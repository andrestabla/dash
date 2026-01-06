"use client";

import { useState, useEffect, use } from "react";
import Link from 'next/link';

interface Task {
    id: number;
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

    const [activeTab, setActiveTab] = useState<"kanban" | "timeline" | "analytics">("kanban");
    const [filters, setFilters] = useState({ search: "", week: "", owner: "" });


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
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [token]);

    const filteredTasks = tasks.filter((t) => {
        if (filters.week && t.week !== filters.week) return false;
        if (filters.owner && t.owner !== filters.owner) return false;
        if (filters.search && !((t.name + t.owner).toLowerCase().includes(filters.search.toLowerCase()))) return false;
        return true;
    });

    if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Cargando tablero público...</div>;

    if (error) return (
        <div style={{ padding: 40, textAlign: 'center', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>🔒</div>
            <h1 style={{ marginBottom: 10 }}>Acceso Restringido</h1>
            <p style={{ color: 'var(--text-dim)', marginBottom: 20 }}>{error}</p>
        </div>
    );

    if (!settings) return null;

    return (
        <div>
            <header>
                <div className="top-bar" style={{ padding: '0 24px', height: 70, display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                    <div className="logo-area" style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ fontSize: 24 }}>{settings.icon}</div>
                            <div>
                                <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{dashboardName}</h1>
                                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-dim)', letterSpacing: 0.5 }}>VISTA PÚBLICA</p>
                            </div>
                        </div>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
                        <Link href="/" className="btn-primary" style={{ textDecoration: 'none', fontSize: 13 }}>
                            Crear mi propio Roadmap
                        </Link>
                    </div>
                </div>
            </header>

            <main>
                <div className="controls">
                    <div className="filters">
                        <input
                            placeholder="🔍 Buscar..."
                            style={{ minWidth: 140 }}
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                        />
                        <select
                            style={{ minWidth: 140 }}
                            value={filters.week}
                            onChange={(e) => setFilters({ ...filters, week: e.target.value })}
                        >
                            <option value="">📅 Semanas</option>
                            {settings.weeks.map((w) => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                        <select
                            style={{ minWidth: 150 }}
                            value={filters.owner}
                            onChange={(e) => setFilters({ ...filters, owner: e.target.value })}
                        >
                            <option value="">👤 Todos</option>
                            {settings.owners.map((o) => (
                                <option key={o} value={o}>{o}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="view-section active">
                    <div className="kanban-container">
                        <div className="lanes" style={{ display: 'flex', height: '100%', alignItems: 'stretch' }}>
                            {statuses.map((st) => {
                                const colTasks = filteredTasks.filter((t) => t.status === st.id);
                                return (
                                    <div key={st.id} className="lane" style={{ minWidth: 320, display: 'flex', flexDirection: 'column', borderTop: `3px solid ${st.color}` }}>
                                        <div className="lane-head">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>{st.name}</span>
                                                <span className="counter-badge">{colTasks.length}</span>
                                            </div>
                                        </div>

                                        <div className="lane-content" style={{ flex: 1, paddingRight: 6, paddingBottom: 20 }}>
                                            {colTasks.length === 0 ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 100, opacity: 0.4 }}>
                                                    <span style={{ fontSize: 13 }}>Sin tareas</span>
                                                </div>
                                            ) : (
                                                colTasks.map((t) => (
                                                    <div key={t.id} className={`kanban-card p-${t.prio || "med"}`} style={{ marginBottom: 12 }}>
                                                        <div style={{ marginBottom: 12, fontWeight: 700, fontSize: 15, lineHeight: 1.4, color: 'var(--text-main)' }}>
                                                            {t.name}
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                                <span className="chip" style={{ fontSize: 10, padding: '2px 8px' }}>{t.week}</span>
                                                                {t.gate && <span className="chip gate" style={{ fontSize: 10, padding: '2px 8px' }}>⛩️ {t.gate}</span>}
                                                            </div>
                                                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', opacity: 0.8 }}>
                                                                <div title={`Responsable: ${t.owner}`} style={{ fontSize: 14, cursor: 'help' }}>👤</div>
                                                                {t.prio === 'high' && <span>🔴</span>}
                                                                {t.prio === 'med' && <span>🟡</span>}
                                                                {t.prio === 'low' && <span>🟢</span>}
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
                </div>
            </main>
            <style jsx>{`
                header { height: 70px; background: var(--bg-card); border-bottom: 1px solid var(--border-dim); position: fixed; top: 0; left: 0; right: 0; z-index: 50; }
                main { margin-top: 70px; height: calc(100vh - 70px); display: flex; flexDirection: column; }
                .controls { padding: 12px 24px; border-bottom: 1px solid var(--border-dim); background: var(--bg-main); display: flex; align-items: center; justify-content: space-between; gap: 20px; }
                .filters { display: flex; gap: 12px; align-items: center; }
                .top-bar input, .top-bar select, .controls input, .controls select { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-dim); background: var(--bg-panel); color: var(--text-main); font-size: 13px; outline: none; transition: all 0.2s; }
                .top-bar input:focus, .top-bar select:focus, .controls input:focus, .controls select:focus { border-color: var(--primary); background: var(--bg-card); box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1); }
                .view-section { flex: 1; overflow: hidden; position: relative; display: flex; flexDirection: column; }
                .kanban-container { flex: 1; overflow-x: auto; padding: 20px 24px; height: 100%; }
                .lanes { gap: 24px; padding-bottom: 20px; }
                .lane { background: var(--bg-panel); border-radius: 12px; padding: 12px; height: 100%; max-height: 100%; overflow: hidden; transition: background 0.2s; border: 1px solid var(--border-dim); }
                .lane:hover { background: var(--panel-hover); }
                .lane-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 0 4px; min-height: 28px; }
                .kanban-card { background: var(--bg-card); padding: 16px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.04); border: 1px solid var(--border-dim); cursor: default; transition: transform 0.2s, box-shadow 0.2s; position: relative; overflow: hidden; }
                .kanban-card:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,0.08); border-color: var(--primary); }
                .kanban-card.p-high { border-left: 3px solid #ef4444; }
                .kanban-card.p-med { border-left: 3px solid #f59e0b; }
                .kanban-card.p-low { border-left: 3px solid #10b981; }
                .chip { background: var(--bg-panel); border: 1px solid var(--border-dim); border-radius: 4px; color: var(--text-dim); font-weight: 500; display: inline-flex; align-items: center; }
                .chip.gate { background: rgba(5, 150, 105, 0.1); color: #059669; border-color: rgba(5, 150, 105, 0.2); }
                .app-title { font-size: 18px; font-weight: 700; margin: 0; color: var(--text-main); letter-spacing: -0.5px; }
                .app-sub { font-size: 10px; font-weight: 700; color: var(--text-dim); margin: 0; letter-spacing: 1px; }
                .counter-badge { background: rgba(0,0,0,0.05); padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 600; color: var(--text-dim); }
                .counter-badge.warning { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
                .dark .lane { background: #1e293b; border-color: #334155; }
                .dark .kanban-card { background: #0f172a; border-color: #334155; }
                .dark .chip { background: #334155; border-color: #475569; }
                .dark .chip.gate { background: rgba(5, 150, 105, 0.2); color: #34d399; }
            `}</style>
        </div>
    );
}
