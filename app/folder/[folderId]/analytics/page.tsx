"use client";

import { useEffect, useState, useMemo, use, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Share2, Copy, Check, X, Search, Filter } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

// Helper for loose status matching
const isTaskDone = (status: string) => {
    if (!status) return false;
    const s = status.toLowerCase();
    return s === 'done' || s.includes('validado') || s.includes('final') || s.includes('complet') || s.includes('entregado') || s.includes('aprobado') || s.includes('closed');
};

// Custom Select Component upgraded to Searchable Combobox
const CustomSelect = ({ value, onChange, options, placeholder, icon, minWidth = 140, flex = 0 }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Sync input with external value
    useEffect(() => {
        const selected = options.find((o: any) => String(o.value) === String(value));
        if (selected) {
            setSearchTerm(selected.label || "");
        } else if (value === '' || value === 'all') {
            const allOpt = options.find((o: any) => o.value === 'all');
            if (value === 'all' && allOpt) setSearchTerm(allOpt.label || "");
            else setSearchTerm("");
        }
    }, [value, options]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // If search matches the current selection exactly, show ALL options (don't filter yet)
    // This allows users to open the dropdown and see the full list immediately
    const selectedOption = options.find((o: any) => String(o.value) === String(value));
    const isExactMatch = selectedOption && (selectedOption.label || "") === searchTerm;

    const filteredOptions = isExactMatch
        ? options
        : options.filter((o: any) => {
            if (!o) return false;
            const label = (o.label || "").toString();
            const term = (searchTerm || "").toString();
            return label.toLowerCase().includes(term.toLowerCase());
        });

    const handleSelect = (val: string, label: string) => {
        onChange(val);
        setSearchTerm(label);
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} style={{ position: 'relative', minWidth, flex: flex ? 1 : undefined }}>
            <div
                className="input-glass"
                style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                    background: 'var(--bg-panel)', border: '1px solid var(--border-dim)',
                    cursor: 'text'
                }}
                onClick={() => setIsOpen(true)}
            >
                {icon}
                <input
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsOpen(true);
                        if (e.target.value === '') onChange('all');
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    style={{
                        background: 'transparent', border: 'none', outline: 'none',
                        width: '100%', color: 'var(--text-main)', fontSize: 13,
                        cursor: 'text'
                    }}
                />
                <span style={{ fontSize: 10, opacity: 0.5, cursor: 'pointer' }} onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}>▼</span>
            </div>

            {isOpen && (
                <div className="animate-fade-in" style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                    background: 'var(--bg-panel)', border: '1px solid var(--border-dim)',
                    borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.2)', zIndex: 1000,
                    maxHeight: 300, overflowY: 'auto'
                }}>
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((o: any) => (
                            <div
                                key={o.value}
                                onClick={() => handleSelect(o.value, o.label)}
                                style={{
                                    padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                                    background: value === o.value ? 'var(--primary-gradient)' : 'transparent',
                                    color: value === o.value ? 'white' : 'var(--text-main)',
                                    fontWeight: value === o.value ? 600 : 400,
                                    borderBottom: '1px dotted var(--border-dim)',
                                    display: 'flex', justifyContent: 'space-between'
                                }}
                            >
                                <span>{o.label}</span>
                                {value === o.value && <span>✓</span>}
                            </div>
                        ))
                    ) : (
                        <div style={{ padding: 12, fontSize: 13, color: 'var(--text-dim)', textAlign: 'center' }}>
                            No se encontraron resultados
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default function FolderAnalyticsPage() {
    const params = useParams();
    const folderId = params.folderId as string;
    const router = useRouter();
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [folderName, setFolderName] = useState("");
    const [breadcrumbs, setBreadcrumbs] = useState<{ id: string | null, name: string }[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [availableDashboards, setAvailableDashboards] = useState<any[]>([]); // New state for all dashboards

    const [filters, setFilters] = useState({
        dashboardId: 'all',
        search: '',
        status: 'all',
        owner: 'all',
        type: 'all'
    });

    // Public sharing state
    const [publicLinkState, setPublicLinkState] = useState<{ isPublic: boolean, token: string | null }>({ isPublic: false, token: null });
    const [sharingLoading, setSharingLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadData();
    }, [folderId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch folder info, breadcrumbs, and comprehensive dashboard list
            const [folderRes, dashboardsRes, tasksRes] = await Promise.all([
                fetch('/api/folders'),
                fetch('/api/dashboards'),
                fetch(`/api/tasks?folderId=${folderId}`)
            ]);

            if (folderRes.ok && dashboardsRes.ok) {
                const folders = await folderRes.json();
                const allDashboards = await dashboardsRes.json();
                const folder = folders.find((f: any) => f.id === folderId);

                if (folderId === 'null') {
                    // Root folder case
                    setFolderName("Espacio de Trabajo");
                    setBreadcrumbs([{ id: null, name: 'Espacio de Trabajo' }]);
                    setAvailableDashboards(allDashboards);

                    // Root public state check (global settings?) - For now disable share on root
                    setPublicLinkState({ isPublic: false, token: null });
                } else if (folder) {
                    setFolderName(folder.name);

                    // Recursive function to get all folder IDs in this subtree
                    const getSubFolderIds = (parentId: string): string[] => {
                        const children = folders.filter((f: any) => f.parent_id === parentId);
                        let ids = [parentId];
                        children.forEach((child: any) => {
                            ids = [...ids, ...getSubFolderIds(child.id)];
                        });
                        return ids;
                    };

                    const relevantFolderIds = getSubFolderIds(folderId);

                    // Filter dashboards that belong to this folder subtree
                    const relevantDashboards = allDashboards.filter((d: any) => relevantFolderIds.includes(String(d.folder_id)));
                    setAvailableDashboards(relevantDashboards);

                    // Build breadcrumbs logic
                    const crumbs = [{ id: null, name: 'Espacio de Trabajo' }];
                    let current = folder;
                    const path = [];
                    while (current) {
                        path.unshift({ id: current.id, name: current.name });
                        current = folders.find((f: any) => f.id === current.parent_id);
                    }
                    setBreadcrumbs([...crumbs, ...path]);

                    // Initialize Public Link State
                    setPublicLinkState({
                        isPublic: !!folder.is_public,
                        token: folder.public_token || null
                    });
                }
            }

            // Set Tasks
            if (tasksRes.ok) {
                const tasksData = await tasksRes.json();
                setTasks(tasksData);
            }
        } catch (error) {
            showToast("Error al cargar datos", "error");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleShareAnalytics = async () => {
        setSharingLoading(true);
        try {
            const newStatus = !publicLinkState.isPublic;
            const res = await fetch(`/api/folders/${folderId}/share`, {
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
        setCopied(true);
        showToast("Enlace copiado", "success");
        setTimeout(() => setCopied(false), 2000);
    };

    // HELPER: Resolve status name, progress and color from Dashboard Settings
    const getStatusInfo = (task: any) => {
        const dashboard = availableDashboards.find(d => String(d.id) === String(task.dashboard_id));
        if (!dashboard || !dashboard.settings || !dashboard.settings.statuses) {
            return {
                name: task.status,
                progress: isTaskDone(task.status) ? 100 : 0,
                color: isTaskDone(task.status) ? '#10b981' : '#64748b'
            };
        }

        const columns = dashboard.settings.statuses;
        const colIndex = columns.findIndex((c: any) => c.id === task.status);

        if (colIndex === -1) {
            return {
                name: task.status,
                progress: isTaskDone(task.status) ? 100 : 0,
                color: isTaskDone(task.status) ? '#10b981' : '#64748b'
            };
        }

        const col = columns[colIndex];
        const name = col.name;
        // Should we use the specific task color? Yes.
        const color = col.color || '#64748b';

        // PROGRESS CALCULATION
        // Priority 1: Custom Percentage set by user
        if (typeof col.percentage === 'number') {
            return { name, progress: col.percentage, color };
        }

        // Priority 2: Default Proportional (0% to 100%)
        // If it's the last column, 100%. If first, 0%. Linear in between.
        if (columns.length <= 1) return { name, progress: 100, color };

        // Linear interpolation: index / (total - 1) * 100
        const proportional = Math.round((colIndex / (columns.length - 1)) * 100);
        return { name, progress: proportional, color };
    };

    // Filter logic
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            // Dashboard Filter
            if (filters.dashboardId !== 'all' && String(t.dashboard_id) !== String(filters.dashboardId)) return false;

            // Search (Name)
            if (filters.search && !t.name.toLowerCase().includes(filters.search.toLowerCase())) return false;

            // Status Filter (By Name)
            if (filters.status !== 'all') {
                const { name } = getStatusInfo(t);
                if (name !== filters.status) return false;
            }

            // Owner
            if (filters.owner !== 'all' && t.owner !== filters.owner) return false;

            // Type
            if (filters.type !== 'all' && t.type !== filters.type) return false;

            return true;
        });
    }, [tasks, filters, availableDashboards]);

    // CASCADING FILTERS LOGIC
    // 1. Base pool of tasks specific to the selected dashboard (Project)
    const tasksInSelectedDashboard = useMemo(() => {
        if (filters.dashboardId === 'all') return tasks;
        return tasks.filter(t => String(t.dashboard_id) === String(filters.dashboardId));
    }, [tasks, filters.dashboardId]);

    // 2. Derive filter options from this pool
    const uniqueDashboards = useMemo(() => {
        // Kept for reference or if needed, but filter uses availableDashboards state
        const map = new Map();
        tasks.forEach(t => map.set(t.dashboard_id, t.dashboard_name));
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [tasks]);

    const combinedDashboards = useMemo(() => {
        const map = new Map();
        // 1. First populate with derived data from tasks (fallback)
        uniqueDashboards.forEach(d => {
            if (d && d.id) {
                // Only set if not already present (though map.set would overwrite, order matters)
                // Actually, we want availableDashboards to OVERWRITE this if present.
                map.set(d.id, d.name || "Tablero (Datos Huerfanos)");
            }
        });
        // 2. Then overwrite with authoritative data from API (source of truth)
        availableDashboards.forEach(d => {
            if (d && d.id) map.set(d.id, d.name || "Tablero Sin Nombre");
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [availableDashboards, uniqueDashboards]);

    const uniqueStatuses = useMemo(() => {
        const s = new Set();
        tasksInSelectedDashboard.forEach(t => {
            const { name } = getStatusInfo(t);
            if (name) s.add(name);
        });
        return [...s];
    }, [tasksInSelectedDashboard, availableDashboards]);
    const uniqueOwners = useMemo(() => [...new Set(tasksInSelectedDashboard.map(t => t.owner).filter(Boolean))], [tasksInSelectedDashboard]);
    const uniqueTypes = useMemo(() => [...new Set(tasksInSelectedDashboard.map(t => t.type).filter(Boolean))], [tasksInSelectedDashboard]);

    // Tasks dropdown options also filtered by project
    const uniqueTasks = useMemo(() => {
        return tasksInSelectedDashboard.map(t => ({ id: t.id, name: t.name })).filter((v, i, a) => a.findIndex(t => t.name === v.name) === i);
    }, [tasksInSelectedDashboard]);

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner" style={{ width: 40, height: 40, border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-main)', padding: '24px 40px' }}>
            {/* Header */}
            <div style={{ maxWidth: 1200, margin: '0 auto', marginBottom: 32 }}>
                {/* Breadcrumbs */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>
                    {breadcrumbs.map((crumb, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                                onClick={() => crumb.id !== folderId && router.push(crumb.id ? `/` : '/')}
                                style={{
                                    cursor: crumb.id !== folderId ? 'pointer' : 'default',
                                    fontWeight: i === breadcrumbs.length - 1 ? 700 : 400,
                                    color: i === breadcrumbs.length - 1 ? 'var(--text-main)' : 'var(--text-dim)'
                                }}
                            >
                                {crumb.name}
                            </span>
                            {i < breadcrumbs.length - 1 && <span>/</span>}
                        </div>
                    ))}
                </div>

                {/* Title & Actions */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>Analítica Consolidada</h1>
                        <p style={{ fontSize: 14, color: 'var(--text-dim)', margin: '4px 0 0 0' }}>
                            Vista agregada de tableros en {folderName} (Incluyendo subcarpetas)
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button className="btn-ghost" onClick={loadData} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {loading ? "Cargando..." : "Refrescar"}
                        </button>
                        <button className="btn-ghost" onClick={() => router.push('/workspace')} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <ArrowLeft size={16} /> Volver
                        </button>
                        <div style={{ position: 'relative' }}>
                            <button
                                className="btn-primary"
                                onClick={handleShareAnalytics}
                                disabled={sharingLoading}
                                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                            >
                                <Share2 size={16} /> Compartir
                            </button>
                            {publicLinkState.isPublic && publicLinkState.token && (
                                <div className="animate-fade-in" style={{
                                    position: 'absolute', top: '100%', right: 0, marginTop: 8,
                                    background: 'var(--bg-panel)', border: '1px solid var(--border-dim)',
                                    borderRadius: 8, padding: 12, width: 320, zIndex: 50,
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>Enlace Público Activo</p>
                                        <button className="btn-ghost" onClick={() => setPublicLinkState({ isPublic: false, token: null })} style={{ padding: 2 }}>
                                            <X size={14} />
                                        </button>
                                    </div>
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
                                            {copied ? <Check size={12} /> : <Copy size={12} />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Toolbar - REORDERED */}
            <div style={{ maxWidth: 1200, margin: '0 auto', marginBottom: 32, padding: '16px 20px', background: 'var(--bg-panel)', borderRadius: 12, border: '1px solid var(--border-dim)' }}>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* 1. Proyecto (Custom Select) */}
                    <CustomSelect
                        value={filters.dashboardId}
                        onChange={(v: any) => setFilters(prev => ({ ...prev, dashboardId: v, search: '', status: 'all', owner: 'all', type: 'all' }))}
                        options={[
                            { value: 'all', label: 'Todos los Tableros' },
                            ...combinedDashboards.map(d => ({ value: d.id, label: d.name }))
                        ]}
                        placeholder="Todos los Tableros"
                    // icon={<div style={{ fontSize: 14 }}>📊</div>}
                    />

                    {/* 2. Tarea (Custom Select for Search) */}
                    <CustomSelect
                        value={filters.search}
                        onChange={(v: any) => setFilters(prev => ({ ...prev, search: v === 'all_tasks_default' ? '' : v }))}
                        options={[
                            { value: '', label: 'Todas las Tareas' },
                            ...uniqueTasks.map(t => ({ value: t.name, label: t.name }))
                        ]}
                        placeholder="Todas las Tareas"
                        flex={1}
                        minWidth={200}
                        icon={<Search size={14} />}
                    />

                    {/* 3. Estado (Custom Select) */}
                    <CustomSelect
                        value={filters.status}
                        onChange={(v: any) => setFilters(prev => ({ ...prev, status: v }))}
                        options={[
                            { value: 'all', label: 'Todos los Estados' },
                            ...uniqueStatuses.map(s => ({ value: s, label: s }))
                        ]}
                        placeholder="Todos los Estados"
                    />

                    {/* 4. Responsables (Custom Select) */}
                    <CustomSelect
                        value={filters.owner}
                        onChange={(v: any) => setFilters(prev => ({ ...prev, owner: v }))}
                        options={[
                            { value: 'all', label: 'Todos los Responsables' },
                            ...uniqueOwners.map(o => ({ value: o, label: o }))
                        ]}
                        placeholder="Todos los Responsables"
                    />

                    {/* 5. Tipos (Custom Select) */}
                    <CustomSelect
                        value={filters.type}
                        onChange={(v: any) => setFilters(prev => ({ ...prev, type: v }))}
                        options={[
                            { value: 'all', label: 'Todos los Tipos' },
                            ...uniqueTypes.map(t => ({ value: t, label: t }))
                        ]}
                        placeholder="Todos los Tipos"
                    />

                    {/* Clear Button */}
                    {(filters.search || filters.status !== 'all' || filters.owner !== 'all' || filters.dashboardId !== 'all' || filters.type !== 'all') && (
                        <button
                            className="btn-ghost"
                            onClick={() => setFilters({ search: '', status: 'all', owner: 'all', dashboardId: 'all', type: 'all' })}
                            style={{ fontSize: 12, color: 'var(--primary)' }}
                        >
                            Limpiar
                        </button>
                    )}
                </div>
            </div>

            {/* Analytics Content */}
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                {/* KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 32 }}>
                    <div className="glass-panel" style={{ padding: 24 }}>
                        <div className="kpi-label">Total Tareas</div>
                        <div className="kpi-value">{filteredTasks.length}</div>
                    </div>
                    <div className="glass-panel" style={{ padding: 24 }}>
                        <div className="kpi-label">Progreso Global</div>
                        <div className="kpi-value" style={{ color: '#10b981' }}>
                            {filteredTasks.length > 0 ? Math.round(
                                filteredTasks.reduce((acc, t) => acc + getStatusInfo(t).progress, 0) / filteredTasks.length
                            ) : 0}%
                        </div>
                    </div>
                    <div className="glass-panel" style={{ padding: 24 }}>
                        <div className="kpi-label">Tableros</div>
                        <div className="kpi-value">{filters.dashboardId === 'all' ? combinedDashboards.length : 1}</div>
                    </div>
                </div>

                {/* Charts */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
                    {/* Status Distribution */}
                    {/* Status Distribution */}
                    <div className="glass-panel" style={{ padding: 24 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, textTransform: 'uppercase', color: 'var(--text-dim)' }}>Estado Consolidado</h3>
                        <div style={{ height: 32, borderRadius: 16, overflow: 'hidden', display: 'flex', marginBottom: 20 }}>
                            {uniqueStatuses.map((s: any) => {
                                // Find representative color for this status name
                                const sampleTask = filteredTasks.find(t => getStatusInfo(t).name === s);
                                const { color } = sampleTask ? getStatusInfo(sampleTask) : { color: '#64748b' };

                                const count = filteredTasks.filter(t => getStatusInfo(t).name === s).length;
                                const pct = (count / filteredTasks.length) * 100;

                                if (count === 0) return null;
                                return <div key={s} style={{ width: `${pct}%`, background: color }} title={`${s}: ${count}`}></div>
                            })}
                        </div>
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                            {uniqueStatuses.map((s: any) => {
                                // Find representative color for this status name
                                const sampleTask = filteredTasks.find(t => getStatusInfo(t).name === s);
                                const { color } = sampleTask ? getStatusInfo(sampleTask) : { color: '#64748b' };

                                const count = filteredTasks.filter(t => getStatusInfo(t).name === s).length;

                                return (
                                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }}></div>
                                        <span style={{ fontSize: 13 }}>{s} ({count})</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Priority Volume */}
                    <div className="glass-panel" style={{ padding: 24 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, textTransform: 'uppercase', color: 'var(--text-dim)' }}>Volumen por Prioridad</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {['high', 'med', 'low'].map(p => {
                                const count = filteredTasks.filter(t => t.prio === p).length;
                                const labels: any = { high: 'Alta', med: 'Media', low: 'Baja' };
                                const colors: any = { high: '#ef4444', med: '#f59e0b', low: '#10b981' };
                                return (
                                    <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 60, fontSize: 13, fontWeight: 600 }}>{labels[p]}</div>
                                        <div style={{ flex: 1, height: 24, background: 'var(--panel-hover)', borderRadius: 4, overflow: 'hidden' }}>
                                            <div style={{ width: `${(count / filteredTasks.length) * 100}%`, height: '100%', background: colors[p], display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, fontSize: 11, fontWeight: 600, color: 'white' }}>
                                                {count > 0 && count}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Workload */}
                    <div className="glass-panel" style={{ padding: 24 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, textTransform: 'uppercase', color: 'var(--text-dim)' }}>Carga de Trabajo (Top 10)</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {Array.from(new Set(filteredTasks.map(t => t.owner))).slice(0, 10).map(o => {
                                const count = filteredTasks.filter(t => t.owner === o).length;
                                const max = Math.max(...Array.from(new Set(filteredTasks.map(t => t.owner))).map(ow => filteredTasks.filter(t => t.owner === ow).length));
                                return (
                                    <div key={o} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-gradient)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                                            {o?.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                                <span>{o}</span>
                                                <span>{count}</span>
                                            </div>
                                            <div style={{ height: 4, background: 'var(--panel-hover)', borderRadius: 2 }}>
                                                <div style={{ width: `${(count / max) * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: 2 }}></div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
            <style jsx>{`
                @media (max-width: 768px) {
                    .glass-panel { padding: 16px !important; }
                    .kpi-value { font-size: 24px !important; }
                    h1 { font-size: 24px !important; }
                }
            `}</style>
        </div>
    );
}
