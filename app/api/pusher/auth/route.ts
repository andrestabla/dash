import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getSession } from '@/lib/auth';
import { pusherServer } from '@/lib/pusher-server';
import { canAccessDashboard } from '@/lib/workspace-access';
import { unauthorized, forbidden, badRequest } from '@/lib/api-error';

const PREFIX = 'presence-dashboard-';

// POST /api/pusher/auth — Pusher presence-channel authorization.
// pusher-js calls this before subscribing to `presence-dashboard-{id}`; access
// is granted only if the session user may read that dashboard. The presence
// payload (id + name) lets collaborators see who else has the board open.
export async function POST(request: Request) {
    const session = await getSession() as any;
    if (!session) return unauthorized();

    const form = new URLSearchParams(await request.text());
    const socketId = form.get('socket_id') || '';
    const channel = form.get('channel_name') || '';

    if (!socketId || !channel.startsWith(PREFIX)) {
        return badRequest('Canal no válido');
    }

    const dashboardId = channel.slice(PREFIX.length);

    const client = await pool.connect();
    try {
        if (!(await canAccessDashboard(client, session, dashboardId))) {
            return forbidden('Sin acceso a este tablero');
        }
    } finally {
        client.release();
    }

    const authResponse = pusherServer.authorizeChannel(socketId, channel, {
        user_id: String(session.id),
        user_info: {
            name: session.name || session.email || 'Usuario',
            email: session.email || '',
        },
    });
    return NextResponse.json(authResponse);
}
