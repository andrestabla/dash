"use client";

import { useState, useEffect, useMemo } from "react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from "@/components/ToastProvider";
import ConfirmModal from "@/components/ConfirmModal";
import { Plus, X, Edit2, Trash2, ArrowRight, FolderOpen, Shield, User, LogOut, StopCircle, Folder, ChevronRight, Copy, Move, CornerUpLeft, Download, Link as LinkIcon, Check, Share2, UserPlus, Mail, BookOpen, Heart } from "lucide-react";

interface Dashboard {
    id: string;
    name: string;
    description: string;
    created_at: string;
    folder_id: string | null;
    start_date?: string;
    end_date?: string;
    settings: any;
    is_demo?: boolean;
}

interface Folder {
    id: string;
    name: string;
    parent_id: string | null;
    icon?: string;
    color?: string;
}

const DEFAULT_SETTINGS = {
    weeks: [
        { id: "W1", name: "W1 · Inicio" },
        { id: "W2", name: "W2 · Extracción" },
        { id: "W3", name: "W3 · Gate A" },
        { id: "W4", name: "W4 · Gate B" },
        { id: "W5", name: "W5 · Activación" },
        { id: "W6", name: "W6 · Producción" },
        { id: "W7", name: "W7 · Gate C" },
        { id: "W8", name: "W8 · Gate D" },
        { id: "W9", name: "W9 · Cierre" },
    ],
    owners: ["Andrés Tabla", "Carmenza Alarcón"],
    types: ["Gestión", "Inventario", "Metodología", "Evaluación", "Producción", "Comité", "IP-Ready"],
    gates: ["A", "B", "C", "D"],
    icon: "🗺️",
    color: "#3b82f6"
};

// Dashboard Icons - Expanded selection
const ICONS = [
    "🗺️", "🚀", "💻", "🎨", "📈", "📅", "🔥", "⚙️", "📱", "🌐",
    "🎯", "💡", "📊", "🎬", "🎭", "📢", "💬", "🏆", "⭐", "🌟",
    "✨", "🔧", "🛠️", "📐", "✏️", "🖌️", "📧", "🗓️", "⏰", "💾",
    "🖥️", "📡", "📺", "🎪", "🎮", "🎲", "🧩", "🔬", "🔭", "💼"
];

// Folder Icons - Expanded selection
const FOLDER_ICONS = [
    "📁", "📂", "🗂️", "📋", "💼", "📊", "📈", "📉",
    "🚀", "💡", "🎯", "🎨", "🎭", "🎬", "💻", "⚙️",
    "🔧", "🛠️", "📱", "🌟", "⭐", "🔥", "✨", "🏆",
    "🎖️", "🏅", "💰", "💳", "🏢", "🏦", "🗃️", "📌"
];

const COLORS = [
    "#3b82f6", // Blue
    "#10b981", // Green
    "#f59e0b", // Amber
    "#ef4444", // Red
    "#8b5cf6", // Purple
    "#ec4899", // Pink
    "#64748b", // Slate
    "#06b6d4", // Cyan
    "#84cc16", // Lime
    "#f97316", // Orange
    "#a855f7", // Violet
    "#14b8a6"  // Teal
];

export default function Workspace() {
    const [dashboards, setDashboards] = useState<Dashboard[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

    // UI States
    const [isCreating, setIsCreating] = useState(false); // Dashboard Wizard
    const [isCreatingFolder, setIsCreatingFolder] = useState(false); // Folder Modal
    const [isMoving, setIsMoving] = useState<{ type: 'dashboard', id: string } | null>(null);
    const [wizardStep, setWizardStep] = useState(1);
    const router = useRouter();
    const { showToast } = useToast();

    // Confirm Modal
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);
    const [confirmTitle, setConfirmTitle] = useState("");
    const [confirmMsg, setConfirmMsg] = useState("");
    const [confirmActionText, setConfirmActionText] = useState("Confirmar");
    const [isDestructive, setIsDestructive] = useState(false);

    // Wizard State (Dashboard)
    const [wizName, setWizName] = useState("");
    const [wizDesc, setWizDesc] = useState("");
    const [wizWeeks, setWizWeeks] = useState(9);
    const [wizOwners, setWizOwners] = useState<string[]>(["Andrés Tabla"]);
    const [newOwner, setNewOwner] = useState("");
    const [wizTypes, setWizTypes] = useState<string[]>(DEFAULT_SETTINGS.types);
    const [newType, setNewType] = useState("");
    const [wizGates, setWizGates] = useState<string[]>(DEFAULT_SETTINGS.gates);
    const [newGate, setNewGate] = useState("");
    const [wizIcon, setWizIcon] = useState("🗺️");
    const [wizColor, setWizColor] = useState("#3b82f6");
    const [wizFolderId, setWizFolderId] = useState<string | null>(null);
    const [wizStartDate, setWizStartDate] = useState(new Date().toISOString().split('T')[0]);

    const wizEndDate = useMemo(() => {
        if (!wizStartDate) return "";
        const d = new Date(wizStartDate);
        d.setDate(d.getDate() + (wizWeeks * 7));
        return d.toISOString().split('T')[0];
    }, [wizStartDate, wizWeeks]);

    // Import State
    const [isImporting, setIsImporting] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [parsedTasks, setParsedTasks] = useState<any[]>([]);

    // Folder Wizard State
    // Folder Wizard State
    const [folderName, setFolderName] = useState("");
    const [folderIcon, setFolderIcon] = useState("📁");
    const [folderColor, setFolderColor] = useState("#fbbf24");

    // Move State
    const [targetFolderId, setTargetFolderId] = useState<string | null>(null);

    // Editing State
    const [editingDash, setEditingDash] = useState<Dashboard | null>(null);
    const [editingFolder, setEditingFolder] = useState<Folder | null>(null);

    const [showLogout, setShowLogout] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [availableUsers, setAvailableUsers] = useState<any[]>([]);

    // Folder Sharing State
    const [isSharingFolder, setIsSharingFolder] = useState(false);
    const [sharingFolder, setSharingFolder] = useState<any>(null);
    const [shareEmail, setShareEmail] = useState("");
    const [shareNotify, setShareNotify] = useState(true);
    const [isSavingShare, setIsSavingShare] = useState(false);
    const [selectedDashboards, setSelectedDashboards] = useState<string[]>([]);
    const [folderDashboards, setFolderDashboards] = useState<any[]>([]);

    const [isLoading, setIsLoading] = useState(true);



    // --- DATA LOADING ---
    const loadData = () => {
        setIsLoading(true);
        Promise.all([
            fetch('/api/dashboards').then(res => res.json()),
            fetch('/api/folders').then(res => res.json()),
            fetch('/api/users/list').then(res => res.json())
        ]).then(([dData, fData, uData]) => {
            if (Array.isArray(dData)) setDashboards(dData);
            if (Array.isArray(fData)) setFolders(fData);
            if (Array.isArray(uData)) setAvailableUsers(uData);
        }).catch(err => {
            console.error(err);
        }).finally(() => {
            setIsLoading(false);
        });
    };



    useEffect(() => {
        loadData();
        fetch('/api/auth/me').then(res => res.json()).then(data => setUser(data.user));
    }, []);



    // --- COMPUTED ---
    const currentItems = useMemo(() => {
        const d = dashboards.filter(item => item.folder_id === currentFolderId);
        const f = folders.filter(item => item.parent_id === currentFolderId);
        return { dashboards: d, folders: f };
    }, [dashboards, folders, currentFolderId]);

    const breadcrumbs = useMemo(() => {
        const path = [{ id: null, name: 'Espacio de Trabajo' }];
        if (!currentFolderId) return path;

        // Build path backwards
        let curr = folders.find(f => f.id === currentFolderId);
        const stack = [];
        while (curr) {
            stack.unshift({ id: curr.id, name: curr.name });
            curr = folders.find(f => f.id === curr?.parent_id);
        }
        return [...path, ...stack];
    }, [folders, currentFolderId]);

    // --- ACTIONS: FOLDERS ---
    const saveFolder = async () => {
        if (!folderName.trim()) return;

        try {
            const isEdit = !!editingFolder;
            const url = '/api/folders';
            const method = isEdit ? 'PUT' : 'POST';
            const body = isEdit
                ? { id: editingFolder.id, name: folderName, parent_id: editingFolder.parent_id, icon: folderIcon, color: folderColor }
                : { name: folderName, parent_id: currentFolderId, icon: folderIcon, color: folderColor };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                const folder = await res.json();
                if (isEdit) {
                    setFolders(folders.map(f => f.id === folder.id ? folder : f));
                    showToast("Carpeta actualizada", "success");
                } else {
                    setFolders([...folders, folder]);
                    showToast("Carpeta creada", "success");
                }
                closeFolderModal();
            }
        } catch (error) {
            showToast("Error al guardar carpeta", "error");
        }
    };

    const deleteFolder = (e: React.MouseEvent, id: string) => {
        e.preventDefault(); e.stopPropagation();
        setConfirmMsg("⚠️ ¿Eliminar carpeta? El contenido se moverá al Espacio Principal.");
        setConfirmCallback(() => async () => {
            await fetch('/api/folders?id=' + id, { method: 'DELETE' });
            // Optimistic update: Move children to root (null)
            setFolders(prev => prev.filter(f => f.id !== id).map(f => f.parent_id === id ? { ...f, parent_id: null } : f));
            setDashboards(prev => prev.map(d => d.folder_id === id ? { ...d, folder_id: null } : d));
            setConfirmOpen(false);
            showToast("Carpeta eliminada", "info");
        });
        setConfirmOpen(true);
    };

    const editFolder = (e: React.MouseEvent, f: Folder) => {
        e.preventDefault(); e.stopPropagation();
        setEditingFolder(f);
        setFolderName(f.name);
        setFolderIcon(f.icon || "📁");
        setFolderColor(f.color || "#fbbf24");
        setIsCreatingFolder(true);
    };

    const closeFolderModal = () => {
        setIsCreatingFolder(false);
        setEditingFolder(null);
        setFolderName("");
        setFolderIcon("📁");
        setFolderColor("#fbbf24");
    };

    // --- ACTIONS: DASHBOARD ---
    const handleSaveDashboard = async () => {
        if (!wizName.trim()) return;
        const isEdit = !!editingDash;

        const currentSettings = isEdit ? editingDash.settings : DEFAULT_SETTINGS;
        const finalSettings = {
            weeks: isEdit ? generateWeeks(wizWeeks) : generateWeeks(wizWeeks),
            owners: wizOwners.length > 0 ? wizOwners : ["Sin Asignar"],
            types: wizTypes.length > 0 ? wizTypes : ["General"],
            gates: wizGates,
            icon: wizIcon,
            color: wizColor
        };

        const payload = {
            name: wizName,
            description: wizDesc,
            settings: finalSettings,
            folder_id: wizFolderId, // Use selected folder from wizard
            start_date: wizStartDate,
            end_date: wizEndDate,
            initialTasks: parsedTasks // Send parsed tasks if any
        };

        const method = isEdit ? 'PUT' : 'POST';

        try {
            const res = await fetch('/api/dashboards', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const dash = await res.json();
                if (isEdit) {
                    setDashboards(dashboards.map(d => d.id === dash.id ? dash : d));
                } else {
                    setDashboards([dash, ...dashboards]);
                }
                resetWizard();
                if (!isEdit) router.push('/board/' + dash.id);
            }
        } catch (err) {
            alert("Error guardando tablero");
        }
    };

    const deleteDash = (e: React.MouseEvent, id: string) => {
        e.preventDefault(); e.stopPropagation();
        setConfirmTitle("Eliminar Proyecto");
        setConfirmMsg("¿Estás seguro de que quieres eliminar este tablero y todas sus tareas? Esta acción es irreversible.");
        setConfirmActionText("Eliminar Definitivamente");
        setIsDestructive(true);
        setConfirmCallback(() => async () => {
            await fetch(`/api/dashboards?id=${id}`, { method: 'DELETE' });
            setDashboards(dashboards.filter(d => d.id !== id));
            showToast("Tablero eliminado", "success");
            setConfirmOpen(false);
        });
        setConfirmOpen(true);
    };

    const duplicateDash = async (e: React.MouseEvent, id: string) => {
        e.preventDefault(); e.stopPropagation();
        try {
            const res = await fetch('/api/dashboards/duplicate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dashboardId: id })
            });
            if (res.ok) {
                const newDash = await res.json();
                setDashboards([newDash, ...dashboards]);
                showToast("Tablero duplicado", "success");
            }
        } catch (error) {
            showToast("Error al duplicar", "error");
        }
    };

    const startMove = (e: React.MouseEvent, id: string) => {
        e.preventDefault(); e.stopPropagation();
        setIsMoving({ type: 'dashboard', id });
        setTargetFolderId(null);
    };

    const executeMove = async () => {
        if (!isMoving) return;
        try {
            await fetch('/api/dashboards/move', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dashboardId: isMoving.id, folderId: targetFolderId })
            });
            // Update local state
            setDashboards(dashboards.map(d => d.id === isMoving.id ? { ...d, folder_id: targetFolderId } : d));
            setIsMoving(null);
            showToast("Tablero movido exitosamente", "success");
            loadData(); // Reload to be safe
        } catch (error) {
            showToast("Error al mover", "error");
        }
    };

    const handleExport = (e: React.MouseEvent, id: string, type: 'dashboard' | 'folder') => {
        e.preventDefault(); e.stopPropagation();
        const url = `/api/export?id=${id}&type=${type}`;
        // Trigger download via hidden link or window.open
        window.open(url, '_blank');
    };

    // --- HELPERS ---
    const generateWeeks = (count: number) => {
        return Array.from({ length: count }, (_, i) => ({
            id: "W" + (i + 1),
            name: "W" + (i + 1) + " · Semana " + (i + 1)
        }));
    };

    const startCreate = () => {
        resetWizard();
        setIsCreating(true);
    };

    const startEdit = (e: React.MouseEvent, d: Dashboard) => {
        e.preventDefault(); e.stopPropagation();
        setEditingDash(d);
        setWizName(d.name);
        setWizDesc(d.description);
        setWizFolderId(d.folder_id);
        setWizIcon(d.settings?.icon || "🗺️");
        setWizColor(d.settings?.color || "#3b82f6");
        setWizWeeks(d.settings?.weeks?.length || 9);
        setWizStartDate(d.start_date ? d.start_date.split('T')[0] : new Date().toISOString().split('T')[0]);
        setWizOwners(d.settings?.owners || []);
        setWizTypes(d.settings?.types || []);
        setWizGates(d.settings?.gates || []);
        setIsCreating(true);
    };

    const resetWizard = () => {
        setIsCreating(false);
        setEditingDash(null);
        setWizardStep(1);
        setWizName("");
        setWizDesc("");
        setWizFolderId(currentFolderId); // Default to current folder
        setWizWeeks(9);
        setWizStartDate(new Date().toISOString().split('T')[0]);
        setWizOwners(["Andrés Tabla"]);
        setWizTypes(DEFAULT_SETTINGS.types);
        setWizGates(DEFAULT_SETTINGS.gates);
        setWizIcon("🗺️");
        setWizColor("#3b82f6");
        setWizIcon("🗺️");
        setWizColor("#3b82f6");
        setIsImporting(false);
        setImportFile(null);
        setParsedTasks([]);
    };

    // --- CSV IMPORT ---
    const handleDownloadTemplate = () => {
        const headers = "Name,Status,Owner,Week,Type,Priority";
        const rows = [
            "Lanzamiento Web,Hecho,Juan,W1,Gestión,high",
            "Revisión de Diseño,En proceso,Maria,W2,Diseño,med",
            "Pruebas QA,Por hacer,Pedro,W3,Calidad,low"
        ];
        const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "plantilla_importacion.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileRead = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportFile(file);
        const reader = new FileReader();
        reader.onload = (evt) => {
            const text = evt.target?.result as string;
            const lines = text.split('\n');
            const data = lines.slice(1).map(line => {
                const [name, status, owner, week, type, prio] = line.split(',');
                if (!name || !name.trim()) return null;
                return {
                    name: name.trim(),
                    status: status?.trim(),
                    owner: owner?.trim(),
                    week: week?.trim(),
                    type: type?.trim(),
                    prio: prio?.trim()
                };
            }).filter(Boolean);
            setParsedTasks(data);
            showToast(`✅ ${data.length} tareas detectadas`, "success");
        };
        reader.readAsText(file);
    };

    const addItem = (list: string[], setList: any, item: string, setItem: any) => {
        if (item.trim()) { setList([...list, item.trim()]); setItem(""); }
    };
    const removeItem = (list: string[], setList: any, idx: number) => {
        setList(list.filter((_, i) => i !== idx));
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
    };

    const confirmLogout = () => {
        setConfirmTitle("Cerrar Sesión");
        setConfirmMsg("¿Estás seguro de que quieres salir?");
        setConfirmActionText("Cerrar Sesión");
        setIsDestructive(false);
        setConfirmCallback(() => handleLogout);
        setConfirmOpen(true);
    };

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
            {/* HEADER & NAV */}
            <header className="workspace-header">
                <div className="workspace-header-left">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-dim)', marginBottom: 8 }}>
                        {breadcrumbs.map((crumb, i) => (
                            <div key={crumb.id || 'root'} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span
                                    onClick={() => setCurrentFolderId(crumb.id as string)}
                                    style={{
                                        cursor: 'pointer',
                                        fontWeight: i === breadcrumbs.length - 1 ? 700 : 400,
                                        color: i === breadcrumbs.length - 1 ? 'var(--text-main)' : 'var(--text-dim)',
                                        textDecoration: i !== breadcrumbs.length - 1 ? 'underline' : 'none'
                                    }}
                                >
                                    {crumb.name}
                                </span>
                                {i < breadcrumbs.length - 1 && <ChevronRight size={14} />}
                            </div>
                        ))}
                    </div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }} className="text-gradient">
                        {breadcrumbs[breadcrumbs.length - 1].name}
                    </h1>
                </div>

                <div className="workspace-header-right">
                    {/* Top utility row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {user?.role === 'admin' && (
                            <Link href="/admin/users" style={{ textDecoration: 'none' }}>
                                <button className="btn-ghost" title="Panel de Admin" style={{ padding: 6 }}><Shield size={18} /></button>
                            </Link>
                        )}
                        <Link href="/profile">
                            <button className="btn-ghost" title="Mi Perfil" style={{ padding: 6 }}><User size={18} /></button>
                        </Link>
                        <Link href="/tutorials">
                            <button className="btn-ghost" title="Tutoriales" style={{ padding: 6, color: 'var(--primary)' }}>
                                <BookOpen size={18} />
                            </button>
                        </Link>
                        <Link href="/donations">
                            <button className="btn-ghost" title="Apóyanos" style={{ padding: 6, color: '#ec4899' }}>
                                <Heart size={18} />
                            </button>
                        </Link>
                        <button className="btn-ghost" onClick={confirmLogout} title="Cerrar Sesión" style={{ padding: 6 }}><LogOut size={18} /></button>
                    </div>

                    {/* Main action row */}
                    <div className="workspace-actions">
                        {(currentItems.dashboards.length > 0 || currentItems.folders.length > 0) && (
                            <button
                                className="btn-ghost"
                                onClick={() => router.push(`/folder/${currentFolderId}/analytics`)}
                                title="Analítica Consolidada"
                                style={{ display: 'flex', alignItems: 'center', gap: 8, borderColor: 'var(--primary)', color: 'var(--text-main)' }}
                            >
                                <Shield size={18} /> <span style={{ fontSize: 13 }}>Analítica Consolidada</span>
                            </button>
                        )}

                        <button className="btn-ghost" onClick={() => setIsCreatingFolder(true)} title="Nueva Carpeta" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FolderOpen size={18} /> <span style={{ fontSize: 13 }}>Nueva Carpeta</span>
                        </button>

                        <button className="btn-primary" onClick={startCreate} style={{ padding: '8px 16px' }}>
                            <Plus size={18} /> Nuevo Proyecto
                        </button>
                    </div>
                </div>
            </header>

            {/* CONTENT GRID */}
            <div>
                {/* LOADING STATE */}
                {isLoading && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
                        <img src="/loading.gif" alt="Cargando..." style={{ width: 64, height: 64, marginBottom: 16 }} />
                        <span style={{ color: 'var(--text-dim)', fontSize: 14 }}>Cargando espacio de trabajo...</span>
                    </div>
                )}

                {/* 1. Folders Section (if any) */}
                {!isLoading && currentItems.folders.length > 0 && (
                    <div style={{ marginBottom: 32 }}>
                        <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 16 }}>Carpetas</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
                            {currentItems.folders.map(f => (
                                <div
                                    key={f.id}
                                    className="glass-panel hover-lift"
                                    onClick={() => setCurrentFolderId(f.id)}
                                    style={{
                                        padding: 16,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 12,
                                        cursor: 'pointer',
                                        border: '1px solid var(--border-dim)',
                                        borderLeft: `4px solid ${f.color || '#fbbf24'}`,
                                        minHeight: 60,
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ fontSize: 24, flexShrink: 0 }}>{f.icon || <Folder size={24} fill={f.color || "#fbbf24"} fillOpacity={0.2} />}</div>
                                    <span style={{
                                        fontWeight: 600,
                                        flex: 1,
                                        overflowWrap: 'break-word',
                                        lineHeight: 1.3,
                                        fontSize: 14
                                    }}>{f.name}</span>

                                    <div className="folder-actions" onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                        <button className="btn-ghost" onClick={(e) => {
                                            e.stopPropagation();
                                            setSharingFolder(f);
                                            // Load dashboards in this folder
                                            const foldDashboards = dashboards.filter(d => d.folder_id === f.id);
                                            setFolderDashboards(foldDashboards);
                                            // Select all dashboards by default
                                            setSelectedDashboards(foldDashboards.map(d => d.id));
                                            setIsSharingFolder(true);
                                        }} style={{ padding: 4 }} title="Compartir"><Share2 size={12} /></button>
                                        <button className="btn-ghost" onClick={(e) => handleExport(e, f.id, 'folder')} style={{ padding: 4 }} title="Descargar Reporte"><Download size={14} /></button>
                                        <button className="btn-ghost" onClick={(e) => editFolder(e, f)} style={{ padding: 4 }}><Edit2 size={12} /></button>
                                        <button className="btn-ghost" onClick={(e) => deleteFolder(e, f.id)} style={{ padding: 4, color: '#f87171' }}><Trash2 size={12} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 2. Dashboards Section */}
                {!isLoading && currentItems.dashboards.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>
                        {currentItems.dashboards.map(d => (
                            <div
                                key={d.id}
                                className="glass-panel hover-lift"
                                onClick={() => router.push("/board/" + d.id)}
                                style={{
                                    textDecoration: "none", color: "inherit", cursor: "pointer",
                                    padding: 24, height: "100%", display: "flex", flexDirection: "column", position: "relative",
                                    borderTop: "4px solid " + (d.settings?.color || "#3b82f6")
                                }}
                            >
                                {/* Action Menus */}
                                <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 4 }}>
                                    <button className="btn-ghost" onClick={(e) => handleExport(e, d.id, 'dashboard')} style={{ padding: 6 }} title="Descargar Reporte"><Download size={14} /></button>
                                    <button className="btn-ghost" onClick={(e) => startMove(e, d.id)} style={{ padding: 6 }} title="Mover"><Move size={14} /></button>
                                    <button className="btn-ghost" onClick={(e) => duplicateDash(e, d.id)} style={{ padding: 6 }} title="Duplicar"><Copy size={14} /></button>
                                    <button className="btn-ghost" onClick={(e) => startEdit(e, d)} style={{ padding: 6 }} title="Editar"><Edit2 size={14} /></button>
                                    <button className="btn-ghost" onClick={(e) => deleteDash(e, d.id)} style={{ padding: 6, color: '#f87171' }} title="Eliminar"><Trash2 size={14} /></button>
                                </div>

                                <div style={{ fontSize: 48, marginBottom: 16 }}>{d.settings?.icon || "🗺️"}</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <h3 style={{ margin: '0', fontSize: 20 }}>{d.name}</h3>
                                    {d.is_demo && (
                                        <span style={{
                                            background: 'rgba(59, 130, 246, 0.1)',
                                            color: '#3b82f6',
                                            fontSize: 9,
                                            fontWeight: 800,
                                            padding: '2px 6px',
                                            borderRadius: 4,
                                            border: '1px solid rgba(59, 130, 246, 0.2)',
                                            letterSpacing: '0.5px'
                                        }}>DEMO</span>
                                    )}
                                </div>
                                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-dim)', flex: 1, lineHeight: 1.5 }}>
                                    {d.description || "Sin descripción"}
                                </p>

                                <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 12, color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Actualizado: {new Date(d.created_at).toLocaleDateString()}</span>
                                    <span style={{ fontWeight: 600, color: d.settings?.color || 'white', display: 'flex', alignItems: 'center', gap: 4 }}>Abrir <ArrowRight size={14} /></span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    !isLoading && currentItems.folders.length === 0 && (
                        <div className="glass-panel" style={{ textAlign: 'center', padding: 80, color: 'var(--text-dim)', border: '2px dashed rgba(255,255,255,0.1)' }}>
                            <div style={{ marginBottom: 16, opacity: 0.5, display: 'inline-block' }}><FolderOpen size={48} /></div>
                            <h3 style={{ color: 'var(--text-main)' }}>Carpeta Vacía</h3>
                            <p>Crea un proyecto o una subcarpeta aquí.</p>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
                                <button className="btn-ghost" onClick={() => setIsCreatingFolder(true)}>+ Carpeta</button>
                                <button className="btn-primary" onClick={startCreate}>+ Proyecto</button>
                            </div>
                        </div>
                    )
                )}
            </div>

            {/* --- MODALS --- */}

            {/* 1. NEW/EDIT FOLDER */}
            {isCreatingFolder && (
                <div className="backdrop">
                    <div className="modal-container animate-slide-up" style={{ maxWidth: 450 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">{editingFolder ? 'Editar Carpeta' : 'Nueva Carpeta'}</h3>
                            <button className="btn-ghost" onClick={closeFolderModal} style={{ padding: 4 }}><X size={20} /></button>
                        </div>

                        <div className="modal-body">
                            <div className="form-group" style={{ textAlign: 'center' }}>
                                <label className="form-label" style={{ textAlign: 'center' }}>NOMBRE DE LA CARPETA</label>
                                <input
                                    className="input-glass"
                                    value={folderName}
                                    onChange={e => setFolderName(e.target.value)}
                                    autoFocus
                                    placeholder="Ej: Q1 Marketing"
                                    style={{ textAlign: 'center', fontSize: 16, padding: '16px' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                <div>
                                    <label className="form-label">Ícono</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, maxHeight: 200, overflowY: 'auto', padding: 4 }}>
                                        {FOLDER_ICONS.map(ic => (
                                            <div
                                                key={ic}
                                                onClick={() => setFolderIcon(ic)}
                                                style={{
                                                    cursor: 'pointer',
                                                    padding: 8,
                                                    borderRadius: 8,
                                                    background: folderIcon === ic ? 'var(--primary-gradient)' : 'rgba(255,255,255,0.05)',
                                                    border: folderIcon === ic ? '2px solid var(--primary)' : '1px solid transparent',
                                                    transition: 'all 0.2s',
                                                    fontSize: 20,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    aspectRatio: '1'
                                                }}
                                            >
                                                {ic}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="form-label">Color</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
                                        {COLORS.map(c => (
                                            <div
                                                key={c}
                                                onClick={() => setFolderColor(c)}
                                                style={{
                                                    width: 28,
                                                    height: 28,
                                                    borderRadius: '50%',
                                                    background: c,
                                                    cursor: 'pointer',
                                                    boxShadow: folderColor === c ? '0 0 0 2px var(--bg-card), 0 0 0 4px ' + c : 'none',
                                                    transition: 'all 0.2s',
                                                    border: '2px solid rgba(255,255,255,0.1)',
                                                    justifySelf: 'center'
                                                }}
                                            >
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-ghost" onClick={closeFolderModal}>Cancelar</button>
                            <button className="btn-primary" onClick={saveFolder}>Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. MOVE DASHBOARD */}
            {isMoving && (
                <div className="backdrop">
                    <div className="modal-container animate-slide-up" style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h3 className="modal-title">Mover Tablero a...</h3>
                        </div>
                        <div className="modal-body">
                            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--border-dim)', borderRadius: 8, marginBottom: 20 }}>
                                {/* Root Option */}
                                <div
                                    onClick={() => setTargetFolderId(null)}
                                    style={{ padding: '10px 12px', cursor: 'pointer', background: targetFolderId === null ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', gap: 8 }}
                                >
                                    <CornerUpLeft size={16} /> <span>Espacio Principal (Raíz)</span>
                                </div>

                                {/* Folder List */}
                                {folders.map(f => (
                                    <div
                                        key={f.id}
                                        onClick={() => setTargetFolderId(f.id)}
                                        style={{ padding: '10px 12px', cursor: 'pointer', background: targetFolderId === f.id ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', gap: 8 }}
                                    >
                                        <Folder size={16} /> <span>{f.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-ghost" onClick={() => setIsMoving(null)}>Cancelar</button>
                            <button className="btn-primary" onClick={executeMove}>Mover Aquí</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. NEW DASHBOARD WIZARD */}
            {isCreating && (
                <div className="backdrop">
                    <div className="modal-container animate-slide-up" style={{ maxWidth: 700 }}>
                        <div className="modal-header">
                            <h2 className="modal-title">{editingDash ? "Editar Tablero" : "Nuevo Proyecto (" + wizardStep + " / 4)"}</h2>
                            <button className="btn-ghost" onClick={resetWizard} style={{ padding: 4 }}><X size={20} /></button>
                        </div>

                        <div className="modal-body">
                            {wizardStep === 1 && (
                                <div className="animate-fade-in">
                                    <div className="form-group">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <label className="form-label" style={{ marginBottom: 0 }}>Método de Creación</label>
                                            {isImporting && (
                                                <button className="btn-ghost" onClick={handleDownloadTemplate} style={{ fontSize: 11, padding: '4px 8px', height: 'auto', color: 'var(--primary)' }}>
                                                    <Download size={12} style={{ marginRight: 4 }} /> Descargar Plantilla
                                                </button>
                                            )}
                                        </div>

                                        <div className="toggle-group">
                                            <div
                                                className={`toggle-option ${!isImporting ? 'active' : ''}`}
                                                onClick={() => setIsImporting(false)}
                                            >
                                                <div className="toggle-option-title">En Blanco</div>
                                                <div className="toggle-option-desc">Iniciar desde cero</div>
                                            </div>
                                            <div
                                                className={`toggle-option ${isImporting ? 'active' : ''}`}
                                                onClick={() => setIsImporting(true)}
                                            >
                                                <div className="toggle-option-title">Importar CSV</div>
                                                <div className="toggle-option-desc">Desde archivo plano</div>
                                            </div>
                                        </div>

                                        {isImporting && (
                                            <div className="animate-fade-in" style={{ marginTop: 16, padding: 16, background: 'var(--bg-panel)', borderRadius: 8, border: '1px dashed var(--border-dim)' }}>
                                                <input type="file" accept=".csv" onChange={handleFileRead} style={{ fontSize: 13, width: '100%' }} />
                                                {parsedTasks.length > 0 && (
                                                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-code)' }}>
                                                        📋 {parsedTasks.length} tareas listas para importar.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Nombre del Proyecto</label>
                                        <input className="input-glass" value={wizName} onChange={e => setWizName(e.target.value)} autoFocus placeholder="Ej: Lanzamiento 2026" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Ubicación</label>
                                        <select
                                            className="input-glass"
                                            value={wizFolderId || ""}
                                            onChange={e => setWizFolderId(e.target.value || null)}
                                            style={{ width: '100%' }}
                                        >
                                            <option value="">Espacio Principal (Raíz)</option>
                                            {folders.map(f => (
                                                <option key={f.id} value={f.id}>📁 {f.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Descripción</label>
                                        <input className="input-glass" value={wizDesc} onChange={e => setWizDesc(e.target.value)} placeholder="Breve resumen..." />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                        <div>
                                            <label className="form-label">Ícono</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, maxHeight: 200, overflowY: 'auto', padding: 4 }}>
                                                {ICONS.map(ic => (
                                                    <div
                                                        key={ic}
                                                        onClick={() => setWizIcon(ic)}
                                                        style={{
                                                            cursor: 'pointer',
                                                            padding: 8,
                                                            borderRadius: 8,
                                                            background: wizIcon === ic ? 'var(--primary-gradient)' : 'rgba(255,255,255,0.05)',
                                                            border: wizIcon === ic ? '2px solid var(--primary)' : '1px solid transparent',
                                                            transition: 'all 0.2s',
                                                            fontSize: 20,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            aspectRatio: '1'
                                                        }}
                                                    >
                                                        {ic}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="form-label">Color Principal</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                                                {COLORS.map(c => (
                                                    <div
                                                        key={c}
                                                        onClick={() => setWizColor(c)}
                                                        style={{
                                                            width: 32,
                                                            height: 32,
                                                            borderRadius: '50%',
                                                            background: c,
                                                            cursor: 'pointer',
                                                            boxShadow: wizColor === c ? '0 0 0 3px var(--bg-card), 0 0 0 5px ' + c : 'none',
                                                            transition: 'all 0.2s',
                                                            border: '2px solid rgba(255,255,255,0.1)'
                                                        }}
                                                    >
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {wizardStep === 2 && (
                                <div className="wiz-step animate-fade-in">
                                    <label className="form-label" style={{ fontSize: 14 }}>Duración (Semanas)</label>
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                        <input type="range" min="4" max="52" value={wizWeeks} onChange={e => setWizWeeks(Number(e.target.value))} style={{ flex: 1 }} />
                                        <span style={{ fontWeight: 700, fontSize: 18, width: 40, textAlign: 'center' }}>{wizWeeks}</span>
                                    </div>
                                    <p style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>
                                        {editingDash
                                            ? "⚠️ Editar la duración regenerará la lista de semanas. (No afecta tareas existentes si los IDs coinciden)."
                                            : "Se generarán " + wizWeeks + " semanas (W1 - W" + wizWeeks + ")."
                                        }
                                    </p>

                                    <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                        <div>
                                            <label className="form-label" style={{ fontSize: 14 }}>Fecha de Inicio</label>
                                            <input
                                                type="date"
                                                className="input-glass"
                                                value={wizStartDate}
                                                onChange={e => setWizStartDate(e.target.value)}
                                                style={{ width: '100%', colorScheme: 'dark' }}
                                            />
                                        </div>
                                        <div>
                                            <label className="form-label" style={{ fontSize: 14 }}>Fecha Final (Estimada)</label>
                                            <div className="input-glass" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)', cursor: 'not-allowed' }}>
                                                {wizEndDate}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {wizardStep === 3 && (
                                <div className="wiz-step animate-fade-in">
                                    <label className="form-label" style={{ fontSize: 14 }}>Equipo (Responsables)</label>

                                    {/* Option 1: Manual Input */}
                                    <div className="form-group">
                                        <label className="form-label">1. Manual (Separado por comas)</label>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <input
                                                className="input-glass"
                                                value={newOwner}
                                                onChange={e => setNewOwner(e.target.value)}
                                                placeholder="Ej: Juan, Pedro, Maria..."
                                                style={{ flex: 1 }}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        if (newOwner.includes(',')) {
                                                            const names = newOwner.split(',').map(n => n.trim()).filter(n => n);
                                                            names.forEach(n => addItem(wizOwners, setWizOwners, n, () => { }));
                                                            setNewOwner("");
                                                        } else {
                                                            addItem(wizOwners, setWizOwners, newOwner, setNewOwner);
                                                        }
                                                    }
                                                }}
                                            />
                                            <button className="btn-ghost" onClick={() => {
                                                if (newOwner.includes(',')) {
                                                    const names = newOwner.split(',').map(n => n.trim()).filter(n => n);
                                                    names.forEach(n => addItem(wizOwners, setWizOwners, n, () => { }));
                                                    setNewOwner("");
                                                } else {
                                                    addItem(wizOwners, setWizOwners, newOwner, setNewOwner);
                                                }
                                            }}><Plus size={16} /></button>
                                        </div>
                                    </div>

                                    {/* Option 2: System Users */}
                                    <div className="form-group">
                                        <label className="form-label">2. Usuarios del Sistema</label>
                                        <select
                                            className="input-glass"
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    addItem(wizOwners, setWizOwners, e.target.value, () => { });
                                                    e.target.value = ""; // Reset select
                                                }
                                            }}
                                        >
                                            <option value="">+ Agregar usuario existente...</option>
                                            {availableUsers.map(u => (
                                                <option key={u.id} value={`${u.name} (${u.email})`}>{u.name} ({u.email})</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Selected List */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 150, overflowY: 'auto', padding: 8, background: 'rgba(0,0,0,0.05)', borderRadius: 8 }}>
                                        {wizOwners.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-dim)', fontStyle: 'italic' }}>No hay miembros asignados.</span>}
                                        {wizOwners.map((o, i) => (
                                            <div key={i} style={{ background: 'var(--panel-hover)', padding: '4px 10px', borderRadius: 20, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)' }}>
                                                {o} <span style={{ cursor: 'pointer', opacity: 0.5 }} onClick={() => removeItem(wizOwners, setWizOwners, i)}>✕</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {wizardStep === 4 && (
                                <div className="wiz-step animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                    <div>
                                        <label className="form-label">Tipos</label>
                                        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                                            <input className="input-glass" value={newType} onChange={e => setNewType(e.target.value)} placeholder="Tipo..." style={{ flex: 1, padding: 6 }} onKeyDown={e => e.key === 'Enter' && addItem(wizTypes, setWizTypes, newType, setNewType)} />
                                            <button className="btn-ghost" onClick={() => addItem(wizTypes, setWizTypes, newType, setNewType)}><Plus size={16} /></button>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                            {wizTypes.map((t, i) => (
                                                <div key={i} style={{ background: 'var(--panel-hover)', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>
                                                    {t} <span style={{ cursor: 'pointer', marginLeft: 4 }} onClick={() => removeItem(wizTypes, setWizTypes, i)}>x</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="form-label">Gates</label>
                                        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                                            <input className="input-glass" value={newGate} onChange={e => setNewGate(e.target.value)} placeholder="Gate..." style={{ flex: 1, padding: 6 }} onKeyDown={e => e.key === 'Enter' && addItem(wizGates, setWizGates, newGate, setNewGate)} />
                                            <button className="btn-ghost" onClick={() => addItem(wizGates, setWizGates, newGate, setNewGate)}><Plus size={16} /></button>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                            {wizGates.map((g, i) => (
                                                <div key={i} style={{ background: '#ecfdf5', color: '#000', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>
                                                    {g} <span style={{ cursor: 'pointer', marginLeft: 4 }} onClick={() => removeItem(wizGates, setWizGates, i)}>x</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            {wizardStep > 1 && <button className="btn-ghost" onClick={() => setWizardStep(s => s - 1)}>Atrás</button>}
                            {wizardStep < 4 ? (
                                <button className="btn-primary" onClick={() => setWizardStep(s => s + 1)} disabled={!wizName}>Siguiente</button>
                            ) : (
                                <button className="btn-primary" onClick={handleSaveDashboard}>
                                    {isImporting && parsedTasks.length > 0 ? `Crear e Importar (${parsedTasks.length})` : "Crear Proyecto"}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {dashboards.length === 0 && !isCreating && (
                <div className="glass-panel" style={{ gridColumn: '1/-1', textAlign: 'center', padding: 80, color: 'var(--text-dim)', border: '2px dashed rgba(255,255,255,0.1)' }}>
                    <div style={{ marginBottom: 16, opacity: 0.5, display: 'inline-block' }}><FolderOpen size={48} /></div>
                    <h3 style={{ color: 'var(--text-main)' }}>No hay proyectos activos</h3>
                    <p>Comienza creando tu primer tablero estratégico.</p>
                    <button className="btn-primary" onClick={startCreate} style={{ marginTop: 20 }}>+ Crear Proyecto</button>
                </div>
            )}
            {/* CONFIRM MODAL */}

            <ConfirmModal
                isOpen={confirmOpen}
                title={confirmTitle}
                message={confirmMsg}
                onConfirm={confirmCallback || (() => { })}
                onCancel={() => setConfirmOpen(false)}
                isDestructive={isDestructive}
                confirmText={confirmActionText}
            />

            <style jsx>{`
                /* DASHBOARD GRID ADAPTIVE */
                .dashboard-grid { 
                    display: grid; 
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); 
                    gap: 20px; 
                    padding: 10px 0;
                }
                
                .dash-card { 
                    background: var(--bg-panel); 
                    border-radius: 12px; 
                    padding: 20px; 
                    border: 1px solid var(--border-dim); 
                    transition: all 0.2s; 
                    cursor: pointer; 
                    display: flex; 
                    flex-direction: column; 
                    justify-content: space-between; 
                    height: 180px; 
                    position: relative;
                }

                @media (max-width: 768px) {
                    header { height: auto !important; padding: 16px !important; }
                    .top-bar { flex-direction: column; align-items: flex-start; gap: 12px; }
                    .user-area { width: 100%; justify-content: space-between; }
                    .filters { overflow-x: auto; padding-bottom: 4px; width: 100%; }
                    .view-toggle { display: none; } /* Hide view toggle on mobile if complex */
                    
                    /* Adjust Grid for Mobile */
                    .dashboard-grid { grid-template-columns: 1fr; }
                }

                /* Workspace Header Fix */
                .workspace-header { 
                    margin-bottom: 40px; 
                    border-bottom: 1px solid rgba(255,255,255,0.1); 
                    padding-bottom: 24px; 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    position: relative; 
                    gap: 24px;
                }
                .workspace-header-left {
                    flex: 1;
                    min-width: 200px;
                }
                .workspace-header-right { 
                    display: flex; 
                    flex-direction: row; 
                    align-items: center; 
                    gap: 16px; 
                }
                .workspace-actions { 
                    display: flex; 
                    align-items: center; 
                    gap: 12px; 
                }

                @media (max-width: 992px) {
                    .workspace-header { flex-direction: column; align-items: stretch; gap: 24px; }
                    .workspace-header-right { align-items: stretch; }
                    .workspace-actions { justify-content: stretch; flex-wrap: wrap; }
                    .workspace-actions button { flex: 1; min-width: 140px; }
                    .folder-header { flex-direction: column; align-items: flex-start; gap: 12px; }
                    .folder-actions { width: 100%; justify-content: space-between; }
                    .folder-actions button { flex: 1; }
                }
                .analytics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; padding: 10px; }
                .kpi-card { background: var(--bg-card); padding: 20px; border-radius: 12px; border: 1px solid var(--border-dim); text-align: center; }
                .kpi-value { font-size: 32px; font-weight: 800; margin: 8px 0; }
                .kpi-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-dim); }
                .kpi-sub { font-size: 11px; color: var(--text-dim); }
                .chart-card { background: var(--bg-card); padding: 20px; border-radius: 12px; border: 1px solid var(--border-dim); }
            `}</style>
            {/* SHARE MODAL */}
            {isSharingFolder && (
                <div className="backdrop fade-in" onClick={() => setIsSharingFolder(false)}>
                    <div className="modal-container animate-slide-up" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ color: sharingFolder?.color || '#3b82f6' }}><Folder size={24} /></div>
                                <h3 className="modal-title">Compartir Carpeta</h3>
                            </div>
                            <button className="btn-ghost" onClick={() => setIsSharingFolder(false)}>✕</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 24 }}>
                                Comparte <b>{sharingFolder?.name}</b> con otros usuarios registrados.
                            </p>

                            <div className="form-group">
                                <label className="form-label"><UserPlus size={14} style={{ marginRight: 6 }} /> Seleccionar Usuario</label>
                                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border-dim)', borderRadius: 12, padding: 8, background: 'rgba(0,0,0,0.1)' }}>
                                    {availableUsers.length === 0 && <p style={{ padding: 10, color: 'var(--text-dim)', fontSize: 13, textAlign: 'center' }}>No hay usuarios para asignar.</p>}
                                    {availableUsers.map(u => (
                                        <div key={u.id} className="hover-lift" style={{
                                            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, cursor: 'pointer', transition: 'background 0.2s',
                                            background: shareEmail === u.email ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                            border: shareEmail === u.email ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid transparent'
                                        }} onClick={() => setShareEmail(u.email)}>
                                            <input
                                                type="radio"
                                                name="shareEmail"
                                                checked={shareEmail === u.email}
                                                onChange={() => { }}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: 14, fontWeight: 500 }}>{u.name || u.email.split('@')[0]}</span>
                                                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{u.email}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Dashboard Selection */}
                            <div className="form-group" style={{ marginTop: 20 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <label className="form-label">Tableros con Acceso</label>
                                    <button
                                        type="button"
                                        className="btn-ghost"
                                        onClick={() => {
                                            if (selectedDashboards.length === folderDashboards.length) {
                                                setSelectedDashboards([]);
                                            } else {
                                                setSelectedDashboards(folderDashboards.map(d => d.id));
                                            }
                                        }}
                                        style={{ fontSize: 12, padding: '4px 8px', height: 'auto' }}
                                    >
                                        {selectedDashboards.length === folderDashboards.length ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                                    </button>
                                </div>
                                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border-dim)', borderRadius: 12, padding: 8, background: 'rgba(0,0,0,0.1)' }}>
                                    {folderDashboards.length === 0 && (
                                        <p style={{ padding: 10, color: 'var(--text-dim)', fontSize: 13, textAlign: 'center' }}>
                                            No hay tableros en esta carpeta
                                        </p>
                                    )}
                                    {folderDashboards.map(dashboard => (
                                        <div
                                            key={dashboard.id}
                                            className="hover-lift"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                padding: '8px 12px',
                                                borderRadius: 8,
                                                cursor: 'pointer',
                                                transition: 'background 0.2s',
                                                background: selectedDashboards.includes(dashboard.id) ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                                border: selectedDashboards.includes(dashboard.id) ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid transparent'
                                            }}
                                            onClick={() => {
                                                setSelectedDashboards(prev =>
                                                    prev.includes(dashboard.id)
                                                        ? prev.filter(id => id !== dashboard.id)
                                                        : [...prev, dashboard.id]
                                                );
                                            }}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedDashboards.includes(dashboard.id)}
                                                onChange={() => { }}
                                                style={{ cursor: 'pointer', transform: 'scale(1.1)' }}
                                            />
                                            <div style={{ fontSize: 24 }}>{dashboard.settings?.icon || '🗺️'}</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 14, fontWeight: 500 }}>{dashboard.name}</div>
                                                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                                                    {dashboard.description || 'Sin descripción'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12, padding: 16, background: 'rgba(59, 130, 246, 0.05)', borderRadius: 12, border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                                <input
                                    type="checkbox"
                                    id="shareNotify"
                                    checked={shareNotify}
                                    onChange={e => setShareNotify(e.target.checked)}
                                    style={{ transform: 'scale(1.1)', cursor: 'pointer' }}
                                />
                                <label htmlFor="shareNotify" style={{ color: '#3b82f6', fontWeight: 600, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Mail size={14} /> Enviar notificación por correo
                                </label>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-ghost" onClick={() => { setIsSharingFolder(false); setShareEmail(""); setSelectedDashboards([]); }}>Cancelar</button>
                            <button
                                className="btn-primary"
                                disabled={!shareEmail || selectedDashboards.length === 0 || isSavingShare}
                                onClick={async () => {
                                    setIsSavingShare(true);
                                    try {
                                        const res = await fetch(`/api/folders/${sharingFolder.id}/share`, {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({
                                                email: shareEmail,
                                                dashboardIds: selectedDashboards,
                                                notify: shareNotify
                                            })
                                        });

                                        if (res.ok) {
                                            const data = await res.json();
                                            showToast(`Acceso compartido: ${data.dashboardsShared} tablero(s)`, "success");
                                            setIsSharingFolder(false);
                                            setShareEmail("");
                                            setSelectedDashboards([]);
                                        } else {
                                            const data = await res.json();
                                            showToast(data.error || "Error al compartir", "error");
                                        }
                                    } catch (e) {
                                        showToast("Error de conexión", "error");
                                    } finally {
                                        setIsSavingShare(false);
                                    }
                                }}
                            >
                                {isSavingShare ? "Compartiendo..." : "Compartir Acceso"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
