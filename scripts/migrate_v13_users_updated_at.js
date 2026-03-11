const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL is not set.');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🔧 Migration V13: users.updated_at consistency');
        await client.query('BEGIN');

        await client.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        `);

        await client.query(`
            UPDATE users
            SET updated_at = COALESCE(updated_at, created_at, NOW())
            WHERE updated_at IS NULL
        `);

        const check = await client.query(`
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'users'
              AND column_name = 'updated_at'
        `);

        await client.query('COMMIT');

        if (check.rows.length === 1) {
            console.log(`✅ users.updated_at ready (${check.rows[0].data_type})`);
        } else {
            console.log('⚠️ users.updated_at was not found after migration');
        }
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration V13 failed:', error.message);
        process.exitCode = 1;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
