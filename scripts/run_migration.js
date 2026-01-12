const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function runMigration() {
    const client = await pool.connect();
    try {
        console.log('--- DYNAMIC Aggressive Migration Start ---');

        // 1. Find and Drop ALL FKs pointing to dashboards or tasks
        const fkRes = await client.query(`
            SELECT 
                tc.table_name, 
                tc.constraint_name
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.constraint_column_usage AS ccu 
                  ON ccu.constraint_name = tc.constraint_name 
            WHERE 
                constraint_type = 'FOREIGN KEY' 
                AND ccu.table_name IN ('dashboards', 'tasks')
        `);

        console.log(`Found ${fkRes.rows.length} FK constraints to drop...`);
        for (const row of fkRes.rows) {
            console.log(`Dropping ${row.constraint_name} on ${row.table_name}...`);
            await client.query(`ALTER TABLE "${row.table_name}" DROP CONSTRAINT IF EXISTS "${row.constraint_name}" CASCADE`);
        }

        // 2. Convert Types
        console.log('Converting ID types to VARCHAR(255)...');
        const tablesToConvert = ['dashboards', 'tasks', 'folders', 'users', 'dashboard_user_permissions', 'dashboard_collaborators'];
        for (const table of tablesToConvert) {
            try {
                // Check if table exists
                const tableExists = await client.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)", [table]);
                if (!tableExists.rows[0].exists) continue;

                console.log(`Evolving ${table}...`);
                if (table === 'dashboards' || table === 'tasks' || table === 'folders' || table === 'users') {
                    await client.query(`ALTER TABLE "${table}" ALTER COLUMN id TYPE VARCHAR(255)`);
                }
                if (table === 'tasks' || table === 'dashboard_user_permissions' || table === 'dashboard_collaborators') {
                    await client.query(`ALTER TABLE "${table}" ALTER COLUMN dashboard_id TYPE VARCHAR(255)`);
                }
            } catch (e) { console.log(`Notice: Error evolving ${table}: ${e.message}`) }
        }

        // 3. Add columns
        console.log('Adding columns...');
        await client.query("ALTER TABLE dashboards ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE");

        // 4. Run main bridge migration
        const sqlPath = path.join(__dirname, 'bridge_migration.sql');
        if (fs.existsSync(sqlPath)) {
            const sql = fs.readFileSync(sqlPath, 'utf8');
            console.log('Running main bridge migration logic...');
            await client.query(sql);
        }

        console.log('✅ DYNAMIC Aggressive Migration Completed Successfully.');
    } catch (e) {
        console.error('❌ DYNAMIC Aggressive Migration Failed:', e);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

runMigration();
