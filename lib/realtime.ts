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
}

function getStore() {
    if (!global.__dashboardRealtimeListeners) {
        global.__dashboardRealtimeListeners = new Map();
    }
    return global.__dashboardRealtimeListeners;
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
                dispatchLocal(String(payload.dashboardId), String(payload.event));
            } catch (error) {
                console.error('[REALTIME] invalid notify payload', error);
            }
        });

        client.on('error', (error) => {
            console.error('[REALTIME] listener error', error);
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
        });
}
