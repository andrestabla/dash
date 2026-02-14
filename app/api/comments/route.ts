import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const taskId = searchParams.get('taskId');

        if (!taskId) {
            return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }

        const client = await pool.connect();
        const result = await client.query(
            'SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at DESC',
            [taskId]
        );
        client.release();

        return NextResponse.json(result.rows);
    } catch (error) {
        console.error('Error fetching comments:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { taskId, userEmail, userName, content } = body;

        if (!taskId || !userEmail || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const client = await pool.connect();
        const result = await client.query(
            'INSERT INTO task_comments (task_id, user_email, user_name, content) VALUES ($1, $2, $3, $4) RETURNING *',
            [taskId, userEmail, userName || userEmail.split('@')[0], content]
        );

        // --- NOTIFICATIONS ---
        try {
            const { sendEmail } = await import('@/lib/email');
            const { generateEmailHtml, getBaseUrl } = await import('@/lib/email-templates');

            // 1. Get Task details (Name & Dashboard ID)
            const taskRes = await client.query('SELECT name, dashboard_id FROM tasks WHERE id = $1', [taskId]);
            const taskName = taskRes.rows[0]?.name || 'Tarea';
            const dashboardId = taskRes.rows[0]?.dashboard_id;

            // 2. Identify Recipients
            const recipientEmails = new Set<string>();

            // A. Assignees
            const assigneesRes = await client.query(`
                SELECT u.email 
                FROM task_assignees ta
                JOIN users u ON ta.user_id = u.id
                WHERE ta.task_id = $1
            `, [taskId]);

            assigneesRes.rows.forEach(r => recipientEmails.add(r.email));

            // B. Mentions (@Name)
            const mentions = content.match(/@([a-zA-Z0-9_ñÑ]+)/g);
            if (mentions && dashboardId) {
                for (const mention of mentions) {
                    const namePart = mention.substring(1); // remove @
                    const userMatch = await client.query(`
                        SELECT u.email FROM users u
                        JOIN dashboard_collaborators dc ON u.id = dc.user_id
                        WHERE dc.dashboard_id = $1 AND u.name ILIKE $2
                        LIMIT 1
                     `, [dashboardId, `%${namePart}%`]);

                    if (userMatch.rows.length > 0) {
                        recipientEmails.add(userMatch.rows[0].email);
                    }
                }
            }

            // Remove sender from recipients
            recipientEmails.delete(userEmail);

            // 3. Send Emails
            const subject = `💬 Nuevo comentario en: ${taskName}`;
            const baseUrl = getBaseUrl();
            const link = `${baseUrl}/board/${dashboardId}?taskId=${taskId}`;

            const html = generateEmailHtml({
                title: `Nuevo comentario en ${taskName}`,
                previewText: `${userName || 'Un usuario'} comentó en la tarea.`,
                bodyContent: `
                    <strong>${userName || 'Un usuario'}</strong> escribió:
                    <br/><br/>
                    <blockquote>${content}</blockquote>
                `,
                ctaLink: link,
                ctaText: "Ver Comentario",
                footerText: "Gestión de Tareas"
            });

            Array.from(recipientEmails).forEach(email => {
                sendEmail(email, subject, html);
            });

        } catch (notifError) {
            console.error("Notification Error:", notifError);
            // Don't fail the request if notification fails
        }

        client.release();

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error) {
        console.error('Error adding comment:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
        }

        const client = await pool.connect();
        await client.query('DELETE FROM task_comments WHERE id = $1', [id]);
        client.release();

        return NextResponse.json({ message: 'Comment deleted' });
    } catch (error) {
        console.error('Error deleting comment:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, content, userEmail } = body;

        if (!id || !content || !userEmail) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const client = await pool.connect();

        // Verify ownership (optional but good practice, though basic here)
        // ideally we check session, but relying on client sent email for this MVP context
        // Real auth check should happen via session in a real app, but matching current pattern:

        const check = await client.query('SELECT user_email FROM task_comments WHERE id = $1', [id]);
        if (check.rows.length === 0) {
            client.release();
            return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
        }
        if (check.rows[0].user_email !== userEmail) {
            client.release();
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const result = await client.query(
            'UPDATE task_comments SET content = $1 WHERE id = $2 RETURNING *',
            [content, id]
        );
        client.release();

        return NextResponse.json(result.rows[0]);
    } catch (error) {
        console.error('Error updating comment:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
