const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkDb() {
    console.log('Connecting to:', process.env.DATABASE_URL ? 'URL found' : 'URL NOT found');
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false,
        },
    });

    try {
        const client = await pool.connect();
        console.log('Successfully connected to the database.');
        
        const res = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'dashboard_user_permissions';
        `);
        
        if (res.rows.length > 0) {
            console.log('Table "dashboard_user_permissions" EXISTS.');
        } else {
            console.log('Table "dashboard_user_permissions" DOES NOT exist.');
        }
        
        client.release();
    } catch (err) {
        console.error('Error connecting to the database:', err.message);
    } finally {
        await pool.end();
    }
}

checkDb();
