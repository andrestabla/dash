require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function auditDatabase() {
    const client = await pool.connect();

    console.log('='.repeat(80));
    console.log('DATABASE SCHEMA AUDIT');
    console.log('='.repeat(80));
    console.log('');

    try {
        // 1. List all tables
        console.log('📋 TABLES IN DATABASE');
        console.log('-'.repeat(80));
        const tablesRes = await client.query(`
            SELECT table_name, table_type
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);
        console.table(tablesRes.rows);
        console.log('');

        // 2. Get table structures
        for (const table of tablesRes.rows) {
            const tableName = table.table_name;
            console.log(`📊 TABLE: ${tableName}`);
            console.log('-'.repeat(80));

            // Get columns
            const columnsRes = await client.query(`
                SELECT 
                    column_name,
                    data_type,
                    character_maximum_length,
                    is_nullable,
                    column_default
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = $1
                ORDER BY ordinal_position
            `, [tableName]);
            console.table(columnsRes.rows);

            // Get row count
            const countRes = await client.query(`SELECT COUNT(*) as count FROM ${tableName}`);
            console.log(`Total rows: ${countRes.rows[0].count}`);
            console.log('');
        }

        // 3. Foreign Keys
        console.log('🔗 FOREIGN KEY RELATIONSHIPS');
        console.log('-'.repeat(80));
        const fkRes = await client.query(`
            SELECT
                tc.table_name as from_table,
                kcu.column_name as from_column,
                ccu.table_name as to_table,
                ccu.column_name as to_column,
                tc.constraint_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_schema = 'public'
            ORDER BY tc.table_name, kcu.column_name
        `);
        console.table(fkRes.rows);
        console.log('');

        // 4. Indexes
        console.log('📇 INDEXES');
        console.log('-'.repeat(80));
        const indexRes = await client.query(`
            SELECT
                tablename,
                indexname,
                indexdef
            FROM pg_indexes
            WHERE schemaname = 'public'
            ORDER BY tablename, indexname
        `);
        console.table(indexRes.rows);
        console.log('');

        // 5. Check for orphaned records
        console.log('🔍 DATA INTEGRITY CHECKS');
        console.log('-'.repeat(80));

        // Check dashboard_user_permissions
        const orphanedPerms = await client.query(`
            SELECT COUNT(*) as count
            FROM dashboard_user_permissions dup
            WHERE NOT EXISTS (SELECT 1 FROM dashboards d WHERE d.id = dup.dashboard_id)
               OR NOT EXISTS (SELECT 1 FROM users u WHERE u.id = dup.user_id)
        `);
        console.log(`Orphaned dashboard_user_permissions: ${orphanedPerms.rows[0].count}`);

        // Check tasks without dashboards
        const orphanedTasks = await client.query(`
            SELECT COUNT(*) as count
            FROM tasks t
            WHERE NOT EXISTS (SELECT 1 FROM dashboards d WHERE d.id = t.dashboard_id)
        `);
        console.log(`Orphaned tasks: ${orphanedTasks.rows[0].count}`);

        // Check comments without tasks
        const orphanedComments = await client.query(`
            SELECT COUNT(*) as count
            FROM task_comments c
            WHERE NOT EXISTS (SELECT 1 FROM tasks t WHERE t.id = c.task_id)
        `);
        console.log(`Orphaned task_comments: ${orphanedComments.rows[0].count}`);

        console.log('');

        // 6. Permission statistics
        console.log('📊 PERMISSION STATISTICS');
        console.log('-'.repeat(80));
        const permStats = await client.query(`
            SELECT 
                d.name as dashboard_name,
                COUNT(dup.user_id) as user_count,
                string_agg(u.email, ', ') as users
            FROM dashboards d
            LEFT JOIN dashboard_user_permissions dup ON d.id = dup.dashboard_id
            LEFT JOIN users u ON dup.user_id = u.id
            GROUP BY d.id, d.name
            ORDER BY d.name
        `);
        console.table(permStats.rows);
        console.log('');

        // 7. User statistics
        console.log('👥 USER STATISTICS');
        console.log('-'.repeat(80));
        const userStats = await client.query(`
            SELECT 
                u.email,
                u.role,
                COUNT(DISTINCT d.id) as owned_dashboards,
                COUNT(DISTINCT dup.dashboard_id) as accessible_dashboards
            FROM users u
            LEFT JOIN dashboards d ON u.id = d.owner_id
            LEFT JOIN dashboard_user_permissions dup ON u.id = dup.user_id
            GROUP BY u.id, u.email, u.role
            ORDER BY u.email
        `);
        console.table(userStats.rows);
        console.log('');

        console.log('='.repeat(80));
        console.log('✅ AUDIT COMPLETE');
        console.log('='.repeat(80));

    } catch (error) {
        console.error('❌ Error during audit:', error);
    } finally {
        client.release();
        await pool.end();
    }
}

auditDatabase();
