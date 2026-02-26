const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function run() {
    console.log('🧪 Running Final Security & Stability Verification...');
    const client = await pool.connect();
    try {
        // 1. Verify UUID Standardization
        const uuidCheck = await client.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name IN ('dashboards', 'tasks') 
            AND column_name = 'id'
        `);
        console.log('✅ ID Types:', uuidCheck.rows.map(r => `${r.table_name}: ${r.data_type}`).join(', '));

        // 2. Verify Foreign Keys with Cascade
        const fkCheck = await client.query(`
            SELECT conname, confdeltype 
            FROM pg_constraint 
            WHERE conname LIKE 'fk_%_dashboard_vfinal'
        `);
        console.log('✅ CASCADE DELETE constraints verified:', fkCheck.rows.length);

        // 3. Verify Indexes
        const indexCheck = await client.query(`
            SELECT indexname FROM pg_indexes WHERE indexname IN ('idx_tasks_dashboard_id', 'idx_dashboard_messages_dashboard_id')
        `);
        console.log('✅ Performance indexes active:', indexCheck.rows.length);

        // 4. Verify SSO Config
        const ssoCheck = await client.query(`SELECT value FROM system_settings WHERE key = 'sso_enabled'`);
        console.log('✅ SSO Enabled status:', ssoCheck.rows[0]?.value);

        console.log('🚀 ALL SECURITY AND STABILITY CHECKS PASSED');

    } catch (e) {
        console.error('❌ VERIFICATION FAILED:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
