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
    DoorOpen,
    Check
} from 'lucide-react';
import UserTour from "@/components/UserTour";

interface Task {
    id: number | string;
    week: string;
    name: string;
    status: string;
    owner: string;
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
}

interface BoardSettings {
    weeks: { id: string; name: string }[];
    owners: string[];
    types: string[];
    gates: string[];
    icon?: string;
    color?: string;
    statuses?: StatusColumn[];
}

const DEFAULT_STATUSES: StatusColumn[] = [
    { id: "todo", name: "Por hacer", color: "#64748b" },
    { id: "doing", name: "En proceso", color: "#3b82f6" },
    { id: "review", name: "Revisión", color: "#f59e0b" },
    { id: "done", name: "Hecho", color: "#10b981" },
];

export default function PublicBoardPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [tasks, setTasks] = useState<Task[]>([]);
    const [settings, setSettings] = useState<BoardSettings | null>(null);
    const [dashboardName, setDashboardName] = useState("");
    const [statuses, setStatuses] = useState<StatusColumn[]>(DEFAULT_STATUSES);
    const [comments, setComments] = useState<any[]>([]);

    const [activeTab, setActiveTab] = useState<"kanban" | "list" | "data">("kanban");
    const [filters, setFilters] = useState({ search: "", week: "", owner: "" });
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [isTourOpen, setIsTourOpen] = useState(true);

    useEffect(() => {
        if (!token) return;

        fetch(`/api/public/board/${token}`)
            .then(res => {
                if (!res.ok) throw new Error("Tablero no encontrado o privado");
                return res.json();
            })
            .then(data => {
                setTasks(data.tasks);
                if (data.dashboard && data.dashboard.settings) {
                    setSettings(data.dashboard.settings);
                    setDashboardName(data.dashboard.name);
                    if (data.dashboard.settings.statuses) {
                        setStatuses(data.dashboard.settings.statuses);
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

    const toggleTheme = () => {
        document.documentElement.classList.toggle('dark');
    };

    // TOUR STEPS
    const tourSteps = [
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

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200 dark:border-slate-700">
                    <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                        <LockKeyhole className="h-8 w-8 text-red-600 dark:text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Acceso Restringido</h1>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">{error}</p>
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
                        <div key={st.id} className="lane w-[320px] flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700" style={{ borderTop: `4px solid ${st.color}` }}>
                            <div className="p-5 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-sm uppercase text-slate-700 dark:text-slate-200">{st.name}</span>
                                    <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300">{colTasks.length}</span>
                                </div>
                                <button disabled className="text-slate-400 hover:text-blue-500 transition-colors cursor-not-allowed">
                                    <Plus size={18} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4 max-h-[calc(100vh-250px)]">
                                {colTasks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-400 text-sm italic">
                                        No hay tareas aquí.
                                    </div>
                                ) : (
                                    colTasks.map((t: Task) => (
                                        <div
                                            key={t.id}
                                            className={`kanban-card p-4 bg-slate-50 dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer transition-all hover:shadow-md hover:border-blue-400 relative overflow-hidden group ${t.prio === 'high' ? 'border-l-4 border-red-500' : t.prio === 'med' ? 'border-l-4 border-amber-500' : 'border-l-4 border-blue-500'}`}
                                            onClick={() => setSelectedTask(t)}
                                        >
                                            <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2 leading-tight">{t.name}</h4>
                                            <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs font-medium">{t.week}</span>
                                                    {t.gate && <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-medium">⛩️ {t.gate}</span>}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="flex items-center gap-1">
                                                        <User size={14} /> {t.owner}
                                                    </span>
                                                    {t.prio === 'high' && <span className="text-red-500">🔴</span>}
                                                    {t.prio === 'med' && <span className="text-amber-500">🟡</span>}
                                                    {t.prio === 'low' && <span className="text-blue-500">🟢</span>}
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

    const renderListView = () => (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full table-auto">
                <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Tarea</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Semana</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Responsable</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Estado</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Prioridad</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {filteredTasks.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="text-center py-10 text-slate-400 italic">No se encontraron tareas con los filtros aplicados.</td>
                        </tr>
                    ) : (
                        filteredTasks.map((t: Task) => (
                            <tr
                                key={t.id}
                                className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                                onClick={() => setSelectedTask(t)}
                            >
                                <td className="px-6 py-4">
                                    <div className="font-semibold text-slate-800 dark:text-slate-100">{t.name}</div>
                                    {t.gate && <span className="mt-1 inline-flex px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-medium">⛩️ {t.gate}</span>}
                                </td>
                                <td className="px-6 py-4">
                                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs font-medium text-slate-600 dark:text-slate-300">{t.week}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200">
                                        <User size={16} className="text-slate-400" /> {t.owner}
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
                                    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
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

    const renderDataView = () => (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Status Distribution */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-5">Distribución por Estado</h3>
                    <div className="space-y-4">
                        {statuses.map((st: StatusColumn) => {
                            const count = tasks.filter((t: Task) => t.status === st.id).length;
                            const pct = tasks.length ? (count / tasks.length) * 100 : 0;
                            return (
                                <div key={st.id}>
                                    <div className="flex justify-between items-center mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                        <span>{st.name}</span>
                                        <span>{count} ({pct.toFixed(0)}%)</span>
                                    </div>
                                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: st.color }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Priorities */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-5">Prioridades</h3>
                    <div className="flex justify-around items-center h-full">
                        {[
                            { label: 'Alta', key: 'high', color: '#ef4444', emoji: '🔴' },
                            { label: 'Media', key: 'med', color: '#f59e0b', emoji: '🟡' },
                            { label: 'Baja', key: 'low', color: '#10b981', emoji: '🟢' }
                        ].map(p => {
                            const count = tasks.filter((t: Task) => t.prio === p.key).length;
                            return (
                                <div key={p.key} className="text-center">
                                    <div className="text-4xl mb-2">{p.emoji}</div>
                                    <div className="text-3xl font-bold text-slate-900 dark:text-white">{count}</div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400 font-medium">{p.label}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Task Types */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-5">Tipos de Tarea</h3>
                    <div className="space-y-3">
                        {settings?.types.map(type => {
                            const count = tasks.filter(t => t.type === type).length;
                            const pct = tasks.length ? (count / tasks.length) * 100 : 0;
                            return (
                                <div key={type} className="flex justify-between items-center text-sm text-slate-700 dark:text-slate-300">
                                    <span>{type}</span>
                                    <span className="font-semibold">{count} ({pct.toFixed(0)}%)</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Owner Summary */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-5">Resumen por Responsable</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {settings?.owners.map((owner: string) => {
                        const count = tasks.filter((t: Task) => t.owner === owner).length;
                        const done = tasks.filter((t: Task) => t.owner === owner && t.status === 'done').length;
                        const pct = count ? Math.round((done / count) * 100) : 0;
                        return (
                            <div key={owner} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                                <div className="font-bold text-slate-900 dark:text-white mb-1">{owner}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">{count} tareas asignadas</div>
                                <div className="flex justify-between items-center text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    <span>Progreso</span>
                                    <span>{pct}%</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col font-sans transition-colors duration-300 text-slate-900 dark:text-white">
            {isTourOpen && <UserTour steps={tourSteps} onComplete={() => setIsTourOpen(false)} />}

            {/* Navbar */}
            <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 shadow-sm transition-colors duration-300">
                <div className="max-w-[1800px] mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-600 dark:text-slate-400">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    {settings?.icon || "📊"} {dashboardName}
                                </h1>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${calculateProgress() === 100
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                    }`}>
                                    {calculateProgress()}% Completado
                                </span>
                                <span className="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-semibold border border-blue-100 dark:border-blue-800 flex items-center gap-1">
                                    <LockKeyhole size={12} /> MODO LECTURA
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide mt-0.5 uppercase">TABLERO DE TRABAJO</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition-all"
                            title="Cambiar tema"
                        >
                            <span className="dark:hidden">🌙</span>
                            <span className="hidden dark:inline">☀️</span>
                        </button>

                        <Link
                            href="/register"
                            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-semibold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
                        >
                            <ExternalLink size={18} />
                            Crear mi cuenta gratis
                        </Link>
                    </div>
                </div>
            </header>

            {/* Toolbar */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 py-4 px-4 sticky top-16 z-20 transition-colors duration-300">
                <div className="max-w-[1800px] mx-auto flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <button
                            disabled
                            className="bg-blue-600/50 cursor-not-allowed text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2"
                        >
                            <Plus size={18} /> Nueva Tarea
                        </button>
                        <button disabled className="text-slate-400 dark:text-slate-500 px-4 py-2.5 bg-slate-100 dark:bg-slate-800/50 rounded-xl font-medium border border-slate-200 dark:border-slate-700 flex items-center gap-2 cursor-not-allowed">
                            <Columns size={18} /> Nueva Columna
                        </button>

                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden lg:block"></div>

                        {/* Search */}
                        <div className="relative group flex-1 lg:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
                            />
                        </div>

                        {/* Filters */}
                        <select
                            value={filters.week}
                            onChange={(e) => setFilters({ ...filters, week: e.target.value })}
                            className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium hover:border-blue-300 dark:hover:border-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white cursor-pointer"
                        >
                            <option value="">📅 Semanas</option>
                            {settings?.weeks.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>

                        <select
                            value={filters.owner}
                            onChange={(e) => setFilters({ ...filters, owner: e.target.value })}
                            className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium hover:border-blue-300 dark:hover:border-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:text-white cursor-pointer"
                        >
                            <option value="">👤 Todos</option>
                            {settings?.owners.map(o => (
                                <option key={o} value={o}>{o}</option>
                            ))}
                        </select>
                    </div>

                    {/* View Toggles */}
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => setActiveTab("kanban")}
                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === "kanban"
                                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                                }`}
                        >
                            <LayoutGrid size={16} /> Tablero
                        </button>
                        <button
                            onClick={() => setActiveTab("list")}
                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === "list"
                                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                                }`}
                        >
                            <List size={16} /> Lista
                        </button>
                        <button
                            onClick={() => setActiveTab("data")}
                            className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === "data"
                                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                                }`}
                        >
                            <BarChart2 size={16} /> Datos
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <main className="flex-1 overflow-x-hidden">
                <div className="h-full p-6 max-w-[1800px] mx-auto min-h-[calc(100vh-200px)]">
                    {activeTab === "kanban" && renderKanban()}
                    {activeTab === "list" && renderListView()}
                    {activeTab === "data" && renderDataView()}
                </div>
            </main>

            {/* Task Details Modal (Read Only) */}
            {selectedTask && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setSelectedTask(null)}
                    />
                    <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">

                        {/* Modal Header */}
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-900/50">
                            <div>
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider rounded-full">
                                        {selectedTask.type}
                                    </span>
                                    <span className="text-slate-400 text-sm font-mono flex items-center gap-1">
                                        <Hash size={14} /> ID: {selectedTask.id}
                                    </span>
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">
                                    {selectedTask.name}
                                </h2>
                            </div>
                            <button
                                onClick={() => setSelectedTask(null)}
                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-wrap gap-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-slate-500 dark:text-slate-400">
                                                <Calendar size={18} />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Semana</p>
                                                <p className="font-semibold text-slate-900 dark:text-white">{settings?.weeks.find(w => w.id === selectedTask.week)?.name || selectedTask.week}</p>
                                            </div>
                                        </div>

                                        <div className="w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm text-slate-500 dark:text-slate-400">
                                                <User size={18} />
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">Responsable</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-[10px] text-white font-bold">
                                                        {selectedTask.owner.charAt(0)}
                                                    </div>
                                                    <p className="font-semibold text-slate-900 dark:text-white">{selectedTask.owner}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                                            <Info size={16} className="text-blue-500" /> Descripción
                                        </h3>
                                        <div className="bg-slate-50 dark:bg-slate-800/30 p-6 rounded-2xl border border-slate-100 dark:border-slate-800/50 text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                            {selectedTask.desc ? renderContentWithLinks(selectedTask.desc) : "Sin descripción."}
                                        </div>
                                    </div>

                                    {/* Discussion / Comments */}
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                                            <MessageSquare size={16} className="text-purple-500" /> Discusión y Actualizaciones
                                        </h3>
                                        <div className="space-y-4">
                                            {comments.filter(c => String(c.task_id) === String(selectedTask.id)).length > 0 ? (
                                                comments
                                                    .filter(c => String(c.task_id) === String(selectedTask.id))
                                                    .map((comment) => (
                                                        <div key={comment.id} className="flex gap-4 group">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-xs text-white font-bold shrink-0 shadow-sm border-2 border-white dark:border-slate-800">
                                                                {comment.user_name ? comment.user_name.charAt(0).toUpperCase() : '?'}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="bg-slate-100 dark:bg-slate-800 px-5 py-3 rounded-2xl rounded-tl-none text-sm text-slate-700 dark:text-slate-300 shadow-sm border border-slate-200/50 dark:border-slate-700">
                                                                    <div className="flex justify-between items-center mb-1">
                                                                        <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{comment.user_name}</span>
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
                                                <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                                    <p className="text-slate-400 text-sm">No hay comentarios en esta tarea.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Attributes */}
                                <div className="space-y-6">
                                    <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">Detalles</h3>

                                        <div className="space-y-5">
                                            <div>
                                                <label className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1.5 block">Estado Actual</label>
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
                                                <label className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1.5 block flex items-center gap-1"><Flag size={12} /> Prioridad</label>
                                                <div className={`px-3 py-2 rounded-lg text-sm font-bold border flex items-center gap-2 ${selectedTask.prio === 'high' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/50' :
                                                        selectedTask.prio === 'med' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/50' :
                                                            'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/50'
                                                    }`}>
                                                    <div className={`w-2 h-2 rounded-full ${selectedTask.prio === 'high' ? 'bg-red-500' :
                                                            selectedTask.prio === 'med' ? 'bg-amber-500' :
                                                                'bg-blue-500'
                                                        }`}></div>
                                                    {selectedTask.prio === 'high' ? 'Alta' : selectedTask.prio === 'med' ? 'Media' : 'Baja'}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1.5 block flex items-center gap-1"><DoorOpen size={12} /> Gate (Fase)</label>
                                                <div className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 font-medium">
                                                    {selectedTask.gate || "N/A"}
                                                </div>
                                            </div>

                                            {selectedTask.due && (
                                                <div>
                                                    <label className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1.5 block flex items-center gap-1"><Calendar size={12} /> Fecha Límite</label>
                                                    <div className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 font-medium">
                                                        {new Date(selectedTask.due).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800/50">
                                        <p className="text-xs text-blue-600 dark:text-blue-300 leading-relaxed text-center">
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

