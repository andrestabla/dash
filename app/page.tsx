"use client";

import { useState, useEffect, useMemo } from "react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from "@/components/ToastProvider";
import ConfirmModal from "@/components/ConfirmModal";
import { Plus, X, Edit2, Trash2, ArrowRight, FolderOpen, Shield, User, LogOut, StopCircle, Folder, ChevronRight, Copy, Move, CornerUpLeft, Download, Link as LinkIcon, Check } from "lucide-react";

interface Dashboard {
    id: string;
    name: string;
    description: string;
    created_at: string;
    folder_id: string | null;
    settings: any;
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

const ICONS = ["🗺️", "🚀", "💻", "🎨", "📈", "📅", "🔥", "⚙️", "📱", "🌐"];
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#64748b"];

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

    const [isLoading, setIsLoading] = useState(true);
    const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
    const [consolidatedTasks, setConsolidatedTasks] = useState<any[]>([]);
    const [isFetchingAnalytics, setIsFetchingAnalytics] = useState(false);
    const [analyticsFilters, setAnalyticsFilters] = useState({ search: '', status: 'all', owner: 'all', dashboardId: 'all', type: 'all' });
    const [publicLinkState, setPublicLinkState] = useState<{ isPublic: boolean, token: string | null }>({ isPublic: false, token: null });
    const [sharingLoading, setSharingLoading] = useState(false);

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
        }).catch(err => console.error(err))
            .finally(() => setIsLoading(false));
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

    const fetchConsolidatedAnalytics = async () => {
        setIsFetchingAnalytics(true);
        setIsAnalyticsOpen(true);
        // Reset state
        setPublicLinkState({ isPublic: false, token: null });
        try {
            const res = await fetch(`/api/tasks?folderId=${currentFolderId || 'null'}`);
            if (res.ok) {
                const data = await res.json();
                setConsolidatedTasks(data);
            }
            // Also check existing share status if we are in a folder
            if (currentFolderId) {
                // We'll need an endpoint to get status or just assume off until user clicks share.
                // For better UX, let's lazy load status when they click share, or fetch it now.
                // Let's create a quick check. Ideally the `api/folders` list would include `is_public` 
                // but since we want to keep it simple, we can fetch it on share toggle or just leave it.
            }
        } catch (error) {
            showToast("Error al cargar analítica", "error");
        } finally {
            setIsFetchingAnalytics(false);
        }
    };

    const handleShareAnalytics = async () => {
        if (!currentFolderId) return; // Cannot share root yet
        setSharingLoading(true);
        try {
            // Toggle public status
            const newStatus = !publicLinkState.isPublic;
            const res = await fetch(`/api/folders/${currentFolderId}/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'toggle_public', isPublic: newStatus })
            });
            if (res.ok) {
                const data = await res.json();
                setPublicLinkState({ isPublic: data.isPublic, token: data.token });
                showToast(newStatus ? "Enlace público activado" : "Enlace público desactivado", "success");
            }
        } catch (error) {
            showToast("Error al compartir", "error");
        } finally {
            setSharingLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showToast("Enlace copiado", "success");
    };

    const filteredAnalyticsTasks = useMemo(() => {
        return consolidatedTasks.filter(t => {
            const matchesSearch = t.name.toLowerCase().includes(analyticsFilters.search.toLowerCase()) ||
                (t.desc && t.desc.toLowerCase().includes(analyticsFilters.search.toLowerCase()));
            const matchesStatus = analyticsFilters.status === 'all' || t.status === analyticsFilters.status;
            const matchesOwner = analyticsFilters.owner === 'all' || t.owner === analyticsFilters.owner;
            const matchesDash = analyticsFilters.dashboardId === 'all' || String(t.dashboard_id) === String(analyticsFilters.dashboardId);
            const matchesType = analyticsFilters.type === 'all' || t.type === analyticsFilters.type;
            return matchesSearch && matchesStatus && matchesOwner && matchesDash && matchesType;
        });
    }, [consolidatedTasks, analyticsFilters]);

    // Extract unique values for filters
    const uniqueStatuses = useMemo(() => [...new Set(consolidatedTasks.map(t => t.status).filter(Boolean))], [consolidatedTasks]);
    const uniqueTypes = useMemo(() => [...new Set(consolidatedTasks.map(t => t.type).filter(Boolean))], [consolidatedTasks]);
    const uniqueOwners = useMemo(() => [...new Set(consolidatedTasks.map(t => t.owner).filter(Boolean))], [consolidatedTasks]);
    const uniqueDashboards = useMemo(() => {
        const map = new Map();
        // We need dashboard names. Since tasks only have dashboard_id, we might need to look up in loaded dashboards.
        // However, consolidated analytics might bring tasks from dashboards NOT currently loaded in `dashboards` state (recursive).
        // For now, we can only filter by ID or we rely on what is available. 
        // A better approach is to have the API return dashboard name with the task or a separate list.
        // As a fallback, we will map partial available dashboards.
        consolidatedTasks.forEach(t => {
            // Try to find name in currently loaded dashboards, otherwise use ID
            const found = dashboards.find(d => String(d.id) === String(t.dashboard_id));
            map.set(t.dashboard_id, found ? found.name : `Tablero #${t.dashboard_id}`);
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [consolidatedTasks, dashboards]);

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
            {/* HEADER & NAV */}
            <header style={{ marginBottom: 40, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
                <div style={{ flex: 1 }}>
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

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
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
                        <button className="btn-ghost" onClick={confirmLogout} title="Cerrar Sesión" style={{ padding: 6 }}><LogOut size={18} /></button>
                    </div>

                    {/* Main action row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {(currentItems.dashboards.length > 0 || currentItems.folders.length > 0) && (
                            <button
                                className="btn-ghost"
                                onClick={fetchConsolidatedAnalytics}
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
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                            {currentItems.folders.map(f => (
                                <div
                                    key={f.id}
                                    className="glass-panel hover-lift"
                                    onClick={() => setCurrentFolderId(f.id)}
                                    style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', border: '1px solid var(--border-dim)', borderLeft: `4px solid ${f.color || '#fbbf24'}` }}
                                >
                                    <div style={{ color: f.color || '#fbbf24' }}>{f.icon || <Folder size={24} fill={f.color || "#fbbf24"} fillOpacity={0.2} />}</div>
                                    <span style={{ fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>

                                    <div className="folder-actions" onClick={e => e.stopPropagation()} style={{ display: 'flex' }}>
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
                                <h3 style={{ margin: '0 0 8px 0', fontSize: 20 }}>{d.name}</h3>
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
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                                        {["📁", "📂", "💼", "📊", "🚀", "💡", "🎯"].map(ic => (
                                            <div key={ic} onClick={() => setFolderIcon(ic)} style={{ cursor: 'pointer', padding: 8, borderRadius: 8, background: folderIcon === ic ? 'var(--bg-panel)' : 'transparent', border: folderIcon === ic ? '1px solid var(--primary)' : '1px solid transparent', transition: 'all 0.2s', fontSize: 20 }}>{ic}</div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="form-label">Color</label>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                                        {COLORS.map(c => (
                                            <div key={c} onClick={() => setFolderColor(c)} style={{ width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer', boxShadow: folderColor === c ? '0 0 0 2px var(--bg-card), 0 0 0 4px ' + c : 'none', transition: 'all 0.2s' }}></div>
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
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                {ICONS.map(ic => (
                                                    <div key={ic} onClick={() => setWizIcon(ic)} style={{ cursor: 'pointer', padding: 10, borderRadius: 8, background: wizIcon === ic ? 'var(--primary-gradient)' : 'rgba(255,255,255,0.05)', transition: 'all 0.2s' }}>{ic}</div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label className="form-label">Color Principal</label>
                                            <div style={{ display: 'flex', gap: 12 }}>
                                                {COLORS.map(c => (
                                                    <div key={c} onClick={() => setWizColor(c)} style={{ width: 32, height: 32, borderRadius: '50%', background: c, cursor: 'pointer', boxShadow: wizColor === c ? '0 0 0 3px var(--bg-card), 0 0 0 5px ' + c : 'none', transition: 'all 0.2s' }}></div>
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
            {/* 4. CONSOLIDATED ANALYTICS MODAL */}
            {isAnalyticsOpen && (
                <div className="backdrop" onClick={() => setIsAnalyticsOpen(false)}>
                    <div className="modal-container animate-slide-up" style={{ maxWidth: 1000, height: '90vh' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2 className="modal-title">Analítica Consolidada</h2>
                                <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>
                                    Vista agregada de tableros en {breadcrumbs[breadcrumbs.length - 1].name} (Incluyendo subcarpetas)
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {currentFolderId && (
                                    <div style={{ position: 'relative' }}>
                                        <button
                                            className="btn-ghost"
                                            onClick={handleShareAnalytics}
                                            title={publicLinkState.isPublic ? "Desactivar enlace público" : "Generar enlace público"}
                                            style={{ padding: 4, color: publicLinkState.isPublic ? '#10b981' : 'var(--text-dim)' }}
                                            disabled={sharingLoading}
                                        >
                                            <LinkIcon size={20} />
                                        </button>
                                        {/* Popover for link if public */}
                                        {publicLinkState.isPublic && publicLinkState.token && (
                                            <div className="animate-fade-in" style={{
                                                position: 'absolute', top: '100%', right: 0, marginTop: 8,
                                                background: 'var(--bg-panel)', border: '1px solid var(--border-dim)',
                                                borderRadius: 8, padding: 12, width: 300, zIndex: 50,
                                                boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                                            }}>
                                                <p style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Enlace Público Activo</p>
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <input
                                                        readOnly
                                                        value={`${window.location.origin}/public/analytics/${publicLinkState.token}`}
                                                        className="input-glass"
                                                        style={{ fontSize: 11, padding: 6, flex: 1 }}
                                                    />
                                                    <button
                                                        className="btn-primary"
                                                        onClick={() => copyToClipboard(`${window.location.origin}/public/analytics/${publicLinkState.token}`)}
                                                        style={{ padding: '4px 8px' }}
                                                    >
                                                        <Copy size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                <button className="btn-ghost" onClick={() => setIsAnalyticsOpen(false)} style={{ padding: 4 }}><X size={24} /></button>
                            </div>
                        </div>

                        {/* FILTER TOOLBAR */}
                        <div style={{ padding: '0 24px 16px', borderBottom: '1px solid var(--border-dim)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                            <div className="input-group" style={{ flex: 1, minWidth: 200 }}>
                                <input
                                    className="input-glass"
                                    placeholder="Buscar tarea..."
                                    value={analyticsFilters.search}
                                    onChange={e => setAnalyticsFilters(prev => ({ ...prev, search: e.target.value }))}
                                    style={{ padding: '8px 12px', fontSize: 13 }}
                                />
                            </div>
                            <select
                                className="input-glass"
                                value={analyticsFilters.status}
                                onChange={e => setAnalyticsFilters(prev => ({ ...prev, status: e.target.value }))}
                                style={{ padding: '8px 12px', fontSize: 13, minWidth: 120 }}
                            >
                                <option value="all">Todos los Estados</option>
                                {uniqueStatuses.map((s: any) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select
                                className="input-glass"
                                value={analyticsFilters.owner}
                                onChange={e => setAnalyticsFilters(prev => ({ ...prev, owner: e.target.value }))}
                                style={{ padding: '8px 12px', fontSize: 13, minWidth: 140 }}
                            >
                                <option value="all">Todos los Responsables</option>
                                {uniqueOwners.map((o: any) => <option key={o} value={o}>{o}</option>)}
                            </select>
                            <select
                                className="input-glass"
                                value={analyticsFilters.dashboardId}
                                onChange={e => setAnalyticsFilters(prev => ({ ...prev, dashboardId: e.target.value }))}
                                style={{ padding: '8px 12px', fontSize: 13, minWidth: 140 }}
                            >
                                <option value="all">Todos los Proyectos</option>
                                {uniqueDashboards.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                            <select
                                className="input-glass"
                                value={analyticsFilters.type}
                                onChange={e => setAnalyticsFilters(prev => ({ ...prev, type: e.target.value }))}
                                style={{ padding: '8px 12px', fontSize: 13, minWidth: 140 }}
                            >
                                <option value="all">Todos los Tipos</option>
                                {uniqueTypes.map((t: any) => <option key={t} value={t}>{t}</option>)}
                            </select>
                            {/* Reset Filter Button */}
                            {(analyticsFilters.search || analyticsFilters.status !== 'all' || analyticsFilters.owner !== 'all' || analyticsFilters.dashboardId !== 'all' || analyticsFilters.type !== 'all') && (
                                <button
                                    className="btn-ghost"
                                    onClick={() => setAnalyticsFilters({ search: '', status: 'all', owner: 'all', dashboardId: 'all', type: 'all' })}
                                    style={{ fontSize: 12, color: 'var(--primary)' }}
                                >
                                    Limpiar
                                </button>
                            )}
                        </div>

                        <div className="modal-body" style={{ background: 'var(--bg-main)' }}>
                            {isFetchingAnalytics ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    <img src="/loading.gif" alt="Cargando..." style={{ width: 48, height: 48, marginBottom: 16 }} />
                                    <span>Consolidando datos...</span>
                                </div>
                            ) : consolidatedTasks.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 40 }}>
                                    <p>No hay tareas suficientes para generar analítica.</p>
                                </div>
                            ) : (
                                <div className="analytics-grid">
                                    {/* Summary KPIs */}
                                    <div className="kpi-card">
                                        <div className="kpi-label">Proyectos</div>
                                        <div className="kpi-value">{analyticsFilters.dashboardId === 'all' ? currentItems.dashboards.length : 1}</div>
                                        <div className="kpi-sub">Tableros filtrados</div>
                                    </div>
                                    <div className="kpi-card">
                                        <div className="kpi-label">Total Tareas</div>
                                        <div className="kpi-value" style={{ color: 'var(--primary)' }}>{filteredAnalyticsTasks.length}</div>
                                        <div className="kpi-sub">Visibles</div>
                                    </div>
                                    <div className="kpi-card">
                                        <div className="kpi-label">Progreso Global</div>
                                        <div className="kpi-value" style={{ color: '#10b981' }}>
                                            {filteredAnalyticsTasks.length > 0
                                                ? Math.round((filteredAnalyticsTasks.filter(t => t.status === 'done').length / filteredAnalyticsTasks.length) * 100)
                                                : 0}%
                                        </div>
                                        <div className="kpi-sub">Estatus "Hecho"</div>
                                    </div>

                                    {/* Status Distribution */}
                                    <div className="chart-card" style={{ gridColumn: 'span 2' }}>
                                        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>ESTADO CONSOLIDADO</h3>
                                        <div className="status-pill-bar" style={{ height: 32, borderRadius: 16, overflow: 'hidden', display: 'flex', marginBottom: 20 }}>
                                            {['done', 'doing', 'review', 'todo'].map(s => {
                                                const count = filteredAnalyticsTasks.filter(t => t.status === s).length;
                                                const pct = (count / filteredAnalyticsTasks.length) * 100;
                                                const colors: any = { done: '#10b981', doing: '#3b82f6', review: '#f59e0b', todo: '#64748b' };
                                                if (count === 0) return null;
                                                return <div key={s} style={{ width: `${pct}%`, background: colors[s] }} title={`${s}: ${count}`}></div>
                                            })}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 12 }}>
                                            {[
                                                { label: 'Hecho', key: 'done', color: '#10b981' },
                                                { label: 'En Proceso', key: 'doing', color: '#3b82f6' },
                                                { label: 'Revisión', key: 'review', color: '#f59e0b' },
                                                { label: 'Pendiente', key: 'todo', color: '#64748b' }
                                            ].map(s => (
                                                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                                                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color }}></div>
                                                    <span style={{ fontWeight: 600 }}>{filteredAnalyticsTasks.filter(t => t.status === s.key).length}</span>
                                                    <span style={{ color: 'var(--text-dim)' }}>{s.label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Priority Volume */}
                                    <div className="chart-card">
                                        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>VOLUMEN POR PRIORIDAD</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            {[
                                                { label: 'Alta', key: 'high', color: '#ef4444' },
                                                { label: 'Media', key: 'med', color: '#f59e0b' },
                                                { label: 'Baja', key: 'low', color: '#10b981' }
                                            ].map(p => {
                                                const count = filteredAnalyticsTasks.filter(t => t.prio === p.key).length;
                                                const max = Math.max(...['high', 'med', 'low'].map(k => filteredAnalyticsTasks.filter(t => t.prio === k).length));
                                                return (
                                                    <div key={p.key}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                                            <span>{p.label}</span>
                                                            <span style={{ fontWeight: 700 }}>{count}</span>
                                                        </div>
                                                        <div style={{ height: 6, background: 'var(--bg-panel)', borderRadius: 3 }}>
                                                            <div style={{ height: '100%', width: `${(count / (max || 1)) * 100}%`, background: p.color, borderRadius: 3 }}></div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Workload */}
                                    <div className="chart-card" style={{ gridColumn: 'span 3' }}>
                                        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>CARGA DE TRABAJO (TOP 10)</h3>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
                                            {Array.from(new Set(filteredAnalyticsTasks.map(t => t.owner))).slice(0, 10).map(o => {
                                                const ownerTasks = filteredAnalyticsTasks.filter(t => t.owner === o);
                                                const done = ownerTasks.filter(t => t.status === 'done').length;
                                                const total = ownerTasks.length;
                                                const pct = Math.round((done / total) * 100);
                                                return (
                                                    <div key={o} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--bg-panel)', borderRadius: 12 }}>
                                                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-gradient)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>
                                                            {o.substring(0, 2).toUpperCase()}
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                                                <span style={{ fontWeight: 600 }}>{o}</span>
                                                                <span>{done}/{total}</span>
                                                            </div>
                                                            <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                                                                <div style={{ height: '100%', width: `${pct}%`, background: '#10b981', borderRadius: 2 }}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )
            }

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
                .analytics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; padding: 10px; }
                .kpi-card { background: var(--bg-card); padding: 20px; border-radius: 12px; border: 1px solid var(--border-dim); text-align: center; }
                .kpi-value { font-size: 32px; font-weight: 800; margin: 8px 0; }
                .kpi-label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-dim); }
                .kpi-sub { font-size: 11px; color: var(--text-dim); }
                .chart-card { background: var(--bg-card); padding: 20px; border-radius: 12px; border: 1px solid var(--border-dim); }
            `}</style>
        </div >
    );
}
