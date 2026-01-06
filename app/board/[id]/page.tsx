"use client";

import { useState, useEffect, useMemo, use } from "react";
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useToast } from "@/components/ToastProvider";
import ConfirmModal from "@/components/ConfirmModal";

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

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: dashboardId } = use(params);
    const { showToast } = useToast();

    const [tasks, setTasks] = useState<Task[]>([]);
    const [settings, setSettings] = useState<BoardSettings | null>(null);
    const [dashboardName, setDashboardName] = useState("Roadmap");
    const [activeTab, setActiveTab] = useState<"kanban" | "timeline" | "analytics">("kanban");
    const [filters, setFilters] = useState({ search: "", week: "", owner: "" });
    const [availableUsers, setAvailableUsers] = useState<{ id: string, name: string, email: string }[]>([]);

    // Modals
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Partial<Task>>({});

    // Confirmation State
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);
    const [confirmMessage, setConfirmMessage] = useState("");

    // Comments State
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState("");
    const [currentUser, setCurrentUser] = useState<{ name: string, email: string } | null>(null);

    // Fetch Current User
    useEffect(() => {
        fetch('/api/auth/me').then(res => res.json()).then(data => {
            if (data.user) setCurrentUser(data.user);
        }).catch(() => { });
    }, []);

    // Load Comments when Modal Opens
    useEffect(() => {
        if (isModalOpen && editingTask.id) {
            fetch(`/api/comments?taskId=${editingTask.id}`)
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setComments(data);
                })
                .catch(err => console.error("Failed to load comments", err));
        } else {
            setComments([]);
        }
    }, [isModalOpen, editingTask.id]);

    const handleAddComment = async () => {
        if (!newComment.trim() || !editingTask.id || !currentUser) return;

        try {
            const res = await fetch('/api/comments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taskId: editingTask.id,
                    userEmail: currentUser.email,
                    userName: currentUser.name,
                    content: newComment
                })
            });

            if (res.ok) {
                const comment = await res.json();
                setComments(prev => [comment, ...prev]);
                setNewComment("");
            }
        } catch (err) {
            showToast("Error al agregar comentario", "error");
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!confirm("¿Eliminar comentario?")) return;
        try {
            const res = await fetch(`/api/comments?id=${commentId}`, { method: 'DELETE' });
            if (res.ok) {
                setComments(prev => prev.filter(c => c.id !== commentId));
            }
        } catch (err) {
            showToast("Error al eliminar comentario", "error");
        }
    };

    // Column Editing
    const [isColModalOpen, setIsColModalOpen] = useState(false);
    const [newColName, setNewColName] = useState("");
    const [newColColor, setNewColColor] = useState("#64748b");

    // Dashboard Settings
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [editSettings, setEditSettings] = useState({
        name: "",
        description: "",
        icon: "🚀",
        weekCount: 8,
        owners: "",
        gates: "",
        types: ""
    });

    const openSettings = () => {
        if (!settings) return;
        setEditSettings({
            name: dashboardName,
            description: "", // We need to fetch/store description in BoardSettings if we want to edit it properly, currently simpler to keep blank or read from somewhere else
            icon: settings.icon || "🚀",
            weekCount: settings.weeks.length,
            owners: settings.owners.join(", "),
            gates: settings.gates.join(", "),
            types: settings.types.join(", ")
        });
        setIsSettingsOpen(true);
    };

    const saveDashboardSettings = async () => {
        if (!editSettings.name.trim()) return showToast("El nombre es requerido", "error");

        // Reconstruct Weeks
        const weeks = Array.from({ length: editSettings.weekCount }, (_, i) => ({
            id: `W${i + 1}`,
            name: `Semana ${i + 1}`
        }));

        const newSettingsData: BoardSettings = {
            ...settings!,
            weeks: weeks, // Note: This resets week names to default "Semana X" if they were custom. For now this is acceptable behavior for "Change Duration".
            owners: editSettings.owners.split(",").map(s => s.trim()).filter(Boolean),
            gates: editSettings.gates.split(",").map(s => s.trim()).filter(Boolean),
            types: editSettings.types.split(",").map(s => s.trim()).filter(Boolean),
            icon: editSettings.icon
        };

        const body = {
            id: dashboardId,
            name: editSettings.name,
            description: editSettings.description, // We will update the top level description
            settings: newSettingsData
        };

        try {
            const res = await fetch('/api/dashboards', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                setSettings(newSettingsData);
                setDashboardName(editSettings.name);
                setIsSettingsOpen(false);
                showToast("Tablero actualizado", "success");
            } else {
                showToast("Error al guardar", "error");
            }
        } catch (err) {
            showToast("Error de conexión", "error");
        }
    };

    // Access State
    const [accessDenied, setAccessDenied] = useState(false);

    // Load Data
    useEffect(() => {
        if (!dashboardId) return;

        // Fetch Dashboard Settings
        fetch(`/api/dashboards/${dashboardId}`)
            .then(async res => {
                if (res.status === 403) {
                    setAccessDenied(true);
                    return null;
                }
                return res.json();
            })
            .then(data => {
                if (data && data.settings) {
                    setSettings(data.settings);
                    setDashboardName(data.name);
                }
            })
            .catch(err => console.error("Failed to load dashboard settings", err));

        // Fetch Tasks
        fetch(`/api/tasks?dashboardId=${dashboardId}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setTasks(data);
            })
            .catch(err => console.error("Failed to load tasks", err));

        // Fetch Available Users for Dropdown
        fetch('/api/users/list')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setAvailableUsers(data);
            })
            .catch(err => console.error("Failed to load users", err));

    }, [dashboardId]);



    if (accessDenied) {
        return (
            <div style={{ padding: 40, textAlign: 'center', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 64, marginBottom: 20 }}>🚫</div>
                <h1 style={{ marginBottom: 10 }}>Acceso Denegado</h1>
                <p style={{ color: 'var(--text-dim)', marginBottom: 20 }}>No tienes permisos para ver este tablero.</p>
                <Link href="/" className="btn-primary">Volver al Inicio</Link>
            </div>
        );
    }

    const statuses = useMemo(() => {
        return settings?.statuses || DEFAULT_STATUSES;
    }, [settings]);

    const toggleTheme = () => {
        const current = localStorage.getItem("theme");
        const next = current === "dark" ? "light" : "dark";
        localStorage.setItem("theme", next);
        document.documentElement.classList.toggle("dark", next === "dark");
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

    // --- DRAG AND DROP ---
    const onDragEnd = async (result: DropResult) => {
        const { source, destination, draggableId } = result;

        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const taskId = parseInt(draggableId);
        const newStatus = destination.droppableId;

        // Optimistic Update
        const originalTasks = [...tasks];
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

        // API Call
        try {
            const task = tasks.find(t => t.id === taskId);
            if (task && task.status !== newStatus) {
                await fetch('/api/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...task, status: newStatus, dashboard_id: dashboardId })
                });
                // Silent success for DnD
            }
        } catch (err) {
            setTasks(originalTasks);
            showToast("Error al mover la tarea", "error");
        }
    };

    // TASK MANAGEMENT
    const openModal = (task?: Task) => {
        if (!settings) return;
        setEditingTask(
            task || {
                status: statuses[0].id,
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
        if (!editingTask.name?.trim()) {
            showToast("El nombre es requerido", "error");
            return;
        }

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
            showToast("Tarea guardada", "success");
        } catch (err) {
            setTasks(originalTasks);
            showToast("Error al guardar", "error");
        }
    };

    const requestDeleteTask = () => {
        setConfirmMessage("¿Estás seguro de que quieres eliminar esta tarea? No podrás deshacerlo.");
        setConfirmCallback(() => executeDeleteTask);
        setConfirmOpen(true);
    };

    const executeDeleteTask = async () => {
        if (!editingTask.id) return;

        const originalTasks = [...tasks];
        setTasks(prev => prev.filter(t => t.id !== editingTask.id));
        setIsModalOpen(false);
        setConfirmOpen(false);

        try {
            await fetch(`/api/tasks?id=${editingTask.id}`, { method: 'DELETE' });
            showToast("Tarea eliminada", "info");
        } catch (err) {
            setTasks(originalTasks);
            showToast("Error al eliminar", "error");
        }
    };

    // COLUMN MANAGEMENT
    const [editingColId, setEditingColId] = useState<string | null>(null);

    const openAddCol = () => {
        setEditingColId(null);
        setNewColName("");
        setNewColColor("#64748b");
        setIsColModalOpen(true);
    };

    const openEditCol = (col: StatusColumn) => {
        setEditingColId(col.id);
        setNewColName(col.name);
        setNewColColor(col.color);
        setIsColModalOpen(true);
    };

    const handleSaveCol = async () => {
        if (!newColName.trim() || !settings) return;

        let newStatuses: StatusColumn[];

        if (editingColId) {
            // Edit existing
            newStatuses = statuses.map(s =>
                s.id === editingColId
                    ? { ...s, name: newColName, color: newColColor }
                    : s
            );
        } else {
            // Add new
            const newColId = newColName.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now().toString().slice(-4);
            newStatuses = [...statuses, { id: newColId, name: newColName, color: newColColor }];
        }

        const newSettings = { ...settings, statuses: newStatuses };
        setSettings(newSettings);
        setIsColModalOpen(false);

        try {
            await fetch('/api/dashboards', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: dashboardId,
                    name: dashboardName,
                    description: "",
                    settings: newSettings
                })
            });
            showToast(editingColId ? "Columna actualizada" : "Columna añadida", "success");
        } catch (err) {
            showToast("Error al guardar columna", "error");
        }
    };

    const confirmDeleteCol = (colId: string) => {
        const hasTasks = tasks.some(t => t.status === colId);
        if (hasTasks) {
            showToast("No puedes eliminar una columna con tareas activas", "error");
            return;
        }

        if (statuses.length <= 1) {
            showToast("Debe haber al menos una columna", "error");
            return;
        }

        setConfirmMessage("¿Eliminar esta columna?");
        setConfirmCallback(() => () => executeDeleteCol(colId));
        setConfirmOpen(true);
    };

    const executeDeleteCol = async (colId: string) => {
        if (!settings) return;
        const newStatuses = statuses.filter(s => s.id !== colId);
        const newSettings = { ...settings, statuses: newStatuses };
        setSettings(newSettings);
        setConfirmOpen(false);

        try {
            await fetch('/api/dashboards', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: dashboardId,
                    name: dashboardName,
                    description: "",
                    settings: newSettings
                })
            });
            showToast("Columna eliminada", "info");
        } catch (err) {
            showToast("Error al eliminar columna", "error");
        }
    };

    if (!settings) return <div style={{ padding: 40, textAlign: 'center' }}>Cargando tablero...</div>;

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <header>
                <div className="top-bar">
                    <div className="logo-area">
                        <Link href="/" className="btn-ghost" title="Volver al Workspace">
                            <span style={{ fontSize: 24 }}>←</span>
                        </Link>
                        <div style={{ marginLeft: 8, paddingLeft: 12, borderLeft: "1px solid var(--border)" }}>
                            <h1 className="app-title">{settings.icon} {dashboardName}</h1>
                            <p className="app-sub">TABLERO DE TRABAJO</p>
                        </div>
                    </div>
                </div>

                {/* ABSOLUTE TOP RIGHT CONTROLS */}
                <div style={{ position: 'absolute', right: 24, top: 0, height: 70, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button className="btn-ghost" onClick={openSettings} title="Configuración del Tablero">
                        ⚙️
                    </button>
                    <button className="btn-ghost" onClick={toggleTheme} title="Cambiar Tema">
                        🌓
                    </button>
                    <Link href="/" className="btn-ghost" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>✕</span> <span>Cerrar</span>
                    </Link>
                </div>
            </header>

            <main>
                <div className="controls">
                    <div className="filters">
                        <button className="btn-primary" onClick={() => {
                            setEditingTask({ id: undefined, name: "", status: settings.statuses?.[0]?.id || "todo", week: settings.weeks[0]?.id || "", owner: settings.owners[0] || "", type: "Feature" });
                            setIsModalOpen(true);
                        }} style={{ marginRight: 12 }}>
                            <span>➕</span> <span style={{ marginLeft: 4 }}>Nueva Tarea</span>
                        </button>

                        <button className="btn-ghost" onClick={openAddCol} style={{ marginRight: 12, border: '1px solid var(--border-dim)', background: 'var(--bg-panel)' }}>
                            <span>🏗️</span> <span style={{ marginLeft: 4 }}>Nueva Columna</span>
                        </button>

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
                {activeTab === "kanban" && (
                    <div className="view-section active">
                        <div className="kanban-container">
                            <div className="lanes" style={{ display: 'flex', height: '100%', alignItems: 'stretch' }}>
                                {statuses.map((st, index) => {
                                    const colTasks = filteredTasks.filter((t) => t.status === st.id);
                                    const isBottleneck = colTasks.length > 10;

                                    return (
                                        <div key={st.id} className="lane" style={{ minWidth: 320, display: 'flex', flexDirection: 'column', borderTop: `3px solid ${st.color}` }}>
                                            <div className="lane-head group">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>{st.name}</span>
                                                    <span className={`counter-badge ${isBottleneck ? "warning" : ""}`}>{colTasks.length}</span>
                                                </div>
                                                <div className="lane-actions" style={{ opacity: 0, transition: 'opacity 0.2s' }}>
                                                    <button className="btn-ghost" onClick={() => openEditCol(st)} style={{ padding: 4, height: 'auto' }} title="Editar Columna">✏️</button>
                                                    <button className="btn-ghost" onClick={() => confirmDeleteCol(st.id)} style={{ padding: 4, height: 'auto', color: '#f87171' }} title="Eliminar Columna">🗑️</button>
                                                </div>
                                            </div>

                                            <Droppable droppableId={st.id}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.droppableProps}
                                                        className="drop-zone lane-content"
                                                        style={{
                                                            flex: 1,
                                                            background: snapshot.isDraggingOver ? 'var(--panel-hover)' : 'transparent',
                                                            transition: 'background 0.2s',
                                                            minHeight: 100,
                                                            overflowY: 'auto', // Custom scrollbar handles this
                                                            paddingRight: 6,
                                                            borderRadius: 8
                                                        }}
                                                    >
                                                        {colTasks.length === 0 && !snapshot.isDraggingOver ? (
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 140, opacity: 0.4, border: '2px dashed var(--border-dim)', borderRadius: 12, margin: '10px 0' }}>
                                                                <span style={{ fontSize: 28, marginBottom: 8, filter: 'grayscale(1)' }}>📭</span>
                                                                <span style={{ fontSize: 13, fontWeight: 500 }}>Sin tareas</span>
                                                            </div>
                                                        ) : (
                                                            colTasks.map((t, index) => (
                                                                <Draggable key={t.id} draggableId={t.id.toString()} index={index}>
                                                                    {(provided, snapshot) => (
                                                                        <div
                                                                            ref={provided.innerRef}
                                                                            {...provided.draggableProps}
                                                                            {...provided.dragHandleProps}
                                                                            className={`kanban-card p-${t.prio || "med"}`}
                                                                            onClick={() => openModal(t)}
                                                                            style={{
                                                                                ...provided.draggableProps.style,
                                                                                marginBottom: 12,
                                                                                opacity: snapshot.isDragging ? 0.9 : 1,
                                                                                transform: snapshot.isDragging ? provided.draggableProps.style?.transform : 'none'
                                                                            }}
                                                                        >
                                                                            {/* Main Title Hierachy */}
                                                                            <div style={{ marginBottom: 12, fontWeight: 700, fontSize: 15, lineHeight: 1.4, color: 'var(--text-main)' }}>
                                                                                {t.name}
                                                                            </div>

                                                                            {/* Secondary Info Row */}
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                                                    <span className="chip" style={{ fontSize: 10, padding: '2px 8px' }}>{t.week}</span>
                                                                                    {t.gate && <span className="chip gate" style={{ fontSize: 10, padding: '2px 8px' }}>⛩️ {t.gate}</span>}
                                                                                </div>

                                                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', opacity: 0.8 }}>
                                                                                    <div title={`Responsable: ${t.owner}`} style={{ fontSize: 14, cursor: 'help' }}>👤</div>

                                                                                    {/* Priority Icons with Tooltips */}
                                                                                    {t.prio === 'high' && <span title="Prioridad Alta" style={{ cursor: 'help' }}>🔴</span>}
                                                                                    {t.prio === 'med' && <span title="Prioridad Media" style={{ cursor: 'help' }}>🟡</span>}
                                                                                    {t.prio === 'low' && <span title="Prioridad Baja" style={{ cursor: 'help' }}>🟢</span>}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </Draggable>
                                                            ))
                                                        )}
                                                        {provided.placeholder}

                                                        {/* Ghost Button in 'Todo' or first column */}
                                                        {index === 0 && (
                                                            <button className="btn-ghost-add" onClick={() => {
                                                                setEditingTask({ id: undefined, name: "", status: st.id, week: settings.weeks[0]?.id || "", owner: settings.owners[0] || "", type: "Feature" });
                                                                setIsModalOpen(true);
                                                            }} style={{ marginTop: 8 }}>
                                                                <span style={{ marginRight: 6, fontSize: 16 }}>+</span> Nueva Tarea
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </Droppable>
                                        </div>
                                    );
                                })}

                                <div className="lane" style={{ minWidth: 100, background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <button className="btn-ghost" onClick={openAddCol} style={{ fontSize: 24, opacity: 0.5 }}>➕</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* TIMELINE */}
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

                {/* ANALYTICS */}
                {activeTab === "analytics" && settings && (
                    <AnalyticsView tasks={tasks} settings={settings} statuses={statuses} />
                )}

                {/* TASK MODAL */}
                {isModalOpen && settings && (
                    <div className="backdrop fade-in" onClick={() => setIsModalOpen(false)}>
                        <div className="modal animate-slide-up" onClick={(e) => e.stopPropagation()}>
                            <div className="m-head">
                                <h3 style={{ margin: 0, fontSize: 15 }}>{editingTask.id ? "Editar Tarea" : "Nueva Tarea"}</h3>
                                <button className="btn-ghost" onClick={() => setIsModalOpen(false)}>✕</button>
                            </div>
                            <div className="m-body">
                                <div className="form-row">
                                    <label>Tarea</label>
                                    <input value={editingTask.name || ""} onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })} style={{ fontWeight: 600 }} autoFocus />
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
                                            <option value="">No Asignado</option>
                                            {/* System Users */}
                                            {availableUsers.length > 0 && (
                                                <optgroup label="Usuarios del Sistema">
                                                    {availableUsers.map(u => (
                                                        <option key={u.id} value={`${u.name} (${u.email})`}>{u.name} ({u.email})</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                            {/* Legacy Manual Owners */}
                                            {settings.owners && settings.owners.length > 0 && (
                                                <optgroup label="Configuración Manual (Legacy)">
                                                    {settings.owners.map(o => (
                                                        <option key={o} value={o}>{o}</option>
                                                    ))}
                                                </optgroup>
                                            )}
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
                                    <textarea value={editingTask.desc || ""} onChange={(e) => setEditingTask({ ...editingTask, desc: e.target.value })} rows={4} />
                                </div>

                                {/* COMMENTS SECTION */}
                                {editingTask.id && (
                                    <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                                        <h4 style={{ margin: '0 0 12px 0', fontSize: 13, textTransform: 'uppercase', color: 'var(--text-dim)' }}>Comentarios</h4>

                                        {/* Comment List */}
                                        <div style={{ marginBottom: 16, maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            {comments.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-dim)', fontStyle: 'italic' }}>No hay comentarios aún.</p>}
                                            {comments.map(c => (
                                                <div key={c.id} style={{ background: 'var(--panel-hover)', padding: '8px 12px', borderRadius: 8 }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            <span style={{ fontWeight: 600, fontSize: 13 }}>{c.user_name}</span>
                                                            <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{new Date(c.created_at).toLocaleString()}</span>
                                                        </div>
                                                        {currentUser?.email === c.user_email && (
                                                            <button className="btn-ghost" onClick={() => handleDeleteComment(c.id)} style={{ padding: 2, height: 'auto', opacity: 0.6 }}>🗑️</button>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{c.content}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Add Comment */}
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <textarea
                                                value={newComment}
                                                onChange={e => setNewComment(e.target.value)}
                                                placeholder="Escribe un comentario..."
                                                style={{ flex: 1, minHeight: 40, padding: 8, fontSize: 13, borderRadius: 6, border: '1px solid var(--border)' }}
                                            />
                                            <button className="btn-ghost" onClick={handleAddComment} disabled={!newComment.trim()} style={{ height: 'auto' }}>
                                                ✈️
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="m-foot">
                                {editingTask.id && (
                                    <button className="btn-ghost" style={{ color: "var(--danger)" }} onClick={requestDeleteTask}>Eliminar</button>
                                )}
                                <button className="btn-primary" onClick={saveTask}>Guardar Tarea</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* CONFIRM MODAL */}
                <ConfirmModal
                    isOpen={confirmOpen}
                    title="Confirmar Acción"
                    message={confirmMessage}
                    onConfirm={confirmCallback || (() => { })}
                    onCancel={() => setConfirmOpen(false)}
                    isDestructive={true}
                    confirmText="Eliminar"
                />

                {/* COLUMN MODAL */}
                {isColModalOpen && (
                    <div className="backdrop fade-in" onClick={() => setIsColModalOpen(false)}>
                        <div className="modal animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ width: 400 }}>
                            <div className="m-head"><h3 style={{ margin: 0 }}>{editingColId ? "Editar Columna" : "Nueva Columna"}</h3><button className="btn-ghost" onClick={() => setIsColModalOpen(false)}>✕</button></div>
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
                                <button className="btn-primary" onClick={handleSaveCol}>
                                    {editingColId ? "Actualizar" : "Crear Columna"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* EDIT DASHBOARD MODAL */}
                {isSettingsOpen && settings && (
                    <div className="backdrop fade-in" onClick={() => setIsSettingsOpen(false)}>
                        <div className="modal animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ width: 600 }}>
                            <div className="m-head">
                                <h3 style={{ margin: 0 }}>Configurar Tablero</h3>
                                <button className="btn-ghost" onClick={() => setIsSettingsOpen(false)}>✕</button>
                            </div>
                            <div className="m-body">
                                <div className="form-grid">
                                    <div>
                                        <label>Nombre del Proyecto</label>
                                        <input value={editSettings.name} onChange={e => setEditSettings({ ...editSettings, name: e.target.value })} style={{ fontWeight: 700 }} />
                                    </div>
                                    <div>
                                        <label>Ícono</label>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            {["🚀", "💻", "🎨", "📈", "🔥", "✨"].map(ic => (
                                                <button key={ic} className="btn-ghost" style={{ fontSize: 18, background: editSettings.icon === ic ? 'var(--bg-panel)' : 'transparent', border: editSettings.icon === ic ? '1px solid var(--primary)' : '1px solid transparent' }} onClick={() => setEditSettings({ ...editSettings, icon: ic })}>{ic}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="form-row" style={{ marginTop: 16 }}>
                                    <label>Descripción</label>
                                    <input value={editSettings.description || ""} onChange={e => setEditSettings({ ...editSettings, description: e.target.value })} placeholder="Breve descripción del objetivo..." />
                                </div>

                                <div className="form-grid" style={{ marginTop: 16 }}>
                                    <div>
                                        <label>Duración (Semanas)</label>
                                        <input type="number" value={editSettings.weekCount} onChange={e => setEditSettings({ ...editSettings, weekCount: parseInt(e.target.value) || 1 })} min={1} max={20} />
                                    </div>
                                    <div>
                                        <label>Equipo (Separado por comas)</label>
                                        <input value={editSettings.owners} onChange={e => setEditSettings({ ...editSettings, owners: e.target.value })} placeholder="Ana, Luis, Pedro..." />
                                    </div>
                                </div>

                                <div className="form-row" style={{ marginTop: 16 }}>
                                    <label>Gates / Hitos (Separados por comas)</label>
                                    <input value={editSettings.gates} onChange={e => setEditSettings({ ...editSettings, gates: e.target.value })} placeholder="Gate 1, Gate 2, Gate 3..." />
                                </div>

                                <div className="form-row" style={{ marginTop: 16 }}>
                                    <label>Tipos de Tarea (Separados por comas)</label>
                                    <input value={editSettings.types} onChange={e => setEditSettings({ ...editSettings, types: e.target.value })} placeholder="Feature, Bug, Spike..." />
                                </div>
                            </div>
                            <div className="m-foot">
                                <button className="btn-primary" onClick={saveDashboardSettings}>Guardar Cambios</button>
                            </div>
                        </div>
                    </div>
                )}

                <style jsx>{`
                    /* LAYOUT */
                    header { background: var(--bg-card); border-bottom: 1px solid var(--border-dim); padding: 0 24px; height: 70px; display: flex; align-items: center; position: sticky; top: 0; z-index: 40; }
                    .top-bar { width: 100%; display: flex; justify-content: space-between; align-items: center; }
                    .logo-area { display: flex; align-items: center; }
                    .app-title { font-size: 18px; font-weight: 700; margin: 0; letter-spacing: -0.5px; }
                    .app-sub { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-dim); margin: 0; font-weight: 600; }
                    
                    main { padding: 24px; height: calc(100vh - 70px); overflow: hidden; display: flex; flex-direction: column; }
                    .controls { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
                    .filters { display: flex; gap: 10px; }
                    .filters input, .filters select { padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-dim); background: var(--bg-card); color: var(--text-main); font-size: 13px; outline: none; transition: all 0.2s; }
                    .filters input:focus, .filters select:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
                    
                    .tabs { display: flex; background: var(--bg-panel); padding: 4px; border-radius: 10px; }
                    .tab { padding: 6px 16px; font-size: 13px; font-weight: 500; color: var(--text-dim); cursor: pointer; border-radius: 8px; transition: all 0.2s; }
                    .tab:hover { color: var(--text-main); }
                    .tab.active { background: var(--bg-card); color: var(--text-main); font-weight: 600; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }

                    /* KANBAN */
                    .view-section { flex: 1; overflow: hidden; display: none; animation: fadeIn 0.3s ease-out; }
                    .view-section.active { display: block; }
                    .kanban-container { height: 100%; overflow-x: auto; padding-bottom: 20px; }
                    .lanes { height: 100%; gap: 24px; padding-right: 40px; }
                    .lane { background: var(--bg-panel); border-radius: 16px; padding: 16px; display: flex; flex-direction: column; border: 1px solid var(--border-dim); transition: background 0.2s; }
                    .lane-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
                    
                    /* Hover Effect for Lane Actions */
                    .lane:hover .lane-actions { opacity: 1 !important; }

                    .counter { background: rgba(0,0,0,0.05); padding: 2px 8px; border-radius: 12px; font-size: 11px; }
                    .dark .counter { background: rgba(255,255,255,0.1); }
                    
                    .drop-zone { flex: 1; overflow-y: auto; padding-right: 4px; display: flex; flex-direction: column; gap: 12px; min-height: 100px; }
                    
                    /* CARDS: Styles moved to globals.css for V11 consistency */
                    .chip { font-size: 10px; font-weight: 700; background: var(--bg-panel); padding: 3px 8px; border-radius: 6px; color: var(--text-dim); text-transform: uppercase; }
                    .chip.gate { background: #ecfdf5; color: #059669; }
                    
                    /* TIMELINE */
                    .timeline-view { padding: 0 40px; max-width: 800px; margin: 0 auto; overflow-y: auto; height: 100%; }
                    .tl-group { margin-bottom: 30px; }
                    .tl-header { font-size: 14px; font-weight: 700; margin-bottom: 12px; color: var(--text-dim); text-transform: uppercase; border-bottom: 1px solid var(--border-dim); padding-bottom: 8px; }
                    .tl-item { display: flex; align-items: center; gap: 16px; padding: 12px; background: var(--bg-card); border-radius: 12px; margin-bottom: 8px; border: 1px solid var(--border-dim); transition: all 0.2s; }
                    .tl-item:hover { transform: translateX(5px); border-color: #3b82f6; }

                    /* MODAL */
                    .backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; }
                    .modal { background: var(--bg-card); width: 500px; max-width: 90vw; max-height: 90vh; border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); overflow: hidden; display: flex; flex-direction: column; }
                    .m-head { padding: 20px 24px; border-bottom: 1px solid var(--border-dim); display: flex; justify-content: space-between; align-items: center; background: var(--bg-panel); }
                    .m-body { padding: 24px; overflow-y: auto; flex: 1; }
                    .m-foot { padding: 20px 24px; border-top: 1px solid var(--border-dim); display: flex; justify-content: flex-end; gap: 12px; background: var(--bg-panel); }
                    
                    .form-row { margin-bottom: 16px; }
                    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
                    label { display: block; font-size: 12px; font-weight: 600; color: var(--text-dim); margin-bottom: 6px; text-transform: uppercase; }
                    input, select, textarea { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--border-dim); background: var(--bg-card); color: var(--text-main); font-family: inherit; transition: all 0.2s; }
                    input:focus, select:focus, textarea:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59,130,246,0.1); }
                    
                    /* DARK MODE ADJUSTMENTS */
                    @media (prefers-color-scheme: dark) {
                        .chip.gate { background: rgba(5, 150, 105, 0.2); color: #34d399; }
                    }
                `}</style>
            </main>
        </DragDropContext>
    );
}

// Analytics Component (kept strictly same styling/logic)
function AnalyticsView({ tasks, settings, statuses }: { tasks: Task[], settings: BoardSettings, statuses: StatusColumn[] }) {
    // ... (logic reused from previous impl)
    const totalTasks = tasks.length;
    const endStatusId = statuses[statuses.length - 1].id;
    const completedTasks = tasks.filter(t => t.status === endStatusId).length;
    const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    const weeklyData = settings.weeks.map(w => {
        const weekTasks = tasks.filter(t => t.week === w.id);
        const done = weekTasks.filter(t => t.status === endStatusId).length;
        const total = weekTasks.length;
        return { name: w.name.split(' · ')[0], total, done, percent: total === 0 ? 0 : (done / total) * 100 };
    });

    const workloadData = settings.owners.map(o => {
        const active = tasks.filter(t => t.owner === o && t.status !== endStatusId).length;
        return { name: o.split(' (')[0], value: active };
    }).sort((a, b) => b.value - a.value);

    const statusData = statuses.map(s => ({ ...s, count: tasks.filter(t => t.status === s.id).length }));
    const gateData = settings.gates.map(g => {
        const gateTasks = tasks.filter(t => t.gate === g);
        const isClosed = gateTasks.length > 0 && gateTasks.every(t => t.status === endStatusId);
        return { name: g, total: gateTasks.length, closed: isClosed };
    });

    return (
        <div className="view-section active animate-fade-in">
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
}
