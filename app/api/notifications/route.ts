import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { unauthorized, serverError } from '@/lib/api-error';

export async function GET() {
    const session = await getSession();
    if (!session) return unauthorized();

    try {
        const client = await pool.connect();
        try {
            const res = await client.query(`
                SELECT id, title, message, is_read, created_at
                FROM notifications
                WHERE user_id = $1
                ORDER BY created_at DESC LIMIT 50
            `, [session.id]);
            return NextResponse.json(res.rows);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Notification Fetch Error:", error);
        return serverError();
    }
}

// Mark as read or Create (Admin only)
export async function POST(request: Request) {
    const session = await getSession();
    if (!session) return unauthorized();

    const body = await request.json();

    try {
        const client = await pool.connect();
        try {

            if (body.action === 'mark_read') {
                await client.query('UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2', [body.id, session.id]);
            }
            else if (body.action === 'create' && session.role === 'admin') {
                const { sendEmail } = await import('@/lib/email');

                // Broadcast or Single
                if (body.target === 'all') {
                    const users = await client.query('SELECT id, email FROM users');

                    // Use Promise.all to send emails in parallel but dont fail the request if one fails
                    const emailPromises = users.rows.map(async (u) => {
                        await client.query(
                            'INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)',
                            [u.id, body.title, body.message]
                        );
                        await sendEmail(u.email, `Nuevo Anuncio: ${body.title}`, `<p>${body.message}</p>`);
                    });

                    await Promise.allSettled(emailPromises);

                } else {
                    // Single User
                    await client.query(
                        'INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)',
                        [body.target_user_id, body.title, body.message]
                    );

                    // Fetch target user email
                    const targetRes = await client.query('SELECT email FROM users WHERE id = $1', [body.target_user_id]);
                    if (targetRes.rows.length > 0) {
                        const email = targetRes.rows[0].email;
                        await sendEmail(email, `Notificación: ${body.title}`, `<p>${body.message}</p>`);
                    }
                }
            }

            return NextResponse.json({ success: true });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error("Notification API Error:", error);
        return serverError();
    }
}
