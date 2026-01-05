const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
    console.error("Error: DATABASE_URL is not set.");
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

const DEFAULT_SETTINGS = {
    weeks: [
        { id: "W1", name: "W1 · Inicio" },
        { id: "W2", name: "W2 · Extracción" },
        { id: "W3", name: "W3 · Gate A" },
        { id: "W4", name: "W4 · Gate B" },
        { id: "W5", name: "W5 · Activación" },
        { id: "W6", name: "W6 · Producción" },
        { id: "W7", name: "W7 · Gate C" },
        { id: "W8", name: "W8 · Gate D" },
        { id: "W9", name: "W9 · Cierre" },
    ],
    owners: ["Andrés Tabla (Metodólogo)", "Carmenza Alarcón (Cliente)"],
    types: ["Gestión", "Inventario", "Metodología", "Evaluación", "Producción", "Comité", "IP-Ready"],
    gates: ["A", "B", "C", "D"]
};

async function migrate() {
    const client = await pool.connect();
    try {
        console.log("Starting V4 Config Migration...");

        // 1. Add JSONB Column
        console.log("Adding 'settings' JSONB column...");
        await client.query(`
        ALTER TABLE dashboards 
        ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;
    `);

        // 2. Backfill Existing Dashboards
        console.log("Backfilling existing dashboards with defaults...");
        // Update any dashboard that has empty settings
        await client.query(`
        UPDATE dashboards 
        SET settings = $1 
        WHERE settings = '{}'::jsonb OR settings IS NULL;
    `, [JSON.stringify(DEFAULT_SETTINGS)]);

        console.log("✅ V4 Config Migration Complete!");

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
