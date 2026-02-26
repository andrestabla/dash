const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function run() {
    const client = await pool.connect();
    try {
        console.log('⚡ Optimizing database indexes for stability...');

        await client.query('BEGIN');

        // Indexes for performance and stability
        const indexes = [
            'CREATE INDEX IF NOT EXISTS idx_tasks_dashboard_id ON tasks(dashboard_id)',
            'CREATE INDEX IF NOT EXISTS idx_dashboard_messages_dashboard_id ON dashboard_messages(dashboard_id)',
            'CREATE INDEX IF NOT EXISTS idx_task_assignees_task_id ON task_assignees(task_id)',
            'CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_at ON login_attempts(ip_address, attempted_at)',
            'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)'
        ];

        for (const sql of indexes) {
            console.log(`🔨 Running: ${sql.split('ON')[0]}...`);
            await client.query(sql);
        }

        await client.query('COMMIT');
        console.log('✅ INDEX OPTIMIZATION COMPLETE');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ OPTIMIZATION FAILED:', e.message);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
