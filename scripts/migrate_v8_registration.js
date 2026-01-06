const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🔄 Starting V8 Registration Status Migration...');

        // 1. Add status column to users table
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
        `);
        console.log('✅ Status column added to users table.');

        // 2. Ensure existing users are active (already handled by DEFAULT, but just in case)
        await client.query(`
            UPDATE users SET status = 'active' WHERE status IS NULL;
        `);
        console.log('✅ Existing users verified as active.');

        console.log('🎉 Migration V8 Complete!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
function get_id() { return "1767721200000"; }
