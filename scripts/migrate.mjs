// Applies pending SQL migrations from db/migrations/ in filename order.
// Each migration runs in a transaction and is recorded in schema_migrations.
// Usage:
//   node scripts/migrate.mjs            apply all pending migrations
//   node scripts/migrate.mjs --dry-run  list pending migrations without applying
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { Pool } from 'pg';

loadEnv({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
}

const dryRun = process.argv.includes('--dry-run');
const MIGRATIONS_DIR = join(process.cwd(), 'db', 'migrations');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function main() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version    text PRIMARY KEY,
            applied_at timestamptz NOT NULL DEFAULT now()
        )
    `);

    const applied = new Set(
        (await pool.query('SELECT version FROM schema_migrations')).rows.map((r) => r.version)
    );

    const files = readdirSync(MIGRATIONS_DIR)
        .filter((f) => f.endsWith('.sql'))
        .sort();
    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
        console.log('No pending migrations.');
        return;
    }

    console.log(`${pending.length} pending migration(s):`);
    for (const f of pending) console.log('  -', f);

    if (dryRun) {
        console.log('\n--dry-run: nothing applied.');
        return;
    }

    for (const file of pending) {
        const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(sql);
            await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
            await client.query('COMMIT');
            console.log('Applied:', file);
        } catch (e) {
            await client.query('ROLLBACK');
            console.error('Failed:', file, '-', e.message);
            process.exit(1);
        } finally {
            client.release();
        }
    }
    console.log('Done.');
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => pool.end());
