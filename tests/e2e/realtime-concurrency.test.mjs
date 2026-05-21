import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import test, { after, before } from 'node:test';

import bcrypt from 'bcryptjs';
import { config as loadEnv } from 'dotenv';
import { Pool } from 'pg';

loadEnv({ path: '.env.local' });

const E2E_PORT = Number(process.env.E2E_PORT || 4022);
const BASE_URL = process.env.E2E_BASE_URL || `http://127.0.0.1:${E2E_PORT}`;
const USE_EXTERNAL_BASE = Boolean(process.env.E2E_BASE_URL);

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required for realtime E2E tests');
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

let serverProcess = null;
const fixture = {
    owner: { email: '', password: '', id: '' },
    collaborator: { email: '', password: '', id: '' },
    outsider: { email: '', password: '', id: '' },
    folderId: '',
    dashboardId: '',
    ownerCookie: '',
    collaboratorCookie: '',
    outsiderCookie: '',
};

// A syntactically valid Pusher socket id (the auth endpoint only signs it).
const FAKE_SOCKET_ID = '123456.7891011';

async function waitForServer() {
    for (let i = 0; i < 60; i += 1) {
        if (serverProcess && serverProcess.exitCode !== null) {
            throw new Error(`Server exited before readiness (code=${serverProcess.exitCode})`);
        }
        try {
            const res = await fetch(`${BASE_URL}/api/health`);
            if (res.ok) return;
        } catch {
            // Server still booting.
        }
        await sleep(500);
    }
    throw new Error(`Server did not become ready at ${BASE_URL}`);
}

async function startServer() {
    if (USE_EXTERNAL_BASE) {
        await waitForServer();
        return;
    }
    serverProcess = spawn('npm', ['run', 'start'], {
        cwd: process.cwd(),
        env: {
            ...process.env,
            PORT: String(E2E_PORT),
            JWT_SECRET: process.env.JWT_SECRET || 'e2e-local-jwt-secret',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    await waitForServer();
}

async function stopServer() {
    if (!serverProcess) return;
    serverProcess.kill('SIGINT');
    await new Promise((resolve) => {
        serverProcess?.on('exit', resolve);
        setTimeout(resolve, 4000);
    });
}

async function loginAndGetCookie(email, password) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    assert.equal(res.status, 200, `Login failed: ${await res.text()}`);
    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie, 'Expected Set-Cookie header');
    return setCookie.split(';')[0];
}

// POST a Pusher private-channel authorization request, mirroring pusher-js.
async function requestChannelAuth(channelName, cookie) {
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (cookie) headers.Cookie = cookie;
    return fetch(`${BASE_URL}/api/pusher/auth`, {
        method: 'POST',
        headers,
        body: new URLSearchParams({
            socket_id: FAKE_SOCKET_ID,
            channel_name: channelName,
        }).toString(),
    });
}

async function getRealtimeMetrics(cookie) {
    const res = await fetch(`${BASE_URL}/api/admin/realtime/metrics`, {
        headers: { Cookie: cookie },
    });
    const text = await res.text();
    assert.equal(res.status, 200, `Metrics fetch failed: ${text}`);
    const body = JSON.parse(text);
    assert.ok(body.realtime, 'Expected realtime metrics payload');
    return body.realtime;
}

async function setupFixture() {
    const suffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    fixture.owner.email = `e2e_rt_owner_${suffix}@example.com`;
    fixture.owner.password = `Owner_${suffix}_Pwd123`;
    fixture.collaborator.email = `e2e_rt_collab_${suffix}@example.com`;
    fixture.collaborator.password = `Collab_${suffix}_Pwd123`;
    fixture.outsider.email = `e2e_rt_outsider_${suffix}@example.com`;
    fixture.outsider.password = `Outsider_${suffix}_Pwd123`;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const ownerHash = await bcrypt.hash(fixture.owner.password, 10);
        const collabHash = await bcrypt.hash(fixture.collaborator.password, 10);
        const outsiderHash = await bcrypt.hash(fixture.outsider.password, 10);

        // Owner is an admin so the test can read the realtime metrics endpoint.
        const ownerRes = await client.query(
            `INSERT INTO users (email, password, name, status, role, accepted_privacy_policy)
             VALUES ($1, $2, $3, 'active', 'admin', TRUE)
             RETURNING id`,
            [fixture.owner.email, ownerHash, 'RT Owner']
        );
        fixture.owner.id = ownerRes.rows[0].id;

        const collabRes = await client.query(
            `INSERT INTO users (email, password, name, status, role, accepted_privacy_policy)
             VALUES ($1, $2, $3, 'active', 'user', TRUE)
             RETURNING id`,
            [fixture.collaborator.email, collabHash, 'RT Collaborator']
        );
        fixture.collaborator.id = collabRes.rows[0].id;

        const outsiderRes = await client.query(
            `INSERT INTO users (email, password, name, status, role, accepted_privacy_policy)
             VALUES ($1, $2, $3, 'active', 'user', TRUE)
             RETURNING id`,
            [fixture.outsider.email, outsiderHash, 'RT Outsider']
        );
        fixture.outsider.id = outsiderRes.rows[0].id;

        const folderRes = await client.query(
            `INSERT INTO folders (name, owner_id)
             VALUES ($1, $2)
             RETURNING id`,
            [`RT Folder ${suffix}`, fixture.owner.id]
        );
        fixture.folderId = folderRes.rows[0].id;

        const dashboardRes = await client.query(
            `INSERT INTO dashboards (name, description, settings, folder_id, owner_id, is_demo)
             VALUES ($1, $2, $3, $4, $5, FALSE)
             RETURNING id`,
            [
                `RT Dashboard ${suffix}`,
                'Realtime test dashboard',
                { statuses: [{ id: 'todo', name: 'Pendiente' }] },
                fixture.folderId,
                fixture.owner.id,
            ]
        );
        fixture.dashboardId = dashboardRes.rows[0].id;

        await client.query(
            `INSERT INTO dashboard_user_permissions (dashboard_id, user_id, role)
             VALUES ($1, $2, 'editor')`,
            [fixture.dashboardId, fixture.collaborator.id]
        );

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }

    fixture.ownerCookie = await loginAndGetCookie(fixture.owner.email, fixture.owner.password);
    fixture.collaboratorCookie = await loginAndGetCookie(fixture.collaborator.email, fixture.collaborator.password);
    fixture.outsiderCookie = await loginAndGetCookie(fixture.outsider.email, fixture.outsider.password);
}

async function cleanupFixture() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        if (fixture.dashboardId) {
            await client.query('DELETE FROM tasks WHERE dashboard_id = $1', [fixture.dashboardId]);
            await client.query('DELETE FROM dashboard_user_permissions WHERE dashboard_id = $1', [fixture.dashboardId]);
            await client.query('DELETE FROM dashboards WHERE id = $1', [fixture.dashboardId]);
        }
        if (fixture.folderId) {
            await client.query('DELETE FROM folders WHERE id = $1', [fixture.folderId]);
        }
        for (const account of [fixture.owner, fixture.collaborator, fixture.outsider]) {
            if (!account.id) continue;
            await client.query('DELETE FROM login_attempts WHERE email = $1', [account.email.toLowerCase()]);
            await client.query('DELETE FROM users WHERE id = $1', [account.id]);
        }
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

before(async () => {
    await startServer();
    await setupFixture();
});

after(async () => {
    await cleanupFixture();
    await stopServer();
    await pool.end();
});

test('autoriza la suscripción al canal privado del tablero para usuarios con acceso', async () => {
    const channel = `private-dashboard-${fixture.dashboardId}`;

    const collabRes = await requestChannelAuth(channel, fixture.collaboratorCookie);
    const collabText = await collabRes.text();
    assert.equal(collabRes.status, 200, `Collaborator auth failed: ${collabText}`);
    const collabBody = JSON.parse(collabText);
    assert.ok(typeof collabBody.auth === 'string' && collabBody.auth.includes(':'),
        'Expected a "key:signature" auth token for the collaborator');

    const ownerRes = await requestChannelAuth(channel, fixture.ownerCookie);
    const ownerText = await ownerRes.text();
    assert.equal(ownerRes.status, 200, `Owner auth failed: ${ownerText}`);
    const ownerBody = JSON.parse(ownerText);
    assert.ok(typeof ownerBody.auth === 'string' && ownerBody.auth.includes(':'),
        'Expected a "key:signature" auth token for the owner');
});

test('rechaza la autorización del canal a usuarios sin acceso o sin sesión', async () => {
    const channel = `private-dashboard-${fixture.dashboardId}`;

    // Authenticated, but not a collaborator of this dashboard.
    const outsiderRes = await requestChannelAuth(channel, fixture.outsiderCookie);
    assert.equal(outsiderRes.status, 403, 'Outsider must not be authorized for the channel');

    // No session at all.
    const anonRes = await requestChannelAuth(channel, '');
    assert.equal(anonRes.status, 401, 'Unauthenticated request must be rejected');

    // Authenticated, but a channel name outside the dashboard namespace.
    const badChannelRes = await requestChannelAuth('private-secret-stuff', fixture.collaboratorCookie);
    assert.equal(badChannelRes.status, 400, 'Channel outside the dashboard namespace must be rejected');
});

test('publica un evento realtime en Pusher al crear una tarea', async () => {
    const before = await getRealtimeMetrics(fixture.ownerCookie);

    const createTaskRes = await fetch(`${BASE_URL}/api/tasks`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Cookie: fixture.ownerCookie,
        },
        body: JSON.stringify({
            name: 'Task from owner for realtime',
            status: 'todo',
            week: 'W1',
            owner: 'Owner',
            type: 'General',
            prio: 'med',
            gate: 'A',
            due: '2026-12-01',
            desc: 'Realtime propagation test',
            dashboard_id: fixture.dashboardId,
        }),
    });
    assert.equal(createTaskRes.status, 201, `Task creation failed: ${await createTaskRes.text()}`);

    const after = await getRealtimeMetrics(fixture.ownerCookie);

    // The write path awaits publishDashboardRealtime, so by the time the
    // response returns the Pusher trigger has completed (success or error).
    assert.ok(after.publishedEvents > before.publishedEvents,
        `Expected publishedEvents to grow (before=${before.publishedEvents}, after=${after.publishedEvents})`);
    assert.equal(after.publishErrors, before.publishErrors,
        `Pusher trigger reported an error (before=${before.publishErrors}, after=${after.publishErrors})`);
    assert.ok(typeof after.lastEventAt === 'number' && after.lastEventAt >= before.lastEventAt - 1,
        'Expected lastEventAt to be updated after publishing');
});
