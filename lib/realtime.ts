type DashboardListener = (event: string) => void;

declare global {
    // eslint-disable-next-line no-var
    var __dashboardRealtimeListeners: Map<string, Set<DashboardListener>> | undefined;
}

function getStore() {
    if (!global.__dashboardRealtimeListeners) {
        global.__dashboardRealtimeListeners = new Map();
    }
    return global.__dashboardRealtimeListeners;
}

export function subscribeDashboardRealtime(dashboardId: string, listener: DashboardListener) {
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
    const store = getStore();
    const listeners = store.get(dashboardId);
    if (!listeners || listeners.size === 0) return;

    listeners.forEach((listener) => {
        try {
            listener(event);
        } catch (error) {
            console.error('[REALTIME] listener error', error);
        }
    });
}
