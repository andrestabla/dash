// Introspects the live database and writes a canonical schema to db/schema.sql.
// Read-only. Usage: node scripts/dump-schema.mjs
import { writeFileSync } from 'node:fs';
import { config as loadEnv } from 'dotenv';
import { Pool } from 'pg';

loadEnv({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

async function main() {
    const out = [];
    out.push('-- Canonical database schema for roadmap-4shine.');
    out.push('-- Generated from the live database by scripts/dump-schema.mjs.');
    out.push('-- This file is the single source of truth for the schema. Do not edit by hand;');
    out.push('-- evolve the schema with a numbered migration in db/migrations/ and regenerate.');
    out.push('');

    // Extensions
    const exts = await pool.query(
        `SELECT extname FROM pg_extension WHERE extname <> 'plpgsql' ORDER BY extname`
    );
    if (exts.rows.length) {
        out.push('-- Extensions');
        for (const e of exts.rows) {
            out.push(`CREATE EXTENSION IF NOT EXISTS "${e.extname}";`);
        }
        out.push('');
    }

    // Sequences (e.g. those backing SERIAL columns)
    const seqs = await pool.query(
        `SELECT sequencename FROM pg_sequences WHERE schemaname = 'public' ORDER BY sequencename`
    );
    if (seqs.rows.length) {
        out.push('-- Sequences');
        for (const s of seqs.rows) {
            out.push(`CREATE SEQUENCE IF NOT EXISTS ${s.sequencename};`);
        }
        out.push('');
    }

    // Enum types
    const enums = await pool.query(`
        SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
        FROM pg_type t
        JOIN pg_enum e ON e.enumtypid = t.oid
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE n.nspname = 'public'
        GROUP BY t.typname
        ORDER BY t.typname
    `);
    if (enums.rows.length) {
        out.push('-- Enum types');
        for (const en of enums.rows) {
            const labels = en.labels.map((l) => `'${l.replace(/'/g, "''")}'`).join(', ');
            out.push(`CREATE TYPE ${en.typname} AS ENUM (${labels});`);
        }
        out.push('');
    }

    // Tables
    const tables = await pool.query(`
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
    `);

    const fkStatements = [];
    const indexStatements = [];

    for (const { tablename } of tables.rows) {
        const cols = await pool.query(
            `SELECT a.attname AS name,
                    format_type(a.atttypid, a.atttypmod) AS type,
                    a.attnotnull AS notnull,
                    pg_get_expr(ad.adbin, ad.adrelid) AS def
             FROM pg_attribute a
             LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
             WHERE a.attrelid = $1::regclass AND a.attnum > 0 AND NOT a.attisdropped
             ORDER BY a.attnum`,
            [`public."${tablename}"`]
        );

        const cons = await pool.query(
            `SELECT conname, contype, pg_get_constraintdef(oid) AS def
             FROM pg_constraint
             WHERE conrelid = $1::regclass
             ORDER BY contype, conname`,
            [`public."${tablename}"`]
        );

        const lines = [];
        for (const c of cols.rows) {
            let line = `    ${c.name} ${c.type}`;
            if (c.notnull) line += ' NOT NULL';
            if (c.def !== null) line += ` DEFAULT ${c.def}`;
            lines.push(line);
        }
        // Inline PK / UNIQUE / CHECK constraints (no cross-table dependency).
        for (const c of cons.rows) {
            if (c.contype === 'f') {
                fkStatements.push(
                    `ALTER TABLE ${tablename} ADD CONSTRAINT ${c.conname} ${c.def};`
                );
            } else {
                lines.push(`    CONSTRAINT ${c.conname} ${c.def}`);
            }
        }

        out.push(`-- Table: ${tablename}`);
        out.push(`CREATE TABLE IF NOT EXISTS ${tablename} (`);
        out.push(lines.join(',\n'));
        out.push(');');
        out.push('');

        // Indexes not backing a constraint.
        const idx = await pool.query(
            `SELECT i.indexname, i.indexdef
             FROM pg_indexes i
             WHERE i.schemaname = 'public' AND i.tablename = $1
               AND NOT EXISTS (
                   SELECT 1 FROM pg_constraint c
                   WHERE c.conname = i.indexname AND c.conrelid = $2::regclass
               )
             ORDER BY i.indexname`,
            [tablename, `public."${tablename}"`]
        );
        for (const ix of idx.rows) {
            indexStatements.push(`${ix.indexdef};`);
        }
    }

    if (fkStatements.length) {
        out.push('-- Foreign keys');
        out.push(...fkStatements);
        out.push('');
    }
    if (indexStatements.length) {
        out.push('-- Indexes');
        out.push(...indexStatements);
        out.push('');
    }

    writeFileSync('db/schema.sql', out.join('\n'));
    console.log(`db/schema.sql written: ${tables.rows.length} tables, ${fkStatements.length} FKs, ${indexStatements.length} indexes, ${enums.rows.length} enums.`);
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => pool.end());
