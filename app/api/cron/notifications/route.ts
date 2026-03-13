import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // Allow Vercel's own cron runner OR a valid CRON_SECRET bearer token
    const userAgent = request.headers.get('user-agent') || '';
    const authHeader = request.headers.get('authorization');
    const isVercelCron = userAgent.includes('vercel-cron');
    const isValidSecret = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;

    if (!isVercelCron && !isValidSecret && process.env.CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Find tasks that need notification (include dashboard owner email for fallback)
        const query = `
            SELECT 
                t.id, t.name, t.due, t.notification_value, t.notification_unit, 
                t.dashboard_id, d.name as dashboard_name,
                u_owner.email as owner_email, u_owner.name as owner_name
            FROM tasks t
            JOIN dashboards d ON t.dashboard_id = d.id
            LEFT JOIN users u_owner ON u_owner.id = d.owner_id
            WHERE t.notification_enabled = TRUE 
              AND t.notification_sent = FALSE 
              AND t.due IS NOT NULL
              AND t.notification_value IS NOT NULL
              AND t.notification_unit IS NOT NULL
        `;

        const result = await client.query(query);
        const tasks = result.rows;
        const now = new Date();
        const sentIds: string[] = [];
        const log: any[] = [];

        for (const task of tasks) {
            if (!task.notification_unit || !task.notification_value) {
                log.push({ task: task.name, skipped: 'missing unit or value' });
                continue;
            }

            // Parse the due date as local midnight (avoid UTC offset issues).
            // 'due' comes from DB as 'YYYY-MM-DD'. Append T00:00:00 to parse as local time.
            const dueDateStr: string = typeof task.due === 'string'
                ? task.due.slice(0, 10)
                : new Date(task.due).toISOString().slice(0, 10);

            const [year, month, day] = dueDateStr.split('-').map(Number);
            const dueDate = new Date(year, month - 1, day, 0, 0, 0, 0); // local midnight

            const notificationTime = new Date(dueDate);

            if (task.notification_unit === 'days') {
                notificationTime.setDate(notificationTime.getDate() - (task.notification_value || 0));
            } else if (task.notification_unit === 'hours') {
                notificationTime.setHours(notificationTime.getHours() - (task.notification_value || 0));
            }

            log.push({
                task: task.name,
                due: dueDate.toISOString(),
                notifyAt: notificationTime.toISOString(),
                now: now.toISOString(),
                shouldSend: now >= notificationTime,
            });

            // If current time is past or equal to notification time
            if (now >= notificationTime) {
                // Fetch assignees' emails (users with user_id in task_assignees)
                const assigneesRes = await client.query(
                    `SELECT u.email, u.name 
                     FROM task_assignees ta
                     JOIN users u ON ta.user_id = u.id
                     WHERE ta.task_id = $1 AND u.email IS NOT NULL`,
                    [task.id]
                );

                let emails: string[] = assigneesRes.rows.map((r: any) => r.email).filter(Boolean);

                // Fallback: if no assignee emails found, notify the dashboard owner
                if (emails.length === 0 && task.owner_email) {
                    emails = [task.owner_email];
                }

                if (emails.length === 0) {
                    log.push({ task: task.name, skipped: 'no emails found' });
                    continue;
                }

                const subject = `🔔 Recordatorio: "${task.name}" vence pronto`;
                const html = `
                    <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #333; border: 1px solid #e5e7eb; border-radius: 12px;">
                        <h2 style="color: #3b82f6; margin-top: 0;">🔔 Recordatorio de Tarea</h2>
                        <p>Hola,</p>
                        <p>Te recordamos que la tarea:</p>
                        <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #3b82f6;">
                            <strong style="font-size: 16px;">${task.name}</strong><br/>
                            <span style="color: #64748b; font-size: 13px;">📋 Tablero: ${task.dashboard_name}</span><br/>
                            <span style="color: #64748b; font-size: 13px;">📅 Fecha límite: <strong>${dueDate.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong></span>
                        </div>
                        <p style="color: #64748b; font-size: 13px;">Esta notificación fue configurada para enviarse <strong>${task.notification_value} ${task.notification_unit === 'days' ? 'día(s)' : 'hora(s)'} antes</strong> de la fecha límite.</p>
                        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #94a3b8;">
                            Correo automático generado por misproyectos.com.co — No responder.
                        </div>
                    </div>
                `;

                for (const email of emails) {
                    await sendEmail(email, subject, html);
                }

                // Mark as sent
                await client.query('UPDATE tasks SET notification_sent = TRUE WHERE id = $1', [task.id]);
                sentIds.push(task.id);
            }
        }

        await client.query('COMMIT');
        client.release();

        return NextResponse.json({ message: 'Processed notifications', sentCount: sentIds.length, log });
    } catch (error) {
        await client.query('ROLLBACK');
        client.release();
        console.error('Cron Error:', error);
        return NextResponse.json({ error: 'Notification process failed' }, { status: 500 });
    }
}
