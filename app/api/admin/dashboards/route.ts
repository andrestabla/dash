import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
    const session = await getSession();
    if (session?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    try {
        const client = await pool.connect();
        // Get boards + basic stats
        const res = await client.query(`
            SELECT d.id, d.name, d.description, d.created_at, 
                   (SELECT COUNT(*) FROM tasks t WHERE t.dashboard_id = d.id) as task_count
            FROM dashboards d
            ORDER BY d.created_at DESC
        `);
        client.release();
        return NextResponse.json(res.rows);
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getSession();
    if (session?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        const client = await pool.connect();
        await client.query('DELETE FROM dashboards WHERE id = $1', [id]);
        client.release();
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getSession();
    if (session?.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    try {
        const body = await request.json();
        const { id, name, description, owners, sendInvite } = body; // owners is string[] of emails

        if (!id || !name) return NextResponse.json({ error: 'ID and Name required' }, { status: 400 });

        const client = await pool.connect();

        // 1. Get current settings to preserve other dashboard settings (like colors, icon, etc)
        const currentRes = await client.query('SELECT settings FROM dashboards WHERE id = $1', [id]);
        if (currentRes.rows.length === 0) {
            client.release();
            return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
        }

        const currentSettings = currentRes.rows[0].settings || {};
        const newSettings = {
            ...currentSettings,
            owners: owners || currentSettings.owners || []
        };

        // 2. Update Dashboard
        await client.query(
            'UPDATE dashboards SET name = $1, description = $2, settings = $3 WHERE id = $4',
            [name, description, newSettings, id]
        );
        client.release();

        // 3. Send Invites
        if (sendInvite && owners && owners.length > 0) {
            const { sendEmail } = await import('@/lib/email');
            const subject = `Invitación a colaborar: ${name}`;
            const link = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/board/${id}`;

            // We'll fire these in parallel
            owners.forEach(async (email: string) => {
                const html = `
                    <div style="font-family: sans-serif; color: #333;">
                        <h2>¡Te han invitado a un Tablero! 📊</h2>
                        <p>Has sido adicionado como colaborador en el tablero <b>"${name}"</b>.</p>
                        <p>Haz clic abajo para acceder:</p>
                        <br/>
                        <a href="${link}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px;">
                            Ir al Tablero
                        </a>
                    </div>
                `;
                await sendEmail(email, subject, html);
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
