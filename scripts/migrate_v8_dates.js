const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🔄 Starting V8 Dates Migration...');

        // 1. Add start_date column
        await client.query(`
            ALTER TABLE dashboards 
            ADD COLUMN IF NOT EXISTS start_date DATE;
        `);
        console.log('✅ Added start_date column.');

        // 2. Add end_date column
        await client.query(`
            ALTER TABLE dashboards 
            ADD COLUMN IF NOT EXISTS end_date DATE;
        `);
        console.log('✅ Added end_date column.');

        console.log('🎉 Migration V8 Complete!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
