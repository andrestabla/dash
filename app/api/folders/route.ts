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
            query = 'SELECT * FROM folders ORDER BY name ASC';
        } else {
            query = `
                SELECT f.* FROM folders f
                WHERE f.owner_id = $1
                OR f.id IN (SELECT folder_id FROM folder_collaborators WHERE user_id = $1)
                ORDER BY f.name ASC
            `;
            params = [session.id];
        }

        const res = await client.query(query, params);
        client.release();
        return NextResponse.json(res.rows);

    } catch (error) {
        console.error("Folder Fetch error:", error);
        return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
    }
}


export async function POST(request: Request) {
    const session = await getSession() as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { name, parent_id, icon, color } = body;

        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

        const client = await pool.connect();
        const res = await client.query(
            'INSERT INTO folders (name, parent_id, icon, color, owner_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, parent_id || null, icon || '📁', color || '#3b82f6', session.id]
        );
        client.release();

        return NextResponse.json(res.rows[0]);
    } catch (error) {
        console.error("Folder Create error:", error);
        return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getSession() as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { id, name, parent_id, icon, color } = body;

        if (!id || !name) return NextResponse.json({ error: 'ID and Name are required' }, { status: 400 });

        // Prevent circular reference
        if (id === parent_id) return NextResponse.json({ error: 'Cannot move folder inside itself' }, { status: 400 });

        const client = await pool.connect();

        // Check permission: Admin or Owner
        const check = await client.query('SELECT owner_id FROM folders WHERE id = $1', [id]);
        if (check.rows.length === 0) {
            client.release();
            return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
        }

        if (session.role !== 'admin' && check.rows[0].owner_id !== session.id) {
            client.release();
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const res = await client.query(
            'UPDATE folders SET name = $1, parent_id = $2, icon = $3, color = $4 WHERE id = $5 RETURNING *',
            [name, parent_id || null, icon || '📁', color || '#3b82f6', id]
        );
        client.release();

        return NextResponse.json(res.rows[0]);
    } catch (error) {
        console.error("Folder Update error:", error);
        return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getSession() as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Check permission: Admin or Owner
            const check = await client.query('SELECT owner_id FROM folders WHERE id = $1', [id]);
            if (check.rows.length === 0) {
                await client.query('ROLLBACK');
                return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
            }

            if (session.role !== 'admin' && check.rows[0].owner_id !== session.id) {
                await client.query('ROLLBACK');
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            // 1. Move subfolders to root
            await client.query('UPDATE folders SET parent_id = NULL WHERE parent_id = $1', [id]);

            // 2. Move dashboards to root
            await client.query('UPDATE dashboards SET folder_id = NULL WHERE folder_id = $1', [id]);

            // 3. Delete the folder
            await client.query('DELETE FROM folders WHERE id = $1', [id]);

            await client.query('COMMIT');
            return NextResponse.json({ success: true });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Folder Delete error:", error);
        return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
    }
}
