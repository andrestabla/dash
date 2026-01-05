import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const dashboardId = searchParams.get('dashboardId');

        const client = await pool.connect();
        let query = 'SELECT id, week, name, status, owner, type, prio, gate, due, description as desc, dashboard_id FROM tasks';
        const params: any[] = [];

        if (dashboardId) {
            query += ' WHERE dashboard_id = $1';
            params.push(dashboardId);
        }

        query += ' ORDER BY id ASC';

        const result = await client.query(query, params);
        const tasks = result.rows.map(row => ({
            ...row,
            id: Number(row.id)
        }));
        client.release();

        return NextResponse.json(tasks);
    } catch (error) {
        console.error('Database Error:', error);
        return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, week, name, status, owner, type, prio, gate, due, desc, dashboard_id } = body;

        if (!dashboard_id) return NextResponse.json({ error: 'Dashboard ID required' }, { status: 400 });

        const client = await pool.connect();

        const query = `
      INSERT INTO tasks (id, week, name, status, owner, type, prio, gate, due, description, dashboard_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        week = EXCLUDED.week,
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        owner = EXCLUDED.owner,
        type = EXCLUDED.type,
        prio = EXCLUDED.prio,
        gate = EXCLUDED.gate,
        due = EXCLUDED.due,
        description = EXCLUDED.description,
        dashboard_id = EXCLUDED.dashboard_id
    `;

        await client.query(query, [id, week, name, status, owner, type, prio, gate, due, desc, dashboard_id]);
        client.release();

        return NextResponse.json({ message: 'Task saved' }, { status: 201 });
    } catch (error) {
        console.error('Database Error:', error);
        return NextResponse.json({ error: 'Failed to save task' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID required' }, { status: 400 });
        }

        const client = await pool.connect();
        await client.query('DELETE FROM tasks WHERE id = $1', [id]);
        client.release();

        return NextResponse.json({ message: 'Task deleted' });
    } catch (error) {
        console.error('Database Error:', error);
        return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }
}
