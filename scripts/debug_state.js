const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function debug() {
    const client = await pool.connect();
    try {
        console.log('--- SYSTEM SETTINGS ---');
        const settings = await client.query('SELECT * FROM system_settings');
        console.table(settings.rows);

        console.log('\n--- DASHBOARDS ---');
        const dashboards = await client.query('SELECT id, name, is_demo, owner_id FROM dashboards');
        console.table(dashboards.rows);

        console.log('\n--- FOLDERS ---');
        const folders = await client.query('SELECT id, name, owner_id FROM folders');
        console.table(folders.rows);

        console.log('\n--- USERS ---');
        const users = await client.query('SELECT id, email, role FROM users');
        console.table(users.rows);

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

debug();
