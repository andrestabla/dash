import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
    const session = await getSession() as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const client = await pool.connect();

        let query;
        let params: any[] = [];

        if (session.role === 'admin') {
            // Admins see everything
            query = 'SELECT * FROM dashboards ORDER BY created_at DESC';
        } else {
            // Users see their own OR shared ones
            query = `
                SELECT d.* FROM dashboards d
                LEFT JOIN dashboard_collaborators dc ON d.id = dc.dashboard_id
                WHERE d.owner_id = $1 OR dc.user_id = $1
                GROUP BY d.id
                ORDER BY d.created_at DESC
            `;
            params = [session.id];
        }

        const result = await client.query(query, params);
        client.release();
        return NextResponse.json(result.rows);
    } catch (error) {
        console.error("Dashboard Fetch Error", error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getSession() as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { name, description, settings, initialTasks, folder_id } = body;

        if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const result = await client.query(
                'INSERT INTO dashboards (name, description, settings, folder_id, owner_id, start_date, end_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
                [name, description || '', settings || {}, folder_id || null, session.id, body.start_date || null, body.end_date || null]
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
            return NextResponse.json(newDash, { status: 201 });
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Dashboard Create Error", error);
        return NextResponse.json({ error: 'Failed to create dashboard' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getSession() as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { id, name, description, settings } = body;

        if (!id || !name) return NextResponse.json({ error: 'ID and Name required' }, { status: 400 });

        const client = await pool.connect();

        // Check permission: Admin or Owner
        const check = await client.query('SELECT owner_id FROM dashboards WHERE id = $1', [id]);
        if (check.rows.length === 0) {
            client.release();
            return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
        }

        if (session.role !== 'admin' && check.rows[0].owner_id !== session.id) {
            client.release();
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const result = await client.query(
            'UPDATE dashboards SET name = $1, description = $2, settings = $3, start_date = $4, end_date = $5 WHERE id = $6 RETURNING *',
            [name, description || '', settings || {}, body.start_date || null, body.end_date || null, id]
        );
        client.release();

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error("Dashboard Update Error", error);
        return NextResponse.json({ error: 'Failed to update dashboard' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getSession() as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const client = await pool.connect();

        // Check permission: Admin or Owner
        const check = await client.query('SELECT owner_id FROM dashboards WHERE id = $1', [id]);
        if (check.rows.length === 0) {
            client.release();
            return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
        }

        if (session.role !== 'admin' && check.rows[0].owner_id !== session.id) {
            client.release();
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const result = await client.query('DELETE FROM dashboards WHERE id = $1 RETURNING id', [id]);
        client.release();

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error("Dashboard Delete Error", error);
        return NextResponse.json({ error: 'Failed to delete dashboard' }, { status: 500 });
    }
}
