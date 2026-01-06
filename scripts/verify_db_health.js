const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
    console.error("❌ Error: DATABASE_URL is not set.");
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function verifyHealth() {
    const client = await pool.connect();
    try {
        console.log("🏥 Starting Database Health Check...\n");

        // 1. Check Tables
        const expectedTables = [
            'users',
            'dashboards',
            'folders',
            'tasks',
            'task_comments',
            'audit_logs',
            'dashboard_collaborators',
            'system_settings',
            'dashboard_shares' // Check if this exists based on verify_db_health.js logic if needed, or migration scripts
        ];

        const tablesRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public';
        `);
        const existingTables = tablesRes.rows.map(r => r.table_name);

        console.log("📋 Table Check:");
        let missingTables = [];
        expectedTables.forEach(t => {
            if (existingTables.includes(t)) {
                console.log(`   ✅ ${t}`);
            } else {
                console.log(`   ❌ ${t} (MISSING)`);
                missingTables.push(t);
            }
        });

        // 2. Check Critical Columns
        console.log("\n🔍 Column Check:");

        const checkColumn = async (table, col) => {
            const res = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = $1 AND column_name = $2;
            `, [table, col]);
            if (res.rows.length > 0) {
                console.log(`   ✅ ${table}.${col}`);
            } else {
                console.log(`   ❌ ${table}.${col} (MISSING)`);
            }
        };

        if (existingTables.includes('folders')) {
            await checkColumn('folders', 'owner_id');
            await checkColumn('folders', 'icon');
            await checkColumn('folders', 'color');
        }
        if (existingTables.includes('dashboards')) {
            await checkColumn('dashboards', 'owner_id');
            await checkColumn('dashboards', 'folder_id');
        }
        if (existingTables.includes('users')) {
            await checkColumn('users', 'status');
            await checkColumn('users', 'role');
        }

        // 3. Recursive Query Test
        console.log("\n🔄 Recursive Capabilities Check:");
        try {
            // Simple recursive query to test support
            await client.query(`
                WITH RECURSIVE t(n) AS (
                    VALUES (1)
                  UNION ALL
                    SELECT n+1 FROM t WHERE n < 5
                )
                SELECT sum(n) FROM t;
            `);
            console.log("   ✅ Recursive CTEs supported and working.");
        } catch (err) {
            console.log("   ❌ Recursive CTE failed:", err.message);
        }

        // 4. Data Consistency (Orphans)
        console.log("\n🧹 Data Integrity Check:");
        if (existingTables.includes('folders') && existingTables.includes('dashboards')) {
            const orphans = await client.query(`
                SELECT count(*) as count 
                FROM dashboards 
                WHERE folder_id IS NOT NULL 
                AND folder_id NOT IN (SELECT id FROM folders);
             `);
            if (orphans.rows[0].count > 0) {
                console.log(`   ⚠️ Found ${orphans.rows[0].count} orphaned dashboards (linking to non-existent folders).`);
            } else {
                console.log("   ✅ No orphaned dashboards found.");
            }
        }

        console.log("\n🏁 Diagnosis Complete.");

    } catch (err) {
        console.error("❌ Critical Failure:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

verifyHealth();
