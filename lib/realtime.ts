// Realtime fan-out for dashboards, backed by Pusher Channels.
//
// A write (task or dashboard change) publishes an 'update' event on the
// dashboard's private channel; every browser with that board open is
// subscribed and refreshes. Pusher handles the connections, so there is
// no self-managed SSE stream or Postgres LISTEN/NOTIFY anymore.
import { pusherServer, dashboardChannel } from '@/lib/pusher-server';

interface RealtimeMetrics {
    publishedEvents: number;
    publishErrors: number;
    lastEventAt: number | null;
}

declare global {
    // eslint-disable-next-line no-var
    var __dashboardRealtimeMetrics: RealtimeMetrics | undefined;
}

function metricsStore(): RealtimeMetrics {
    if (!global.__dashboardRealtimeMetrics) {
        global.__dashboardRealtimeMetrics = { publishedEvents: 0, publishErrors: 0, lastEventAt: null };
    }
    return global.__dashboardRealtimeMetrics;
}

/**
 * Broadcast a realtime update for a dashboard. Awaited by API routes so the
 * Pusher request completes before the serverless function returns.
 */
export async function publishDashboardRealtime(dashboardId: string, event: string): Promise<void> {
    const metrics = metricsStore();
    try {
        await pusherServer.trigger(dashboardChannel(dashboardId), 'update', {
            event,
            ts: Date.now(),
        });
        metrics.publishedEvents += 1;
        metrics.lastEventAt = Date.now();
    } catch (error) {
        metrics.publishErrors += 1;
        console.error('[REALTIME] Pusher trigger failed', error);
    }
}

/** Lightweight metrics for the admin diagnostics endpoint. */
export function getRealtimeMetrics(): RealtimeMetrics {
    return { ...metricsStore() };
}
