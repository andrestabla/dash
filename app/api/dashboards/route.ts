import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { publishDashboardRealtime } from '@/lib/realtime';
import { buildCanvasSettings, getDashboardKind } from '@/lib/canvas';
import { unauthorized, badRequest, notFound, forbidden, serverError } from '@/lib/api-error';
import { DEFAULT_WORKSPACE_ID } from '@/lib/workspace';
import { gestorClause, isGestorOf } from '@/lib/workspace-access';

export async function GET() {
    const session = await getSession() as any;
    if (!session) return unauthorized();

    try {
        const client = await pool.connect();
        try {

            let query;
            let params: any[] = [];


            if (session.role === 'admin') {
                query = 'SELECT * FROM dashboards ORDER BY created_at DESC';
            } else {
                query = `
                    SELECT d.* FROM dashboards d
                    WHERE d.owner_id = $1
                    OR EXISTS (SELECT 1 FROM dashboard_user_permissions dc WHERE dc.dashboard_id = d.id AND dc.user_id = $1)
                    OR d.folder_id IN (SELECT folder_id FROM folder_collaborators WHERE user_id = $1)
                    OR ${gestorClause('d', '$1')}
                    ORDER BY d.created_at DESC
                `;
                params = [session.id];
            }

            const result = await client.query(query, params);
            return NextResponse.json(result.rows);
        } finally {
            client.release();
        }

    } catch (error) {
        console.error("Dashboard Fetch Error", error);
        return serverError('Database error');
    }
}


export async function POST(request: Request) {
    const session = await getSession() as any;
    if (!session) return unauthorized();

    try {
        const body = await request.json();
        const { name, description, settings, initialTasks, folder_id, is_demo } = body;

        if (!name) return badRequest('Name required');

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const normalizedSettings = buildCanvasSettings(
                { ...(settings || {}), dashboardType: getDashboardKind(settings) },
                String(name || 'Idea Principal')
            );

            // A dashboard lives in the same workspace as its folder; a
            // folderless dashboard falls back to the default workspace.
            let createWorkspaceId: string = DEFAULT_WORKSPACE_ID;
            if (folder_id) {
                const fw = await client.query('SELECT workspace_id FROM folders WHERE id = $1', [folder_id]);
                if (fw.rows[0]?.workspace_id) createWorkspaceId = fw.rows[0].workspace_id;
            }

            const result = await client.query(
                'INSERT INTO dashboards (name, description, settings, folder_id, owner_id, start_date, end_date, is_demo, workspace_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
                [name, description || '', normalizedSettings, folder_id || null, session.id, body.start_date || null, body.end_date || null, is_demo || false, createWorkspaceId]
            );
            const newDash = result.rows[0];

            // Handle Initial Tasks Import
            if (initialTasks && Array.isArray(initialTasks) && initialTasks.length > 0) {
                const values: any[] = [];
                const placeholders: string[] = [];
                let counter = 1;

                initialTasks.forEach((t: any) => {
                    placeholders.push(`($${counter++}, $${counter++}, $${counter++}, $${counter++}, $${counter++}, $${counter++}, $${counter++})`);
                    values.push(
                        newDash.id,
                        t.name || 'Tarea Importada',
                        // Map standard statuses to IDs
                        t.status === 'Hecho' ? 'done' : t.status === 'En proceso' ? 'doing' : t.status === 'Revisión' ? 'review' : 'todo',
                        t.owner || 'Sin Asignar',
                        t.week || newDash.settings.weeks[0]?.id || 'W1',
                        t.type || 'General',
                        t.prio || 'med'
                    );
                });

                if (values.length > 0) {
                    const queryText = `
                        INSERT INTO tasks (dashboard_id, name, status, owner, week, type, prio)
                        VALUES ${placeholders.join(', ')}
                    `;
                    await client.query(queryText, values);
                }
            }

            await client.query('COMMIT');
            await publishDashboardRealtime(String(newDash.id), 'dashboard_changed');
            return NextResponse.json(newDash, { status: 201 });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Dashboard Create Error", error);
        return serverError('Failed to create dashboard');
    }
}

export async function PUT(request: Request) {
    const session = await getSession() as any;
    if (!session) return unauthorized();

    try {
        const body = await request.json();
        const { id, name, description, settings } = body;

        if (!id || !name) return badRequest('ID and Name required');

        const client = await pool.connect();
        try {

            // Check permission: Admin, Owner, or Collaborator
            const check = await client.query('SELECT owner_id, folder_id, workspace_id, is_demo, start_date, end_date, description, settings, name FROM dashboards WHERE id = $1', [id]);
            if (check.rows.length === 0) {
                return notFound('Dashboard not found');
            }

            const dashboard = check.rows[0];
            const isOwner = dashboard.owner_id === session.id;
            const isAdmin = session.role === 'admin';

            if (dashboard.is_demo && !isAdmin) {
                return forbidden('Cannot modify demo dashboard');
            }

            let isCollaborator = false;
            let isGestor = false;
            if (!isOwner && !isAdmin) {
                // Check direct dashboard collaboration
                const collRes = await client.query(
                    'SELECT id FROM dashboard_user_permissions WHERE dashboard_id = $1 AND user_id = $2',
                    [id, session.id]
                );
                isCollaborator = collRes.rows.length > 0;

                // If not directly shared, check if parent folder is shared
                if (!isCollaborator && dashboard.folder_id) {
                    const folderCollRes = await client.query(
                        'SELECT id FROM folder_collaborators WHERE folder_id = $1 AND user_id = $2',
                        [dashboard.folder_id, session.id]
                    );
                    isCollaborator = folderCollRes.rows.length > 0;
                }

                // A gestor governs every dashboard in their workspace.
                if (!isCollaborator) {
                    isGestor = await isGestorOf(client, session.id, dashboard.workspace_id);
                }
            }

            if (!isAdmin && !isOwner && !isCollaborator && !isGestor) {
                return forbidden();
            }

            const normalizedSettings = buildCanvasSettings(
                { ...(settings || {}), dashboardType: getDashboardKind(settings || dashboard.settings) },
                String(name || dashboard.name || 'Idea Principal')
            );
            const nextDescription = description === undefined ? dashboard.description || '' : description || '';
            const nextStartDate = body.start_date === undefined ? dashboard.start_date : body.start_date || null;
            const nextEndDate = body.end_date === undefined ? dashboard.end_date : body.end_date || null;
            const nextIsDemo = body.is_demo ?? dashboard.is_demo;

            const result = await client.query(
                'UPDATE dashboards SET name = $1, description = $2, settings = $3, start_date = $4, end_date = $5, is_demo = $6 WHERE id = $7 RETURNING *',
                [name, nextDescription, normalizedSettings, nextStartDate, nextEndDate, nextIsDemo, id]
            );
            await publishDashboardRealtime(String(id), 'dashboard_changed');

            return NextResponse.json(result.rows[0]);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Dashboard Update Error", error);
        return serverError('Failed to update dashboard');
    }
}

export async function DELETE(request: Request) {
    const session = await getSession() as any;
    if (!session) return unauthorized();

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return badRequest('ID required');

        const client = await pool.connect();
        try {

            // Check permission: Admin, Owner, or workspace gestor
            const check = await client.query('SELECT owner_id, workspace_id, is_demo FROM dashboards WHERE id = $1', [id]);
            if (check.rows.length === 0) {
                return notFound('Dashboard not found');
            }

            const dashboard = check.rows[0];
            if (dashboard.is_demo && session.role !== 'admin') {
                return forbidden('Cannot delete demo dashboard');
            }

            if (session.role !== 'admin' && dashboard.owner_id !== session.id) {
                const gestor = await isGestorOf(client, session.id, dashboard.workspace_id);
                if (!gestor) return forbidden();
            }

            const result = await client.query('DELETE FROM dashboards WHERE id = $1 RETURNING id', [id]);
            await publishDashboardRealtime(String(id), 'dashboard_deleted');

            return NextResponse.json({ success: true, id });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Dashboard Delete Error", error);
        return serverError('Failed to delete dashboard');
    }
}
