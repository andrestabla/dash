const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkDashSchema() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        const client = await pool.connect();

        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'dashboards'
        `);
        console.log("Dashboards Schema:", res.rows.map(r => r.column_name));

        client.release();
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkDashSchema();
