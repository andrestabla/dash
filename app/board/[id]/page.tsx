"use client";

import { useState, useEffect, useMemo, use } from "react";
import Link from 'next/link';

interface Task {
    id: number;
    week: string;
    name: string;
    status: string; // Dynamic Status ID
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
    statuses?: StatusColumn[]; // V5 Custom Columns 
}

const DEFAULT_STATUSES: StatusColumn[] = [
    { id: "todo", name: "Por hacer", color: "#64748b" },
    { id: "doing", name: "En proceso", color: "#3b82f6" },
    { id: "review", name: "Revisión", color: "#f59e0b" },
    { id: "done", name: "Hecho", color: "#10b981" },
];

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: dashboardId } = use(params);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [settings, setSettings] = useState<BoardSettings | null>(null);
    const [dashboardName, setDashboardName] = useState("Roadmap");
    const [activeTab, setActiveTab] = useState<"kanban" | "timeline" | "analytics">("kanban");
    const [filters, setFilters] = useState({ search: "", week: "", owner: "" });

    // Modal & Toast
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Partial<Task>>({});
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Column Editing
    const [isColModalOpen, setIsColModalOpen] = useState(false);
    const [newColName, setNewColName] = useState("");
    const [newColColor, setNewColColor] = useState("#64748b");

    // Load Data
    useEffect(() => {
        if (!dashboardId) return;

        fetch(`/api/dashboards/${dashboardId}`)
            .then(res => res.json())
            .then(data => {
                if (data.settings) {
                    setSettings(data.settings);
                    setDashboardName(data.name);
                }
            })
            .catch(err => console.error("Failed to load dashboard settings", err));

        fetch(`/api/tasks?dashboardId=${dashboardId}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setTasks(data);
            })
            .catch(err => console.error("Failed to load tasks", err));
    }, [dashboardId]);

    const statuses = useMemo(() => {
        return settings?.statuses || DEFAULT_STATUSES;
    }, [settings]);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 2000);
    };

    const toggleTheme = () => {
        document.body.classList.toggle("dark");
    };

    const filteredTasks = useMemo(() => {
        return tasks.filter((t) => {
            if (filters.week && t.week !== filters.week) return false;
            if (filters.owner && t.owner !== filters.owner) return false;
            if (
                filters.search &&
                !((t.name + t.owner).toLowerCase().includes(filters.search.toLowerCase()))
            )
                return false;
            return true;
        });
    }, [tasks, filters]);

    // --- ACTIONS ---

    const handleDragStart = (e: React.DragEvent, id: number) => {
        e.dataTransfer.setData("text/plain", id.toString());
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).classList.add("drag-over");
    };

    const handleDragLeave = (e: React.DragEvent) => {
        (e.currentTarget as HTMLElement).classList.remove("drag-over");
    };

    const handleDrop = async (e: React.DragEvent, statusId: string) => {
        e.preventDefault();
        (e.currentTarget as HTMLElement).classList.remove("drag-over");
        const id = parseInt(e.dataTransfer.getData("text/plain"));

        // Optimistic Update
        const originalTasks = [...tasks];
        setTasks(prev => prev.map(t => t.id === id && t.status !== statusId ? { ...t, status: statusId } : t));

        try {
            const task = tasks.find(t => t.id === id);
            if (task && task.status !== statusId) {
                await fetch('/api/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...task, status: statusId, dashboard_id: dashboardId })
                });
                showToast("Actualizado");
            }
        } catch (err) {
            setTasks(originalTasks);
            alert("Error al actualizar");
        }
    };

    // TASK MANAGEMENT
    const openModal = (task?: Task) => {
        if (!settings) return;
        setEditingTask(
            task || {
                status: statuses[0].id, // Dynamic First Status
                week: settings.weeks[0]?.id || "",
                prio: "med",
                gate: "",
                type: settings.types[0] || "",
                owner: settings.owners[0] || "",
                dashboard_id: dashboardId
            }
        );
        setIsModalOpen(true);
    };

    const saveTask = async () => {
        if (!editingTask.name?.trim()) return alert("Nombre requerido");

        const newTask: Task = {
            ...(editingTask as Task),
            id: editingTask.id || Date.now(),
            dashboard_id: dashboardId
        };

        const originalTasks = [...tasks];
        if (editingTask.id) {
            setTasks(prev => prev.map(t => t.id === editingTask.id ? newTask : t));
        } else {
            setTasks(prev => [...prev, newTask]);
        }

        setIsModalOpen(false);

        try {
            await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTask)
            });
            showToast("Guardado");
        } catch (err) {
            setTasks(originalTasks);
            alert("Error al guardar");
        }
    };

    const deleteTask = async () => {
        if (!editingTask.id) return;
        if (confirm("¿Eliminar?")) {
            const originalTasks = [...tasks];
            setTasks(prev => prev.filter(t => t.id !== editingTask.id));
            setIsModalOpen(false);

            try {
                await fetch(`/api/tasks?id=${editingTask.id}`, { method: 'DELETE' });
                showToast("Eliminado");
            } catch (err) {
                setTasks(originalTasks);
                alert("Error al eliminar");
            }
        }
    };

    // COLUMN MANAGEMENT
    const addColumn = async () => {
        if (!newColName.trim() || !settings) return;

        const newColId = newColName.toLowerCase().replace(/\s+/g, '_');
        const newStatuses = [...statuses, { id: newColId, name: newColName, color: newColColor }];

        // Update Local
        const newSettings = { ...settings, statuses: newStatuses };
        setSettings(newSettings);
        setIsColModalOpen(false);

        // Update Backend
        try {
            await fetch('/api/dashboards', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: dashboardId,
                    name: dashboardName,
                    description: "", // Ideally fetch desc too, but name/settings is enough for now
                    settings: newSettings
                })
            });
            showToast("Columna Añadida");
        } catch (err) {
            alert("Error guardando columna");
        }
    };

    if (!settings) return <div style={{ padding: 40, textAlign: 'center' }}>Cargando tablero...</div>;

    return (
        <>
            <header>
                <div className="top-bar">
                    <div className="logo-area">
                        <Link href="/" className="btn-ghost" title="Volver al Workspace">
                            <img
                                src="https://www.algoritmot.com/wp-content/uploads/2022/08/Recurso-8-1536x245.png"
                                alt="Algoritmo T"
                                className="brand-logo"
                            />
                        </Link>
                        <div style={{ marginLeft: 8, paddingLeft: 12, borderLeft: "1px solid var(--border)" }}>
                            <h1 className="app-title">{settings.icon} {dashboardName}</h1>
                            <p className="app-sub">TABLERO DE TRABAJO</p>
                        </div>
                    </div>
                    <div className="top-buttons" style={{ display: "flex", gap: 8 }}>
                        <button className="btn-ghost" onClick={toggleTheme} title="Tema">
                            🌓
                        </button>
                        <Link href="/" className="btn-ghost" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
                            ✕ Cerrar Tablero
                        </Link>
                        <button className="btn-primary" onClick={() => openModal()}>
                            <span>➕</span> <span style={{ marginLeft: 4 }}>Tarea</span>
                        </button>
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
                                <option key={w.id} value={w.id}>
                                    {w.name}
                                </option>
                            ))}
                        </select>
                        <select
                            style={{ minWidth: 150 }}
                            value={filters.owner}
                            onChange={(e) => setFilters({ ...filters, owner: e.target.value })}
                        >
                            <option value="">👤 Todos</option>
                            {settings.owners.map((o) => (
                                <option key={o} value={o}>
                                    {o}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="tabs">
                        <div className={`tab ${activeTab === "kanban" ? "active" : ""}`} onClick={() => setActiveTab("kanban")}>🧩 Tablero</div>
                        <div className={`tab ${activeTab === "timeline" ? "active" : ""}`} onClick={() => setActiveTab("timeline")}>🗓️ Lista</div>
                        <div className={`tab ${activeTab === "analytics" ? "active" : ""}`} onClick={() => setActiveTab("analytics")}>📊 Datos</div>
                    </div>
                </div>

                {/* KANBAN */}
                <div className={`view-section ${activeTab === "kanban" ? "active" : ""}`}>
                    <div className="kanban-container">
                        <div className="lanes" style={{ display: 'flex' }}>
                            {statuses.map((st) => {
                                const colTasks = filteredTasks.filter((t) => t.status === st.id);
                                return (
                                    <div key={st.id} className="lane" style={{ minWidth: 280 }}>
                                        <div className="lane-head">
                                            <span style={{ color: st.color }}>● {st.name}</span>
                                            <span className="counter">{colTasks.length}</span>
                                        </div>
                                        <div
                                            className="drop-zone"
                                            onDragOver={handleDragOver}
                                            onDrop={(e) => handleDrop(e, st.id)}
                                            onDragLeave={handleDragLeave}
                                        >
                                            {colTasks.map((t) => (
                                                <div key={t.id} className={`card p-${t.prio || "med"}`} draggable onDragStart={(e) => handleDragStart(e, t.id)} onClick={() => openModal(t)}>
                                                    <div className="card-top">
                                                        <span className="chip">{t.week}</span>
                                                        {t.gate && <span className="chip gate">⛩️ {t.gate}</span>}
                                                    </div>
                                                    <div className="card-title">{t.name}</div>
                                                    <div className="card-desc">👤 {t.owner.split(" (")[0]}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* ADD COLUMN BUTTON */}
                            <div className="lane" style={{ minWidth: 100, background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <button className="btn-ghost" onClick={() => setIsColModalOpen(true)} style={{ fontSize: 24, opacity: 0.5 }}>➕</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* OTHER VIEWS (Simplified for brevity, ensuring standard TSX structure) */}
                {activeTab === "timeline" && (
                    <div className="view-section active">
                        <div className="timeline-view">
                            {settings.weeks.map(w => {
                                const weekTasks = filteredTasks.filter(t => t.week === w.id);
                                if (weekTasks.length === 0) return null;
                                return (
                                    <div key={w.id} className="tl-group">
                                        <div className="tl-header">{w.name}</div>
                                        {weekTasks.map(t => (
                                            <div key={t.id} className="tl-item">
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: statuses.find(s => s.id === t.status)?.color }}></div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{t.owner} · {t.type}</div>
                                                </div>
                                                <button className="btn-ghost" onClick={() => openModal(t)}>✏️</button>
                                            </div>
                                        ))}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {activeTab === "analytics" && settings && (
                    <AnalyticsView tasks={tasks} settings={settings} statuses={statuses} />
                )}

                {/* TASK MODAL */}
                {isModalOpen && settings && (
                    <div className="backdrop" onClick={() => setIsModalOpen(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="m-head">
                                <h3 style={{ margin: 0, fontSize: 15 }}>{editingTask.id ? "Editar Tarea" : "Nueva Tarea"}</h3>
                                <button className="btn-ghost" onClick={() => setIsModalOpen(false)}>✕</button>
                            </div>
                            <div className="m-body">
                                <div className="form-row">
                                    <label>Tarea</label>
                                    <input value={editingTask.name || ""} onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })} style={{ fontWeight: 600 }} />
                                </div>
                                <div className="form-grid">
                                    <div>
                                        <label>Estado</label>
                                        <select value={editingTask.status} onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}>
                                            {statuses.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                                        </select>
                                    </div>
                                    <div>
                                        <label>Semana</label>
                                        <select value={editingTask.week} onChange={(e) => setEditingTask({ ...editingTask, week: e.target.value })}>
                                            {settings.weeks.map(w => (<option key={w.id} value={w.id}>{w.name}</option>))}
                                        </select>
                                    </div>
                                    <div>
                                        <label>Responsable</label>
                                        <select value={editingTask.owner} onChange={(e) => setEditingTask({ ...editingTask, owner: e.target.value })}>
                                            {settings.owners.map(o => (<option key={o} value={o}>{o}</option>))}
                                        </select>
                                    </div>
                                    <div>
                                        <label>Tipo</label>
                                        <select value={editingTask.type} onChange={(e) => setEditingTask({ ...editingTask, type: e.target.value })}>
                                            {settings.types.map(t => (<option key={t} value={t}>{t}</option>))}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-row" style={{ marginTop: 12 }}>
                                    <label>Fecha Objetivo</label>
                                    <input type="date" value={editingTask.due || ""} onChange={(e) => setEditingTask({ ...editingTask, due: e.target.value })} />
                                </div>
                                <div className="form-row">
                                    <label>Descripción</label>
                                    <textarea value={editingTask.desc || ""} onChange={(e) => setEditingTask({ ...editingTask, desc: e.target.value })} />
                                </div>
                            </div>
                            <div className="m-foot">
                                <button className="btn-ghost" style={{ color: "var(--danger)" }} onClick={deleteTask}>Eliminar</button>
                                <button className="btn-primary" onClick={saveTask}>Guardar</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* COLUMN MODAL */}
                {isColModalOpen && (
                    <div className="backdrop" onClick={() => setIsColModalOpen(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 400 }}>
                            <div className="m-head"><h3 style={{ margin: 0 }}>Nueva Columna</h3><button className="btn-ghost" onClick={() => setIsColModalOpen(false)}>✕</button></div>
                            <div className="m-body">
                                <div className="form-row">
                                    <label>Nombre columna</label>
                                    <input value={newColName} onChange={e => setNewColName(e.target.value)} autoFocus placeholder="Ej: Bloqueado" />
                                </div>
                                <div className="form-row">
                                    <label>Color</label>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        {["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6"].map(c => (
                                            <div key={c} onClick={() => setNewColColor(c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', boxShadow: newColColor === c ? '0 0 0 2px var(--panel), 0 0 0 4px ' + c : 'none' }}></div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="m-foot">
                                <button className="btn-primary" onClick={addColumn}>Crear Columna</button>
                            </div>
                        </div>
                    </div>
                )}

                {toastMessage && <div id="toast" className="show">{toastMessage}</div>}
            </main>
        </>
    );
}

// --- ANALYTICS COMPONENT ---
function AnalyticsView({ tasks, settings, statuses }: { tasks: Task[], settings: BoardSettings, statuses: StatusColumn[] }) {

    // 1. GLOBAL KPIS
    const totalTasks = tasks.length;
    const endStatusId = statuses[statuses.length - 1].id; // Last column considered "Done"
    const completedTasks = tasks.filter(t => t.status === endStatusId).length;
    const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    // 2. WEEKLY VELOCITY
    const weeklyData = settings.weeks.map(w => {
        const weekTasks = tasks.filter(t => t.week === w.id);
        const done = weekTasks.filter(t => t.status === endStatusId).length;
        const total = weekTasks.length;
        return {
            name: w.name.split(' · ')[0], // "W1"
            total,
            done,
            percent: total === 0 ? 0 : (done / total) * 100
        };
    });

    // 3. WORKLOAD BY OWNER
    const workloadData = settings.owners.map(o => {
        const active = tasks.filter(t => t.owner === o && t.status !== endStatusId).length;
        return { name: o.split(' (')[0], value: active };
    }).sort((a, b) => b.value - a.value);

    // 4. STATUS DISTRIBUTION
    const statusData = statuses.map(s => {
        return {
            ...s,
            count: tasks.filter(t => t.status === s.id).length
        };
    });

    // 5. GATES HEALTH
    const gateData = settings.gates.map(g => {
        const gateTasks = tasks.filter(t => t.gate === g);
        const isClosed = gateTasks.length > 0 && gateTasks.every(t => t.status === endStatusId);
        return { name: g, total: gateTasks.length, closed: isClosed };
    });

    return (
        <div className="view-section active fade-in">
            <div className="analytics-grid">
                {/* KPI CARDS */}
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

                {/* ROW 1: VELOCITY & WORKLOAD */}
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
                    <h3>Carga de Trabajo (Activa)</h3>
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

                {/* ROW 2: STATUS & GATES */}
                <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                    <h3>Estado del Proyecto</h3>
                    <div className="status-pill-bar">
                        {statusData.map(s => s.count > 0 && (
                            <div key={s.id} style={{ flex: s.count, background: s.color, height: 24, position: 'relative' }} title={`${s.name}: ${s.count}`}>
                            </div>
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
                .analytics-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 20px;
                    padding: 20px 0;
                }
                .kpi-card {
                    background: var(--panel);
                    padding: 20px;
                    border-radius: 12px;
                    border: 1px solid var(--border);
                    text-align: center;
                }
                .kpi-value { font-size: 36px; font-weight: 800; margin: 10px 0; }
                .kpi-label { font-size: 13px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-dim); }
                
                .chart-card {
                    background: var(--panel);
                    padding: 20px;
                    border-radius: 12px;
                    border: 1px solid var(--border);
                }
                .chart-card h3 { margin: 0 0 15px 0; font-size: 16px; opacity: 0.9; }

                /* WEEKLY BAR CHART */
                .chart-container {
                    display: flex;
                    align-items: flex-end;
                    justify-content: space-between;
                    height: 150px;
                    padding-top: 10px;
                }
                .bar-group { display: flex; flex-direction: column; align-items: center; flex: 1; }
                .bar-bg { width: 12px; height: 100px; background: var(--panel-hover); border-radius: 6px; display: flex; align-items: flex-end; overflow: hidden; }
                .bar-label { font-size: 10px; margin-top: 8px; color: var(--text-dim); }
                .bar-fill { width: 100%; transition: height 0.5s ease; border-radius: 6px; }

                /* WORKLOAD LIST */
                .list-chart { display: flex; flex-direction: column; gap: 8px; }
                .lc-row { display: flex; align-items: center; gap: 10px; font-size: 13px; }
                .lc-label { width: 80px; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                .lc-bar-area { flex: 1; height: 8px; background: var(--panel-hover); border-radius: 4px; overflow: hidden; }
                .lc-bar { height: 100%; background: #f59e0b; border-radius: 4px; }
                .lc-val { width: 20px; text-align: right; font-weight: bold; }

                /* STATUS PILL */
                .status-pill-bar { display: flex; border-radius: 12px; overflow: hidden; margin-bottom: 15px; }
                .legend { display: flex; flex-wrap: wrap; gap: 15px; font-size: 12px; }
                .l-item { display: flex; align-items: center; gap: 6px; }
                .dot { width: 8px; height: 8px; borderRadius: 50%; }

                /* GATES */
                .gate-list { display: flex; flex-direction: column; gap: 10px; }
                .gate-item { display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 8px; background: var(--panel-hover); border: 1px solid transparent; }
                .gate-item.closed { background: #ecfdf5; border-color: #10b981; color: #064e3b; }
                .gate-item.open { opacity: 0.7; }
                .g-name { flex: 1; font-weight: 600; }
                .g-status { font-size: 11px; text-transform: uppercase; }
                 
                /* Responsive */
                 @media (max-width: 900px) {
                    .analytics-grid { grid-template-columns: 1fr; }
                    .chart-card { grid-column: span 1 !important; }
                }

            `}</style>
        </div>
    );
}
