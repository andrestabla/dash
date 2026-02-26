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
        console.log('🚀 Starting Deep Schema Repair...');

        await client.query('BEGIN');

        const tablesToUpdate = [
            'tasks',
            'dashboard_collaborators',
            'dashboard_messages',
            'dashboard_user_permissions'
        ];

        // 1. Convert dashboards.id to UUID
        console.log('🔄 Converting dashboards.id to UUID...');
        await client.query(`ALTER TABLE dashboards ALTER COLUMN id TYPE UUID USING id::UUID`);

        // 2. Convert all referencing columns to UUID
        for (const table of tablesToUpdate) {
            console.log(`🔄 Converting ${table}.dashboard_id to UUID...`);
            await client.query(`ALTER TABLE ${table} ALTER COLUMN dashboard_id TYPE UUID USING dashboard_id::UUID`);
        }

        // 3. Establish Foreign Keys with CASCADE DELETE
        for (const table of tablesToUpdate) {
            console.log(`🔗 Adding Foreign Key to ${table}...`);
            const constraintName = `fk_${table}_dashboard_ref`;
            // Drop if exists first to be safe
            await client.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${constraintName}`);
            await client.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${table}_dashboard_id_fkey`); // Common default name

            await client.query(`
                ALTER TABLE ${table} 
                ADD CONSTRAINT ${constraintName} 
                FOREIGN KEY (dashboard_id) 
                REFERENCES dashboards(id) 
                ON DELETE CASCADE
            `);
        }

        // 4. Update SSO Authority
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
        if (e.detail) console.error('Detail:', e.detail);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
