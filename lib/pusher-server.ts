// Server-side Pusher Channels client.
// Used to broadcast realtime updates to the dashboards a user has open.
import Pusher from 'pusher';

export const pusherServer = new Pusher({
    appId: process.env.PUSHER_APP_ID || '',
    key: process.env.PUSHER_KEY || process.env.NEXT_PUBLIC_PUSHER_KEY || '',
    secret: process.env.PUSHER_SECRET || '',
    cluster: process.env.PUSHER_CLUSTER || process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
    useTLS: true,
});

/**
 * Presence channel for a single dashboard. It carries the realtime 'update'
 * events and, being a presence channel, also tracks which users currently
 * have the board open so collaborators can see each other live.
 */
export function dashboardChannel(dashboardId: string): string {
    return `presence-dashboard-${dashboardId}`;
}
