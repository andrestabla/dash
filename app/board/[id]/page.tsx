"use client";

import { useState, useEffect, useMemo, use } from "react";
import Link from 'next/link';

/* CONFIG */
const KEY = "4shine_roadmap_v8_brand";

type TaskStatus = "todo" | "doing" | "review" | "done";

interface Task {
    id: number;
    week: string;
    name: string;
    status: string; // TaskStatus
    owner: string;
    type: string;
    prio: string;
    gate: string;
    due: string;
    desc: string;
    dashboard_id: string;
}

const STATUSES = [
    { id: "todo", name: "Por hacer", color: "#64748b" },
    { id: "doing", name: "En proceso", color: "#3b82f6" },
    { id: "review", name: "Revisión", color: "#f59e0b" },
    { id: "done", name: "Hecho", color: "#10b981" },
];

const WEEKS = [
    { id: "W1", name: "W1 · Inicio" },
    { id: "W2", name: "W2 · Extracción" },
    { id: "W3", name: "W3 · Gate A" },
    { id: "W4", name: "W4 · Gate B" },
    { id: "W5", name: "W5 · Activación" },
    { id: "W6", name: "W6 · Producción" },
    { id: "W7", name: "W7 · Gate C" },
    { id: "W8", name: "W8 · Gate D" },
    { id: "W9", name: "W9 · Cierre" },
];

const TYPES = ["Gestión", "Inventario", "Metodología", "Evaluación", "Producción", "Comité", "IP-Ready"];
const OWNERS = ["Andrés Tabla (Metodólogo)", "Carmenza Alarcón (Cliente)"];

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: dashboardId } = use(params);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [activeTab, setActiveTab] = useState<"kanban" | "timeline" | "analytics">("kanban");
    const [filters, setFilters] = useState({ search: "", week: "", owner: "" });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Partial<Task>>({});
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Load Data
    useEffect(() => {
        if (!dashboardId) return;
        fetch(`/api/tasks?dashboardId=${dashboardId}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setTasks(data);
            })
            .catch(err => console.error("Failed to load tasks", err));
    }, [dashboardId]);

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

    /* ACTIONS */
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
            setTasks(originalTasks); // Revert
            alert("Error al actualizar");
        }
    };

    const openModal = (task?: Task) => {
        setEditingTask(
            task || {
                status: "todo",
                week: "W1",
                prio: "med",
                gate: "",
                type: "Metodología",
                owner: OWNERS[0],
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

        // Optimistic Update
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
            // Optimistic
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

    // Analytics Calcs
    const analyticsData = useMemo(() => {
        const total = tasks.length;
        const done = tasks.filter(t => t.status === "done").length;
        const percent = total ? Math.round((done / total) * 100) : 0;

        const weekly = WEEKS.map(w => {
            const wTasks = tasks.filter(t => t.week === w.id);
            const wDone = wTasks.filter(t => t.status === "done").length;
            const wPct = wTasks.length ? Math.round((wDone / wTasks.length) * 100) : 0;
            return { ...w, percent: wPct, hasTasks: wTasks.length > 0 };
        });

        const gates = ["A", "B", "C", "D"].map(g => {
            const gTasks = tasks.filter(t => t.gate === g);
            const allDone = gTasks.length > 0 && gTasks.every(t => t.status === "done");
            return { gate: g, open: allDone, hasTasks: gTasks.length > 0 };
        });

        const owners: Record<string, number> = {};
        tasks.forEach(t => {
            if (t.status !== "done") owners[t.owner] = (owners[t.owner] || 0) + 1;
        });
        const sortedOwners = Object.entries(owners).sort((a, b) => b[1] - a[1]);
        const maxLoad = sortedOwners[0]?.[1] || 1;

        const upcoming = tasks
            .filter(t => t.status !== "done" && t.due)
            .sort((a, b) => a.due.localeCompare(b.due))
            .slice(0, 4);

        return { total, done, percent, weekly, gates, sortedOwners, maxLoad, upcoming };
    }, [tasks]);

    return (
        <>
            <header>
                <div className="top-bar">
                    <div className="logo-area">
                        <Link href="/" className="btn-ghost" title="Volver al Workspace">
                            ←
                        </Link>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="https://www.algoritmot.com/wp-content/uploads/2022/08/Recurso-8-1536x245.png"
                            alt="Algoritmo T"
                            className="brand-logo"
                        />
                        <div style={{ marginLeft: 8, paddingLeft: 12, borderLeft: "1px solid var(--border)" }}>
                            <h1 className="app-title">Roadmap 4Shine</h1>
                            <p className="app-sub">TABLERO DE TRABAJO</p>
                        </div>
                    </div>
                    <div className="top-buttons" style={{ display: "flex", gap: 8 }}>
                        <button className="btn-ghost" onClick={toggleTheme} title="Tema">
                            🌓
                        </button>
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
                            {WEEKS.map((w) => (
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
                            {OWNERS.map((o) => (
                                <option key={o} value={o}>
                                    {o}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="tabs">
                        <div
                            className={`tab ${activeTab === "kanban" ? "active" : ""}`}
                            onClick={() => setActiveTab("kanban")}
                        >
                            🧩 Tablero
                        </div>
                        <div
                            className={`tab ${activeTab === "timeline" ? "active" : ""}`}
                            onClick={() => setActiveTab("timeline")}
                        >
                            🗓️ Lista
                        </div>
                        <div
                            className={`tab ${activeTab === "analytics" ? "active" : ""}`}
                            onClick={() => setActiveTab("analytics")}
                        >
                            📊 Datos
                        </div>
                    </div>
                </div>

                {/* KANBAN */}
                <div className={`view-section ${activeTab === "kanban" ? "active" : ""}`}>
                    <div className="kanban-container">
                        <div className="lanes">
                            {STATUSES.map((st) => {
                                const colTasks = filteredTasks.filter((t) => t.status === st.id);
                                return (
                                    <div key={st.id} className="lane">
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
                                                <div
                                                    key={t.id}
                                                    className={`card p-${t.prio || "med"}`}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, t.id)}
                                                    onClick={() => openModal(t)}
                                                >
                                                    <div className="card-top">
                                                        <span className="chip">{t.week}</span>
                                                        {t.gate && <span className="chip gate">⛩️ {t.gate}</span>}
                                                    </div>
                                                    <div className="card-title">{t.name}</div>
                                                    <div className="card-desc">
                                                        👤 {t.owner.split(" (")[0]}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* TIMELINE */}
                <div className={`view-section ${activeTab === "timeline" ? "active" : ""}`}>
                    <div className="timeline-view">
                        {WEEKS.map((w) => {
                            const weekTasks = filteredTasks.filter(t => t.week === w.id);
                            if (weekTasks.length === 0) return null;
                            return (
                                <div key={w.id} className="tl-group">
                                    <div className="tl-header">{w.name}</div>
                                    {weekTasks.map(t => (
                                        <div key={t.id} className="tl-item">
                                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUSES.find(s => s.id === t.status)?.color }}></div>
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

                {/* ANALYTICS */}
                <div className={`view-section ${activeTab === "analytics" ? "active" : ""}`}>
                    <div className="analytics-grid">
                        <div className="a-card">
                            <h3>🚀 Avance Global</h3>
                            <div style={{ fontSize: 36, fontWeight: 800, color: 'var(--primary)', textAlign: 'center', margin: '10px 0' }}>
                                <span>{analyticsData.percent}%</span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center' }}>
                                <span>{analyticsData.done}</span> tareas completadas de <span>{analyticsData.total}</span>
                            </div>
                        </div>

                        <div className="a-card" style={{ gridColumn: "span 2" }}>
                            <h3>📅 Progreso Semanal</h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {analyticsData.weekly.map(w => w.hasTasks && (
                                    <div key={w.id} style={{ fontSize: 11 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                            <span>{w.id}</span> <span>{w.percent}%</span>
                                        </div>
                                        <div className="prog-track">
                                            <div className="prog-fill" style={{ width: `${w.percent}%`, background: w.percent === 100 ? 'var(--success)' : 'var(--primary)' }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="a-card">
                            <h3>⛩️ Estado Gates</h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {analyticsData.gates.map(g => g.hasTasks && (
                                    <div key={g.gate} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: 6, background: 'var(--panel-hover)', borderRadius: 6, alignItems: 'center' }}>
                                        <strong>Gate {g.gate}</strong>
                                        <span className={`chip ${g.open ? 'gate' : ''}`} style={g.open ? { color: 'var(--success)', background: '#ecfdf5' } : {}}>
                                            {g.open ? '🔓 Abierto' : '🔒 Pendiente'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="a-card" style={{ gridColumn: "span 2" }}>
                            <h3>⚖️ Carga (Pendientes)</h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {analyticsData.sortedOwners.length === 0 && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>¡Sin tareas pendientes!</div>}
                                {analyticsData.sortedOwners.map(([name, count]) => (
                                    <div key={name} style={{ marginBottom: 6 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                                            <span>{name.split(" (")[0]}</span>
                                            <span>{count}</span>
                                        </div>
                                        <div className="prog-track"><div className="prog-fill warn" style={{ width: `${(count / analyticsData.maxLoad) * 100}%` }}></div></div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="a-card" style={{ gridColumn: "span 2" }}>
                            <h3>⏰ Próximos Vencimientos</h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {analyticsData.upcoming.length === 0 && <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Sin vencimientos cercanos</div>}
                                {analyticsData.upcoming.map(t => (
                                    <div key={t.id} style={{ background: 'var(--panel-hover)', border: '1px solid var(--border)', padding: 8, borderRadius: 6, fontSize: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{t.due.slice(5)}</span>
                                        <span style={{ color: 'var(--text-dim)', textAlign: 'right', maxWidth: 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {isModalOpen && (
                    <div className="backdrop" onClick={() => setIsModalOpen(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            {/* Modal Content - same as before but uses editingTask state */}
                            <div className="m-head">
                                <h3 style={{ margin: 0, fontSize: 15 }}>{editingTask.id ? "Editar Tarea" : "Nueva Tarea"}</h3>
                                <button className="btn-ghost" onClick={() => setIsModalOpen(false)}>
                                    ✕
                                </button>
                            </div>
                            <div className="m-body">
                                <div className="form-row">
                                    <label>Tarea</label>
                                    <input
                                        value={editingTask.name || ""}
                                        onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })}
                                        style={{ fontWeight: 600 }}
                                    />
                                </div>
                                <div className="form-grid">
                                    <div>
                                        <label>Estado</label>
                                        <select
                                            value={editingTask.status}
                                            onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                                        >
                                            {STATUSES.map((s) => (
                                                <option key={s.id} value={s.id}>
                                                    {s.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label>Semana</label>
                                        <select
                                            value={editingTask.week}
                                            onChange={(e) => setEditingTask({ ...editingTask, week: e.target.value })}
                                        >
                                            {WEEKS.map((w) => (
                                                <option key={w.id} value={w.id}>
                                                    {w.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label>Responsable</label>
                                        <select
                                            value={editingTask.owner}
                                            onChange={(e) => setEditingTask({ ...editingTask, owner: e.target.value })}
                                        >
                                            {OWNERS.map((o) => (
                                                <option key={o} value={o}>
                                                    {o}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label>Tipo</label>
                                        <select
                                            value={editingTask.type}
                                            onChange={(e) => setEditingTask({ ...editingTask, type: e.target.value })}
                                        >
                                            {TYPES.map((t) => (
                                                <option key={t} value={t}>
                                                    {t}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label>Prioridad</label>
                                        <select
                                            value={editingTask.prio}
                                            onChange={(e) => setEditingTask({ ...editingTask, prio: e.target.value })}
                                        >
                                            <option value="high">🔴 Alta</option>
                                            <option value="med">🟡 Media</option>
                                            <option value="low">🟢 Baja</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label>Gate</label>
                                        <select
                                            value={editingTask.gate}
                                            onChange={(e) => setEditingTask({ ...editingTask, gate: e.target.value })}
                                        >
                                            <option value="">-</option>
                                            <option value="A">Gate A</option>
                                            <option value="B">Gate B</option>
                                            <option value="C">Gate C</option>
                                            <option value="D">Gate D</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-row" style={{ marginTop: 12 }}>
                                    <label>Fecha Objetivo</label>
                                    <input
                                        type="date"
                                        value={editingTask.due || ""}
                                        onChange={(e) => setEditingTask({ ...editingTask, due: e.target.value })}
                                    />
                                </div>
                                <div className="form-row">
                                    <label>Descripción</label>
                                    <textarea
                                        value={editingTask.desc || ""}
                                        onChange={(e) => setEditingTask({ ...editingTask, desc: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="m-foot">
                                <button
                                    className="btn-ghost"
                                    style={{ color: "var(--danger)" }}
                                    onClick={deleteTask}
                                >
                                    Eliminar
                                </button>
                                <button className="btn-primary" onClick={saveTask}>
                                    Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
            {toastMessage && <div id="toast" className="show">{toastMessage}</div>}
        </>
    );
}
