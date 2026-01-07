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
                   (SELECT COUNT(*) FROM tasks t WHERE t.dashboard_id = d.id) as task_count,
                   u.name as owner_name, u.email as owner_email
            FROM dashboards d
            LEFT JOIN users u ON d.owner_id = u.id
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

        try {
            await client.query('BEGIN');

            // 1. Update Dashboard basic info
            await client.query(
                'UPDATE dashboards SET name = $1, description = $2 WHERE id = $3',
                [name, description, id]
            );

            // 2. Update permissions in dashboard_user_permissions table
            if (owners && Array.isArray(owners)) {
                // Get current permissions
                const currentPermsRes = await client.query(
                    'SELECT user_id, u.email FROM dashboard_user_permissions dup JOIN users u ON dup.user_id = u.id WHERE dashboard_id = $1',
                    [id]
                );
                const currentEmails = currentPermsRes.rows.map(r => r.email);

                // Find emails to add and remove
                const emailsToAdd = owners.filter(email => !currentEmails.includes(email));
                const emailsToRemove = currentEmails.filter(email => !owners.includes(email));

                // Remove permissions for users no longer in the list
                if (emailsToRemove.length > 0) {
                    await client.query(
                        `DELETE FROM dashboard_user_permissions 
                         WHERE dashboard_id = $1 
                         AND user_id IN (SELECT id FROM users WHERE email = ANY($2))`,
                        [id, emailsToRemove]
                    );
                }

                // Add permissions for new users
                for (const email of emailsToAdd) {
                    const userRes = await client.query('SELECT id FROM users WHERE email = $1', [email]);
                    if (userRes.rows.length > 0) {
                        const userId = userRes.rows[0].id;
                        await client.query(
                            `INSERT INTO dashboard_user_permissions (dashboard_id, user_id, granted_by, role)
                             VALUES ($1, $2, $3, 'viewer')
                             ON CONFLICT (dashboard_id, user_id) DO NOTHING`,
                            [id, userId, (session.user as any)?.id || null]
                        );
                    }
                }
            }

            await client.query('COMMIT');
            client.release();

            // 3. Send Invites
            if (sendInvite && owners && owners.length > 0) {
                const origin = request.headers.get('origin') || `https://${request.headers.get('host')}`;
                const base = process.env.NEXT_PUBLIC_APP_URL || origin || 'https://misproyectos.com.co';
                const { sendEmail } = await import('@/lib/email');
                const subject = `Invitación a colaborar: ${name}`;
                const link = `${base}/board/${id}`;

                // We'll fire these in parallel
                const emailPromises = owners.map(async (email: string) => {
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

                await Promise.allSettled(emailPromises);
            }

            return NextResponse.json({ success: true });
        } catch (error) {
            await client.query('ROLLBACK');
            client.release();
            throw error;
        }
    } catch (error) {
        console.error('Error updating dashboard:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

