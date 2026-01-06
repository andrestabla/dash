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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type'); // 'dashboard' | 'folder'

    if (!id || !type) {
        return NextResponse.json({ error: 'Missing id or type' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
        const workbook = XLSX.utils.book_new();
        let filename = "export.xlsx";

        if (type === 'dashboard') {
            const data = await getDashboardData(client, id);
            if (!data) return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });

            const sheet = createDashboardSheet(data.dashboard, data.tasks);
            XLSX.utils.book_append_sheet(workbook, sheet, "Proyecto");
            filename = `${data.dashboard.name.replace(/[^a-z0-9]/gi, '_')}.xlsx`;

        } else if (type === 'folder') {
            // 1. Get Folder Info
            const folderRes = await client.query('SELECT name FROM folders WHERE id = $1', [id]);
            if (folderRes.rows.length === 0) return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
            const folderName = folderRes.rows[0].name;
            filename = `${folderName.replace(/[^a-z0-9]/gi, '_')}.xlsx`;

            // 2. Get Dashboards in Folder
            const dashRes = await client.query('SELECT id FROM dashboards WHERE folder_id = $1 ORDER BY created_at DESC', [id]);
            const dashboardIds = dashRes.rows.map((r: any) => r.id);

            if (dashboardIds.length === 0) {
                // Empty folder, create dummy sheet
                const sheet = XLSX.utils.json_to_sheet([{ Info: "Carpeta vacía" }]);
                XLSX.utils.book_append_sheet(workbook, sheet, "Info");
            } else {
                for (const dId of dashboardIds) {
                    const data = await getDashboardData(client, dId);
                    if (data) {
                        const sheet = createDashboardSheet(data.dashboard, data.tasks);
                        // Sheet name max length is 31 chars
                        let sheetName = data.dashboard.name.substring(0, 30).replace(/[:\/?*\[\]\\]/g, "");
                        // Ensure unique sheet names if duplicates exist (simple counter)
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

        // Generate Buffer
        const buf = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

        // Return response
        return new NextResponse(buf, {
            status: 200,
            headers: {
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
        });

    } catch (error) {
        console.error('Export error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    } finally {
        client.release();
    }
}
