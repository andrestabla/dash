const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false,
        },
    });

    try {
        const sql = fs.readFileSync(path.join(__dirname, 'update_support_schema.sql'), 'utf8');
        const client = await pool.connect();
        console.log('Connected to DB. Running migration...');
        await client.query(sql);
        console.log('Migration completed successfully.');
        client.release();
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        await pool.end();
    }
}

runMigration();
