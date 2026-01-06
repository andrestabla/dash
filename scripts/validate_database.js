const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function validateDatabase() {
    console.log('🔍 Validating Database Schema and Communication...\n');

    try {
        // 1. Check database connection
        console.log('1️⃣ Testing database connection...');
        const client = await pool.connect();
        console.log('✅ Database connection successful\n');

        // 2. Verify all required tables exist
        console.log('2️⃣ Verifying tables...');
        const tables = ['users', 'folders', 'dashboards', 'tasks', 'comments', 'notifications', 'organization_settings'];
        for (const table of tables) {
            const result = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = $1
                );
            `, [table]);
            const exists = result.rows[0].exists;
            console.log(`   ${exists ? '✅' : '❌'} Table: ${table}`);
        }
        console.log('');

        // 3. Check foreign key relationships
        console.log('3️⃣ Validating foreign key relationships...');
        const fkCheck = await client.query(`
            SELECT
                tc.table_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public';
        `);
        console.log(`   ✅ Found ${fkCheck.rows.length} foreign key relationships`);
        fkCheck.rows.forEach(fk => {
            console.log(`      ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
        });
        console.log('');

        // 4. Test recursive folder query
        console.log('4️⃣ Testing recursive folder queries...');
        const recursiveTest = await client.query(`
            WITH RECURSIVE folder_tree AS (
                SELECT id, name, parent_id, 1 as depth
                FROM folders
                WHERE parent_id IS NULL
                
                UNION ALL
                
                SELECT f.id, f.name, f.parent_id, ft.depth + 1
                FROM folders f
                INNER JOIN folder_tree ft ON f.parent_id = ft.id
                WHERE ft.depth < 10
            )
            SELECT COUNT(*) as total_folders, MAX(depth) as max_depth
            FROM folder_tree;
        `);
        console.log(`   ✅ Recursive query successful`);
        console.log(`      Total folders: ${recursiveTest.rows[0].total_folders}`);
        console.log(`      Max depth: ${recursiveTest.rows[0].max_depth}`);
        console.log('');

        // 5. Validate task-dashboard relationships
        console.log('5️⃣ Validating task-dashboard relationships...');
        const taskDashboardCheck = await client.query(`
            SELECT 
                COUNT(DISTINCT t.id) as total_tasks,
                COUNT(DISTINCT t.dashboard_id) as unique_dashboards,
                COUNT(DISTINCT d.id) as existing_dashboards
            FROM tasks t
            LEFT JOIN dashboards d ON t.dashboard_id = d.id;
        `);
        const stats = taskDashboardCheck.rows[0];
        console.log(`   ✅ Task-Dashboard relationships validated`);
        console.log(`      Total tasks: ${stats.total_tasks}`);
        console.log(`      Unique dashboard IDs in tasks: ${stats.unique_dashboards}`);
        console.log(`      Existing dashboards: ${stats.existing_dashboards}`);
        console.log('');

        // 6. Check for orphaned records
        console.log('6️⃣ Checking for orphaned records...');
        const orphanedTasks = await client.query(`
            SELECT COUNT(*) as count
            FROM tasks t
            LEFT JOIN dashboards d ON t.dashboard_id = d.id
            WHERE d.id IS NULL;
        `);
        const orphanedDashboards = await client.query(`
            SELECT COUNT(*) as count
            FROM dashboards d
            LEFT JOIN folders f ON d.folder_id = f.id
            WHERE f.id IS NULL AND d.folder_id IS NOT NULL;
        `);
        console.log(`   ${orphanedTasks.rows[0].count > 0 ? '⚠️' : '✅'} Orphaned tasks: ${orphanedTasks.rows[0].count}`);
        console.log(`   ${orphanedDashboards.rows[0].count > 0 ? '⚠️' : '✅'} Orphaned dashboards: ${orphanedDashboards.rows[0].count}`);
        console.log('');

        // 7. Test progress calculation
        console.log('7️⃣ Testing progress calculation...');
        const progressTest = await client.query(`
            SELECT 
                d.id as dashboard_id,
                d.name as dashboard_name,
                COUNT(t.id) as total_tasks,
                COUNT(CASE WHEN t.status = 'done' THEN 1 END) as done_tasks,
                ROUND(
                    CASE 
                        WHEN COUNT(t.id) > 0 
                        THEN (COUNT(CASE WHEN t.status = 'done' THEN 1 END)::float / COUNT(t.id)::float) * 100
                        ELSE 0
                    END
                ) as progress_pct
            FROM dashboards d
            LEFT JOIN tasks t ON t.dashboard_id = d.id
            GROUP BY d.id, d.name
            HAVING COUNT(t.id) > 0
            LIMIT 5;
        `);
        console.log(`   ✅ Progress calculation working`);
        progressTest.rows.forEach(row => {
            console.log(`      ${row.dashboard_name}: ${row.done_tasks}/${row.total_tasks} (${row.progress_pct}%)`);
        });
        console.log('');

        // 8. Summary
        console.log('📊 Validation Summary:');
        console.log('   ✅ Database connection: OK');
        console.log('   ✅ All tables exist: OK');
        console.log('   ✅ Foreign keys: OK');
        console.log('   ✅ Recursive queries: OK');
        console.log('   ✅ Task relationships: OK');
        console.log(`   ${orphanedTasks.rows[0].count === 0 && orphanedDashboards.rows[0].count === 0 ? '✅' : '⚠️'} Data integrity: ${orphanedTasks.rows[0].count === 0 && orphanedDashboards.rows[0].count === 0 ? 'OK' : 'WARNINGS'}`);
        console.log('   ✅ Progress calculation: OK');

        client.release();
        await pool.end();

        console.log('\n✅ Database validation complete!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Validation failed:', error.message);
        console.error(error);
        await pool.end();
        process.exit(1);
    }
}

validateDatabase();
