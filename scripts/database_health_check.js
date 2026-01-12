const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function healthCheck() {
    const client = await pool.connect();
    try {
        console.log('🏥 === NEON DATABASE HEALTH CHECK ===\n');

        // 1. Connection Test
        console.log('1️⃣  CONNECTION TEST');
        const connTest = await client.query('SELECT NOW() as current_time');
        console.log('   ✅ Connected successfully');
        console.log('   ⏰ Server time:', connTest.rows[0].current_time);
        console.log('');

        // 2. Tables Existence
        console.log('2️⃣  TABLE STRUCTURE');
        const tables = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        console.log('   Tables found:', tables.rows.length);
        tables.rows.forEach(t => console.log('   ✅', t.table_name));
        console.log('');

        // 3. Critical Columns Check
        console.log('3️⃣  CRITICAL COLUMNS CHECK');

        // Check dashboards.is_demo
        const demoCol = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'dashboards' AND column_name = 'is_demo'
        `);
        if (demoCol.rows.length > 0) {
            console.log('   ✅ dashboards.is_demo exists');
        } else {
            console.log('   ❌ dashboards.is_demo MISSING');
        }

        // Check ID types
        const idTypes = await client.query(`
            SELECT table_name, column_name, data_type, character_maximum_length
            FROM information_schema.columns 
            WHERE column_name = 'id' AND table_schema = 'public'
            ORDER BY table_name
        `);
        console.log('   ID Column Types:');
        idTypes.rows.forEach(r => {
            const type = r.character_maximum_length ? `${r.data_type}(${r.character_maximum_length})` : r.data_type;
            console.log(`     - ${r.table_name}.id: ${type}`);
        });
        console.log('');

        // 4. Data Counts
        console.log('4️⃣  DATA INVENTORY');
        const userCount = await client.query('SELECT count(*) FROM users');
        const dashCount = await client.query('SELECT count(*) FROM dashboards');
        const taskCount = await client.query('SELECT count(*) FROM tasks');
        const settingsCount = await client.query('SELECT count(*) FROM system_settings');

        console.log('   👥 Users:', userCount.rows[0].count);
        console.log('   📊 Dashboards:', dashCount.rows[0].count);
        console.log('   ✅ Tasks:', taskCount.rows[0].count);
        console.log('   ⚙️  System Settings:', settingsCount.rows[0].count);
        console.log('');

        // 5. SSO Configuration
        console.log('5️⃣  SSO CONFIGURATION');
        const ssoSettings = await client.query(`
            SELECT key, value 
            FROM system_settings 
            WHERE key LIKE 'sso%' 
            ORDER BY key
        `);
        if (ssoSettings.rows.length === 0) {
            console.log('   ❌ NO SSO SETTINGS FOUND');
        } else {
            ssoSettings.rows.forEach(s => {
                const value = s.key.includes('secret') ? '***HIDDEN***' : s.value;
                console.log(`   ${s.value === 'true' || s.value === 'google' || s.value === 'microsoft' ? '✅' : '⚠️ '} ${s.key} = ${value}`);
            });
        }
        console.log('');

        // 6. Demo Dashboard Check
        console.log('6️⃣  DEMO DASHBOARD STATUS');
        const demoBoards = await client.query(`
            SELECT id, name, is_demo 
            FROM dashboards 
            WHERE is_demo = TRUE
        `);
        if (demoBoards.rows.length === 0) {
            console.log('   ⚠️  No demo dashboards found');
        } else {
            console.log(`   ✅ Found ${demoBoards.rows.length} demo dashboard(s):`);
            for (const board of demoBoards.rows) {
                const taskCount = await client.query('SELECT count(*) FROM tasks WHERE dashboard_id = $1', [board.id]);
                console.log(`     - ${board.name} (${taskCount.rows[0].count} tasks)`);
            }
        }
        console.log('');

        // 7. Admin Users
        console.log('7️⃣  ADMIN USERS');
        const admins = await client.query(`
            SELECT id, name, email 
            FROM users 
            WHERE role = 'admin'
        `);
        console.log(`   Found ${admins.rows.length} admin(s):`);
        admins.rows.forEach(a => console.log(`     ✅ ${a.name || a.email}`));
        console.log('');

        // 8. Orphaned Data Check
        console.log('8️⃣  DATA INTEGRITY');
        const orphanedTasks = await client.query(`
            SELECT count(*) 
            FROM tasks t 
            LEFT JOIN dashboards d ON t.dashboard_id = d.id 
            WHERE d.id IS NULL
        `);
        if (orphanedTasks.rows[0].count > 0) {
            console.log(`   ⚠️  ${orphanedTasks.rows[0].count} orphaned tasks (no parent dashboard)`);
        } else {
            console.log('   ✅ No orphaned tasks');
        }
        console.log('');

        console.log('✅ === HEALTH CHECK COMPLETE ===');

    } catch (e) {
        console.error('❌ HEALTH CHECK FAILED:', e.message);
        console.error(e);
    } finally {
        client.release();
        await pool.end();
    }
}

healthCheck();
