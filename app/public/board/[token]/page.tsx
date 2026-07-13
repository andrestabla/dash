"use client";

import { useState, useEffect, use, useMemo } from "react";
import Link from 'next/link';
import {
    LayoutGrid,
    List,
    BarChart2,
    Search,
    ExternalLink,
    X,
    Calendar,
    User,
    Flag,
    Tag,
    Info,
    Users,
    LockKeyhole,
    Plus,
    Columns,
    ArrowLeft,
    Hash,
    MessageSquare,
    DoorOpen
} from 'lucide-react';
import UserTour from "@/components/UserTour";
import CollaborativeCanvas from "@/components/CollaborativeCanvas";
import { getDashboardKind, normalizeCanvasDocument, type CanvasDocument, type DashboardKind } from "@/lib/canvas";

interface Task {
    id: number | string;
    week: string;
    name: string;
    status: string;
    owner: string;
    assignees?: { name: string }[];
    type: string;
    prio: string;
    gate: string;
    due: string;
    desc: string;
    dashboard_id: string;
}

interface StatusColumn {
    id: string;
    name: string;
    color: string;
    percentage?: number;
}

interface BoardSettings {
    weeks: { id: string; name: string }[];
    owners: string[];
    types: string[];
    gates: string[];
    icon?: string;
    color?: string;
    statuses?: StatusColumn[];
    dashboardType?: DashboardKind;
    canvas?: CanvasDocument;
}

const DEFAULT_STATUSES: StatusColumn[] = [
    { id: "todo", name: "Por hacer", color: "#64748b" },
    { id: "doing", name: "En proceso", color: "#3b82f6" },
    { id: "review", name: "Revisión", color: "#f59e0b" },
    { id: "done", name: "Hecho", color: "#10b981" },
];

/** All responsibles of a task — its assignees, or the legacy single owner. */
function taskAssigneeNames(task: Task): string[] {
    if (task.assignees && task.assignees.length > 0) {
        return task.assignees.map((a) => a.name).filter(Boolean);
    }
    return task.owner ? [task.owner] : [];
}

export default function PublicBoardPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [tasks, setTasks] = useState<Task[]>([]);
    const [settings, setSettings] = useState<BoardSettings | null>(null);
    const [dashboardType, setDashboardType] = useState<DashboardKind>('kanban');
    const [dashboardName, setDashboardName] = useState("");
    const [statuses, setStatuses] = useState<StatusColumn[]>(DEFAULT_STATUSES);
    const [comments, setComments] = useState<any[]>([]);

    const [activeTab, setActiveTab] = useState<"kanban" | "canvas" | "list" | "data">("kanban");
    const [filters, setFilters] = useState({ search: "", week: "", owner: "" });
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isTourOpen, setIsTourOpen] = useState(true);

    // Stable canvas document so the read-only viewer keeps its local fold state.
    const canvasDocument = useMemo(
        () => normalizeCanvasDocument(settings?.canvas ?? null),
        [settings?.canvas]
    );

    useEffect(() => {
        // Enforce light mode cleanup on mount
        document.documentElement.classList.remove('dark');

        if (!token) return;

        fetch(`/api/public/board/${token}`)
            .then(res => {
                if (!res.ok) throw new Error("Tablero no encontrado o privado");
                return res.json();
            })
            .then(data => {
                setTasks(data.tasks);
                if (data.dashboard && data.dashboard.settings) {
                    const kind = getDashboardKind(data.dashboard.settings);
                    setDashboardType(kind);
                    setSettings({
                        ...data.dashboard.settings,
                        dashboardType: kind,
                        canvas: kind === 'canvas'
                            ? normalizeCanvasDocument(data.dashboard.settings?.canvas)
                            : undefined
                    });
                    setDashboardName(data.dashboard.name);
                    if (data.dashboard.settings.statuses) {
                        setStatuses(data.dashboard.settings.statuses);
                    }
                    if (kind === 'canvas') {
                        setActiveTab('canvas');
                    }
                }
                if (data.comments) {
                    setComments(data.comments);
                }
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [token]);

    const renderContentWithLinks = (text: string) => {
        if (!text) return "";
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = text.split(urlRegex);
        return parts.map((part, i) => {
            if (part.match(urlRegex)) {
                return (
                    <a
                        key={i}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline break-all"
                        onClick={e => e.stopPropagation()}
                    >
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    const filteredTasks = useMemo(() => {
        return tasks.filter((t: Task) => {
            if (filters.week && t.week !== filters.week) return false;
            if (filters.owner && t.owner !== filters.owner) return false;
            if (filters.search && !((t.name + t.owner).toLowerCase().includes(filters.search.toLowerCase()))) return false;
            return true;
        });
    }, [tasks, filters]);

    const calculateProgress = () => {
        if (tasks.length === 0) return 0;
        const doneTasks = tasks.filter(t => t.status === 'done').length;
        return Math.round((doneTasks / tasks.length) * 100);
    };

    // TOUR STEPS — adapted to the board type (kanban vs. canvas/lienzo)
    const kanbanTourSteps = [
        {
            title: "👋 Bienvenido a Dash!",
            description: "Este es un tablero de demostración interactivo. Aquí podrás ver cómo se organizan los proyectos reales en nuestra plataforma. Tienes acceso completo de lectura a todas las tareas detalladas."
        },
        {
            title: "👀 Vistas Versátiles",
            description: "Usa estos botones Superiores (Tablero, Lista, Datos) para cambiar la perspectiva. ¿Prefieres Kanban? ¿Una lista tipo Excel? ¿O métricas clave? Tú eliges cómo ver la información."
        },
        {
            title: "🔍 Filtros Potentes",
            description: "Encuentra lo que necesitas al instante. Filtra por Semana (W1, W2...), por Responsable o busca por texto. Ideal para reuniones de seguimiento y focalización."
        },
        {
            title: "🚦 Estados Personalizables",
            description: "Las columnas (Por ejecutar, En progreso, etc.) representan el flujo de trabajo real. Cada estado tiene un color y un porcentaje de avance asociado para el cálculo automático de progreso."
        },
        {
            title: "⚡ Tarjetas de Tarea",
            description: "Cada tarjeta es una unidad de trabajo. Muestra el estado, la prioridad (Baja/Media/Alta), el Gate (fase del proyecto) y el responsable. ¡Haz clic en una tarea para ver todos sus detalles!"
        },
        {
            title: "🔒 Modo Lectura",
            description: "Como es un demo público, estás en modo 'Solo Lectura'. Puedes explorar todo, abrir tareas y ver comentarios, pero no podrás editar ni mover tarjetas. ¡Crea tu cuenta para tener tu propio espacio!"
        }
    ];

    const canvasTourSteps = [
        {
            title: "👋 Bienvenido a Dash!",
            description: "Este es un lienzo interactivo: un diagrama de flujo que representa un proceso real. Tienes acceso completo de lectura a todo su contenido."
        },
        {
            title: "🗺️ Recorre el lienzo",
            description: "Arrastra con el cursor para desplazarte libremente por el diagrama. Es un espacio amplio, así que muévete con total libertad para explorarlo."
        },
        {
            title: "🔎 Zoom y encuadre",
            description: "Con los controles de la esquina inferior izquierda puedes acercar, alejar o pulsar 'Encuadrar' para ver todo el flujo de un vistazo."
        },
        {
            title: "🧩 Elementos y conexiones",
            description: "Cada figura es un paso, decisión o documento del proceso. Las flechas indican cómo se conecta el flujo, de principio a fin."
        },
        {
            title: "➕ Plega y despliega ramas",
            description: "Los nodos con el botón − / + te permiten plegar o desplegar ramas del flujo para concentrarte en la parte que te interesa. Las burbujas 💬 muestran comentarios."
        },
        {
            title: "🔒 Modo Lectura",
            description: "Como es un demo público, estás en modo 'Solo Lectura'. Puedes navegar, hacer zoom, plegar ramas y ver comentarios, pero no editar. ¡Crea tu cuenta para tener tu propio espacio!"
        }
    ];

    const tourSteps = dashboardType === 'canvas' ? canvasTourSteps : kanbanTourSteps;

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200">
                    <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                        <LockKeyhole className="h-8 w-8 text-red-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Acceso Restringido</h1>
                    <p className="text-slate-600 mb-6">{error}</p>
                    <Link href="/" className="inline-flex items-center justify-center w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all">
                        Volver al Inicio
                    </Link>
                </div>
            </div>
        );
    }

    // --- RENDER FUNCTIONS ---

    const renderKanban = () => (
        <div className="kanban-view h-full overflow-x-auto">
            <div className="flex gap-6 h-full pb-5 w-max">
                {statuses.map((st: StatusColumn) => {
                    const colTasks = filteredTasks.filter((t: Task) => t.status === st.id);
                    return (
                        <div key={st.id} className="lane w-[320px] flex flex-col bg-slate-50 rounded-2xl shadow-sm border border-slate-200">
                            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-white rounded-t-2xl">
                                <div className="flex items-center gap-3">
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: st.color }} />
                                    <span className="font-bold text-sm uppercase text-slate-700">{st.name}</span>
                                    <span className="px-2.5 py-0.5 bg-slate-100 rounded-full text-xs font-bold text-slate-600 shadow-sm border border-slate-200">{colTasks.length}</span>
                                </div>
                                <button disabled className="text-slate-400 hover:text-blue-500 transition-colors cursor-not-allowed">
                                    <Plus size={18} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 max-h-[calc(100vh-250px)] bg-slate-50/50">
                                {colTasks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm italic m-2">
                                        No hay tareas aquí.
                                    </div>
                                ) : (
                                    colTasks.map((t: Task) => (
                                        <div
                                            key={t.id}
                                            className="kanban-card p-4 bg-white rounded-xl shadow-sm border border-slate-200 cursor-pointer transition-all hover:shadow-md hover:border-blue-400 relative overflow-hidden group"
                                            onClick={() => setSelectedTask(t)}
                                        >
                                            <div className="flex items-start gap-2 mb-2">
                                                <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${t.prio === 'high' ? 'bg-red-500' : t.prio === 'med' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                                <h4 className="font-semibold text-slate-800 leading-tight pr-2">{t.name}</h4>
                                            </div>
                                            <div className="flex justify-between items-center text-xs text-slate-500 mt-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 bg-slate-100 rounded text-[11px] font-semibold text-slate-600 border border-slate-200">{t.week}</span>
                                                    {t.gate && <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-[11px] font-semibold border border-purple-100">⛩️ {t.gate}</span>}
                                                </div>
                                                <div className="flex items-center gap-1 flex-wrap justify-end">
                                                    {(() => {
                                                        const people = taskAssigneeNames(t);
                                                        return (<>
                                                            {people.slice(0, 3).map((name, i) => (
                                                                <div key={i} className="flex items-center gap-1.5 bg-slate-50 px-1.5 py-0.5 rounded-full border border-slate-100">
                                                                    <User size={12} className="text-slate-400" />
                                                                    <span className="text-[11px] font-medium text-slate-600 truncate max-w-[72px]">{String(name).split(' ')[0]}</span>
                                                                </div>
                                                            ))}
                                                            {people.length > 3 && (
                                                                <span className="text-[11px] font-semibold text-slate-500 px-1" title={people.join(', ')}>+{people.length - 3}</span>
                                                            )}
                                                        </>);
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    const renderCanvasView = () => (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-2 sm:p-4">
            <div className="mb-2 sm:mb-4 flex items-center justify-between gap-2">
                <h3 className="text-slate-800 font-bold text-sm sm:text-base">Canvas (solo lectura)</h3>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full whitespace-nowrap">
                    {canvasDocument.nodes.length} nodos
                </span>
            </div>
            <p className="text-[11px] text-slate-400 mb-2 sm:hidden">
                Arrastra con un dedo para moverte · pellizca para acercar
            </p>
            <div className="h-[calc(100dvh-210px)] min-h-[420px] sm:h-[calc(100vh-260px)] sm:min-h-[520px]">
                <CollaborativeCanvas
                    canvasDocument={canvasDocument}
                    onChange={() => { /* read-only: viewers never persist */ }}
                    readOnly
                    accentColor={settings?.color || '#2563eb'}
                />
            </div>
        </div>
    );

    const renderListView = () => (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <table className="w-full table-auto">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tarea</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Semana</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Responsable</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Prioridad</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {filteredTasks.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="text-center py-10 text-slate-400 italic">No se encontraron tareas con los filtros aplicados.</td>
                        </tr>
                    ) : (
                        filteredTasks.map((t: Task) => (
                            <tr
                                key={t.id}
                                className="bg-white hover:bg-slate-50 transition-colors cursor-pointer"
                                onClick={() => setSelectedTask(t)}
                            >
                                <td className="px-6 py-4">
                                    <div className="font-semibold text-slate-800">{t.name}</div>
                                    {t.gate && <span className="mt-1 inline-flex px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-medium border border-purple-100">⛩️ {t.gate}</span>}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-medium text-slate-600 border border-slate-200">{t.week}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-slate-700">
                                        <User size={16} className="text-slate-400 shrink-0" /> {taskAssigneeNames(t).join(', ') || '—'}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span
                                        className="px-3 py-1 rounded-full text-xs font-bold"
                                        style={{
                                            backgroundColor: statuses.find((s: StatusColumn) => s.id === t.status)?.color + '20',
                                            color: statuses.find((s: StatusColumn) => s.id === t.status)?.color
                                        }}
                                    >
                                        {statuses.find((s: StatusColumn) => s.id === t.status)?.name}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-sm text-slate-700">
                                        {t.prio === 'high' && <><span className="text-red-500">🔴</span> Alta</>}
                                        {t.prio === 'med' && <><span className="text-amber-500">🟡</span> Media</>}
                                        {t.prio === 'low' && <><span className="text-blue-500">🟢</span> Baja</>}
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );

    // Mirror the private board's "Datos" (AnalyticsView) exactly so the public
    // data view is visually identical to the private one, which is the source
    // of truth. Same KPIs, charts, class names and styles.
    const renderDataView = () => {
        const totalTasks = tasks.length;
        const endStatusId = statuses[statuses.length - 1].id;
        const completedTasks = tasks.filter(t => t.status === endStatusId).length;
        const progress = totalTasks === 0 ? 0 : Math.round(tasks.reduce((acc, t) => {
            const st = statuses.find(s => s.id === t.status);
            return acc + (st?.percentage || 0);
        }, 0) / totalTasks);

        const weeklyData = (settings?.weeks || []).map(w => {
            const weekTasks = (tasks || []).filter(t => t?.week === w?.id);
            const done = weekTasks.filter(t => t?.status === endStatusId).length;
            const total = weekTasks.length;
            const weightedSum = weekTasks.reduce((acc, t) => {
                const st = statuses.find(s => s.id === t?.status);
                return acc + (st?.percentage || 0);
            }, 0);
            const percent = total === 0 ? 0 : Math.round(weightedSum / total);
            return { name: (w?.name || "Semana").split(' · ')[0], total, done, percent };
        });

        const assignments = new Map<string, number>();
        (settings?.owners || []).forEach(o => assignments.set(o, 0));
        (tasks || []).forEach(t => {
            if (t.status === endStatusId) return; // Skip done tasks
            if (t.assignees && t.assignees.length > 0) {
                t.assignees.forEach((a) => {
                    assignments.set(a.name, (assignments.get(a.name) || 0) + 1);
                });
            } else if (t.owner) {
                assignments.set(t.owner, (assignments.get(t.owner) || 0) + 1);
            }
        });
        const workloadData = Array.from(assignments.entries())
            .map(([name, value]) => ({ name: name.split(' (')[0], value }))
            .sort((a, b) => b.value - a.value);

        const statusData = (statuses || []).map(s => ({ ...s, count: (tasks || []).filter(t => t?.status === s?.id).length }));
        const gateData = (settings?.gates || []).map(g => {
            const gateTasks = (tasks || []).filter(t => t?.gate === g);
            const isClosed = gateTasks.length > 0 && gateTasks.every(t => t?.status === endStatusId);
            return { name: String(g), total: gateTasks.length, closed: isClosed };
        });

        return (
            <div className="animate-fade-in">
                <div className="analytics-grid">
                    <div className="kpi-card">
                        <div className="kpi-label">Progreso Total</div>
                        <div className="kpi-value" style={{ color: 'var(--primary)' }}>{progress}%</div>
                        <div className="kpi-sub">{completedTasks} de {totalTasks} tareas</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Tareas Activas</div>
                        <div className="kpi-value">{totalTasks - completedTasks}</div>
                        <div className="kpi-sub">Pendientes / En Curso</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">Próximo Hito</div>
                        <div className="kpi-value" style={{ fontSize: 24 }}>
                            {gateData.find(g => !g.closed)?.name ? `Gate ${gateData.find(g => !g.closed)?.name}` : "🏁 Finalizado"}
                        </div>
                    </div>

                    <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                        <h3>Velocidad Semanal</h3>
                        <div className="chart-container">
                            {weeklyData.map(d => (
                                <div key={d.name} className="bar-group">
                                    <div className="bar-bg">
                                        <div className="bar-fill" style={{ height: `${d.percent}%`, background: d.percent === 100 ? '#10b981' : 'var(--primary)' }}></div>
                                    </div>
                                    <div className="bar-label">{d.name}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="chart-card">
                        <h3>Carga de Trabajo</h3>
                        <div className="list-chart">
                            {workloadData.map(d => (
                                <div key={d.name} className="lc-row">
                                    <div className="lc-label">{d.name}</div>
                                    <div className="lc-bar-area">
                                        <div className="lc-bar" style={{ width: `${(d.value / (Math.max(...workloadData.map(x => x.value)) || 1)) * 100}%` }}></div>
                                    </div>
                                    <div className="lc-val">{d.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                        <h3>Estado del Proyecto</h3>
                        <div className="status-pill-bar">
                            {statusData.map(s => s.count > 0 && (
                                <div key={s.id} style={{ flex: s.count, background: s.color, height: 24 }} title={`${s.name}: ${s.count}`}></div>
                            ))}
                        </div>
                        <div className="legend">
                            {statusData.map(s => (
                                <div key={s.id} className="l-item">
                                    <span className="dot" style={{ background: s.color }}></span> {s.name} ({s.count})
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="chart-card">
                        <h3>Control de Gates</h3>
                        <div className="gate-list">
                            {gateData.map(g => (
                                <div key={g.name} className={`gate-item ${g.closed ? 'closed' : 'open'}`}>
                                    <div className="g-icon">{g.closed ? '🔒' : '🔓'}</div>
                                    <div className="g-name">Gate {g.name}</div>
                                    <div className="g-status">{g.closed ? 'Completado' : 'Abierto'}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <style jsx>{`
                    .analytics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; padding: 20px 0; }
                    .kpi-card { background: var(--panel); padding: 20px; border-radius: 12px; border: 1px solid var(--border); text-align: center; }
                    .kpi-value { font-size: 36px; font-weight: 800; margin: 10px 0; }
                    .kpi-label { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-dim); }
                    .chart-card { background: var(--panel); padding: 20px; border-radius: 12px; border: 1px solid var(--border); }
                    .chart-card h3 { margin: 0 0 15px 0; font-size: 16px; opacity: 0.9; }
                    .chart-container { display: flex; align-items: flex-end; justify-content: space-between; height: 150px; padding-top: 10px; }
                    .bar-group { display: flex; flex-direction: column; align-items: center; flex: 1; }
                    .bar-bg { width: 12px; height: 100px; background: var(--panel-hover); border-radius: 6px; display: flex; align-items: flex-end; overflow: hidden; }
                    .bar-label { font-size: 10px; margin-top: 8px; color: var(--text-dim); }
                    .bar-fill { width: 100%; transition: height 0.5s ease; border-radius: 6px; }
                    .list-chart { display: flex; flex-direction: column; gap: 8px; }
                    .lc-row { display: flex; align-items: center; gap: 10px; font-size: 13px; }
                    .lc-label { width: 80px; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                    .lc-bar-area { flex: 1; height: 8px; background: var(--panel-hover); border-radius: 4px; overflow: hidden; }
                    .lc-bar { height: 100%; background: #f59e0b; border-radius: 4px; }
                    .lc-val { width: 20px; text-align: right; font-weight: bold; }
                    .status-pill-bar { display: flex; border-radius: 12px; overflow: hidden; margin-bottom: 15px; }
                    .legend { display: flex; flex-wrap: wrap; gap: 15px; font-size: 12px; }
                    .l-item { display: flex; align-items: center; gap: 6px; }
                    .dot { width: 8px; height: 8px; borderRadius: 50%; }
                    .gate-list { display: flex; flex-direction: column; gap: 10px; }
                    .gate-item { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 8px; background: var(--panel-hover); border: 1px solid transparent; }
                    .gate-item.closed { background: #ecfdf5; border-color: #10b981; color: #064e3b; }
                    .gate-item.open { opacity: 0.7; }
                    .g-name { flex: 1; font-weight: 600; }
                    .g-status { font-size: 11px; text-transform: uppercase; }
                    @media (max-width: 900px) { .analytics-grid { grid-template-columns: 1fr; } .chart-card { grid-column: span 1 !important; } }
                `}</style>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
            {isTourOpen && <UserTour steps={tourSteps} onComplete={() => setIsTourOpen(false)} />}

            {/* Navbar */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-[1800px] mx-auto px-4 py-2.5 sm:py-0 sm:h-16 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <Link href="/" className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600 shrink-0">
                            <ArrowLeft size={20} />
                        </Link>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-base sm:text-xl font-bold text-slate-900 flex items-center gap-2 leading-tight">
                                    {settings?.icon || "📊"} {dashboardName}
                                </h1>
                                {dashboardType === 'canvas' ? (
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                                        {settings?.canvas?.nodes?.length || 0} nodos
                                    </span>
                                ) : (
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${calculateProgress() === 100
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-blue-100 text-blue-700'
                                        }`}>
                                        {calculateProgress()}% Completado
                                    </span>
                                )}
                                <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-semibold border border-blue-100 flex items-center gap-1">
                                    <LockKeyhole size={12} /> MODO LECTURA - VISTA PÚBLICA
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium tracking-wide mt-1 uppercase hidden sm:block">SOLO LECTURA • DASH DEMO</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Link
                            href="/register"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                        >
                            <ExternalLink size={18} />
                            Crear mi cuenta gratis
                        </Link>
                    </div>
                </div>
            </header>

            {/* Toolbar */}
            <div className="bg-white border-b border-slate-200 py-4 px-4 sm:sticky sm:top-16 z-20">
                <div className="max-w-[1800px] mx-auto flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        {dashboardType !== 'canvas' ? (
                            <>
                                <button
                                    disabled
                                    className="bg-blue-600/50 cursor-not-allowed text-white px-4 py-2.5 rounded-xl font-semibold hidden sm:flex items-center gap-2"
                                >
                                    <Plus size={18} /> Nueva Tarea
                                </button>
                                <button disabled className="text-slate-400 px-4 py-2.5 bg-slate-100 rounded-xl font-medium border border-slate-200 hidden sm:flex items-center gap-2 cursor-not-allowed">
                                    <Columns size={18} /> Nueva Columna
                                </button>

                                <div className="h-8 w-px bg-slate-200 mx-2 hidden lg:block"></div>

                                {/* Search */}
                                <div className="relative group flex-1 lg:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Buscar..."
                                        value={filters.search}
                                        onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
                                    />
                                </div>

                                {/* Filters */}
                                <select
                                    value={filters.week}
                                    onChange={(e) => setFilters({ ...filters, week: e.target.value })}
                                    className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium hover:border-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 cursor-pointer"
                                >
                                    <option value="">📅 Semanas</option>
                                    {settings?.weeks.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </select>

                                <select
                                    value={filters.owner}
                                    onChange={(e) => setFilters({ ...filters, owner: e.target.value })}
                                    className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium hover:border-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 cursor-pointer"
                                >
                                    <option value="">👤 Todos</option>
                                    {settings?.owners.map(o => (
                                        <option key={o} value={o}>{o}</option>
                                    ))}
                                </select>
                            </>
                        ) : (
                            <div className="text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-4 py-2.5 rounded-xl">
                                Lienzo colaborativo público (solo lectura)
                            </div>
                        )}
                    </div>

                    {/* View Toggles */}
                    <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200">
                        {dashboardType === 'canvas' ? (
                            <button
                                onClick={() => setActiveTab("canvas")}
                                className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === "canvas"
                                    ? "bg-white text-blue-600 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700"
                                    }`}
                            >
                                <LayoutGrid size={16} /> Lienzo
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => setActiveTab("kanban")}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === "kanban"
                                        ? "bg-white text-blue-600 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                        }`}
                                >
                                    <LayoutGrid size={16} /> Tablero
                                </button>
                                <button
                                    onClick={() => setActiveTab("list")}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === "list"
                                        ? "bg-white text-blue-600 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                        }`}
                                >
                                    <List size={16} /> Lista
                                </button>
                                <button
                                    onClick={() => setActiveTab("data")}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === "data"
                                        ? "bg-white text-blue-600 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                        }`}
                                >
                                    <BarChart2 size={16} /> Datos
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <main className="flex-1 overflow-x-hidden bg-slate-50">
                <div className="h-full p-6 max-w-[1800px] mx-auto min-h-[calc(100vh-200px)]">
                    {activeTab === "canvas" && renderCanvasView()}
                    {activeTab === "kanban" && dashboardType !== 'canvas' && renderKanban()}
                    {activeTab === "list" && dashboardType !== 'canvas' && renderListView()}
                    {activeTab === "data" && dashboardType !== 'canvas' && renderDataView()}
                </div>
            </main>

            {/* Task Details Modal (Read Only) */}
            {selectedTask && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setSelectedTask(null)}
                    />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200">

                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                            <div>
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider rounded-full">
                                        {selectedTask.type}
                                    </span>
                                    <span className="text-slate-400 text-sm font-mono flex items-center gap-1">
                                        <Hash size={14} /> ID: {selectedTask.id}
                                    </span>
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900 leading-tight">
                                    {selectedTask.name}
                                </h2>
                            </div>
                            <button
                                onClick={() => setSelectedTask(null)}
                                className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-8">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                                {/* Left Column: Description & Metadata */}
                                <div className="lg:col-span-2 space-y-8">
                                    {/* Status Bar */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-wrap gap-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-lg shadow-sm text-slate-500">
                                                <Calendar size={18} />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Semana</p>
                                                <p className="font-semibold text-slate-900">{settings?.weeks.find(w => w.id === selectedTask.week)?.name || selectedTask.week}</p>
                                            </div>
                                        </div>

                                        <div className="w-px bg-slate-200 hidden sm:block"></div>

                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-lg shadow-sm text-slate-500">
                                                <User size={18} />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Responsable</p>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                                                    {taskAssigneeNames(selectedTask).map((name, i) => (
                                                        <div key={i} className="flex items-center gap-1.5">
                                                            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] text-white font-bold">
                                                                {String(name).charAt(0).toUpperCase()}
                                                            </div>
                                                            <p className="font-semibold text-slate-900">{name}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Info size={16} className="text-blue-500" /> Descripción
                                        </h3>
                                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-slate-700 leading-relaxed whitespace-pre-wrap">
                                            {selectedTask.desc ? renderContentWithLinks(selectedTask.desc) : "Sin descripción."}
                                        </div>
                                    </div>

                                    {/* Discussion / Comments */}
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <MessageSquare size={16} className="text-purple-500" /> Discusión y Actualizaciones
                                        </h3>
                                        <div className="space-y-4">
                                            {comments.filter(c => String(c.task_id) === String(selectedTask.id)).length > 0 ? (
                                                comments
                                                    .filter(c => String(c.task_id) === String(selectedTask.id))
                                                    .map((comment) => (
                                                        <div key={comment.id} className="flex gap-4 group">
                                                            <div className="w-8 h-8 rounded-full bg-slate-500 flex items-center justify-center text-xs text-white font-bold shrink-0 shadow-sm border-2 border-white">
                                                                {comment.user_name ? comment.user_name.charAt(0).toUpperCase() : '?'}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="bg-slate-100 px-5 py-3 rounded-2xl rounded-tl-none text-sm text-slate-700 shadow-sm border border-slate-200/50">
                                                                    <div className="flex justify-between items-center mb-1">
                                                                        <span className="font-bold text-slate-800 text-xs">{comment.user_name}</span>
                                                                        <span className="text-[10px] text-slate-400">
                                                                            {new Date(comment.created_at).toLocaleString()}
                                                                        </span>
                                                                    </div>
                                                                    <p>{renderContentWithLinks(comment.content)}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                            ) : (
                                                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                    <p className="text-slate-400 text-sm">No hay comentarios en esta tarea.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Attributes */}
                                <div className="space-y-6">
                                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-200 pb-2">Detalles</h3>

                                        <div className="space-y-5">
                                            <div>
                                                <label className="text-xs text-slate-500 font-medium mb-1.5 block">Estado Actual</label>
                                                <div
                                                    className="px-3 py-2 rounded-lg text-sm font-bold border inline-block w-full"
                                                    style={{
                                                        borderColor: statuses.find(s => s.id === selectedTask.status)?.color,
                                                        backgroundColor: `${statuses.find(s => s.id === selectedTask.status)?.color}15`,
                                                        color: statuses.find(s => s.id === selectedTask.status)?.color
                                                    }}
                                                >
                                                    {statuses.find(s => s.id === selectedTask.status)?.name}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs text-slate-500 font-medium mb-1.5 block flex items-center gap-1"><Flag size={12} /> Prioridad</label>
                                                <div className={`px-3 py-2 rounded-lg text-sm font-bold border flex items-center gap-2 ${selectedTask.prio === 'high' ? 'bg-red-50 text-red-700 border-red-200' :
                                                        selectedTask.prio === 'med' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                            'bg-blue-50 text-blue-700 border-blue-200'
                                                    }`}>
                                                    <div className={`w-2 h-2 rounded-full ${selectedTask.prio === 'high' ? 'bg-red-500' :
                                                            selectedTask.prio === 'med' ? 'bg-amber-500' :
                                                                'bg-blue-500'
                                                        }`}></div>
                                                    {selectedTask.prio === 'high' ? 'Alta' : selectedTask.prio === 'med' ? 'Media' : 'Baja'}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs text-slate-500 font-medium mb-1.5 block flex items-center gap-1"><DoorOpen size={12} /> Gate (Fase)</label>
                                                <div className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 font-medium">
                                                    {selectedTask.gate || "N/A"}
                                                </div>
                                            </div>

                                            {selectedTask.due && (
                                                <div>
                                                    <label className="text-xs text-slate-500 font-medium mb-1.5 block flex items-center gap-1"><Calendar size={12} /> Fecha Límite</label>
                                                    <div className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 font-medium">
                                                        {new Date(selectedTask.due).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                                        <p className="text-xs text-blue-600 leading-relaxed text-center">
                                            🔒 Esta vista es de solo lectura. Únete a Dash para gestionar tus propios proyectos.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
