const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkSchema() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        const client = await pool.connect();

        const dashboardRes = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'dashboards' AND column_name = 'id';
        `);
        console.log('Dashboards ID type:', dashboardRes.rows[0]);

        const userRes = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'id';
        `);
        console.log('Users ID type:', userRes.rows[0]);

        client.release();
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

checkSchema();
