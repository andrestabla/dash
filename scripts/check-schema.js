const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkSchema() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        const client = await pool.connect();

        // Check tasks table
        const tasksRes = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'tasks'
        `);
        console.log("Tasks Table:", tasksRes.rows.map(r => r.column_name));

        // Check for assignments table
        const tablesRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        const tables = tablesRes.rows.map(r => r.table_name);
        console.log("Tables:", tables);

        if (tables.includes('task_assignees')) {
            const assigneesRes = await client.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'task_assignees'
            `);
            console.log("Task Assignees Table:", assigneesRes.rows.map(r => r.column_name));
        }

        client.release();
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkSchema();
