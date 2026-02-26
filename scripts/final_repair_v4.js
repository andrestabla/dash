const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
});

async function run() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting Comprehensive Schema Repair & Orphan Cleanup...');

        await client.query('BEGIN');

        const dependentTables = [
            'tasks',
            'dashboard_collaborators',
            'dashboard_messages',
            'dashboard_user_permissions'
        ];

        // 1. DROP known constraints
        const constraintsToDrop = [
            { table: 'tasks', name: 'tasks_dashboard_id_fkey' },
            { table: 'tasks', name: 'fk_tasks_dashboard' },
            { table: 'dashboard_collaborators', name: 'dashboard_collaborators_dashboard_id_fkey' },
            { table: 'dashboard_collaborators', name: 'fk_dashboard_collaborators_dashboard' },
            { table: 'dashboard_messages', name: 'dashboard_messages_dashboard_id_fkey' },
            { table: 'dashboard_user_permissions', name: 'dashboard_user_permissions_dashboard_id_fkey' }
        ];

        for (const c of constraintsToDrop) {
            await client.query(`ALTER TABLE ${c.table} DROP CONSTRAINT IF EXISTS ${c.name}`);
        }

        // 2. PURGE ORPHANS based on current string comparison
        for (const table of dependentTables) {
            console.log(`🧹 Purging orphans from ${table}...`);
            await client.query(`
                DELETE FROM ${table} t
                WHERE NOT EXISTS (SELECT 1 FROM dashboards d WHERE d.id::text = t.dashboard_id::text)
            `);
        }

        // 3. CONVERT COLUMNS
        console.log('🔄 Converting dashboards.id to UUID...');
        await client.query(`ALTER TABLE dashboards ALTER COLUMN id TYPE UUID USING id::UUID`);

        for (const table of dependentTables) {
            console.log(`🔄 Converting ${table}.dashboard_id to UUID...`);
            await client.query(`ALTER TABLE ${table} ALTER COLUMN dashboard_id TYPE UUID USING dashboard_id::UUID`);
        }

        // 4. RECREATE CONSTRAINTS with CASCADE DELETE
        for (const table of dependentTables) {
            console.log(`🔗 Adding Foreign Key to ${table}...`);
            await client.query(`
                ALTER TABLE ${table} 
                ADD CONSTRAINT fk_${table}_dashboard_vfinal
                FOREIGN KEY (dashboard_id) 
                REFERENCES dashboards(id) 
                ON DELETE CASCADE
            `);
        }

        // 5. Update SSO Authority
        console.log('⚙️  Standardizing SSO Configuration...');
        await client.query(`
            INSERT INTO system_settings (key, value, description)
            VALUES 
                ('sso_authority', 'https://accounts.google.com', 'Google SSO Authority'),
                ('sso_platform', 'google', 'Current SSO Platform'),
                ('sso_enabled', 'true', 'SSO Status')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `);

        await client.query('COMMIT');
        console.log('✅ DATABASE REPAIRED SUCCESSFULLY');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ REPAIR FAILED:', e.message);
        if (e.detail) console.error('Detail:', e.detail);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
