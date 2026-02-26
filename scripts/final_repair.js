const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
});

async function run() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting Final Schema Repair...');

        await client.query('BEGIN');

        // 1. Convert dashboards.id to UUID if it contains valid UUIDs
        // We first need to check if we can do this without breaking foreign keys
        // Since foreign keys are missing, we can convert columns independently

        console.log('🔄 Converting dashboards.id to UUID...');
        await client.query(`
            ALTER TABLE dashboards 
            ALTER COLUMN id TYPE UUID USING id::UUID
        `);

        console.log('🔄 Converting tasks.dashboard_id to UUID...');
        await client.query(`
            ALTER TABLE tasks 
            ALTER COLUMN dashboard_id TYPE UUID USING dashboard_id::UUID
        `);

        console.log('🔄 Converting dashboard_user_permissions.dashboard_id to UUID...');
        await client.query(`
            ALTER TABLE dashboard_user_permissions
            ALTER COLUMN dashboard_id TYPE UUID USING dashboard_id::UUID
        `);

        console.log('🔗 Establishing Foreign Key (tasks -> dashboards) with CASCADE DELETE...');
        await client.query(`
            ALTER TABLE tasks 
            ADD CONSTRAINT fk_tasks_dashboard 
            FOREIGN KEY (dashboard_id) 
            REFERENCES dashboards(id) 
            ON DELETE CASCADE
        `);

        console.log('🔗 Establishing Foreign Key (perms -> dashboards) with CASCADE DELETE...');
        await client.query(`
            ALTER TABLE dashboard_user_permissions
            ADD CONSTRAINT fk_perms_dashboard 
            FOREIGN KEY (dashboard_id) 
            REFERENCES dashboards(id) 
            ON DELETE CASCADE
        `);

        console.log('⚙️  Standardizing SSO Configuration...');
        await client.query(`
            INSERT INTO system_settings (key, value, description)
            VALUES 
                ('sso_authority', 'https://accounts.google.com', 'Google SSO Authority'),
                ('sso_platform', 'google', 'Current SSO Platform')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `);

        await client.query('COMMIT');
        console.log('✅ DATABASE REPAIRED SUCCESSFULLY');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ REPAIR FAILED:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
