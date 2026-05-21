import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { serverError } from '@/lib/api-error';

// GET /api/workspaces/public — minimal { id, name } list used by the public
// registration form so a new user can choose which workspace to join.
// No session required; it exposes only workspace names.
export async function GET() {
    try {
        const client = await pool.connect();
        try {
            const res = await client.query(
                'SELECT id, name FROM workspaces WHERE deleted_at IS NULL ORDER BY name ASC'
            );
            return NextResponse.json(res.rows);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Public workspaces error', error);
        return serverError('No se pudieron cargar los workspaces');
    }
}
