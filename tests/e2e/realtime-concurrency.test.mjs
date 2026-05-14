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
    folderId: '',
    dashboardId: '',
    collaboratorCookie: '',
};

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

async function setupFixture() {
    const suffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    fixture.owner.email = `e2e_rt_owner_${suffix}@example.com`;
    fixture.owner.password = `Owner_${suffix}_Pwd123`;
    fixture.collaborator.email = `e2e_rt_collab_${suffix}@example.com`;
    fixture.collaborator.password = `Collab_${suffix}_Pwd123`;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const ownerHash = await bcrypt.hash(fixture.owner.password, 10);
        const collabHash = await bcrypt.hash(fixture.collaborator.password, 10);

        const ownerRes = await client.query(
            `INSERT INTO users (email, password, name, status, role, accepted_privacy_policy)
             VALUES ($1, $2, $3, 'active', 'user', TRUE)
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

    fixture.collaboratorCookie = await loginAndGetCookie(fixture.collaborator.email, fixture.collaborator.password);
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
        if (fixture.owner.id) {
            await client.query('DELETE FROM login_attempts WHERE email = $1', [fixture.owner.email.toLowerCase()]);
            await client.query('DELETE FROM users WHERE id = $1', [fixture.owner.id]);
        }
        if (fixture.collaborator.id) {
            await client.query('DELETE FROM login_attempts WHERE email = $1', [fixture.collaborator.email.toLowerCase()]);
            await client.query('DELETE FROM users WHERE id = $1', [fixture.collaborator.id]);
        }
        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

function waitForRealtimeUpdateEvent(stream, timeoutMs = 12000) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            reader.cancel().catch(() => {});
            reject(new Error('Timed out waiting for realtime update event'));
        }, timeoutMs);

        const readLoop = async () => {
            try {
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    buffer += decoder.decode(value, { stream: true });

                    const chunks = buffer.split('\n\n');
                    buffer = chunks.pop() || '';
                    for (const chunk of chunks) {
                        const eventMatch = chunk.match(/event:\s*(.+)/);
                        const dataMatch = chunk.match(/data:\s*(.+)/);
                        const eventName = eventMatch?.[1]?.trim();
                        const dataJson = dataMatch?.[1];
                        if (!eventName || !dataJson) continue;
                        let data = null;
                        try {
                            data = JSON.parse(dataJson);
                        } catch {
                            continue;
                        }
                        if (eventName === 'update' && data?.event === 'tasks_changed') {
                            clearTimeout(timeout);
                            reader.cancel().catch(() => {});
                            resolve(data);
                            return;
                        }
                    }
                }
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        };

        void readLoop();
    });
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

test('propaga cambios de tareas en tiempo real entre dos usuarios del mismo tablero', { timeout: 30_000 }, async () => {
    const ownerCookie = await loginAndGetCookie(fixture.owner.email, fixture.owner.password);
    const controller = new AbortController();

    const sseRes = await fetch(`${BASE_URL}/api/realtime/dashboard/${fixture.dashboardId}`, {
        headers: {
            Cookie: fixture.collaboratorCookie,
            Accept: 'text/event-stream',
        },
        signal: controller.signal
    });
    assert.equal(sseRes.status, 200, `Unexpected SSE status: ${sseRes.status}`);
    assert.ok(sseRes.body, 'Expected SSE response body');

    const eventPromise = waitForRealtimeUpdateEvent(sseRes.body).finally(() => {
        controller.abort();
    });

    const createTaskRes = await fetch(`${BASE_URL}/api/tasks`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Cookie: ownerCookie
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
            dashboard_id: fixture.dashboardId
        })
    });
    assert.equal(createTaskRes.status, 201, `Task creation failed: ${await createTaskRes.text()}`);

    const updateData = await eventPromise;
    assert.equal(updateData.dashboardId, fixture.dashboardId);
    assert.equal(updateData.event, 'tasks_changed');
});
