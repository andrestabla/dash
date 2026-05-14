# Realtime Operations Runbook

## Scope
This runbook covers dashboard realtime updates powered by:
- Server-Sent Events endpoint: `/api/realtime/dashboard/[id]`
- Event fanout: `PostgreSQL LISTEN/NOTIFY` channel `dashboard_realtime_events`
- Fallback sync: periodic client polling

## Fast Health Check
1. API health:
```bash
curl -s https://misproyectos.com.co/api/health
```
Expected: `{"status":"ok","database":"reachable",...}`

2. Realtime metrics (admin session required):
```bash
curl -s https://misproyectos.com.co/api/admin/realtime/metrics
```
Expected:
- `status: "ok"`
- `activeConnections >= 0`
- `publishedEvents` increments when tasks/settings change
- `receivedEvents` increments across instances

## Realtime Incident Triage
1. Confirm users can still read/write tasks through REST (`/api/tasks`).
2. Check `/api/admin/realtime/metrics`:
- High `listenerErrors`: inspect runtime logs for DB connectivity.
- High `reconnects`: unstable DB listener or network.
- High `rejectedConnections`: per-user SSE limit reached (likely duplicate tabs/connections).
3. Validate event flow manually:
- Open two sessions on same dashboard.
- Update/create task in session A.
- Confirm session B reflects update immediately.

## Failure Modes and Actions
1. `LISTEN/NOTIFY` propagation degraded:
- Symptom: local updates visible only on same instance.
- Action: restart deployment (forces new listeners), verify DB reachability.
- Fallback: client polling continues to converge state.

2. SSE disconnect storms:
- Symptom: frequent reconnects in metrics.
- Action: check edge/runtime logs, verify no aggressive proxy idle timeout changes.

3. Connection limit rejections:
- Symptom: `429` on realtime endpoint.
- Action: close duplicate tabs or increase limit in `openRealtimeConnection(..., maxPerUserPerDashboard)`.

## Safety Limits (current)
- Max SSE connections per user+dashboard: `3`
- Server-side forced SSE lifetime: `2 minutes` (client auto-reconnects)
- Heartbeat interval: `25s`

## Regression Test
Run:
```bash
npm run test:e2e:realtime
```
This verifies two users on one dashboard receive realtime task updates.
