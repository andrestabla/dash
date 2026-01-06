import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import * as XLSX from 'xlsx';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Helper to fetch dashboard data
async function getDashboardData(client: any, dashboardId: string) {
    const dashRes = await client.query('SELECT * FROM dashboards WHERE id = $1', [dashboardId]);
    if (dashRes.rows.length === 0) return null;

    const dashboard = dashRes.rows[0];
    const tasksRes = await client.query('SELECT * FROM tasks WHERE dashboard_id = $1 ORDER BY week_id, status', [dashboardId]);
    const tasks = tasksRes.rows;

    return { dashboard, tasks };
}

// Helper to create a worksheet for a dashboard
function createDashboardSheet(dashboard: any, tasks: any[]) {
    // 1. Prepare data rows
    const rows = tasks.map(t => ({
        "Semana": t.week_id,
        "Tarea / Hito": t.title,
        "Estado": t.status,
        "Responsable": t.owner || "Sin asignar",
        "Tipo": t.type || "General",
        "Notas": t.notes || ""
    }));

    // 2. Create sheet
    const worksheet = XLSX.utils.json_to_sheet(rows);

    // 3. Add Title (Optional, trickier with simple json_to_sheet but good enough for now)
    // We can just rely on the sheet name being the project name

    // Auto-width columns
    const wscols = [
        { wch: 10 }, // Week
        { wch: 40 }, // Title
        { wch: 15 }, // Status
        { wch: 20 }, // Owner
        { wch: 15 }, // Type
        { wch: 30 }  // Notes
    ];
    worksheet['!cols'] = wscols;

    return worksheet;
}

export async function GET(request: Request) {
    console.log("[Export API] Started");
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type'); // 'dashboard' | 'folder'

    console.log(`[Export API] Request: id=${id}, type=${type}`);

    if (!id || !type) {
        console.error("[Export API] Missing parameters");
        return NextResponse.json({ error: 'Missing id or type' }, { status: 400 });
    }

    let client;
    try {
        console.log("[Export API] Connecting to DB...");
        client = await pool.connect();

        console.log("[Export API] Creating Workbook...");
        const workbook = XLSX.utils.book_new();
        let filename = "export.xlsx";

        if (type === 'dashboard') {
            console.log(`[Export API] Fetching data for dashboard ${id}`);
            const data = await getDashboardData(client, id);

            if (!data) {
                console.error(`[Export API] Dashboard ${id} not found`);
                return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
            }

            console.log(`[Export API] Found dashboard: ${data.dashboard.name}, Tasks: ${data.tasks.length}`);
            const sheet = createDashboardSheet(data.dashboard, data.tasks);
            XLSX.utils.book_append_sheet(workbook, sheet, "Proyecto");

            const cleanName = data.dashboard.name.replace(/[^a-z0-9]/gi, '_');
            filename = `${cleanName}.xlsx`;

        } else if (type === 'folder') {
            console.log(`[Export API] Fetching data for folder ${id}`);
            // 1. Get Folder Info
            const folderRes = await client.query('SELECT name FROM folders WHERE id = $1', [id]);
            if (folderRes.rows.length === 0) {
                console.error(`[Export API] Folder ${id} not found`);
                return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
            }
            const folderName = folderRes.rows[0].name;
            filename = `${folderName.replace(/[^a-z0-9]/gi, '_')}.xlsx`;

            // 2. Get Dashboards in Folder
            console.log(`[Export API] Fetching children dashboards for folder ${id}`);
            const dashRes = await client.query('SELECT id FROM dashboards WHERE folder_id = $1 ORDER BY created_at DESC', [id]);
            const dashboardIds = dashRes.rows.map((r: any) => r.id);
            console.log(`[Export API] Found ${dashboardIds.length} dashboards`);

            if (dashboardIds.length === 0) {
                const sheet = XLSX.utils.json_to_sheet([{ Info: "Carpeta vacía" }]);
                XLSX.utils.book_append_sheet(workbook, sheet, "Info");
            } else {
                for (const dId of dashboardIds) {
                    const data = await getDashboardData(client, dId);
                    if (data) {
                        const sheet = createDashboardSheet(data.dashboard, data.tasks);
                        let sheetName = data.dashboard.name.substring(0, 30).replace(/[:\/?*\[\]\\]/g, "");
                        if (workbook.SheetNames.includes(sheetName)) {
                            sheetName = sheetName.substring(0, 27) + Math.floor(Math.random() * 100);
                        }
                        XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
                    }
                }
            }
        } else {
            return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }

        console.log("[Export API] Writing workbook to buffer...");
        const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
        console.log("[Export API] Buffer created, sending response.");

        return new NextResponse(buf, {
            status: 200,
            headers: {
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
        });

    } catch (error: any) {
        console.error('[Export API] Critical Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    } finally {
        if (client) client.release();
    }
}
