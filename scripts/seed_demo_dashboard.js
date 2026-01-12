const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function seed() {
    const client = await pool.connect();
    try {
        console.log('🚀 Seeding Mega Tablero de Ejemplo...');

        // 1. Get Admin User
        const userRes = await client.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
        if (userRes.rows.length === 0) {
            console.error('❌ No admin user found to own the demo dashboard');
            return;
        }
        const adminId = userRes.rows[0].id;

        // 2. Clear existing demo dashboards
        await client.query("DELETE FROM dashboards WHERE is_demo = TRUE");

        // 3. Create Demo Dashboard
        const settings = {
            weeks: [
                { id: "W1", name: "W1 · Planificación" },
                { id: "W2", name: "W2 · Diseño" },
                { id: "W3", name: "W3 · Desarrollo" },
                { id: "W4", name: "W4 · Pruebas" },
                { id: "W5", name: "W5 · Lanzamiento" }
            ],
            owners: ["Andrés Tabla", "Demo User", "Sistema"],
            types: ["Feature", "Bug", "Mejora", "Documentación"],
            gates: ["A", "B", "C"],
            icon: "🌟",
            color: "#8b5cf6",
            statuses: [
                { id: "todo", name: "Por hacer", color: "#64748b", percentage: 0 },
                { id: "doing", name: "En proceso", color: "#3b82f6", percentage: 50 },
                { id: "review", name: "Revisión", color: "#f59e0b", percentage: 80 },
                { id: "done", name: "Hecho", color: "#10b981", percentage: 100 },
            ]
        };

        const dashRes = await client.query(
            "INSERT INTO dashboards (name, description, settings, owner_id, is_demo, start_date, end_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
            ["Mega Tablero de Ejemplo (Demo)", "Este tablero muestra todas las funcionalidades habilitadas de la plataforma.", JSON.stringify(settings), adminId, true, new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]
        );
        const dashId = dashRes.rows[0].id;

        // 4. Create Tasks
        const tasks = [
            { name: "Explorar la vista Kanban", status: "done", owner: "Demo User", week: "W1", type: "Feature", prio: "high", desc: "Usa el arrastrar y soltar para mover tareas." },
            { name: "Configurar notificaciones", status: "doing", owner: "Andrés Tabla", week: "W2", type: "Mejora", prio: "med", desc: "Ajusta tus preferencias en el perfil." },
            { name: "Revisar analítica consolidada", status: "todo", owner: "Sistema", week: "W3", type: "Mejora", prio: "low", desc: "Visualiza el progreso global de tus carpetas." },
            { name: "Probar filtros avanzados", status: "review", owner: "Demo User", week: "W1", type: "Feature", prio: "med", desc: "Filtra por semana, responsable o texto." },
            { name: "Añadir comentarios a tareas", status: "done", owner: "Andrés Tabla", week: "W1", type: "Documentación", prio: "high", desc: "Haz clic en una tarea para ver sus detalles y comentar." }
        ];

        for (const t of tasks) {
            await client.query(
                "INSERT INTO tasks (id, dashboard_id, name, status, owner, week, type, prio, description) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
                [`task-demo-${Math.random().toString(36).substr(2, 9)}`, dashId, t.name, t.status, t.owner, t.week, t.type, t.prio, t.desc]
            );
        }

        console.log('✅ Demo Dashboard seeded successfully!');
    } catch (e) {
        console.error('❌ Seeding failed:', e);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
