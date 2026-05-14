import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { subscribeDashboardRealtime } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession() as any;
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: dashboardId } = await params;
    if (!dashboardId) return NextResponse.json({ error: 'Dashboard ID required' }, { status: 400 });

    const client = await pool.connect();
    try {
        const accessQuery = session.role === 'admin'
            ? 'SELECT id FROM dashboards WHERE id = $1'
            : `SELECT id FROM dashboards d
               WHERE id = $1 AND (
                   owner_id = $2
                   OR EXISTS (SELECT 1 FROM dashboard_user_permissions dc WHERE dc.dashboard_id = d.id AND dc.user_id = $2)
                   OR EXISTS (SELECT 1 FROM folder_collaborators fc WHERE fc.folder_id = d.folder_id AND fc.user_id = $2)
               )`;
        const accessParams = session.role === 'admin' ? [dashboardId] : [dashboardId, session.id];
        const accessCheck = await client.query(accessQuery, accessParams);
        if (accessCheck.rows.length === 0) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
    } finally {
        client.release();
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            const send = (event: string, data: unknown) => {
                controller.enqueue(
                    encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
                );
            };

            send('connected', { ok: true, dashboardId, ts: Date.now() });

            const unsubscribe = subscribeDashboardRealtime(dashboardId, (event) => {
                send('update', { event, dashboardId, ts: Date.now() });
            });

            const heartbeat = setInterval(() => {
                send('heartbeat', { ts: Date.now() });
            }, 25000);

            const close = () => {
                clearInterval(heartbeat);
                unsubscribe();
                try {
                    controller.close();
                } catch {
                    // Ignore close errors for already-closed streams.
                }
            };

            // Close stale streams after 5 minutes to avoid long-lived leaks.
            const maxLifetime = setTimeout(close, 5 * 60 * 1000);

            void maxLifetime;
        },
        cancel() {
            // no-op; cleanup happens in close timeout or abort handler when available
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive'
        }
    });
}
