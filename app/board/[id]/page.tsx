"use client";

import { useState, useEffect, useMemo, use } from "react";
import Link from 'next/link';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useToast } from "@/components/ToastProvider";

import ConfirmModal from "@/components/ConfirmModal";

import { Send, Edit2, Trash2, X, Share2, Copy, Check, UserPlus, Globe, Users, LayoutGrid, ListTodo, BarChart3 } from 'lucide-react';

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
}

const DEFAULT_STATUSES: StatusColumn[] = [
    { id: "todo", name: "Por hacer", color: "#64748b", percentage: 0 },
    { id: "doing", name: "En proceso", color: "#3b82f6", percentage: 50 },
    { id: "review", name: "Revisión", color: "#f59e0b", percentage: 80 },
    { id: "done", name: "Hecho", color: "#10b981", percentage: 100 },
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
    const [projectEndDate, setProjectEndDate] = useState<string | null>(null);
    const [dashboardMeta, setDashboardMeta] = useState<{ description?: string, start_date?: string, end_date?: string }>({});

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

    // Comment Editing State
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");

    // Share Modal State
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareTab, setShareTab] = useState<'internal' | 'public'>('internal');
    const [collaborators, setCollaborators] = useState<any[]>([]);
    const [isPublic, setIsPublic] = useState(false);
    const [publicToken, setPublicToken] = useState<string | null>(null);
    const [inviteUserId, setInviteUserId] = useState("");
    const [copied, setCopied] = useState(false);

    // Fetch Share Data
    const fetchShareData = async () => {
        try {
            const res = await fetch(`/api/dashboards/${dashboardId}/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'list_collaborators' })
            });
            if (res.ok) {
                const data = await res.json();
                setCollaborators(data.collaborators);
                setIsPublic(data.isPublic);
                setPublicToken(data.publicToken);
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Link parsing helper
    const renderContentWithLinks = (content: string) => {
        if (!content) return null;
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const parts = content.split(urlRegex);

        return parts.map((part, i) => {
            if (part.match(urlRegex)) {
                return (
                    <a
                        key={i}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: '#3b82f6', textDecoration: 'underline', wordBreak: 'break-all' }}
                    >
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    useEffect(() => {
        if (isShareModalOpen) {
            fetchShareData();
        }
    }, [isShareModalOpen]);

    const handleInviteUser = async () => {
        if (!inviteUserId) return;
        try {
            const res = await fetch(`/api/dashboards/${dashboardId}/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add_collaborator', userId: inviteUserId })
            });
            if (res.ok) {
                showToast("Usuario invitado correctamente", "success");
                setInviteUserId("");
                fetchShareData();
            } else {
                showToast("Error al invitar", "error");
            }
        } catch (e) {
            showToast("Error de red", "error");
        }
    };

    const handleRemoveCollaborator = async (userId: string) => {
        if (!confirm("¿Quitar acceso a este usuario?")) return;
        try {
            const res = await fetch(`/api/dashboards/${dashboardId}/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'remove_collaborator', userId })
            });
            if (res.ok) fetchShareData();
        } catch (e) { console.error(e); }
    };

    const handleTogglePublic = async () => {
        try {
            const res = await fetch(`/api/dashboards/${dashboardId}/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'toggle_public', isPublic: !isPublic })
            });
            if (res.ok) {
                const data = await res.json();
                setIsPublic(data.isPublic);
                setPublicToken(data.token);
                if (data.isPublic) showToast("Tablero ahora es PÚBLICO", "success");
                else showToast("Tablero ahora es PRIVADO", "success");
            }
        } catch (e) { console.error(e); }
    };

    const copyPublicLink = () => {
        const url = `${window.location.origin}/public/board/${publicToken}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        showToast("Enlace copiado", "success");
    };

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
        if (!newComment.trim()) return;
        if (!editingTask.id) return;

        if (!currentUser) {
            showToast("Error: No se ha identificado al usuario. Recarga la página.", "error");
            return;
        }

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
            } else {
                const err = await res.json();
                showToast(`Error: ${err.error || "Fallo al guardar"}`, "error");
            }
        } catch (err) {
            showToast("Error al agregar comentario (Red)", "error");
        }
    };

    const startEditComment = (comment: any) => {
        setEditingCommentId(comment.id);
        setEditContent(comment.content);
    };

    const handleSaveEditComment = async () => {
        if (!editingCommentId || !editContent.trim() || !currentUser) return;

        try {
            const res = await fetch('/api/comments', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingCommentId,
                    content: editContent,
                    userEmail: currentUser.email
                })
            });

            if (res.ok) {
                const updated = await res.json();
                setComments(prev => prev.map(c => c.id === editingCommentId ? updated : c));
                setEditingCommentId(null);
                setEditContent("");
            }
        } catch (err) {
            showToast("Error al editar comentario", "error");
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
    const [newColPercent, setNewColPercent] = useState<number>(0);

    // Dashboard Settings
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [editSettings, setEditSettings] = useState({
        name: "",
        description: "",
        icon: "🚀",
        weekCount: 8,

        owners: "",
        gates: "",
        types: "",
        start_date: ""
    });

    // Temp statuses for settings modal
    const [tempStatuses, setTempStatuses] = useState<StatusColumn[]>([]);

    const openSettings = () => {
        if (!settings) return;
        setEditSettings({
            name: dashboardName,
            description: dashboardMeta.description || "",
            icon: settings.icon || "🚀",
            weekCount: settings.weeks.length,
            owners: settings.owners.join(", "),
            gates: settings.gates.join(", "),
            types: settings.types.join(", "),
            start_date: dashboardMeta.start_date ? dashboardMeta.start_date.split('T')[0] : ""
        });
        setTempStatuses(settings.statuses || []);
        setIsSettingsOpen(true);
    };

    const handleTempStatusChange = (id: string, field: 'name' | 'percentage', value: any) => {
        setTempStatuses(prev => prev.map(s => {
            if (s.id === id) {
                return { ...s, [field]: field === 'percentage' ? Number(value) : value };
            }
            return s;
        }));
    };

    const saveDashboardSettings = async () => {
        if (!editSettings.name.trim()) return showToast("El nombre es requerido", "error");

        // Validated logic: Weighted progress relies on 0-100% scale per column, not a sum of 100.

        // Reconstruct Weeks
        const weeks = Array.from({ length: editSettings.weekCount }, (_, i) => ({
            id: `W${i + 1}`,
            name: `Semana ${i + 1}`
        }));

        const newSettingsData: BoardSettings = {
            ...settings!,
            weeks: weeks,
            owners: editSettings.owners.split(",").map(s => s.trim()).filter(Boolean),
            gates: editSettings.gates.split(",").map(s => s.trim()).filter(Boolean),
            types: editSettings.types.split(",").map(s => s.trim()).filter(Boolean),
            icon: editSettings.icon,
            statuses: tempStatuses
        };

        // Calculate End Date
        let end_date = null;
        if (editSettings.start_date) {
            const d = new Date(editSettings.start_date);
            d.setDate(d.getDate() + (editSettings.weekCount * 7));
            end_date = d.toISOString().split('T')[0];
        }

        const body = {
            id: dashboardId,
            name: editSettings.name,
            description: editSettings.description,
            settings: newSettingsData,
            start_date: editSettings.start_date || null,
            end_date: end_date
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
                    setDashboardMeta({
                        description: data.description,
                        start_date: data.start_date,
                        end_date: data.end_date
                    });
                    if (data.end_date) setProjectEndDate(data.end_date.split('T')[0]);
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
                <Link href="/workspace" className="btn-primary">Volver al Inicio</Link>
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

    const duplicateTask = async (task: Task) => {
        try {
            const newTask = {
                ...task,
                id: Date.now(),
                name: `${task.name} (Copia)`,
            };
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTask)
            });
            if (res.ok) {
                showToast('Tarea duplicada exitosamente', 'success');
                // Reload tasks
                const tasksRes = await fetch(`/api/tasks?dashboardId=${dashboardId}`);
                if (tasksRes.ok) {
                    const tasksData = await tasksRes.json();
                    setTasks(tasksData);
                }
            }
        } catch (error) {
            showToast('Error al duplicar tarea', 'error');
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

        // Date Validation
        if (newTask.due && projectEndDate) {
            if (new Date(newTask.due) > new Date(projectEndDate)) {
                showToast(`La fecha no puede ser posterior al fin del proyecto (${projectEndDate})`, "error");
                return;
            }
        }

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

    const cancelEditTask = () => {
        setIsModalOpen(false);
        setEditingTask({ id: undefined, name: "", status: settings?.statuses?.[0]?.id || "todo", week: settings?.weeks?.[0]?.id || "", owner: settings?.owners?.[0] || "", type: "Feature" });
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
        setNewColPercent(0);
        setIsColModalOpen(true);
    };

    const openEditCol = (col: StatusColumn) => {
        setEditingColId(col.id);
        setNewColName(col.name);
        setNewColColor(col.color);
        setNewColPercent(col.percentage || 0);
        setIsColModalOpen(true);
    };

    const handleSaveCol = async () => {
        if (!newColName.trim() || !settings) return;

        let newStatuses: StatusColumn[];

        if (editingColId) {
            // Edit existing
            newStatuses = statuses.map(s =>
                s.id === editingColId
                    ? { ...s, name: newColName, color: newColColor, percentage: newColPercent }
                    : s
            );
        } else {
            // Add new
            const newColId = newColName.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now().toString().slice(-4);
            newStatuses = [...statuses, { id: newColId, name: newColName, color: newColColor, percentage: newColPercent }];
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
                        <Link href="/workspace" className="btn-ghost" title="Volver al Workspace">
                            <span style={{ fontSize: 24 }}>←</span>
                        </Link>
                        <div style={{ marginLeft: 8, paddingLeft: 12, borderLeft: "1px solid var(--border)" }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <h1 className="app-title">{settings.icon} {dashboardName}</h1>
                                <div style={{
                                    padding: '4px 12px',
                                    borderRadius: 20,
                                    background: 'var(--primary-gradient)',
                                    color: 'white',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap'
                                }}>
                                    {tasks.length > 0 ? Math.round(tasks.reduce((acc, t) => {
                                        const st = statuses.find(s => s.id === t.status);
                                        return acc + (st?.percentage || 0);
                                    }, 0) / tasks.length) : 0}% Completado
                                </div>
                            </div>
                            <p className="app-sub">TABLERO DE TRABAJO</p>
                        </div>
                    </div>

                    {/* TOP RIGHT CONTROLS - Now integrated into flex flow */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }} className="top-right-controls">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }} className="desktop-actions">
                            <div className="flex -space-x-2 hide-mobile">
                                {availableUsers.slice(0, 3).map((u, i) => (
                                    <div key={i} title={u.name} style={{ width: 28, height: 28, borderRadius: '50%', background: `hsl(${i * 60}, 70%, 50%)`, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, border: '2px solid white' }}>
                                        {u.name.substring(0, 2).toUpperCase()}
                                    </div>
                                ))}
                            </div>
                            <button className="btn-primary" onClick={() => setIsShareModalOpen(true)} style={{ padding: '8px 16px', gap: 8 }}>
                                <Share2 size={16} /> <span className="hide-mobile">Compartir</span>
                            </button>
                            <button className="btn-ghost" onClick={openSettings} title="Configuración">⚙️</button>
                            <Link href="/workspace" className="btn-ghost hide-mobile" style={{ textDecoration: 'none' }}>Volver</Link>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button className="btn-ghost" onClick={toggleTheme} title="Cambiar Tema">
                                🌓
                            </button>
                            <Link href="/workspace" className="btn-ghost" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span>✕</span> <span className="hide-mobile">Cerrar</span>
                            </Link>
                        </div>
                    </div>
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
                        <div className={`tab ${activeTab === "kanban" ? "active" : ""}`} onClick={() => setActiveTab("kanban")}>
                            <LayoutGrid size={16} /> <span>Tablero</span>
                        </div>
                        <div className={`tab ${activeTab === "timeline" ? "active" : ""}`} onClick={() => setActiveTab("timeline")}>
                            <ListTodo size={16} /> <span>Lista</span>
                        </div>
                        <div className={`tab ${activeTab === "analytics" ? "active" : ""}`} onClick={() => setActiveTab("analytics")}>
                            <BarChart3 size={16} /> <span>Datos</span>
                        </div>
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
                                                                                    <div className="btn-icon-hover" onClick={(e) => { e.stopPropagation(); duplicateTask(t); }} title="Duplicar Tarea">
                                                                                        <Copy size={14} />
                                                                                    </div>
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

                {/* TIMELINE (LIST VIEW) */}
                {activeTab === "timeline" && (
                    <div className="view-section active animate-fade-in">
                        <div className="timeline-container">
                            {settings.weeks.map(w => {
                                const weekTasks = filteredTasks.filter(t => t.week === w.id);
                                if (weekTasks.length === 0) return null;
                                return (
                                    <div key={w.id} className="tl-week-group">
                                        <div className="tl-week-header">
                                            <div className="tl-week-dot"></div>
                                            <span>{w.name}</span>
                                            <div className="tl-count">{weekTasks.length} tareas</div>
                                        </div>
                                        <div className="tl-cards-grid">
                                            {weekTasks.map(t => {
                                                const taskStatus = statuses.find(s => s.id === t.status) || DEFAULT_STATUSES[0];
                                                return (
                                                    <div key={t.id} className="tl-card" onClick={() => openModal(t)}>
                                                        <div className="tl-card-top">
                                                            <div className="tl-status-dot" style={{ background: taskStatus.color }}></div>
                                                            <div className="tl-task-name">{t.name}</div>
                                                            <div className="tl-actions" onClick={e => e.stopPropagation()}>
                                                                <button className="btn-ghost-sm" onClick={() => duplicateTask(t)} title="Duplicar"><Copy size={14} /></button>
                                                                <button className="btn-ghost-sm" onClick={() => openModal(t)} title="Editar"><Edit2 size={14} /></button>
                                                            </div>
                                                        </div>
                                                        <div className="tl-card-meta">
                                                            <div className="tl-badge" style={{ background: `${taskStatus.color}20`, color: taskStatus.color }}>
                                                                {taskStatus.name}
                                                            </div>
                                                            <div className="tl-meta-info">
                                                                <Users size={12} /> <span>{t.owner.split(' (')[0]}</span>
                                                            </div>
                                                            <div className="tl-meta-info">
                                                                <div className={`type-tag ${t.type.toLowerCase().includes('feature') ? 'feature' : t.type.toLowerCase().includes('bug') ? 'bug' : 'other'}`}>
                                                                    {t.type}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
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

                {isModalOpen && settings && (
                    <div className="backdrop fade-in" onClick={cancelEditTask}>
                        <div className="modal-container animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 800 }}>
                            <div className="modal-header">
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 4 }}>{editingTask.id}</div>
                                    <input
                                        className="modal-title"
                                        value={editingTask.name}
                                        onChange={(e) => setEditingTask({ ...editingTask, name: e.target.value })}
                                        style={{ background: 'transparent', border: 'none', padding: 0, width: '100%', outline: 'none' }}
                                    />
                                </div>
                                <button className="btn-ghost" onClick={cancelEditTask}>✕</button>
                            </div>
                            <div className="modal-body">
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">Responsable</label>
                                        <select
                                            className="input-glass"
                                            value={editingTask.owner}
                                            onChange={(e) => setEditingTask({ ...editingTask, owner: e.target.value })}
                                        >
                                            <optgroup label="Usuarios del Sistema">
                                                {availableUsers.map(u => (
                                                    <option key={u.id} value={u.name}>{u.name}</option>
                                                ))}
                                            </optgroup>
                                            {settings.owners && settings.owners.length > 0 && (
                                                <optgroup label="Manual (Legacy)">
                                                    {settings.owners.map(o => (
                                                        <option key={o} value={o}>{o}</option>
                                                    ))}
                                                </optgroup>
                                            )}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Tipo</label>
                                        <select className="input-glass" value={editingTask.type} onChange={(e) => setEditingTask({ ...editingTask, type: e.target.value })}>
                                            {settings.types.map(t => (<option key={t} value={t}>{t}</option>))}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Fecha Objetivo</label>
                                    <input className="input-glass" type="date" value={editingTask.due || ""} onChange={(e) => setEditingTask({ ...editingTask, due: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Descripción</label>
                                    <textarea className="input-glass" value={editingTask.desc || ""} onChange={(e) => setEditingTask({ ...editingTask, desc: e.target.value })} rows={4} />
                                    {editingTask.desc && (
                                        <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-dim)', background: 'rgba(0,0,0,0.02)', padding: 10, borderRadius: 8, border: '1px solid var(--border-dim)' }}>
                                            <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 10, textTransform: 'uppercase' }}>Vista Previa con Enlaces:</div>
                                            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{renderContentWithLinks(editingTask.desc)}</div>
                                        </div>
                                    )}
                                </div>

                                {/* COMMENTS SECTION */}
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
                                                        <div style={{ display: 'flex', gap: 4 }}>
                                                            <button className="btn-ghost" onClick={() => startEditComment(c)} style={{ padding: 2, height: 'auto', opacity: 0.6 }}><Edit2 size={12} /></button>
                                                            <button className="btn-ghost" onClick={() => handleDeleteComment(c.id)} style={{ padding: 2, height: 'auto', opacity: 0.6 }}><Trash2 size={12} /></button>
                                                        </div>
                                                    )}
                                                </div>

                                                {editingCommentId === c.id ? (
                                                    <div style={{ marginTop: 4 }}>
                                                        <textarea
                                                            value={editContent}
                                                            onChange={e => setEditContent(e.target.value)}
                                                            className="input-glass"
                                                            style={{ width: '100%', padding: 6, fontSize: 13, minHeight: 60 }}
                                                        />
                                                        <div style={{ display: 'flex', gap: 6, marginTop: 6, justifyContent: 'flex-end' }}>
                                                            <button className="btn-ghost" onClick={() => setEditingCommentId(null)} style={{ fontSize: 11 }}>Cancelar</button>
                                                            <button className="btn-primary" onClick={handleSaveEditComment} style={{ padding: '4px 10px', fontSize: 11, height: 'auto' }}>Guardar</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{renderContentWithLinks(c.content)}</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add Comment */}
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <textarea
                                            value={newComment}
                                            onChange={e => setNewComment(e.target.value)}
                                            placeholder="Escribe un comentario..."
                                            className="input-glass"
                                            style={{ flex: 1, minHeight: 40, padding: 8, fontSize: 13 }}
                                        />
                                        <button className="btn-ghost" onClick={handleAddComment} disabled={!newComment.trim()} style={{ height: 'auto' }}>
                                            <Send size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn-ghost" style={{ color: "var(--danger)" }} onClick={requestDeleteTask}>Eliminar</button>
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
                        <div className="modal-container animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400 }}>
                            <div className="modal-header">
                                <h3 className="modal-title">{editingColId ? "Editar Columna" : "Nueva Columna"}</h3>
                                <button className="btn-ghost" onClick={() => setIsColModalOpen(false)}>✕</button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Nombre columna</label>
                                    <input className="input-glass" value={newColName} onChange={e => setNewColName(e.target.value)} autoFocus placeholder="Ej: Bloqueado" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Color</label>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        {["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6"].map(c => (
                                            <div key={c} onClick={() => setNewColColor(c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', boxShadow: newColColor === c ? '0 0 0 2px var(--panel), 0 0 0 4px ' + c : 'none' }}></div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', gap: 10 }}>
                                        {["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6"].map(c => (
                                            <div key={c} onClick={() => setNewColColor(c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', boxShadow: newColColor === c ? '0 0 0 2px var(--panel), 0 0 0 4px ' + c : 'none' }}></div>
                                        ))}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Porcentaje de Progreso ({newColPercent}%)</label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="5"
                                        value={newColPercent}
                                        onChange={e => setNewColPercent(Number(e.target.value))}
                                        style={{ width: '100%' }}
                                    />
                                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                                        Define cuánto progreso representa una tarea en esta columna.
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
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
                        <div className="modal-container animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
                            <div className="modal-header">
                                <h3 className="modal-title">Configurar Tablero</h3>
                                <button className="btn-ghost" onClick={() => setIsSettingsOpen(false)}>✕</button>
                            </div>
                            <div className="modal-body">
                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">Nombre del Proyecto</label>
                                        <input className="input-glass" value={editSettings.name} onChange={e => setEditSettings({ ...editSettings, name: e.target.value })} style={{ fontWeight: 700 }} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Ícono</label>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            {["🚀", "💻", "🎨", "📈", "🔥", "✨"].map(ic => (
                                                <button key={ic} className="btn-ghost" style={{ fontSize: 18, background: editSettings.icon === ic ? 'var(--bg-panel)' : 'transparent', border: editSettings.icon === ic ? '1px solid var(--primary)' : '1px solid transparent' }} onClick={() => setEditSettings({ ...editSettings, icon: ic })}>{ic}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Descripción</label>
                                    <input className="input-glass" value={editSettings.description || ""} onChange={e => setEditSettings({ ...editSettings, description: e.target.value })} placeholder="Breve descripción del objetivo..." />
                                </div>

                                <div className="form-grid">
                                    <div className="form-group">
                                        <label className="form-label">Duración (Semanas)</label>
                                        <input className="input-glass" type="number" value={editSettings.weekCount} onChange={e => setEditSettings({ ...editSettings, weekCount: parseInt(e.target.value) || 1 })} min={1} max={20} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Equipo (Separado por comas)</label>
                                        <input className="input-glass" value={editSettings.owners} onChange={e => setEditSettings({ ...editSettings, owners: e.target.value })} placeholder="Ana, Luis, Pedro..." />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Fecha de Inicio</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                        <input
                                            className="input-glass"
                                            type="date"
                                            value={editSettings.start_date}
                                            onChange={e => setEditSettings({ ...editSettings, start_date: e.target.value })}
                                        />
                                        <div className="input-glass" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)', display: 'flex', alignItems: 'center' }}>
                                            {editSettings.start_date ? (() => {
                                                const d = new Date(editSettings.start_date);
                                                d.setDate(d.getDate() + (editSettings.weekCount * 7));
                                                return "Fin: " + d.toISOString().split('T')[0];
                                            })() : "Sin fecha fin"}
                                        </div>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Gates / Hitos (Separados por comas)</label>
                                    <input className="input-glass" value={editSettings.gates} onChange={e => setEditSettings({ ...editSettings, gates: e.target.value })} placeholder="Gate 1, Gate 2, Gate 3..." />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Tipos de Tarea (Separados por comas)</label>
                                    <input className="input-glass" value={editSettings.types} onChange={e => setEditSettings({ ...editSettings, types: e.target.value })} placeholder="Feature, Bug, Spike..." />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn-primary" onClick={saveDashboardSettings}>Guardar Cambios</button>
                            </div>
                        </div>
                    </div>
                )}

            </main>

            <style jsx global>{`
                /* PREMIUM UI UPGRADE - GLOBAL SCOPE FOR HEADER AREA */
                header { 
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.3);
                    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.03);
                    padding: 0 24px; 
                    height: 70px; 
                    display: flex !important; 
                    align-items: center !important; 
                    position: sticky; 
                    top: 0; 
                    z-index: 40; 
                }
                .top-bar { 
                    width: 100%; 
                    display: flex !important; 
                    justify-content: space-between !important; 
                    align-items: center !important; 
                    flex-direction: row !important;
                    flex-wrap: nowrap !important;
                }
                .logo-area {
                    display: flex !important;
                    align-items: center !important;
                    gap: 12px !important;
                }
                .top-right-controls {
                    display: flex !important;
                    align-items: center !important;
                    gap: 12px !important;
                }

                /* Dark Mode Overrides for Header */
                @media (prefers-color-scheme: dark) {
                   header { background: rgba(15, 23, 42, 0.7); border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
                }

                /* Mobile Overrides for Header */
                @media (max-width: 768px) {
                    header { height: auto !important; padding: 12px 16px; }
                    .top-bar { flex-direction: column !important; align-items: flex-start !important; gap: 20px !important; }
                    .logo-area { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
                    .top-right-controls { width: 100% !important; justify-content: space-between !important; }
                }
            `}</style>

            <style jsx>{`
                /* PREMIUM UI UPGRADE - SCOPED TO COMPONENT */
                main { 
                    padding: 24px; 
                    height: calc(100vh - 70px); 
                    overflow: hidden; 
                    display: flex; 
                    flex-direction: column;
                    background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%); 
                }
                
                /* Typography Polish */
                .app-title { font-size: 18px; font-weight: 800; margin: 0; letter-spacing: -0.5px; background: linear-gradient(45deg, #1e293b, #334155); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                .app-sub { font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin: 0; font-weight: 700; opacity: 0.8; }

                /* Controls & Filters */
                .controls { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 20px; }
                .filters { display: flex; gap: 10px; align-items: center; flex-wrap: nowrap; }
                
                .tabs { 
                    display: flex; 
                    background: rgba(0,0,0,0.03); 
                    padding: 4px; 
                    border-radius: 14px; 
                    gap: 4px;
                    border: 1px solid rgba(0,0,0,0.05);
                }
                .tab { 
                    display: flex; 
                    align-items: center; 
                    gap: 8px; 
                    padding: 8px 16px; 
                    border-radius: 10px; 
                    cursor: pointer; 
                    font-size: 13px; 
                    font-weight: 600; 
                    color: #64748b; 
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                    white-space: nowrap;
                }
                .tab:hover { background: rgba(255,255,255,0.5); color: #1e293b; }
                .tab.active { 
                    background: white; 
                    color: #3b82f6; 
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                    transform: translateY(0);
                }
                .tab.active svg { color: #3b82f6; }
                .filters input, .filters select { 
                    padding: 8px 16px; 
                    border-radius: 12px; 
                    border: 1px solid rgba(0,0,0,0.05); 
                    background: rgba(255,255,255,0.6); 
                    color: var(--text-main); 
                    font-size: 13px; 
                    outline: none; 
                    transition: all 0.2s;
                    backdrop-filter: blur(4px);
                    box-shadow: 0 2px 10px rgba(0,0,0,0.02);
                }
                .filters input:focus, .filters select:focus { 
                    background: white;
                    border-color: #3b82f6; 
                    box-shadow: 0 4px 12px rgba(59,130,246,0.15); 
                    transform: translateY(-1px);
                }

                /* KANBAN LANES - Deep Glass */
                .view-section { flex: 1; overflow: hidden; display: none; animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
                .view-section.active { display: block; }
                .kanban-container { height: 100%; overflow-x: auto; padding-bottom: 20px; }
                .lanes { height: 100%; gap: 24px; padding-right: 40px; }
                
                .lane { 
                    background: rgba(255, 255, 255, 0.45);
                    backdrop-filter: blur(14px);
                    -webkit-backdrop-filter: blur(14px); 
                    border-radius: 20px; 
                    padding: 16px; 
                    display: flex; 
                    flex-direction: column; 
                    border: 1px solid rgba(255, 255, 255, 0.6); 
                    box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.05);
                    transition: all 0.3s ease;
                }
                .lane:hover {
                    background: rgba(255, 255, 255, 0.6);
                    box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.08);
                    border-color: rgba(255, 255, 255, 0.8);
                }

                .lane-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #475569; padding: 0 4px; }
                
                .drop-zone { flex: 1; overflow-y: auto; padding-right: 4px; display: flex; flex-direction: column; gap: 14px; min-height: 100px; }

                /* Dark Mode Overrides for main content */
                @media (prefers-color-scheme: dark) {
                   main { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); }
                   .app-title { background: linear-gradient(45deg, #f8fafc, #cbd5e1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
                   .lane { 
                       background: rgba(30, 41, 59, 0.4); 
                       border: 1px solid rgba(255, 255, 255, 0.05); 
                       box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
                   }
                   .lane:hover { background: rgba(30, 41, 59, 0.6); }
                   .filters input, .filters select { background: rgba(30, 41, 59, 0.6); border-color: rgba(255,255,255,0.1); color: white; }
                   .lane-head { color: #94a3b8; }
                }

                /* TIMELINE CARD VIEW */
                .timeline-container { padding: 4px; display: flex; flex-direction: column; gap: 32px; overflow-y: auto; height: 100%; }
                .tl-week-group { display: flex; flex-direction: column; gap: 16px; }
                .tl-week-header { display: flex; align-items: center; gap: 12px; font-size: 14px; font-weight: 700; color: #1e293b; padding-bottom: 8px; border-bottom: 1px solid rgba(0,0,0,0.05); }
                .tl-week-dot { width: 8px; height: 8px; border-radius: 50%; background: #3b82f6; box-shadow: 0 0 8px rgba(59,130,246,0.4); }
                .tl-count { font-size: 11px; font-weight: 500; color: #64748b; background: rgba(0,0,0,0.04); padding: 2px 8px; border-radius: 20px; }
                
                .tl-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
                .tl-card { 
                    background: rgba(255, 255, 255, 0.6);
                    backdrop-filter: blur(8px);
                    border: 1px solid rgba(255,255,255,0.7);
                    border-radius: 16px;
                    padding: 16px;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                    box-shadow: 0 4px 20px rgba(0,0,0,0.02);
                }
                .tl-card:hover {
                    background: white;
                    transform: translateY(-2px);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.06);
                    border-color: #3b82f640;
                }
                .tl-card-top { display: flex; align-items: start; gap: 12px; }
                .tl-status-dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 4px; flex-shrink: 0; }
                .tl-task-name { flex: 1; font-size: 14px; font-weight: 600; color: #1e293b; line-height: 1.4; }
                .tl-actions { display: flex; gap: 4px; opacity: 0; transition: opacity 0.2s; }
                .tl-card:hover .tl-actions { opacity: 1; }
                .btn-ghost-sm { background: transparent; border: none; padding: 4px; border-radius: 6px; color: #94a3b8; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
                .btn-ghost-sm:hover { background: rgba(0,0,0,0.05); color: #1e293b; }
                
                .tl-card-meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
                .tl-badge { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
                .tl-meta-info { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #64748b; font-weight: 500; }
                
                .type-tag { font-size: 9px; padding: 2px 6px; border-radius: 4px; font-weight: 700; text-transform: uppercase; border: 1px solid transparent; }
                .type-tag.feature { background: #e0f2fe; color: #0369a1; border-color: #bae6fd; }
                .type-tag.bug { background: #fee2e2; color: #b91c1c; border-color: #fecaca; }
                .type-tag.other { background: #f1f5f9; color: #475569; border-color: #e2e8f0; }

                /* Mobile Optimization */
                @media (max-width: 768px) {
                    .tl-cards-grid { grid-template-columns: 1fr; }
                    .tl-actions { opacity: 1; }
                    main { overflow-y: auto !important; height: auto !important; padding: 16px; }
                    .kanban-container { height: auto !important; padding-bottom: 40px; }
                    .lanes { height: auto !important; gap: 16px; padding-right: 0; }
                }
            `}</style>

            {
                isShareModalOpen && (
                    <div className="backdrop animate-fade-in" onClick={() => setIsShareModalOpen(false)}>
                        <div className="modal-container animate-slide-up" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2 className="modal-title">Compartir Tablero</h2>
                                <button onClick={() => setIsShareModalOpen(false)} className="btn-ghost"><X size={20} /></button>
                            </div>

                            <div className="modal-body">
                                <div style={{ display: 'flex', gap: 4, marginBottom: 24, padding: 4, background: 'var(--bg-panel)', borderRadius: 12 }}>
                                    <button
                                        onClick={() => setShareTab('internal')}
                                        style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', background: shareTab === 'internal' ? 'var(--bg-card)' : 'transparent', color: shareTab === 'internal' ? 'var(--text-main)' : 'var(--text-dim)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: shareTab === 'internal' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                    >
                                        <Users size={16} /> Equipo
                                    </button>
                                    <button
                                        onClick={() => setShareTab('public')}
                                        style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', background: shareTab === 'public' ? 'var(--bg-card)' : 'transparent', color: shareTab === 'public' ? 'var(--text-main)' : 'var(--text-dim)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', boxShadow: shareTab === 'public' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                    >
                                        <Globe size={16} /> Público
                                    </button>
                                </div>

                                {shareTab === 'internal' ? (
                                    <div className="animate-fade-in">
                                        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                                            <select
                                                className="input-glass"
                                                value={inviteUserId}
                                                onChange={e => setInviteUserId(e.target.value)}
                                            >
                                                <option value="">Seleccionar usuario...</option>
                                                {availableUsers.filter(u => u.email !== currentUser?.email && !collaborators.some(c => c.email === u.email)).map(u => (
                                                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                                ))}
                                            </select>
                                            <button className="btn-primary" disabled={!inviteUserId} onClick={handleInviteUser}>
                                                <UserPlus size={16} /> Invitar
                                            </button>
                                        </div>

                                        <h3 style={{ fontSize: 14, textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 12 }}>Colaboradores</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                                            {collaborators.length === 0 && <p style={{ fontSize: 13, color: 'var(--text-dim)', textAlign: 'center', padding: 20 }}>No hay colaboradores aún.</p>}
                                            {collaborators.map(c => (
                                                <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-dim)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>
                                                            {c.name.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</div>
                                                            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{c.email}</div>
                                                        </div>
                                                    </div>
                                                    <button className="btn-ghost" onClick={() => handleRemoveCollaborator(c.id)} title="Quitar acceso">
                                                        <Trash2 size={16} color="var(--text-dim)" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="animate-fade-in">
                                        <div style={{ padding: 20, borderRadius: 12, border: '1px solid var(--border-dim)', background: 'var(--bg-panel)', marginBottom: 20 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: isPublic ? '#10b981' : 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                                        <Globe size={20} />
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600 }}>Enlace Público</div>
                                                        <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Cualquiera con el enlace puede ver.</div>
                                                    </div>
                                                </div>
                                                <label className="switch" style={{ position: 'relative', display: 'inline-block', width: 48, height: 24 }}>
                                                    <input type="checkbox" checked={isPublic} onChange={handleTogglePublic} style={{ opacity: 0, width: 0, height: 0 }} />
                                                    <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: isPublic ? '#10b981' : '#ccc', transition: '.4s', borderRadius: 34 }}></span>
                                                    <span style={{ position: 'absolute', content: '""', height: 16, width: 16, left: 4, bottom: 4, backgroundColor: 'white', transition: '.4s', borderRadius: '50%', transform: isPublic ? 'translateX(24px)' : 'translateX(0)' }}></span>
                                                </label>
                                            </div>

                                            {isPublic && (
                                                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                                                    <input
                                                        className="input-glass"
                                                        readOnly
                                                        value={`${window.location.origin}/public/board/${publicToken}`}
                                                        style={{ fontSize: 12, color: 'var(--text-dim)' }}
                                                    />
                                                    <button className="btn-primary" onClick={copyPublicLink} style={{ padding: '0 12px' }}>
                                                        {copied ? <Check size={16} /> : <Copy size={16} />}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <p style={{ fontSize: 12, color: 'var(--text-dim)', textAlign: 'center' }}>
                                            ⚠️ Los usuarios externos solo podrán ver el tablero, no editarlo.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </DragDropContext >
    );
}

// Analytics Component (kept strictly same styling/logic)
function AnalyticsView({ tasks, settings, statuses }: { tasks: Task[], settings: BoardSettings, statuses: StatusColumn[] }) {
    // ... (logic reused from previous impl)
    const totalTasks = tasks.length;
    const endStatusId = statuses[statuses.length - 1].id;
    const completedTasks = tasks.filter(t => t.status === endStatusId).length; // Keep for simple count
    const progress = totalTasks === 0 ? 0 : Math.round(tasks.reduce((acc, t) => {
        const st = statuses.find(s => s.id === t.status);
        return acc + (st?.percentage || 0);
    }, 0) / totalTasks);

    const weeklyData = settings.weeks.map(w => {
        const weekTasks = tasks.filter(t => t.week === w.id);
        const done = weekTasks.filter(t => t.status === endStatusId).length;
        const total = weekTasks.length;
        // Weighted percent for the week
        const weightedSum = weekTasks.reduce((acc, t) => {
            const st = statuses.find(s => s.id === t.status);
            return acc + (st?.percentage || 0);
        }, 0);
        const percent = total === 0 ? 0 : Math.round(weightedSum / total);

        return { name: w.name.split(' · ')[0], total, done, percent };
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
