const { Pool } = require('pg');

const SEED_TASKS = [
    // SEMANA 1
    { id: 101, week: "W1", name: "🚀 Sesión 1: Kickoff", status: "done", owner: "Andrés Tabla (Metodólogo)", type: "Gestión", prio: "high", gate: "", due: "2026-01-06", desc: "Facilitación de alcance y entregables." },
    { id: 102, week: "W1", name: "🗂️ Mapeo y acceso a fuentes", status: "doing", owner: "Andrés Tabla (Metodólogo)", type: "Inventario", prio: "high", gate: "", due: "2026-01-09", desc: "Consolidación de videos, libros, PDFs." },
    { id: 103, week: "W1", name: "Crear estructura repositorio", status: "doing", owner: "Andrés Tabla (Metodólogo)", type: "Gestión", prio: "high", gate: "", due: "2026-01-09", desc: "Estructura carpetas y nomenclatura." },
    { id: 104, week: "W1", name: "Taxonomía inicial", status: "todo", owner: "Andrés Tabla (Metodólogo)", type: "Metodología", prio: "med", gate: "", due: "2026-01-09", desc: "Pilares → subtemas." },

    // SEMANA 2
    { id: 201, week: "W2", name: "Selección de piezas núcleo", status: "todo", owner: "Andrés Tabla (Metodólogo)", type: "Inventario", prio: "high", gate: "", due: "2026-01-16", desc: "Identificar materiales clave." },
    { id: 202, week: "W2", name: "Extracción de ADN", status: "todo", owner: "Andrés Tabla (Metodólogo)", type: "Metodología", prio: "high", gate: "", due: "2026-01-16", desc: "Principios y normalización." },
    { id: 203, week: "W2", name: "Mapa de Herramientas", status: "todo", owner: "Andrés Tabla (Metodólogo)", type: "Producción", prio: "med", gate: "", due: "2026-01-16", desc: "Formatos y dinámicas." },

    // SEMANA 3
    { id: 301, week: "W3", name: "✅ Sesión 2: Validar Blueprint (Gate A)", status: "todo", owner: "Carmenza Alarcón (Cliente)", type: "Comité", prio: "high", gate: "A", due: "2026-01-20", desc: "Aprobación de promesa y proceso." },
    { id: 302, week: "W3", name: "Definir subcomponentes", status: "todo", owner: "Andrés Tabla (Metodólogo)", type: "Metodología", prio: "high", gate: "A", due: "2026-01-23", desc: "Competencias y conductas." },
    { id: 303, week: "W3", name: "Diagramas de flujo", status: "todo", owner: "Andrés Tabla (Metodólogo)", type: "Producción", prio: "med", gate: "", due: "2026-01-23", desc: "Mapa visual estructura." },

    // SEMANA 4
    { id: 401, week: "W4", name: "✅ Sesión 3: Estructura final", status: "todo", owner: "Carmenza Alarcón (Cliente)", type: "Comité", prio: "high", gate: "", due: "2026-01-27", desc: "Cierre estructura formal." },
    { id: 402, week: "W4", name: "Diseñar Baseline (Test 1)", status: "todo", owner: "Andrés Tabla (Metodólogo)", type: "Evaluación", prio: "high", gate: "B", due: "2026-01-30", desc: "Escalas e instrucciones." },
    { id: 403, week: "W4", name: "Definir Rúbricas y Scoring", status: "todo", owner: "Andrés Tabla (Metodólogo)", type: "Evaluación", prio: "high", gate: "B", due: "2026-01-30", desc: "Reglas de ponderación." },

    // SEMANA 5
    { id: 501, week: "W5", name: "✅ Sesión 4: Validar Baseline", status: "todo", owner: "Carmenza Alarcón (Cliente)", type: "Comité", prio: "high", gate: "", due: "2026-02-03", desc: "Validar medición y reportes." },
    { id: 502, week: "W5", name: "Matriz de recomendación", status: "todo", owner: "Andrés Tabla (Metodólogo)", type: "Metodología", prio: "high", gate: "", due: "2026-02-06", desc: "Brecha → Intervención." },
    { id: 503, week: "W5", name: "Biblioteca mínima", status: "todo", owner: "Andrés Tabla (Metodólogo)", type: "Inventario", prio: "med", gate: "", due: "2026-02-06", desc: "Contenido faltante." },

    // SEMANA 6
    { id: 601, week: "W6", name: "✅ Sesión 5: Aprobar Matriz", status: "todo", owner: "Carmenza Alarcón (Cliente)", type: "Comité", prio: "high", gate: "", due: "2026-02-10", desc: "Validar reglas de progresión." },
    { id: 602, week: "W6", name: "Redacción Dossier Maestro", status: "todo", owner: "Andrés Tabla (Metodólogo)", type: "Producción", prio: "high", gate: "", due: "2026-02-13", desc: "Documento madre." },
    { id: 603, week: "W6", name: "Ensamble del Toolkit", status: "todo", owner: "Andrés Tabla (Metodólogo)", type: "Producción", prio: "med", gate: "", due: "2026-02-13", desc: "Plantillas y checklists." },

    // SEMANA 7
    { id: 701, week: "W7", name: "✅ Sesión 6: Revisión Dossier", status: "todo", owner: "Carmenza Alarcón (Cliente)", type: "Comité", prio: "high", gate: "", due: "2026-02-17", desc: "Revisión narrativa." },
    { id: 702, week: "W7", name: "Guía del Mentor", status: "todo", owner: "Andrés Tabla (Metodólogo)", type: "Producción", prio: "high", gate: "C", due: "2026-02-20", desc: "Scripts y objeciones." },
    { id: 703, week: "W7", name: "Workbook Participante", status: "todo", owner: "Andrés Tabla (Metodólogo)", type: "Producción", prio: "high", gate: "C", due: "2026-02-20", desc: "Ejercicios usuario." },

    // SEMANA 8
    { id: 801, week: "W8", name: "✅ Sesión 7: Validar Guía", status: "todo", owner: "Carmenza Alarcón (Cliente)", type: "Comité", prio: "high", gate: "", due: "2026-02-24", desc: "Validar tono y estilo." },
    { id: 802, week: "W8", name: "Consolidación v1.0", status: "todo", owner: "Andrés Tabla (Metodólogo)", type: "IP-Ready", prio: "high", gate: "D", due: "2026-02-27", desc: "Control consistencia." },
    { id: 803, week: "W8", name: "Paquete IP-ready", status: "todo", owner: "Andrés Tabla (Metodólogo)", type: "IP-Ready", prio: "high", gate: "D", due: "2026-02-27", desc: "Metadatos y versionado." },

    // SEMANA 9
    { id: 901, week: "W9", name: "✅ Sesión 8: Cierre (Freeze)", status: "todo", owner: "Carmenza Alarcón (Cliente)", type: "Comité", prio: "med", gate: "", due: "2026-03-03", desc: "Aprobación final." }
];

if (!process.env.DATABASE_URL) {
    console.error("Error: DATABASE_URL is not set.");
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    const client = await pool.connect();
    try {
        console.log("Creating table...");
        await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id BIGINT PRIMARY KEY,
        week TEXT,
        name TEXT,
        status TEXT,
        owner TEXT,
        type TEXT,
        prio TEXT,
        gate TEXT,
        due TEXT,
        description TEXT
      );
    `);

        console.log("Seeding data...");
        for (const t of SEED_TASKS) {
            await client.query(`
        INSERT INTO tasks (id, week, name, status, owner, type, prio, gate, due, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING;
      `, [t.id, t.week, t.name, t.status, t.owner, t.type, t.prio, t.gate, t.due, t.desc]);
        }

        console.log("✅ Database initialized successfully!");
    } catch (err) {
        console.error("Error seeding DB:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

main();
