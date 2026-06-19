"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const IDLE_LIMIT_MS = 60 * 60 * 1000; // 1 hour
const LAST_ACTIVITY_KEY = "auth:last-activity";
const STORAGE_THROTTLE_MS = 30_000;

// Routes that never require authentication. We don't even probe /api/auth/me
// on these; the watcher is dormant.
const SKIP_PREFIXES = ["/login", "/register", "/public/", "/onboarding"];

// Cached result of the auth probe for the lifetime of this app session.
// Re-probing on every pathname change paid a cold-start tax on every
// internal navigation; once we know the user is authed, we trust it until
// the next hard reload (logout / inactivity logout / user navigating away).
let cachedAuthed: boolean | null = null;

export default function InactivityWatcher() {
    const pathname = usePathname();
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (!pathname) return;
        if (SKIP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix))) return;

        let cancelled = false;
        let lastWriteAt = 0;

        const clearTimer = () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };

        const readLastActivity = (): number => {
            try {
                const raw = window.localStorage.getItem(LAST_ACTIVITY_KEY);
                const n = Number(raw);
                return Number.isFinite(n) && n > 0 ? n : Date.now();
            } catch {
                return Date.now();
            }
        };

        const writeLastActivity = (ts: number) => {
            try {
                window.localStorage.setItem(LAST_ACTIVITY_KEY, String(ts));
            } catch {
                // Storage may be unavailable (private mode); fall back to in-memory tracking.
            }
        };

        const performLogout = async () => {
            if (cancelled) return;
            clearTimer();
            cachedAuthed = null;
            try {
                await fetch("/api/auth/logout", { method: "POST" });
            } catch {
                // ignore — we redirect regardless so a stale cookie still lands on /login
            }
            try {
                window.localStorage.removeItem(LAST_ACTIVITY_KEY);
            } catch {
                // ignore
            }
            window.location.href = "/login?reason=inactivity";
        };

        const armTimer = () => {
            if (cancelled) return;
            clearTimer();
            const elapsed = Date.now() - readLastActivity();
            if (elapsed >= IDLE_LIMIT_MS) {
                void performLogout();
                return;
            }
            timerRef.current = setTimeout(armTimer, IDLE_LIMIT_MS - elapsed);
        };

        const recordActivity = () => {
            if (cancelled) return;
            const now = Date.now();
            if (now - lastWriteAt < STORAGE_THROTTLE_MS) return;
            lastWriteAt = now;
            writeLastActivity(now);
            // No need to rearm — the existing timer wakes up after IDLE_LIMIT_MS
            // and reads the latest activity to decide.
        };

        const onStorage = (event: StorageEvent) => {
            if (event.key === LAST_ACTIVITY_KEY) {
                // Another tab recorded activity — rearm to its later timestamp.
                armTimer();
            }
        };

        const onVisibility = () => {
            if (document.visibilityState === "visible") {
                // Browsers throttle background timers; on return to foreground
                // we re-check immediately so a quietly expired session doesn't
                // linger on screen.
                armTimer();
            }
        };

        const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"] as const;

        // Probe the session before we attach anything. If the user isn't
        // authenticated (e.g. mid-page after their cookie expired) we let the
        // ordinary 401 redirects do their job and don't compete. The probe
        // result is cached at module scope so internal navigations don't pay
        // a fresh /api/auth/me round trip every time.
        void (async () => {
            let authed = cachedAuthed;
            if (authed === null) {
                try {
                    const res = await fetch("/api/auth/me", { cache: "no-store" });
                    if (res.ok) {
                        const body = await res.json().catch(() => null);
                        authed = !!(body && body.user);
                    } else {
                        authed = false;
                    }
                } catch {
                    authed = false;
                }
                cachedAuthed = authed;
            }
            if (cancelled || !authed) return;

            // First visit in this browser — seed the activity timestamp so we
            // measure from now rather than treating a fresh login as already
            // idle.
            try {
                if (!window.localStorage.getItem(LAST_ACTIVITY_KEY)) {
                    writeLastActivity(Date.now());
                }
            } catch {
                // ignore
            }

            events.forEach((ev) => document.addEventListener(ev, recordActivity, { passive: true }));
            window.addEventListener("storage", onStorage);
            document.addEventListener("visibilitychange", onVisibility);
            armTimer();
        })();

        return () => {
            cancelled = true;
            clearTimer();
            events.forEach((ev) => document.removeEventListener(ev, recordActivity));
            window.removeEventListener("storage", onStorage);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, [pathname]);

    return null;
}
