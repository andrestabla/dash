import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM dashboards ORDER BY created_at DESC');
        client.release();
        return NextResponse.json(result.rows);
    } catch (error) {
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, description, settings, initialTasks, folder_id } = body;

        if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const result = await client.query(
                'INSERT INTO dashboards (name, description, settings, folder_id) VALUES ($1, $2, $3, $4) RETURNING *',
                [name, description || '', settings || {}, folder_id || null]
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
    try {
        const body = await request.json();
        const { id, name, description, settings } = body;

        if (!id || !name) return NextResponse.json({ error: 'ID and Name required' }, { status: 400 });

        const client = await pool.connect();
        const result = await client.query(
            'UPDATE dashboards SET name = $1, description = $2, settings = $3 WHERE id = $4 RETURNING *',
            [name, description || '', settings || {}, id]
        );
        client.release();

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update dashboard' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const client = await pool.connect();
        const result = await client.query('DELETE FROM dashboards WHERE id = $1 RETURNING id', [id]);
        client.release();

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to delete dashboard' }, { status: 500 });
    }
}
