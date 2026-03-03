import assert from 'node:assert/strict';
import { config as loadEnv } from 'dotenv';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

loadEnv({ path: '.env.local' });

const BASE_URL = process.env.SMOKE_BASE_URL || 'https://misproyectos.com.co';
if (BASE_URL.includes('misproyectos.com.co') && process.env.CONFIRM_REMOTE_SMOKE !== 'YES') {
  throw new Error(
    'Refusing to run against production without CONFIRM_REMOTE_SMOKE=YES'
  );
}
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const fixture = {
  email: '',
  password: '',
  userId: '',
  folderId: '',
  dashboardId: '',
  taskId: '',
};

async function setupFixture() {
  const suffix = `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
  fixture.email = `prod_smoke_${suffix}@example.com`;
  fixture.password = `ProdSmoke_${suffix}_Pwd123`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const hasAcceptedPolicy = await client.query(`
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'accepted_privacy_policy'
      LIMIT 1
    `);

    const hashed = await bcrypt.hash(fixture.password, 10);

    let userRes;
    if (hasAcceptedPolicy.rows.length > 0) {
      userRes = await client.query(
        `
          INSERT INTO users (email, password, name, status, role, accepted_privacy_policy)
          VALUES ($1, $2, $3, $4, $5, TRUE)
          RETURNING id
        `,
        [fixture.email, hashed, 'Prod Smoke User', 'active', 'user']
      );
    } else {
      userRes = await client.query(
        `
          INSERT INTO users (email, password, name, status, role)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `,
        [fixture.email, hashed, 'Prod Smoke User', 'active', 'user']
      );
    }

    fixture.userId = userRes.rows[0].id;

    const folderRes = await client.query(
      `
        INSERT INTO folders (name, parent_id, icon, color, owner_id)
        VALUES ($1, NULL, $2, $3, $4)
        RETURNING id
      `,
      [`Prod Smoke Folder ${suffix}`, '📁', '#3b82f6', fixture.userId]
    );
    fixture.folderId = folderRes.rows[0].id;

    const settings = {
      statuses: [
        { id: 'todo', name: 'Pendiente', color: '#64748b' },
        { id: 'doing', name: 'En Progreso', color: '#3b82f6' },
        { id: 'done', name: 'Completado', color: '#10b981' },
      ],
      weeks: [{ id: 'W1', name: 'W1' }],
      owners: ['QA'],
    };

    const dashboardRes = await client.query(
      `
        INSERT INTO dashboards (name, description, settings, folder_id, owner_id, is_demo)
        VALUES ($1, $2, $3, $4, $5, FALSE)
        RETURNING id
      `,
      [`Prod Smoke Dashboard ${suffix}`, 'Smoke testing dashboard', settings, fixture.folderId, fixture.userId]
    );
    fixture.dashboardId = dashboardRes.rows[0].id;

    const taskRes = await client.query(
      `
        INSERT INTO tasks (dashboard_id, name, status, owner, week, type, prio, gate, due, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `,
      [
        fixture.dashboardId,
        'Tarea Smoke Persistencia',
        'todo',
        'QA',
        'W1',
        'General',
        'med',
        'A',
        '2026-12-31',
        'Tarea para validar persistencia de movimiento',
      ]
    );
    fixture.taskId = taskRes.rows[0].id;

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

async function loginAndGetCookie() {
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: fixture.email, password: fixture.password }),
  });

  if (loginRes.status !== 200) {
    throw new Error(`Login failed (${loginRes.status}): ${await loginRes.text()}`);
  }

  const setCookie = loginRes.headers.get('set-cookie');
  assert.ok(setCookie, 'Missing Set-Cookie on login');
  return setCookie.split(';')[0];
}

async function run() {
  console.log(`Smoke base URL: ${BASE_URL}`);
  console.log('1) Creating production smoke fixture...');
  await setupFixture();

  try {
    console.log('2) Authenticating against production...');
    const cookie = await loginAndGetCookie();

    console.log('3) Moving task status todo -> done via API...');
    const moveRes = await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookie,
      },
      body: JSON.stringify({
        id: fixture.taskId,
        week: 'W1',
        name: 'Tarea Smoke Persistencia',
        status: 'done',
        owner: 'QA',
        type: 'General',
        prio: 'med',
        gate: 'A',
        due: '2026-12-31',
        desc: 'Tarea para validar persistencia de movimiento',
        dashboard_id: fixture.dashboardId,
      }),
    });

    if (moveRes.status !== 201) {
      throw new Error(`Task move save failed (${moveRes.status}): ${await moveRes.text()}`);
    }

    console.log('4) Validating persistence from API + DB...');
    const tasksRes = await fetch(`${BASE_URL}/api/tasks?dashboardId=${fixture.dashboardId}`, {
      headers: { Cookie: cookie },
    });
    if (tasksRes.status !== 200) {
      throw new Error(`Task fetch failed (${tasksRes.status}): ${await tasksRes.text()}`);
    }

    const tasks = await tasksRes.json();
    const moved = tasks.find((t) => String(t.id) === String(fixture.taskId));
    assert.ok(moved, 'Moved task not found in API response');
    assert.equal(moved.status, 'done', 'Task status did not persist in API response');

    const dbCheck = await pool.query('SELECT status FROM tasks WHERE id = $1', [fixture.taskId]);
    assert.equal(dbCheck.rows[0]?.status, 'done', 'Task status did not persist in database');

    console.log('5) Validating authenticated export (dashboard + folder)...');
    const exportDashboard = await fetch(
      `${BASE_URL}/api/export?id=${fixture.dashboardId}&type=dashboard`,
      { headers: { Cookie: cookie } }
    );
    if (exportDashboard.status !== 200) {
      throw new Error(`Dashboard export failed (${exportDashboard.status}): ${await exportDashboard.text()}`);
    }
    const csvDashboard = await exportDashboard.text();
    assert.match(csvDashboard, /Tarea Smoke Persistencia/i);
    assert.match(csvDashboard, /Completado/i);

    const exportFolder = await fetch(
      `${BASE_URL}/api/export?id=${fixture.folderId}&type=folder`,
      { headers: { Cookie: cookie } }
    );
    if (exportFolder.status !== 200) {
      throw new Error(`Folder export failed (${exportFolder.status}): ${await exportFolder.text()}`);
    }
    const csvFolder = await exportFolder.text();
    assert.match(csvFolder, /Proyecto,Semana,Tarea \/ Hito,Estado/i);
    assert.match(csvFolder, /Prod Smoke Dashboard/i);

    console.log('6) Validating unauthenticated contract for mobile...');
    const unauthRes = await fetch(`${BASE_URL}/api/tasks`);
    assert.equal(unauthRes.status, 401, `Expected 401 unauth /api/tasks, got ${unauthRes.status}`);
    const ct = unauthRes.headers.get('content-type') || '';
    assert.match(ct, /application\/json/i, `Expected JSON content-type, got ${ct}`);

    console.log('✅ Production smoke test passed.');
  } finally {
    console.log('7) Cleaning up fixture data...');
    await cleanupFixture();
  }
}

run()
  .catch(async (error) => {
    console.error('❌ Production smoke test failed:', error);
    try {
      await cleanupFixture();
    } catch {
      // ignore secondary cleanup errors
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
