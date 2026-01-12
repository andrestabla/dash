const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function seed() {
    const client = await pool.connect();
    try {
        console.log('🚀 Seeding EXHAUSTIVE Mega Tablero de Ejemplo...');

        // 1. Get Admin User
        const userRes = await client.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        if (userRes.rows.length === 0) {
            console.error('❌ No admin user found to own the demo dashboard');
            return;
        }
        const adminId = userRes.rows[0].id;

        // 2. Clear existing demo dashboards
        await client.query("DELETE FROM dashboards WHERE is_demo = TRUE");

        // 3. Define Settings
        const settings = {
            weeks: [
                { id: "W1", name: "W1 · Estrategia" },
                { id: "W2", name: "W2 · Definición" },
                { id: "W3", name: "W3 · Diseño UX/UI" },
                { id: "W4", name: "W4 · Prototipado" },
                { id: "W5", name: "W5 · Desarrollo Corazón" },
                { id: "W6", name: "W6 · Integración API" },
                { id: "W7", name: "W7 · QA & Testing" },
                { id: "W8", name: "W8 · Ajustes Finales" },
                { id: "W9", name: "W9 · Lanzamiento" }
            ],
            owners: ["Andrés Tabla", "Beatriz Soler", "Carlos Ruiz", "Diana Prince", "Sistema"],
            types: ["Estrategia", "Diseño", "Desarrollo", "Infraestructura", "Marketing", "Legal", "Soporte"],
            gates: ["A - Inicio", "B - Diseño", "C - Beta", "D - Prod"],
            icon: "💎",
            color: "#4f46e5",
            statuses: [
                { id: "todo", name: "Por ejecutar", color: "#64748b", percentage: 0 },
                { id: "doing", name: "En progreso", color: "#3b82f6", percentage: 40 },
                { id: "review", name: "Validación", color: "#f59e0b", percentage: 80 },
                { id: "blocked", name: "Bloqueado", color: "#ef4444", percentage: 10 },
                { id: "done", name: "Completado", color: "#10b981", percentage: 100 },
            ]
        };

        const dashRes = await client.query(
            "INSERT INTO dashboards (name, description, settings, owner_id, is_demo, start_date, end_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
            [
                "Mega Tablero de Ejemplo (Exhaustivo)",
                "Demostración completa de flujos de trabajo profesionales, desde la concepción hasta el despliegue a gran escala.",
                JSON.stringify(settings),
                adminId,
                true,
                new Date(),
                new Date(Date.now() + 64 * 24 * 60 * 60 * 1000)
            ]
        );
        const dashId = dashRes.rows[0].id;

        // 4. Detailed Tasks
        const tasks = [
            // ESTRATEGIA (W1)
            { name: "Definición de objetivos OKR Q1", status: "done", owner: "Andrés Tabla", week: "W1", type: "Estrategia", prio: "high", gate: "A - Inicio", desc: "Establecer metas claras para todo el equipo." },
            { name: "Análisis de competencia global", status: "done", owner: "Beatriz Soler", week: "W1", type: "Estrategia", prio: "med", gate: "A - Inicio", desc: "Benchmark detallado de los 5 principales competidores." },
            { name: "Selección de stack tecnológico", status: "done", owner: "Sistema", week: "W1", type: "Infraestructura", prio: "high", gate: "A - Inicio", desc: "Decisión técnica sobre Next.js y Neon DB." },

            // DISEÑO (W2-W3)
            { name: "User Personas y Storytelling", status: "done", owner: "Beatriz Soler", week: "W2", type: "Diseño", prio: "med", gate: "B - Diseño", desc: "Definir quién es nuestro usuario ideal." },
            { name: "Wireframes de alta fidelidad", status: "doing", owner: "Beatriz Soler", week: "W3", type: "Diseño", prio: "high", gate: "B - Diseño", desc: "Diseño de la interfaz principal en Figma." },
            { name: "Guía de estilos y Design System", status: "todo", owner: "Carlos Ruiz", week: "W3", type: "Diseño", prio: "low", gate: "B - Diseño", desc: "Creación de componentes reutilizables." },

            // DESARROLLO (W4-W6)
            { name: "Configuración de CI/CD", status: "done", owner: "Andrés Tabla", week: "W4", type: "Infraestructura", prio: "high", gate: "C - Beta", desc: "Automatización de despliegues en Vercel." },
            { name: "Módulo de autenticación SSO", status: "doing", owner: "Diana Prince", week: "W5", type: "Desarrollo", prio: "high", gate: "C - Beta", desc: "Integración con Google y Microsoft OIDC." },
            { name: "Dashboard de analítica avanzada", status: "doing", owner: "Sistema", week: "W5", type: "Desarrollo", prio: "med", gate: "C - Beta", desc: "Gráficos interactivos usando Recharts." },
            { name: "API de gestión de documentos", status: "blocked", owner: "Carlos Ruiz", week: "W6", type: "Desarrollo", prio: "high", gate: "C - Beta", desc: "Pendiente de definición de permisos R2." },

            // MARKETING & LEGAL
            { name: "Revisión de términos y privacidad", status: "review", owner: "Diana Prince", week: "W8", type: "Legal", prio: "high", gate: "D - Prod", desc: "Asegurar cumplimiento de GDPR." },
            { name: "Campaña de lanzamiento en LinkedIn", status: "todo", owner: "Beatriz Soler", week: "W9", type: "Marketing", prio: "med", gate: "D - Prod", desc: "Generación de leads orgánicos." },

            // REPETICIÓN PARA LLENAR EL TABLERO
            { name: "Optimización de base de datos", status: "todo", owner: "Sistema", week: "W7", type: "Infraestructura", prio: "med", gate: "C - Beta", desc: "Indexación de tablas críticas." },
            { name: "Pruebas de carga 10k usuarios", status: "todo", owner: "Diana Prince", week: "W7", type: "Infraestructura", prio: "high", gate: "D - Prod", desc: "Verificar estabilidad bajo estrés." },
            { name: "Traducción a 5 idiomas", status: "doing", owner: "Carlos Ruiz", week: "W8", type: "Marketing", prio: "low", gate: "D - Prod", desc: "Internacionalización de la plataforma." },
            { name: "Video promocional de producto", status: "review", owner: "Beatriz Soler", week: "W9", type: "Marketing", prio: "med", gate: "D - Prod", desc: "Demo de 60 segundos." },
            { name: "Soporte nivel 1 post-lanzamiento", status: "todo", owner: "Diana Prince", week: "W9", type: "Soporte", prio: "high", gate: "D - Prod", desc: "Atención a feedback inmediato." }
        ];

        for (const t of tasks) {
            await client.query(
                "INSERT INTO tasks (id, dashboard_id, name, status, owner, week, type, prio, description, gate) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
                [`task-demo-${Math.random().toString(36).substr(2, 9)}`, dashId, t.name, t.status, t.owner, t.week, t.type, t.prio, t.desc, t.gate]
            );
        }

        console.log(`✅ ${tasks.length} tasks generated for the Mega Tablero.`);

        // 5. Add some collaborators to the dashboard
        const otherUsers = await client.query("SELECT id FROM users WHERE id != $1 LIMIT 5", [adminId]);
        for (const u of otherUsers.rows) {
            await client.query("INSERT INTO dashboard_user_permissions (dashboard_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING", [dashId, u.id, 'editor']);
        }

        console.log('✅ EXHAUSTIVE Demo Dashboard seeded successfully!');
    } catch (e) {
        console.error('❌ Seeding failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
