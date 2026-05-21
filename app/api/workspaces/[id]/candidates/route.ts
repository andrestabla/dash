import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canGovernWorkspace } from '@/lib/workspace-access';
import { unauthorized, forbidden, serverError } from '@/lib/api-error';

// GET /api/workspaces/[id]/candidates?q=...
// Existing accounts — not already members of the workspace — matching the
// query. Powers the invitation autocomplete on the governance page.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession() as any;
    if (!session) return unauthorized();
    const { id: workspaceId } = await params;

    const raw = new URL(request.url).searchParams.get('q') || '';
    const q = raw.trim().toLowerCase().replace(/[%_\\]/g, '');
    if (q.length < 2) return NextResponse.json([]);

    try {
        const client = await pool.connect();
        try {
            if (!(await canGovernWorkspace(client, session, workspaceId))) {
                return forbidden('No gobiernas este workspace');
            }
            const res = await client.query(
                `SELECT u.id, u.name, u.email
                 FROM users u
                 WHERE (lower(u.email) LIKE '%' || $2 || '%'
                        OR lower(coalesce(u.name, '')) LIKE '%' || $2 || '%')
                   AND u.status <> 'denied'
                   AND NOT EXISTS (
                       SELECT 1 FROM workspace_members wm
                       WHERE wm.workspace_id = $1 AND wm.user_id = u.id
                   )
                 ORDER BY u.email ASC
                 LIMIT 8`,
                [workspaceId, q]
            );
            return NextResponse.json(res.rows);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Candidates search error', error);
        return serverError('No se pudo buscar usuarios');
    }
}
