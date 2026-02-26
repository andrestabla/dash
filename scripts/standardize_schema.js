const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting Schema Standardization...');

        await client.query('BEGIN');

        // 1. Convert dashboard_id to UUID in tasks table
        // We first need to make sure all values are UUIDs (already checked orphans, remaining should be valid)
        console.log('🔄 Converting tasks.dashboard_id to UUID...');
        await client.query(`
            ALTER TABLE tasks 
            ALTER COLUMN dashboard_id TYPE UUID USING dashboard_id::UUID
        `);

        // 2. Add Foreign Key with CASCADE DELETE
        console.log('🔗 Adding Foreign Key constraint with CASCADE DELETE...');
        await client.query(`
            ALTER TABLE tasks 
            ADD CONSTRAINT fk_tasks_dashboard 
            FOREIGN KEY (dashboard_id) 
            REFERENCES dashboards(id) 
            ON DELETE CASCADE
        `);

        // 3. Update SSO Authority
        console.log('⚙️  Updating SSO Authority...');
        await client.query(`
            INSERT INTO system_settings (key, value, description)
            VALUES ('sso_authority', 'https://accounts.google.com', 'Google SSO Authority URL')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `);

        await client.query('COMMIT');
        console.log('✅ Schema standardized and configuration updated.');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
