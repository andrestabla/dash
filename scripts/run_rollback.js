const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runRollback() {
    console.log('Starting rollback...');
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

        const sqlPath = path.join(__dirname, 'rollback_assignees.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing Rollback SQL...');
        await client.query(sql);

        console.log('✅ Rollback completed successfully. Table task_assignees dropped.');
        await client.end();
    } catch (err) {
        console.error('Rollback failed:', err);
        process.exit(1);
    }
}

runRollback();
