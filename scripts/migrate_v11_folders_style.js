require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting migration V11: Folders Style...');

        // 1. Add 'icon' column if it doesn't exist
        const checkIcon = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='folders' AND column_name='icon'
        `);

        if (checkIcon.rows.length === 0) {
            await client.query(`ALTER TABLE folders ADD COLUMN icon VARCHAR(50) DEFAULT '📁';`);
            console.log('✅ Added "icon" to "folders" table.');
        } else {
            console.log('ℹ️ "icon" column already exists.');
        }

        // 2. Add 'color' column if it doesn't exist
        const checkColor = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='folders' AND column_name='color'
        `);

        if (checkColor.rows.length === 0) {
            await client.query(`ALTER TABLE folders ADD COLUMN color VARCHAR(50) DEFAULT '#3b82f6';`); // Default blue
            console.log('✅ Added "color" to "folders" table.');
        } else {
            console.log('ℹ️ "color" column already exists.');
        }

        console.log('🎉 Migration V11 complete!');
    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
