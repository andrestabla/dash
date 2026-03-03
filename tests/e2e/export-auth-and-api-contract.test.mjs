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
    throw new Error('DATABASE_URL is required for E2E tests');
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

let serverProcess = null;
const fixture = {
    email: '',
    password: '',
    userId: '',
    folderId: '',
    dashboardId: '',
};

async function waitForServer() {
    for (let i = 0; i < 60; i += 1) {
        try {
            const res = await fetch(`${BASE_URL}/api/health`);
            if (res.ok) return;
        } catch {
            // Server is still starting.
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

    serverProcess.stdout?.on('data', () => {});
    serverProcess.stderr?.on('data', () => {});

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

async function setupFixture() {
    const suffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    fixture.email = `e2e_export_${suffix}@example.com`;
    fixture.password = `E2E_${suffix}_Pwd123`;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const hashed = await bcrypt.hash(fixture.password, 10);
        const userRes = await client.query(
            `
                INSERT INTO users (email, password, name, status, role)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id
            `,
            [fixture.email, hashed, 'E2E Export User', 'active', 'user']
        );
        fixture.userId = userRes.rows[0].id;

        const folderRes = await client.query(
            `
                INSERT INTO folders (name, parent_id, icon, color, owner_id)
                VALUES ($1, NULL, $2, $3, $4)
                RETURNING id
            `,
            [`E2E Folder ${suffix}`, '📁', '#3b82f6', fixture.userId]
        );
        fixture.folderId = folderRes.rows[0].id;

        const dashboardRes = await client.query(
            `
                INSERT INTO dashboards (name, description, settings, folder_id, owner_id, is_demo)
                VALUES ($1, $2, $3, $4, $5, FALSE)
                RETURNING id
            `,
            [
                `E2E Dashboard ${suffix}`,
                'Export fixture dashboard',
                { statuses: [{ id: 'todo', name: 'Pendiente' }] },
                fixture.folderId,
                fixture.userId,
            ]
        );
        fixture.dashboardId = dashboardRes.rows[0].id;

        await client.query(
            `
                INSERT INTO tasks (dashboard_id, name, status, owner, week, type, prio, gate, due, description)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            `,
            [
                fixture.dashboardId,
                'Tarea E2E Export',
                'todo',
                'QA User',
                'W1',
                'General',
                'med',
                'A',
                '2026-03-15',
                'Fila de prueba para exportación',
            ]
        );

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
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
            await client.query('DELETE FROM folder_collaborators WHERE folder_id = $1', [fixture.folderId]);
            await client.query('DELETE FROM folders WHERE id = $1', [fixture.folderId]);
        }

        if (fixture.userId) {
            await client.query('DELETE FROM login_attempts WHERE email = $1', [fixture.email.toLowerCase()]);
            await client.query('DELETE FROM users WHERE id = $1', [fixture.userId]);
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function loginAndGetSessionCookie() {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: fixture.email,
            password: fixture.password,
        }),
    });

    assert.equal(loginRes.status, 200, `Login failed: ${await loginRes.text()}`);

    const setCookieHeader = loginRes.headers.get('set-cookie');
    assert.ok(setCookieHeader, 'Expected Set-Cookie header after login');

    const sessionCookie = setCookieHeader.split(';')[0];
    assert.match(sessionCookie, /^session=/, 'Expected session cookie');
    return sessionCookie;
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

test('exporta dashboard autenticado en CSV', { timeout: 30_000 }, async () => {
    const sessionCookie = await loginAndGetSessionCookie();
    const res = await fetch(
        `${BASE_URL}/api/export?id=${fixture.dashboardId}&type=dashboard`,
        {
            headers: { Cookie: sessionCookie },
            redirect: 'manual',
        }
    );

    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /text\/csv/i);
    assert.match(res.headers.get('content-disposition') || '', /\.csv/i);

    const csv = await res.text();
    assert.match(csv, /Semana,Tarea \/ Hito,Estado,Responsable/i);
    assert.match(csv, /Tarea E2E Export/i);
    assert.match(csv, /Pendiente/i);
});

test('exporta carpeta autenticada en CSV con columna Proyecto', { timeout: 30_000 }, async () => {
    const sessionCookie = await loginAndGetSessionCookie();
    const res = await fetch(
        `${BASE_URL}/api/export?id=${fixture.folderId}&type=folder`,
        {
            headers: { Cookie: sessionCookie },
            redirect: 'manual',
        }
    );

    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type') || '', /text\/csv/i);

    const csv = await res.text();
    assert.match(csv, /Proyecto,Semana,Tarea \/ Hito,Estado/i);
    assert.match(csv, /E2E Dashboard/i);
    assert.match(csv, /Tarea E2E Export/i);
});

test('contrato móvil/API sin autenticación devuelve 401 JSON y no HTML', { timeout: 30_000 }, async () => {
    const paths = [
        '/api/tasks',
        '/api/dashboards',
        `/api/export?id=${fixture.dashboardId}&type=dashboard`,
    ];

    for (const path of paths) {
        const res = await fetch(`${BASE_URL}${path}`, { redirect: 'manual' });
        const contentType = res.headers.get('content-type') || '';
        const body = await res.text();

        assert.equal(res.status, 401, `Expected 401 for ${path}`);
        assert.match(contentType, /application\/json/i, `Expected JSON for ${path}`);
        assert.doesNotMatch(body, /<!DOCTYPE html>|<html/i, `Expected non-HTML response for ${path}`);

        const parsed = JSON.parse(body);
        assert.equal(typeof parsed.error, 'string');
    }
});
