import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession() as any;
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: dashboardId } = await params;

    try {
        const client = await pool.connect();

        // Fetch messages with user details
        const res = await client.query(`
            SELECT m.*, u.name as user_name, u.email as user_email
            FROM dashboard_messages m
            LEFT JOIN users u ON m.user_id = u.id
            WHERE m.dashboard_id = $1
            ORDER BY m.created_at ASC
            LIMIT 100
        `, [dashboardId]);

        client.release();
        return NextResponse.json(res.rows);
    } catch (error) {
        console.error("Chat fetch error:", error);
        return NextResponse.json({ error: "DB Error" }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession() as any;
    if (!session || !session.id) {
        return NextResponse.json({ error: 'Unauthorized: No session ID' }, { status: 401 });
    }

    const { id: dashboardId } = await params;

    try {
        const { content, notify } = await request.json();

        if (!content || !content.trim()) {
            return NextResponse.json({ error: "Content required" }, { status: 400 });
        }

        const client = await pool.connect();

        try {
            // Optional: Check permissions (is user part of dashboard?)
            // For now relying on basic auth session + knowledge of dashboard ID

            const res = await client.query(`
                INSERT INTO dashboard_messages (dashboard_id, user_id, content)
                VALUES ($1, $2, $3)
                RETURNING *
            `, [dashboardId, session.id, content]);

            // Handle Notifications
            if (notify && notify !== 'none') {
                const { sendEmail } = await import('@/lib/email');

                let recipients: string[] = [];

                if (notify === 'all') {
                    // Fetch all collaborators
                    const collabRes = await client.query(`
                        SELECT u.email 
                        FROM dashboard_collaborators dc
                        JOIN users u ON dc.user_id = u.id
                        WHERE dc.dashboard_id = $1 AND u.id != $2
                    `, [dashboardId, session.id]);
                    recipients = collabRes.rows.map(r => r.email);

                    // Add owner if not present and not sender
                    const ownerRes = await client.query('SELECT u.email, u.id FROM dashboards d JOIN users u ON d.owner_id = u.id WHERE d.id = $1', [dashboardId]);
                    if (ownerRes.rows.length > 0) {
                        const owner = ownerRes.rows[0];
                        if (owner.id !== session.id && !recipients.includes(owner.email)) {
                            recipients.push(owner.email);
                        }
                    }

                } else {
                    // Specific User
                    const userRes = await client.query('SELECT email FROM users WHERE id = $1', [notify]);
                    if (userRes.rows.length > 0) {
                        recipients.push(userRes.rows[0].email);
                    }
                }

                // Get Dashboard Name
                const dashRes = await client.query('SELECT name FROM dashboards WHERE id = $1', [dashboardId]);
                const dashName = dashRes.rows[0]?.name || "Tablero";

                // Send Emails
                const { generateEmailHtml, getBaseUrl } = await import('@/lib/email-templates');
                const baseUrl = getBaseUrl();
                const link = `${baseUrl}/board/${dashboardId}`;
                const subject = `💬 Nuevo mensaje en: ${dashName}`;

                const html = generateEmailHtml({
                    title: `Nuevo mensaje en ${dashName}`,
                    previewText: `${session.name || 'Un miembro'} escribió en el chat.`,
                    bodyContent: `
                        <strong>${session.name || 'Un miembro'}</strong> escribió:
                        <br/><br/>
                        <blockquote>${content}</blockquote>
                    `,
                    ctaLink: link,
                    ctaText: "Ir al Chat",
                    footerText: "Dashboard App"
                });

                // Send in parallel and AWAIT to ensure Vercel doesn't kill the process
                await Promise.allSettled(recipients.map(email => sendEmail(email, subject, html)));
            }

            // Get user details for immediate frontend update without re-fetch
            const newMessage = res.rows[0];
            newMessage.user_name = session.name || session.email?.split('@')[0] || 'Usuario';
            newMessage.user_email = session.email;

            return NextResponse.json(newMessage, { status: 201 });
        } finally {
            client.release();
        }
    } catch (error: any) {
        console.error("Chat post error:", error);
        return NextResponse.json({ error: "Failed to post message", details: error.message }, { status: 500 });
    }
}
