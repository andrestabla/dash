import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import pool from '@/lib/db';

type Dashboard = {
    id: string;
    name: string;
    settings: any;
    folder_id: string | null;
};

type Task = {
    dashboard_id: string;
    week: string | null;
    name: string;
    status: string | null;
    owner: string | null;
    type: string | null;
    prio: string | null;
    gate: string | null;
    due: string | null;
    description: string | null;
};

function sanitizeFileName(name: string) {
    return (name || 'export')
        .replace(/[^a-z0-9_\-]/gi, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 80) || 'export';
}

function escapeCsvCell(value: unknown): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function buildCsv(headers: string[], rows: Array<Record<string, unknown>>) {
    const headerLine = headers.map(escapeCsvCell).join(',');
    const body = rows
        .map((row) => headers.map((header) => escapeCsvCell(row[header])).join(','))
        .join('\n');

    return `${headerLine}\n${body}`;
}

function resolveStatusName(settings: any, statusId: string | null) {
    if (!statusId) return '';
    const statuses = settings?.statuses;
    if (!Array.isArray(statuses)) return statusId;
    const found = statuses.find((item: any) => item?.id === statusId);
    return found?.name || statusId;
}

function taskToCsvRow(task: Task, dashboard: Dashboard, includeProject = false) {
    const base = {
        'Semana': task.week || '',
        'Tarea / Hito': task.name || '',
        'Estado': resolveStatusName(dashboard.settings, task.status),
        'Responsable': task.owner || 'Sin asignar',
        'Tipo': task.type || 'General',
        'Prioridad': task.prio || '',
        'Gate': task.gate || '',
        'Fecha Límite': task.due || '',
        'Descripción / Notas': task.description || '',
    } as Record<string, unknown>;

    if (!includeProject) return base;
    return { 'Proyecto': dashboard.name, ...base };
}

async function getAuthorizedDashboard(client: any, dashboardId: string, session: any) {
    const res = await client.query(
        `
            SELECT d.*
            FROM dashboards d
            WHERE d.id = $1
              AND (
                $3 = 'admin'
                OR d.owner_id = $2
                OR EXISTS (
                    SELECT 1
                    FROM dashboard_user_permissions dup
                    WHERE dup.dashboard_id = d.id
                      AND dup.user_id = $2
                )
                OR (
                    d.folder_id IS NOT NULL
                    AND EXISTS (
                        SELECT 1
                        FROM folder_collaborators fc
                        WHERE fc.folder_id = d.folder_id
                          AND fc.user_id = $2
                    )
                )
              )
            LIMIT 1
        `,
        [dashboardId, session.id, session.role]
    );

    return res.rows[0] as Dashboard | undefined;
}

async function getAuthorizedFolder(client: any, folderId: string, session: any) {
    const res = await client.query(
        `
            SELECT f.*
            FROM folders f
            WHERE f.id = $1
              AND (
                $3 = 'admin'
                OR f.owner_id = $2
                OR EXISTS (
                    SELECT 1
                    FROM folder_collaborators fc
                    WHERE fc.folder_id = f.id
                      AND fc.user_id = $2
                )
              )
            LIMIT 1
        `,
        [folderId, session.id, session.role]
    );

    return res.rows[0] as { id: string; name: string } | undefined;
}

export async function GET(request: Request) {
    const session = await getSession() as any;
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    if (!id || !type) {
        return NextResponse.json({ error: 'Missing id or type' }, { status: 400 });
    }

    const headersDashboard = [
        'Semana',
        'Tarea / Hito',
        'Estado',
        'Responsable',
        'Tipo',
        'Prioridad',
        'Gate',
        'Fecha Límite',
        'Descripción / Notas',
    ];

    const headersFolder = ['Proyecto', ...headersDashboard];

    const client = await pool.connect();

    try {
        if (type === 'dashboard') {
            const dashboard = await getAuthorizedDashboard(client, id, session);
            if (!dashboard) {
                return NextResponse.json({ error: 'Dashboard not found or forbidden' }, { status: 404 });
            }

            const tasksRes = await client.query(
                `
                    SELECT dashboard_id, week, name, status, owner, type, prio, gate, due, description
                    FROM tasks
                    WHERE dashboard_id = $1
                    ORDER BY week, status, created_at
                `,
                [dashboard.id]
            );

            const rows = tasksRes.rows.map((task: Task) => taskToCsvRow(task, dashboard, false));
            const csv = '\uFEFF' + buildCsv(headersDashboard, rows);
            const filename = `${sanitizeFileName(dashboard.name)}.csv`;

            return new NextResponse(csv, {
                status: 200,
                headers: {
                    'Cache-Control': 'no-store',
                    'Content-Disposition': `attachment; filename="${filename}"`,
                    'Content-Type': 'text/csv; charset=utf-8',
                },
            });
        }

        if (type === 'folder') {
            const folder = await getAuthorizedFolder(client, id, session);
            if (!folder) {
                return NextResponse.json({ error: 'Folder not found or forbidden' }, { status: 404 });
            }

            const dashboardsRes = await client.query(
                `
                    SELECT d.id, d.name, d.settings, d.folder_id
                    FROM dashboards d
                    WHERE d.folder_id = $1
                      AND (
                        $3 = 'admin'
                        OR d.owner_id = $2
                        OR EXISTS (
                            SELECT 1
                            FROM dashboard_user_permissions dup
                            WHERE dup.dashboard_id = d.id
                              AND dup.user_id = $2
                        )
                        OR EXISTS (
                            SELECT 1
                            FROM folder_collaborators fc
                            WHERE fc.folder_id = $1
                              AND fc.user_id = $2
                        )
                      )
                    ORDER BY d.created_at DESC
                `,
                [id, session.id, session.role]
            );

            const dashboards = dashboardsRes.rows as Dashboard[];

            if (dashboards.length === 0) {
                const csv = '\uFEFF' + buildCsv(['Info'], [{ Info: 'Carpeta vacía' }]);
                const filename = `${sanitizeFileName(folder.name)}.csv`;
                return new NextResponse(csv, {
                    status: 200,
                    headers: {
                        'Cache-Control': 'no-store',
                        'Content-Disposition': `attachment; filename="${filename}"`,
                        'Content-Type': 'text/csv; charset=utf-8',
                    },
                });
            }

            const dashboardIds = dashboards.map((d) => d.id);
            const tasksRes = await client.query(
                `
                    SELECT dashboard_id, week, name, status, owner, type, prio, gate, due, description
                    FROM tasks
                    WHERE dashboard_id = ANY($1::uuid[])
                    ORDER BY dashboard_id, week, status, created_at
                `,
                [dashboardIds]
            );

            const taskMap = new Map<string, Task[]>();
            for (const task of tasksRes.rows as Task[]) {
                if (!taskMap.has(task.dashboard_id)) taskMap.set(task.dashboard_id, []);
                taskMap.get(task.dashboard_id)!.push(task);
            }

            const rows: Array<Record<string, unknown>> = [];

            for (const dashboard of dashboards) {
                const tasks = taskMap.get(dashboard.id) || [];
                if (tasks.length === 0) {
                    rows.push({
                        'Proyecto': dashboard.name,
                        'Semana': '',
                        'Tarea / Hito': 'Sin tareas',
                        'Estado': '',
                        'Responsable': '',
                        'Tipo': '',
                        'Prioridad': '',
                        'Gate': '',
                        'Fecha Límite': '',
                        'Descripción / Notas': '',
                    });
                    continue;
                }

                for (const task of tasks) {
                    rows.push(taskToCsvRow(task, dashboard, true));
                }
            }

            const csv = '\uFEFF' + buildCsv(headersFolder, rows);
            const filename = `${sanitizeFileName(folder.name)}.csv`;

            return new NextResponse(csv, {
                status: 200,
                headers: {
                    'Cache-Control': 'no-store',
                    'Content-Disposition': `attachment; filename="${filename}"`,
                    'Content-Type': 'text/csv; charset=utf-8',
                },
            });
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json(
            {
                error: 'Internal Server Error',
                details: process.env.NODE_ENV === 'production' ? undefined : error.message,
            },
            { status: 500 }
        );
    } finally {
        client.release();
    }
}
