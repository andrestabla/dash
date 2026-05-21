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

/** Private channel that carries realtime updates for a single dashboard. */
export function dashboardChannel(dashboardId: string): string {
    return `private-dashboard-${dashboardId}`;
}
