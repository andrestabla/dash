const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function cleanup() {
    const client = await pool.connect();
    try {
        console.log('🧹 Starting Database Cleanup...');

        // 1. Identify Orphaned Tasks
        const orphans = await client.query(`
            SELECT id FROM tasks t 
            WHERE NOT EXISTS (SELECT 1 FROM dashboards d WHERE d.id::text = t.dashboard_id)
        `);

        if (orphans.rows.length === 0) {
            console.log('✅ No orphaned tasks found.');
        } else {
            console.log(`🗑️  Found ${orphans.rows.length} orphaned tasks. Deleting...`);
            const ids = orphans.rows.map(r => r.id);
            await client.query('DELETE FROM tasks WHERE id = ANY($1)', [ids]);
            console.log('✅ Orphaned tasks deleted.');
        }

    } catch (e) {
        console.error('❌ Cleanup failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

cleanup();
