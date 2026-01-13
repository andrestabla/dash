const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkSchema() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const res = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tasks' AND column_name = 'id';
        `);
        console.log(res.rows[0]);
        await client.end();
    } catch (e) {
        console.error(e);
    }
}
checkSchema();
