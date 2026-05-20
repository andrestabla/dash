import { NextResponse } from 'next/server';
import type { PoolClient } from 'pg';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';

// Resolves whether the session user may access the dashboard a task belongs to.
async function resolveTaskAccess(client: PoolClient, session: any, taskId: string) {
    const taskRes = await client.query('SELECT dashboard_id FROM tasks WHERE id = $1', [taskId]);
    if (taskRes.rows.length === 0) {
        return { found: false, hasAccess: false, dashboardId: null as string | null };
    }
    const dashboardId: string = taskRes.rows[0].dashboard_id;

    if (session.role === 'admin') {
        return { found: true, hasAccess: true, dashboardId };
    }

    const accessRes = await client.query(
        `SELECT 1 FROM dashboards d
         WHERE d.id = $1 AND (
             d.owner_id = $2 OR
             EXISTS (SELECT 1 FROM dashboard_user_permissions dc WHERE dc.dashboard_id = d.id AND dc.user_id = $2) OR
             EXISTS (SELECT 1 FROM folder_collaborators fc WHERE fc.folder_id = d.folder_id AND fc.user_id = $2)
         )`,
        [dashboardId, session.id]
    );
    return { found: true, hasAccess: accessRes.rows.length > 0, dashboardId };
}

export async function GET(request: Request) {
    const session = await getSession() as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const taskId = searchParams.get('taskId');

        if (!taskId) {
            return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }

        const client = await pool.connect();
        try {
            const access = await resolveTaskAccess(client, session, taskId);
            if (!access.found) {
                return NextResponse.json({ error: 'Task not found' }, { status: 404 });
            }
            if (!access.hasAccess) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }

            const result = await client.query(
                'SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at DESC',
                [taskId]
            );
            return NextResponse.json(result.rows);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error fetching comments:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getSession() as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { taskId, content } = body;

        if (!taskId || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // The comment author is the authenticated user, never client-supplied.
        const userEmail: string = session.email;
        const userName: string = session.name || (userEmail ? userEmail.split('@')[0] : 'Usuario');

        const client = await pool.connect();
        try {
            const access = await resolveTaskAccess(client, session, taskId);
            if (!access.found) {
                return NextResponse.json({ error: 'Task not found' }, { status: 404 });
            }
            if (!access.hasAccess) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }

            const result = await client.query(
                'INSERT INTO task_comments (task_id, user_email, user_name, content) VALUES ($1, $2, $3, $4) RETURNING *',
                [taskId, userEmail, userName, content]
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
                            JOIN dashboard_user_permissions dc ON u.id = dc.user_id
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
                    previewText: `${userName} comentó en la tarea.`,
                    bodyContent: `
                        <strong>${userName}</strong> escribió:
                        <br/><br/>
                        <blockquote>${content}</blockquote>
                    `,
                    ctaLink: link,
                    ctaText: "Ver Comentario",
                    footerText: "Gestión de Tareas"
                });

                await Promise.allSettled(Array.from(recipientEmails).map(email => sendEmail(email, subject, html)));

            } catch (notifError) {
                console.error("Notification Error:", notifError);
                // Don't fail the request if notification fails
            }

            return NextResponse.json(result.rows[0], { status: 201 });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error adding comment:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const session = await getSession() as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
        }

        const client = await pool.connect();
        try {
            const commentRes = await client.query(
                'SELECT user_email, task_id FROM task_comments WHERE id = $1',
                [id]
            );
            if (commentRes.rows.length === 0) {
                return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
            }
            const comment = commentRes.rows[0];

            const access = await resolveTaskAccess(client, session, comment.task_id);
            if (!access.hasAccess) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }

            const isAuthor = comment.user_email === session.email;
            const isAdmin = session.role === 'admin';

            // The dashboard owner may moderate comments on their own board.
            let isDashboardOwner = false;
            if (!isAuthor && !isAdmin && access.dashboardId) {
                const ownerRes = await client.query(
                    'SELECT 1 FROM dashboards WHERE id = $1 AND owner_id = $2',
                    [access.dashboardId, session.id]
                );
                isDashboardOwner = ownerRes.rows.length > 0;
            }

            if (!isAuthor && !isAdmin && !isDashboardOwner) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }

            await client.query('DELETE FROM task_comments WHERE id = $1', [id]);
            return NextResponse.json({ message: 'Comment deleted' });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error deleting comment:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const session = await getSession() as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await request.json();
        const { id, content } = body;

        if (!id || !content) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const client = await pool.connect();
        try {
            const check = await client.query('SELECT user_email FROM task_comments WHERE id = $1', [id]);
            if (check.rows.length === 0) {
                return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
            }

            // Only the original author may edit a comment's content.
            if (check.rows[0].user_email !== session.email) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }

            const result = await client.query(
                'UPDATE task_comments SET content = $1 WHERE id = $2 RETURNING *',
                [content, id]
            );
            return NextResponse.json(result.rows[0]);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error updating comment:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
