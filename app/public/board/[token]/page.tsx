"use client";

import { useState, useEffect, use } from "react";
import Link from 'next/link';
import { LayoutGrid, List, BarChart2, Search, ExternalLink, X, Calendar, User, Flag, Tag, Info } from 'lucide-react';

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

    const [activeTab, setActiveTab] = useState<"kanban" | "list" | "data">("kanban");
    const [filters, setFilters] = useState({ search: "", week: "", owner: "" });
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);


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

    const filteredTasks = tasks.filter((t: Task) => {
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
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
            <header style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-dim)', height: 70, display: 'flex', alignItems: 'center', padding: '0 24px', position: 'sticky', top: 0, zIndex: 50 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: 24 }}>{settings.icon || '🚀'}</div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{dashboardName}</h1>
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-dim)', letterSpacing: 0.5, fontWeight: 700 }}>VISTA PÚBLICA</p>
                    </div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
                    <Link href="/" className="btn-primary" style={{ textDecoration: 'none', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                        Crear mi propio Roadmap <ExternalLink size={14} />
                    </Link>
                </div>
            </header>

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div className="toolbar" style={{ padding: '12px 24px', borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
                    <div className="tabs" style={{ display: 'flex', background: 'var(--bg-panel)', padding: 4, borderRadius: 10 }}>
                        <button onClick={() => setActiveTab('kanban')} className={`tab ${activeTab === 'kanban' ? 'active' : ''}`}>
                            <LayoutGrid size={16} /> Tablero
                        </button>
                        <button onClick={() => setActiveTab('list')} className={`tab ${activeTab === 'list' ? 'active' : ''}`}>
                            <List size={16} /> Lista
                        </button>
                        <button onClick={() => setActiveTab('data')} className={`tab ${activeTab === 'data' ? 'active' : ''}`}>
                            <BarChart2 size={16} /> Datos
                        </button>
                    </div>

                    <div className="filters" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                            <input
                                placeholder="Buscar..."
                                style={{ paddingLeft: 32, minWidth: 200 }}
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            />
                        </div>
                        <select
                            style={{ minWidth: 140 }}
                            value={filters.week}
                            onChange={(e) => setFilters({ ...filters, week: e.target.value })}
                        >
                            <option value="">📅 Semanas</option>
                            {settings.weeks.map((w: { id: string; name: string }) => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                        <select
                            style={{ minWidth: 150 }}
                            value={filters.owner}
                            onChange={(e) => setFilters({ ...filters, owner: e.target.value })}
                        >
                            <option value="">👤 Todos</option>
                            {settings.owners.map((o: string) => (
                                <option key={o} value={o}>{o}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="view-container" style={{ flex: 1, overflow: 'hidden', padding: activeTab === 'data' ? '0' : '24px' }}>
                    {activeTab === 'kanban' && (
                        <div className="kanban-view" style={{ height: '100%', overflowX: 'auto' }}>
                            <div style={{ display: 'flex', gap: 24, height: '100%', paddingBottom: 20 }}>
                                {statuses.map((st: StatusColumn) => {
                                    const colTasks = filteredTasks.filter((t: Task) => t.status === st.id);
                                    return (
                                        <div key={st.id} className="lane" style={{ minWidth: 320, display: 'flex', flexDirection: 'column', background: 'var(--bg-panel)', borderRadius: 16, border: '1px solid var(--border-dim)', borderTop: `4px solid ${st.color}`, padding: 16 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)', textTransform: 'uppercase' }}>{st.name}</span>
                                                    <span className="counter-badge" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}>{colTasks.length}</span>
                                                </div>
                                            </div>

                                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}>
                                                {colTasks.length === 0 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 100, opacity: 0.4, border: '1px dashed var(--border-dim)', borderRadius: 12 }}>
                                                        <span style={{ fontSize: 13 }}>Sin tareas</span>
                                                    </div>
                                                ) : (
                                                    colTasks.map((t: Task) => (
                                                        <div
                                                            key={t.id}
                                                            className={`kanban-card p-${t.prio || "med"}`}
                                                            style={{ cursor: 'pointer' }}
                                                            onClick={() => setSelectedTask(t)}
                                                        >
                                                            <div style={{ marginBottom: 12, fontWeight: 700, fontSize: 15, lineHeight: 1.4, color: 'var(--text-main)' }}>
                                                                {t.name}
                                                            </div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                                    <span className="chip" style={{ fontSize: 10 }}>{t.week}</span>
                                                                    {t.gate && <span className="chip gate" style={{ fontSize: 10 }}>⛩️ {t.gate}</span>}
                                                                </div>
                                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', opacity: 0.8 }}>
                                                                    <div title={`Responsable: ${t.owner}`} style={{ fontSize: 14 }}>👤</div>
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
                    )}

                    {activeTab === 'list' && (
                        <div style={{ background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-dim)', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-dim)' }}>
                                    <tr>
                                        <th style={{ padding: '16px 24px', fontSize: 13, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Tarea</th>
                                        <th style={{ padding: '16px', fontSize: 13, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Semana</th>
                                        <th style={{ padding: '16px', fontSize: 13, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Responsable</th>
                                        <th style={{ padding: '16px', fontSize: 13, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Estado</th>
                                        <th style={{ padding: '16px', fontSize: 13, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Prioridad</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTasks.map((t: Task) => (
                                        <tr
                                            key={t.id}
                                            style={{ borderBottom: '1px solid var(--border-dim)', transition: 'background 0.2s', cursor: 'pointer' }}
                                            onClick={() => setSelectedTask(t)}
                                            className="row-hover"
                                        >
                                            <td style={{ padding: '16px 24px' }}>
                                                <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
                                                {t.gate && <span className="chip gate" style={{ fontSize: 10, marginTop: 4, display: 'inline-flex' }}>⛩️ {t.gate}</span>}
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <span className="chip" style={{ fontSize: 11 }}>{t.week}</span>
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                                                    <span style={{ fontSize: 16 }}>👤</span> {t.owner}
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: statuses.find((s: StatusColumn) => s.id === t.status)?.color + '20', color: statuses.find((s: StatusColumn) => s.id === t.status)?.color }}>
                                                    {statuses.find((s: StatusColumn) => s.id === t.status)?.name}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                                                    {t.prio === 'high' && <span>🔴 Alta</span>}
                                                    {t.prio === 'med' && <span>🟡 Media</span>}
                                                    {t.prio === 'low' && <span>🟢 Baja</span>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredTasks.length === 0 && (
                                        <tr>
                                            <td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                                                No se encontraron tareas con los filtros aplicados.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'data' && (
                        <div style={{ padding: 32, maxWidth: 1000, margin: '0 auto' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
                                <div className="glass-panel" style={{ padding: 24 }}>
                                    <h3 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 700 }}>Distribución por Estado</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        {statuses.map((st: StatusColumn) => {
                                            const count = tasks.filter((t: Task) => t.status === st.id).length;
                                            const pct = tasks.length ? (count / tasks.length) * 100 : 0;
                                            return (
                                                <div key={st.id}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
                                                        <span>{st.name}</span>
                                                        <span>{count}</span>
                                                    </div>
                                                    <div style={{ height: 8, background: 'var(--bg-panel)', borderRadius: 4, overflow: 'hidden' }}>
                                                        <div style={{ height: '100%', width: `${pct}%`, background: st.color }} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="glass-panel" style={{ padding: 24 }}>
                                    <h3 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 700 }}>Prioridades</h3>
                                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', justifyContent: 'space-around', height: '100%' }}>
                                        {[
                                            { label: 'Alta', key: 'high', color: '#ef4444', emoji: '🔴' },
                                            { label: 'Media', key: 'med', color: '#f59e0b', emoji: '🟡' },
                                            { label: 'Baja', key: 'low', color: '#10b981', emoji: '🟢' }
                                        ].map(p => {
                                            const count = tasks.filter((t: Task) => t.prio === p.key).length;
                                            return (
                                                <div key={p.key} style={{ textAlign: 'center' }}>
                                                    <div style={{ fontSize: 24, marginBottom: 8 }}>{p.emoji}</div>
                                                    <div style={{ fontSize: 24, fontWeight: 800 }}>{count}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>{p.label}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="glass-panel" style={{ marginTop: 24, padding: 24 }}>
                                <h3 style={{ margin: '0 0 20px 0', fontSize: 16, fontWeight: 700 }}>Resumen por Responsable</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                                    {settings.owners.map((owner: string) => {
                                        const count = tasks.filter((t: Task) => t.owner === owner).length;
                                        const done = tasks.filter((t: Task) => t.owner === owner && t.status === 'done').length;
                                        const pct = count ? Math.round((done / count) * 100) : 0;
                                        return (
                                            <div key={owner} style={{ padding: 16, background: 'var(--bg-panel)', borderRadius: 12, border: '1px solid var(--border-dim)' }}>
                                                <div style={{ fontWeight: 700, marginBottom: 4 }}>{owner}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>{count} tareas asignadas</div>
                                                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>Progreso</span>
                                                    <span>{pct}%</span>
                                                </div>
                                                <div style={{ height: 4, background: 'var(--bg-card)', borderRadius: 2, overflow: 'hidden' }}>
                                                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary)' }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {selectedTask && (
                <div className="backdrop" onClick={() => setSelectedTask(null)} style={{ display: 'flex', zIndex: 100 }}>
                    <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 12,
                                    background: statuses.find(s => s.id === selectedTask.status)?.color + '20',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 20
                                }}>
                                    {selectedTask.prio === 'high' ? '🔴' : selectedTask.prio === 'low' ? '🟢' : '🟡'}
                                </div>
                                <div>
                                    <h2 className="modal-title">{selectedTask.name}</h2>
                                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-dim)', fontWeight: 600 }}>Toda la información de la tarea</p>
                                </div>
                            </div>
                            <button className="btn-icon" onClick={() => setSelectedTask(null)}>
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body" style={{ padding: '24px 32px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, marginBottom: 32 }}>
                                <div className="info-block" style={{ background: 'var(--bg-panel)', padding: 16, borderRadius: 16, border: '1px solid var(--border-dim)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
                                        <Info size={14} /> Estado & Prioridad
                                    </div>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        <span style={{ padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: statuses.find(s => s.id === selectedTask.status)?.color, color: 'white' }}>
                                            {statuses.find(s => s.id === selectedTask.status)?.name}
                                        </span>
                                        <span className={`chip p-${selectedTask.prio || "med"}`} style={{ fontSize: 12, fontWeight: 700 }}>
                                            Prio: {selectedTask.prio === 'high' ? 'Alta' : selectedTask.prio === 'low' ? 'Baja' : 'Media'}
                                        </span>
                                    </div>
                                </div>

                                <div className="info-block" style={{ background: 'var(--bg-panel)', padding: 16, borderRadius: 16, border: '1px solid var(--border-dim)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
                                        <User size={14} /> Responsable
                                    </div>
                                    <div style={{ fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                                            {selectedTask.owner.charAt(0)}
                                        </div>
                                        {selectedTask.owner}
                                    </div>
                                </div>

                                <div className="info-block" style={{ background: 'var(--bg-panel)', padding: 16, borderRadius: 16, border: '1px solid var(--border-dim)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
                                        <Calendar size={14} /> Programación
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedTask.week}</div>
                                        {selectedTask.due && <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Límite: {new Date(selectedTask.due).toLocaleDateString()}</div>}
                                    </div>
                                </div>

                                <div className="info-block" style={{ background: 'var(--bg-panel)', padding: 16, borderRadius: 16, border: '1px solid var(--border-dim)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>
                                        <Tag size={14} /> Clasificación
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        <span className="chip" style={{ fontSize: 12 }}>{selectedTask.type}</span>
                                        {selectedTask.gate && <span className="chip gate" style={{ fontSize: 12 }}>⛩️ {selectedTask.gate}</span>}
                                    </div>
                                </div>
                            </div>

                            <div style={{ background: 'var(--bg-panel)', padding: 24, borderRadius: 20, border: '1px solid var(--border-dim)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-dim)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', marginBottom: 16 }}>
                                    <Flag size={14} /> Descripción de la tarea
                                </div>
                                <div style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--text-main)', whiteSpace: 'pre-wrap' }}>
                                    {selectedTask.desc || "Esta tarea no tiene una descripción detallada."}
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer" style={{ justifyContent: 'center', padding: 24 }}>
                            <button className="btn-secondary" onClick={() => setSelectedTask(null)} style={{ minWidth: 200 }}>
                                Cerrar Detalle
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .tab { display: flex; align-items: center; gap: 8px; padding: 6px 16px; font-size: 13px; font-weight: 600; color: var(--text-dim); cursor: pointer; border-radius: 8px; border: none; background: transparent; transition: all 0.2s; }
                .tab:hover { color: var(--text-main); }
                .tab.active { background: var(--bg-card); color: var(--primary); box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
                
                input, select { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-dim); background: var(--bg-panel); color: var(--text-main); font-size: 13px; outline: none; transition: all 0.2s; }
                input:focus, select:focus { border-color: var(--primary); background: var(--bg-card); box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
                
                .counter-badge { padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 700; color: var(--text-dim); }
                
                .chip { background: var(--bg-panel); border: 1px solid var(--border-dim); border-radius: 4px; color: var(--text-dim); font-weight: 700; display: inline-flex; align-items: center; padding: 2px 8px; }
                .chip.gate { background: rgba(16, 185, 129, 0.1); color: #059669; border-color: rgba(16, 185, 129, 0.2); }
                
                .kanban-card { background: var(--bg-card); padding: 16px; border-radius: 12px; border: 1px solid var(--border-dim); box-shadow: 0 1px 3px rgba(0,0,0,0.05); position: relative; overflow: hidden; transition: all 0.2s; }
                .kanban-card:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(0,0,0,0.08); border-color: var(--primary); }
                .kanban-card.p-high { border-left: 4px solid #ef4444; }
                .kanban-card.p-med { border-left: 4px solid #f59e0b; }
                .kanban-card.p-low { border-left: 4px solid #10b981; }

                .row-hover:hover { background: var(--bg-panel); }

                .lane::-webkit-scrollbar { width: 4px; }
                .lane::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.05); border-radius: 10px; }
                .dark .lane::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); }

                @media (max-width: 768px) {
                    .toolbar { flex-direction: column; align-items: stretch; }
                    .filters { flex-wrap: wrap; }
                    .filters > div, .filters select { flex: 1; min-width: 120px; }
                }
            `}</style>
        </div>
    );
}

