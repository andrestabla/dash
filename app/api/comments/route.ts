import { NextResponse } from 'next/server';
import type { PoolClient } from 'pg';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { unauthorized, forbidden, notFound, badRequest, serverError } from '@/lib/api-error';
import { gestorClause } from '@/lib/workspace-access';

function escapeHtml(str: string): string {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c));
}

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
             EXISTS (SELECT 1 FROM folder_collaborators fc WHERE fc.folder_id = d.folder_id AND fc.user_id = $2) OR
             ${gestorClause('d', '$2')}
         )`,
        [dashboardId, session.id]
    );
    return { found: true, hasAccess: accessRes.rows.length > 0, dashboardId };
}

export async function GET(request: Request) {
    const session = await getSession() as any;
    if (!session) return unauthorized();

    try {
        const { searchParams } = new URL(request.url);
        const taskId = searchParams.get('taskId');

        if (!taskId) {
            return badRequest('Task ID is required');
        }

        const client = await pool.connect();
        try {
            const access = await resolveTaskAccess(client, session, taskId);
            if (!access.found) {
                return notFound('Task not found');
            }
            if (!access.hasAccess) {
                return forbidden('Access denied');
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
        return serverError();
    }
}

export async function POST(request: Request) {
    const session = await getSession() as any;
    if (!session) return unauthorized();

    try {
        const body = await request.json();
        const { taskId, content } = body;

        if (!taskId || !content) {
            return badRequest('Missing required fields');
        }

        // The comment author is the authenticated user, never client-supplied.
        const userEmail: string = session.email;
        const userName: string = session.name || (userEmail ? userEmail.split('@')[0] : 'Usuario');

        const client = await pool.connect();
        try {
            const access = await resolveTaskAccess(client, session, taskId);
            if (!access.found) {
                return notFound('Task not found');
            }
            if (!access.hasAccess) {
                return forbidden('Access denied');
            }

            const result = await client.query(
                'INSERT INTO task_comments (task_id, user_email, user_name, content) VALUES ($1, $2, $3, $4) RETURNING *',
                [taskId, userEmail, userName, content]
            );

            // --- NOTIFICATIONS: email + in-app for assignees and @mentions ---
            try {
                const { sendEmail } = await import('@/lib/email');
                const { generateEmailHtml, getBaseUrl } = await import('@/lib/email-templates');

                const taskRes = await client.query('SELECT name, dashboard_id FROM tasks WHERE id = $1', [taskId]);
                const taskName = taskRes.rows[0]?.name || 'Tarea';
                const dashboardId = taskRes.rows[0]?.dashboard_id;

                // Recipients keyed by email; `mentioned` flags explicit @tags —
                // those also get an in-app notification, not just an email.
                const recipients = new Map<string, { email: string; userId: string | null; mentioned: boolean }>();

                // A. Task assignees.
                const assigneesRes = await client.query(
                    `SELECT u.id, u.email FROM task_assignees ta
                     JOIN users u ON ta.user_id = u.id
                     WHERE ta.task_id = $1 AND u.email IS NOT NULL`,
                    [taskId]
                );
                for (const row of assigneesRes.rows) {
                    recipients.set(row.email, { email: row.email, userId: row.id, mentioned: false });
                }

                // B. @mentions — resolved by exact, longest name match. The
                // mention picker inserts each user's full name (spaces and
                // accents included), so matching names as written is reliable
                // where the old regex broke on accented or compound names.
                if (typeof content === 'string' && content.includes('@')) {
                    const usersRes = await client.query(
                        'SELECT id, name, email FROM users WHERE name IS NOT NULL AND email IS NOT NULL'
                    );
                    const allUsers = usersRes.rows as { id: string; name: string; email: string }[];
                    for (let i = 0; i < content.length; i += 1) {
                        if (content[i] !== '@') continue;
                        const rest = content.slice(i + 1);
                        let best: { id: string; name: string; email: string } | null = null;
                        for (const candidate of allUsers) {
                            const name = String(candidate.name);
                            if (!name || rest.slice(0, name.length).toLowerCase() !== name.toLowerCase()) continue;
                            const after = rest[name.length];
                            const boundaryOk = after === undefined || /[\s.,;:!?)\]'"]/.test(after);
                            if (boundaryOk && (!best || name.length > best.name.length)) best = candidate;
                        }
                        if (best) {
                            recipients.set(best.email, { email: best.email, userId: best.id, mentioned: true });
                        }
                    }
                }

                recipients.delete(userEmail); // never notify the comment's author

                const list = Array.from(recipients.values());
                if (list.length > 0) {
                    const baseUrl = getBaseUrl();
                    const link = `${baseUrl}/board/${dashboardId}?taskId=${taskId}`;
                    const subject = `💬 Nuevo comentario en: ${taskName}`;
                    const html = generateEmailHtml({
                        title: `Nuevo comentario en ${taskName}`,
                        previewText: `${userName} comentó en la tarea.`,
                        bodyContent: `
                            <strong>${escapeHtml(userName)}</strong> escribió:
                            <br/><br/>
                            <blockquote>${escapeHtml(content)}</blockquote>
                        `,
                        ctaLink: link,
                        ctaText: 'Ver Comentario',
                        footerText: 'Gestión de Tareas'
                    });

                    await Promise.allSettled(list.map((r) => sendEmail(r.email, subject, html)));

                    // In-app notification for the people explicitly @mentioned.
                    const preview = content.length > 140 ? `${content.slice(0, 140)}…` : content;
                    for (const r of list) {
                        if (!r.mentioned || !r.userId) continue;
                        await client.query(
                            'INSERT INTO notifications (user_id, title, message, link) VALUES ($1, $2, $3, $4)',
                            [r.userId, `💬 Te mencionaron en "${taskName}"`, `${userName}: ${preview}`, link]
                        );
                    }
                }
            } catch (notifError) {
                console.error('Notification Error:', notifError);
                // Don't fail the request if notification fails.
            }

            return NextResponse.json(result.rows[0], { status: 201 });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error adding comment:', error);
        return serverError();
    }
}

export async function DELETE(request: Request) {
    const session = await getSession() as any;
    if (!session) return unauthorized();

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return badRequest('Comment ID is required');
        }

        const client = await pool.connect();
        try {
            const commentRes = await client.query(
                'SELECT user_email, task_id FROM task_comments WHERE id = $1',
                [id]
            );
            if (commentRes.rows.length === 0) {
                return notFound('Comment not found');
            }
            const comment = commentRes.rows[0];

            const access = await resolveTaskAccess(client, session, comment.task_id);
            if (!access.hasAccess) {
                return forbidden('Access denied');
            }

            const isAuthor = comment.user_email === session.email;
            const isAdmin = session.role === 'admin';

            // The dashboard owner — or a gestor of its workspace — may
            // moderate comments on that board.
            let canModerate = false;
            if (!isAuthor && !isAdmin && access.dashboardId) {
                const modRes = await client.query(
                    `SELECT 1 FROM dashboards d
                     WHERE d.id = $1 AND (d.owner_id = $2 OR ${gestorClause('d', '$2')})`,
                    [access.dashboardId, session.id]
                );
                canModerate = modRes.rows.length > 0;
            }

            if (!isAuthor && !isAdmin && !canModerate) {
                return forbidden('Access denied');
            }

            await client.query('DELETE FROM task_comments WHERE id = $1', [id]);
            return NextResponse.json({ message: 'Comment deleted' });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error deleting comment:', error);
        return serverError();
    }
}

export async function PUT(request: Request) {
    const session = await getSession() as any;
    if (!session) return unauthorized();

    try {
        const body = await request.json();
        const { id, content } = body;

        if (!id || !content) {
            return badRequest('Missing required fields');
        }

        const client = await pool.connect();
        try {
            const check = await client.query('SELECT user_email FROM task_comments WHERE id = $1', [id]);
            if (check.rows.length === 0) {
                return notFound('Comment not found');
            }

            // Only the original author may edit a comment's content.
            if (check.rows[0].user_email !== session.email) {
                return forbidden('Access denied');
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
        return serverError();
    }
}
