import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

// Helper to check authentication
async function isAuthenticated() {
    const session = await getSession();
    return !!session;
}

export async function GET() {
    if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const client = await pool.connect();
        const res = await client.query('SELECT * FROM folders ORDER BY name ASC');
        client.release();
        return NextResponse.json(res.rows);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { name, parent_id } = body;

        if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

        const client = await pool.connect();
        const res = await client.query(
            'INSERT INTO folders (name, parent_id) VALUES ($1, $2) RETURNING *',
            [name, parent_id || null]
        );
        client.release();

        return NextResponse.json(res.rows[0]);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { id, name, parent_id } = body;

        if (!id || !name) return NextResponse.json({ error: 'ID and Name are required' }, { status: 400 });

        // Prevent circular reference if parent_id is being updated
        if (id === parent_id) return NextResponse.json({ error: 'Cannot move folder inside itself' }, { status: 400 });

        const client = await pool.connect();
        const res = await client.query(
            'UPDATE folders SET name = $1, parent_id = $2 WHERE id = $3 RETURNING *',
            [name, parent_id || null, id]
        );
        client.release();

        if (res.rows.length === 0) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });

        return NextResponse.json(res.rows[0]);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    if (!await isAuthenticated()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        const client = await pool.connect();

        // Strategy: When deleting a folder, we move its children (subfolders and dashboards) to the ROOT (null)
        // This is safer than cascade delete. Or should we delete? 
        // Logic: "Move contents to root" is usually better UX than losing data.

        // 1. Move subfolders to root
        await client.query('UPDATE folders SET parent_id = NULL WHERE parent_id = $1', [id]);

        // 2. Move dashboards to root
        await client.query('UPDATE dashboards SET folder_id = NULL WHERE folder_id = $1', [id]);

        // 3. Delete the folder
        await client.query('DELETE FROM folders WHERE id = $1', [id]);

        client.release();

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
    }
}
