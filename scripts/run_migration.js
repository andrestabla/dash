const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Connection string provided by the user
const connectionString = 'postgresql://neondb_owner:npg_cmqedE60uOAF@ep-holy-dew-a4cxhmv8-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function runMigration() {
    console.log('🚀 Starting database migration...');

    const pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    const sqlFile = process.argv[2] || 'add_dashboard_permissions.sql';
    const sqlPath = path.join(__dirname, sqlFile);

    if (!fs.existsSync(sqlPath)) {
        console.error(`❌ Migration file not found: ${sqlPath}`);
        console.log('   Usage: node scripts/run_migration.js <filename.sql>');
        process.exit(1);
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');
    const client = await pool.connect();

    try {
        console.log('🔌 Connected to Neon DB. Checking existing tables...');

        const tableRes = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        console.log('📋 Existing tables:');
        console.table(tableRes.rows);

        console.log('🛠️ Attempting to execute SQL...');

        const res = await client.query(sql);

        console.log('✅ Migration executed successfully.');

        // The script returns results for multiple statements as an array
        if (Array.isArray(res)) {
            res.forEach((r, i) => {
                if (r.command) console.log(`   [${i}] ${r.command} completed.`);
                if (r.rows && r.rows.length > 0) {
                    console.table(r.rows);
                }
            });
        } else {
            console.log(`   Command ${res.command} completed.`);
            if (res.rows && res.rows.length > 0) {
                console.table(res.rows);
            }
        }

    } catch (err) {
        console.error('❌ Error during migration:', err.message);
        if (err.detail) console.error('   Detail:', err.detail);
        if (err.where) console.error('   Where:', err.where);
    } finally {
        client.release();
        await pool.end();
        console.log('👋 Database connection closed.');
    }
}

runMigration();
