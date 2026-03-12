import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // Basic security check (could be improved with a secret key in headers)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Find tasks that need notification
        const query = `
            SELECT t.id, t.name, t.due, t.notification_value, t.notification_unit, t.dashboard_id, d.name as dashboard_name
            FROM tasks t
            JOIN dashboards d ON t.dashboard_id = d.id
            WHERE t.notification_enabled = TRUE 
              AND t.notification_sent = FALSE 
              AND t.due IS NOT NULL
        `;

        const result = await client.query(query);
        const tasks = result.rows;
        const now = new Date();
        let sentCount = 0;

        for (const task of tasks) {
            const dueDate = new Date(task.due);
            let notificationTime = new Date(dueDate);

            if (task.notification_unit === 'days') {
                notificationTime.setDate(notificationTime.getDate() - (task.notification_value || 0));
            } else if (task.notification_unit === 'hours') {
                notificationTime.setHours(notificationTime.getHours() - (task.notification_value || 0));
            }

            // If current time is past or equal to notification time
            if (now >= notificationTime) {
                // Fetch assignees' emails
                const assigneesRes = await client.query(
                    `SELECT u.email, u.name 
                     FROM task_assignees ta
                     JOIN users u ON ta.user_id = u.id
                     WHERE ta.task_id = $1`,
                    [task.id]
                );

                const emails = assigneesRes.rows.map(r => r.email).filter(Boolean);

                if (emails.length > 0) {
                    const subject = `Recordatorio: Tarea "${task.name}" en ${task.dashboard_name}`;
                    const html = `
                        <div style="font-family: sans-serif; padding: 20px; color: #333;">
                            <h2 style="color: #3b82f6;">Recordatorio de Tarea</h2>
                            <p>Hola,</p>
                            <p>Este es un recordatorio de que la tarea <strong>"${task.name}"</strong> en el tablero <strong>"${task.dashboard_name}"</strong> vence el <strong>${dueDate.toLocaleDateString()}</strong>.</p>
                            <p>Configuraste una notificación para ${task.notification_value} ${task.notification_unit === 'days' ? 'días' : 'horas'} antes.</p>
                            <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #666;">
                                <p>Este es un correo automático, por favor no respondas.</p>
                            </div>
                        </div>
                    `;

                    for (const email of emails) {
                        await sendEmail(email, subject, html);
                    }

                    // Mark as sent
                    await client.query('UPDATE tasks SET notification_sent = TRUE WHERE id = $1', [task.id]);
                    sentCount++;
                }
            }
        }

        await client.query('COMMIT');
        client.release();

        return NextResponse.json({ message: `Processed notifications`, sentCount });
    } catch (error) {
        await client.query('ROLLBACK');
        client.release();
        console.error('Cron Error:', error);
        return NextResponse.json({ error: 'Notification process failed' }, { status: 500 });
    }
}
