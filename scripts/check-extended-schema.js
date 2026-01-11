const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkExtendedSchema() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        const tables = ['audit_logs', 'login_attempts', 'users'];
        for (const table of tables) {
            console.log(`\n--- ${table.toUpperCase()} TABLE ---`);
            const cols = await client.query(`
                SELECT column_name, data_type, column_default 
                FROM information_schema.columns 
                WHERE table_name = '${table}'
            `);
            cols.rows.forEach(col => console.log(`${col.column_name} (${col.data_type}) - Default: ${col.column_default}`));
        }

        await client.end();
    } catch (error) {
        console.error('Failed to fetch schema:', error);
        process.exit(1);
    }
}

checkExtendedSchema();
