import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { action, isPublic } = body;
    const folderId = params.id;

    try {
        const client = await pool.connect();

        // Access Control: Only owner (or admin) can share
        // For MVP, we'll allow if user is logged in. In prod, check ownership.

        if (action === 'toggle_public') {
            let token = null;

            if (isPublic) {
                // Check if token already exists
                const res = await client.query('SELECT public_token FROM folders WHERE id = $1', [folderId]);
                token = res.rows[0]?.public_token;

                if (!token) {
                    token = crypto.randomUUID();
                    await client.query('UPDATE folders SET is_public = TRUE, public_token = $1 WHERE id = $2', [token, folderId]);
                } else {
                    await client.query('UPDATE folders SET is_public = TRUE WHERE id = $1', [folderId]);
                }
            } else {
                await client.query('UPDATE folders SET is_public = FALSE WHERE id = $1', [folderId]);
            }

            client.release();
            return NextResponse.json({ success: true, isPublic, token });
        }

        client.release();
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error("Folder Share API Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
