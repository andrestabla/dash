const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkMigrationStatus() {
    console.log('Checking database connection...');
    if (!process.env.DATABASE_URL) {
        console.error('Error: DATABASE_URL is not defined in .env.local');
        process.exit(1);
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        console.log('Connected to database.');

        const res = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'dashboard_user_permissions'
      );
    `);

        const exists = res.rows[0].exists;
        if (exists) {
            console.log('✅ Success: Table "dashboard_user_permissions" exists.');
        } else {
            console.log('❌ Failure: Table "dashboard_user_permissions" does NOT exist.');
            console.log('The migration script scripts/add_dashboard_permissions.sql needs to be run.');
        }

        await client.end();
    } catch (err) {
        console.error('Database connection error:', err);
        process.exit(1);
    }
}

checkMigrationStatus();
