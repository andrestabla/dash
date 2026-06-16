import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { badRequest, forbidden, notFound, serverError, unauthorized } from '@/lib/api-error';
import { isGestorOf } from '@/lib/workspace-access';

export const dynamic = 'force-dynamic';

// Uploads one canvas comment image to its dedicated table and returns a URL
// that the client embeds in the canvas document. Splitting this out of the
// dashboard save keeps the JSONB blob small enough to fit inside Vercel's
// 4.5 MB request-body limit no matter how many screenshots the user attaches.
export async function POST(request: Request) {
    const session = await getSession() as any;
    if (!session) return unauthorized();

    let body: { dashboardId?: unknown; dataUrl?: unknown };
    try {
        body = await request.json();
    } catch {
        return badRequest('Invalid JSON body');
    }

    const dashboardId = typeof body.dashboardId === 'string' ? body.dashboardId : null;
    const dataUrl = typeof body.dataUrl === 'string' ? body.dataUrl : null;
    if (!dashboardId || !dataUrl) {
        return badRequest('dashboardId and dataUrl are required');
    }

    const match = dataUrl.match(/^data:([\w/+.-]+);base64,(.+)$/);
    if (!match) return badRequest('Expected a base64 data URL');
    const mime = match[1];
    const base64 = match[2];
    if (!/^image\//.test(mime)) return badRequest('Only image data URLs are accepted');

    let buffer: Buffer;
    try {
        buffer = Buffer.from(base64, 'base64');
    } catch {
        return badRequest('Invalid base64 payload');
    }
    // Per-image cap of 1.5 MB. The client already downscales to ~900 px /
    // JPEG 0.82, which lands well under this in practice.
    if (buffer.length === 0 || buffer.length > 1_500_000) {
        return badRequest('Image is empty or larger than 1.5 MB');
    }

    const client = await pool.connect();
    try {
        const dashRes = await client.query(
            'SELECT owner_id, folder_id, workspace_id, is_demo FROM dashboards WHERE id = $1',
            [dashboardId]
        );
        if (dashRes.rows.length === 0) return notFound('Dashboard not found');
        const dashboard = dashRes.rows[0];

        const isAdmin = session.role === 'admin';
        if (dashboard.is_demo && !isAdmin) return forbidden('Cannot modify demo dashboard');

        const isOwner = dashboard.owner_id === session.id;
        let isCollaborator = false;
        let isGestor = false;
        if (!isOwner && !isAdmin) {
            const direct = await client.query(
                'SELECT 1 FROM dashboard_user_permissions WHERE dashboard_id = $1 AND user_id = $2',
                [dashboardId, session.id]
            );
            isCollaborator = direct.rows.length > 0;
            if (!isCollaborator && dashboard.folder_id) {
                const folder = await client.query(
                    'SELECT 1 FROM folder_collaborators WHERE folder_id = $1 AND user_id = $2',
                    [dashboard.folder_id, session.id]
                );
                isCollaborator = folder.rows.length > 0;
            }
            if (!isCollaborator) {
                isGestor = await isGestorOf(client, session.id, dashboard.workspace_id);
            }
        }
        if (!isAdmin && !isOwner && !isCollaborator && !isGestor) return forbidden();

        const insert = await client.query(
            `INSERT INTO canvas_images (dashboard_id, data, mime, bytes, created_by)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [dashboardId, buffer, mime, buffer.length, session.id]
        );
        const id = insert.rows[0].id;
        return NextResponse.json({ id, url: `/api/canvas-images/${id}` });
    } catch (error) {
        console.error('Canvas image upload error:', error);
        return serverError('Failed to store canvas image');
    } finally {
        client.release();
    }
}
