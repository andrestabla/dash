type DashboardListener = (event: string) => void;
import { Client } from 'pg';
import pool from '@/lib/db';

const REALTIME_CHANNEL = 'dashboard_realtime_events';

declare global {
    // eslint-disable-next-line no-var
    var __dashboardRealtimeListeners: Map<string, Set<DashboardListener>> | undefined;
    // eslint-disable-next-line no-var
    var __dashboardRealtimeListenerClient: Client | undefined;
    // eslint-disable-next-line no-var
    var __dashboardRealtimeListenerBootPromise: Promise<void> | undefined;
    // eslint-disable-next-line no-var
    var __dashboardRealtimeConnectionCounts: Map<string, number> | undefined;
    // eslint-disable-next-line no-var
    var __dashboardRealtimeConnections: Map<string, { dashboardId: string; userId: string; openedAt: number }> | undefined;
    // eslint-disable-next-line no-var
    var __dashboardRealtimeMetrics: {
        acceptedConnections: number;
        rejectedConnections: number;
        activeConnections: number;
        publishedEvents: number;
        receivedEvents: number;
        reconnects: number;
        listenerErrors: number;
        lastEventAt: number | null;
    } | undefined;
}

function getStore() {
    if (!global.__dashboardRealtimeListeners) {
        global.__dashboardRealtimeListeners = new Map();
    }
    return global.__dashboardRealtimeListeners;
}

function getConnectionCounts() {
    if (!global.__dashboardRealtimeConnectionCounts) {
        global.__dashboardRealtimeConnectionCounts = new Map();
    }
    return global.__dashboardRealtimeConnectionCounts;
}

function getConnections() {
    if (!global.__dashboardRealtimeConnections) {
        global.__dashboardRealtimeConnections = new Map();
    }
    return global.__dashboardRealtimeConnections;
}

function getMetricsStore() {
    if (!global.__dashboardRealtimeMetrics) {
        global.__dashboardRealtimeMetrics = {
            acceptedConnections: 0,
            rejectedConnections: 0,
            activeConnections: 0,
            publishedEvents: 0,
            receivedEvents: 0,
            reconnects: 0,
            listenerErrors: 0,
            lastEventAt: null
        };
    }
    return global.__dashboardRealtimeMetrics;
}

function dispatchLocal(dashboardId: string, event: string) {
    const store = getStore();
    const listeners = store.get(dashboardId);
    if (!listeners || listeners.size === 0) return;

    listeners.forEach((listener) => {
        try {
            listener(event);
        } catch (error) {
            console.error('[REALTIME] listener callback error', error);
        }
    });
}

function scheduleRealtimeReconnect() {
    getMetricsStore().reconnects += 1;
    global.__dashboardRealtimeListenerClient = undefined;
    global.__dashboardRealtimeListenerBootPromise = undefined;
    setTimeout(() => {
        void ensureRealtimeListener();
    }, 2000);
}

async function ensureRealtimeListener() {
    if (global.__dashboardRealtimeListenerBootPromise) {
        return global.__dashboardRealtimeListenerBootPromise;
    }

    global.__dashboardRealtimeListenerBootPromise = (async () => {
        if (global.__dashboardRealtimeListenerClient) return;
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) return;

        const client = new Client({
            connectionString,
            ssl: {
                rejectUnauthorized: false
            }
        });

        await client.connect();
        await client.query(`LISTEN ${REALTIME_CHANNEL}`);

        client.on('notification', (msg) => {
            if (msg.channel !== REALTIME_CHANNEL || !msg.payload) return;
            try {
                const payload = JSON.parse(msg.payload) as { dashboardId?: string; event?: string };
                if (!payload.dashboardId || !payload.event) return;
                const metrics = getMetricsStore();
                metrics.receivedEvents += 1;
                metrics.lastEventAt = Date.now();
                dispatchLocal(String(payload.dashboardId), String(payload.event));
            } catch (error) {
                console.error('[REALTIME] invalid notify payload', error);
                getMetricsStore().listenerErrors += 1;
            }
        });

        client.on('error', (error) => {
            console.error('[REALTIME] listener error', error);
            getMetricsStore().listenerErrors += 1;
            scheduleRealtimeReconnect();
        });

        client.on('end', () => {
            scheduleRealtimeReconnect();
        });

        global.__dashboardRealtimeListenerClient = client;
    })();

    try {
        await global.__dashboardRealtimeListenerBootPromise;
    } catch (error) {
        console.error('[REALTIME] failed to bootstrap listener', error);
        scheduleRealtimeReconnect();
    }
}

export function subscribeDashboardRealtime(dashboardId: string, listener: DashboardListener) {
    void ensureRealtimeListener();
    const store = getStore();
    const listeners = store.get(dashboardId) ?? new Set<DashboardListener>();
    listeners.add(listener);
    store.set(dashboardId, listeners);

    return () => {
        const current = store.get(dashboardId);
        if (!current) return;
        current.delete(listener);
        if (current.size === 0) {
            store.delete(dashboardId);
        }
    };
}

export function publishDashboardRealtime(dashboardId: string, event: string) {
    const normalizedDashboardId = String(dashboardId);
    const normalizedEvent = String(event);

    // Immediate local delivery on current instance.
    dispatchLocal(normalizedDashboardId, normalizedEvent);
    const metrics = getMetricsStore();
    metrics.publishedEvents += 1;
    metrics.lastEventAt = Date.now();

    // Distributed delivery to all instances via Postgres LISTEN/NOTIFY.
    const payload = JSON.stringify({
        dashboardId: normalizedDashboardId,
        event: normalizedEvent,
        ts: Date.now()
    });

    void pool
        .query('SELECT pg_notify($1, $2)', [REALTIME_CHANNEL, payload])
        .catch((error) => {
            console.error('[REALTIME] publish notify failed', error);
            getMetricsStore().listenerErrors += 1;
        });
}

export function openRealtimeConnection(dashboardId: string, userId: string, maxPerUserPerDashboard = 3) {
    const normalizedDashboardId = String(dashboardId);
    const normalizedUserId = String(userId);
    const key = `${normalizedDashboardId}:${normalizedUserId}`;
    const counts = getConnectionCounts();
    const metrics = getMetricsStore();
    const current = counts.get(key) ?? 0;

    if (current >= maxPerUserPerDashboard) {
        metrics.rejectedConnections += 1;
        return { ok: false as const, reason: 'connection_limit_reached' };
    }

    counts.set(key, current + 1);
    const connectionId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    getConnections().set(connectionId, {
        dashboardId: normalizedDashboardId,
        userId: normalizedUserId,
        openedAt: Date.now()
    });
    metrics.acceptedConnections += 1;
    metrics.activeConnections += 1;

    return { ok: true as const, connectionId };
}

export function closeRealtimeConnection(connectionId: string) {
    const connections = getConnections();
    const metadata = connections.get(connectionId);
    if (!metadata) return;
    connections.delete(connectionId);

    const key = `${metadata.dashboardId}:${metadata.userId}`;
    const counts = getConnectionCounts();
    const current = counts.get(key) ?? 0;
    if (current <= 1) {
        counts.delete(key);
    } else {
        counts.set(key, current - 1);
    }

    const metrics = getMetricsStore();
    metrics.activeConnections = Math.max(0, metrics.activeConnections - 1);
}

export function getRealtimeMetrics() {
    const metrics = getMetricsStore();
    const listenersByDashboard = Array.from(getStore().entries()).map(([dashboardId, listeners]) => ({
        dashboardId,
        listeners: listeners.size
    }));

    return {
        ...metrics,
        listenersByDashboard,
        trackedConnections: getConnections().size
    };
}
