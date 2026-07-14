"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import { Shield, FolderOpen, Search, ExternalLink } from "lucide-react";

// Helper for loose status matching (shared with the internal analytics view)
const isTaskDone = (status: string) => {
    if (!status) return false;
    const s = status.toLowerCase();
    return s === 'done' || s.includes('validado') || s.includes('final') || s.includes('complet') || s.includes('entregado') || s.includes('aprobado') || s.includes('closed');
};

// Searchable combobox — same component the private analytics page uses so both
// views share an identical filter toolbar.
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

export default function PublicAnalyticsPage() {
    const params = useParams();
    const token = params.token as string;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<{ folderName: string, dashboards: any[], tasks: any[] } | null>(null);

    const [filters, setFilters] = useState({ search: '', status: 'all', owner: 'all', dashboardId: 'all', type: 'all' });

    useEffect(() => {
        if (!token) return;
        fetch(`/api/public/analytics/${token}`)
            .then(res => {
                if (!res.ok) throw new Error("No encontrado o acceso denegado");
                return res.json();
            })
            .then(d => {
                setData(d);
                setLoading(false);
            })
            .catch(err => {
                setError(err.message);
                setLoading(false);
            });
    }, [token]);

    const tasks = data?.tasks || [];
    const availableDashboards = data?.dashboards || [];

    // Resolve status name, progress and color from the task's dashboard settings.
    const getStatusInfo = (task: any) => {
        const settings = task.dashboard_settings;

        if (!settings || !settings.statuses) {
            const isDone = isTaskDone(task.status);
            return { name: task.status, color: isDone ? '#10b981' : '#64748b', progress: isDone ? 100 : 0 };
        }

        const columns = settings.statuses;
        const colIndex = columns.findIndex((c: any) => c.id === task.status);

        if (colIndex === -1) {
            const isDone = isTaskDone(task.status);
            return { name: task.status, color: isDone ? '#10b981' : '#64748b', progress: isDone ? 100 : 0 };
        }

        const col = columns[colIndex];
        const name = col.name;
        const color = col.color || '#64748b';

        let progress = 0;
        if (typeof col.percentage === 'number') {
            progress = col.percentage;
        } else if (columns.length <= 1) {
            progress = 100;
        } else {
            progress = Math.round((colIndex / (columns.length - 1)) * 100);
        }

        return { name, color, progress };
    };

    // --- FILTER LOGIC ---
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            if (filters.dashboardId !== 'all' && String(t.dashboard_id) !== String(filters.dashboardId)) return false;
            if (filters.search && !t.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
            if (filters.status !== 'all') {
                const { name } = getStatusInfo(t);
                if (name !== filters.status) return false;
            }
            if (filters.owner !== 'all') {
                const hasAssignee = t.assignees?.some((a: any) => a.name === filters.owner) || t.owner === filters.owner;
                if (!hasAssignee) return false;
            }
            if (filters.type !== 'all' && t.type !== filters.type) return false;
            return true;
        });
    }, [tasks, filters]);

    // CASCADING FILTERS — options narrow to the selected project.
    const tasksInSelectedDashboard = useMemo(() => {
        if (filters.dashboardId === 'all') return tasks;
        return tasks.filter(t => String(t.dashboard_id) === String(filters.dashboardId));
    }, [tasks, filters.dashboardId]);

    // Dashboards derived from the authoritative API list, with task-derived
    // fallback so orphan tasks still surface a project option.
    const combinedDashboards = useMemo(() => {
        const map = new Map<string, any>();
        tasks.forEach(t => {
            if (t.dashboard_id && !map.has(String(t.dashboard_id))) {
                map.set(String(t.dashboard_id), { id: t.dashboard_id, name: t.dashboard_name || "Tablero" });
            }
        });
        availableDashboards.forEach(d => {
            if (d && d.id) map.set(String(d.id), d);
        });
        return Array.from(map.values());
    }, [availableDashboards, tasks]);

    const uniqueStatuses = useMemo(() => {
        const s = new Set<string>();
        tasksInSelectedDashboard.forEach(t => {
            const { name } = getStatusInfo(t);
            if (name) s.add(name);
        });
        return Array.from(s);
    }, [tasksInSelectedDashboard]);

    const uniqueOwners = useMemo(() => {
        const owners = new Set<string>();
        tasksInSelectedDashboard.forEach(t => {
            if (t.owner) owners.add(t.owner);
            if (Array.isArray(t.assignees)) t.assignees.forEach((a: any) => owners.add(a.name));
        });
        return Array.from(owners);
    }, [tasksInSelectedDashboard]);

    const uniqueTypes = useMemo(() => [...new Set(tasksInSelectedDashboard.map(t => t.type).filter(Boolean))], [tasksInSelectedDashboard]);

    const uniqueTasks = useMemo(() => {
        return tasksInSelectedDashboard
            .map(t => ({ id: t.id, name: t.name }))
            .filter((v, i, a) => a.findIndex(t => t.name === v.name) === i);
    }, [tasksInSelectedDashboard]);

    if (loading) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
            <div className="spinner" style={{ width: 40, height: 40, border: '4px solid var(--border-dim)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ marginTop: 20, opacity: 0.7 }}>Cargando analítica pública...</p>
            <style jsx global>{` @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } `}</style>
        </div>
    );

    if (error) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
            <Shield size={64} color="#ef4444" style={{ marginBottom: 20 }} />
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>Acceso no disponible</h1>
            <p style={{ opacity: 0.7, marginTop: 8 }}>{error}</p>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
            {/* Header */}
            <div className="pa-header" style={{ padding: '24px 40px', borderBottom: '1px solid var(--border-dim)', background: 'var(--bg-panel)', position: 'sticky', top: 0, zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1200, margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ background: 'var(--primary-gradient)', padding: 8, borderRadius: 8, display: 'flex' }}>
                            <FolderOpen size={20} color="white" />
                        </div>
                        <div>
                            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{data?.folderName}</h1>
                            <p style={{ fontSize: 12, margin: 0, color: 'var(--text-dim)' }}>Analítica Consolidada (Vista Pública)</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div style={{ background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-dim)', padding: '16px 0' }}>
                <div className="pa-toolbar" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* 1. Proyecto */}
                    <CustomSelect
                        value={filters.dashboardId}
                        onChange={(v: any) => setFilters(prev => ({ ...prev, dashboardId: v, search: '', status: 'all', owner: 'all', type: 'all' }))}
                        options={[
                            { value: 'all', label: 'Todos los Tableros' },
                            ...combinedDashboards.map(d => ({ value: d.id, label: d.name }))
                        ]}
                        placeholder="Todos los Tableros"
                    />
                    {/* 2. Tarea (búsqueda) */}
                    <CustomSelect
                        value={filters.search}
                        onChange={(v: any) => setFilters(prev => ({ ...prev, search: v === 'all' ? '' : v }))}
                        options={[
                            { value: '', label: 'Todas las Tareas' },
                            ...uniqueTasks.map(t => ({ value: t.name, label: t.name }))
                        ]}
                        placeholder="Todas las Tareas"
                        flex={1}
                        minWidth={200}
                        icon={<Search size={14} />}
                    />
                    {/* 3. Estado */}
                    <CustomSelect
                        value={filters.status}
                        onChange={(v: any) => setFilters(prev => ({ ...prev, status: v }))}
                        options={[
                            { value: 'all', label: 'Todos los Estados' },
                            ...uniqueStatuses.map(s => ({ value: s, label: s }))
                        ]}
                        placeholder="Todos los Estados"
                    />
                    {/* 4. Responsables */}
                    <CustomSelect
                        value={filters.owner}
                        onChange={(v: any) => setFilters(prev => ({ ...prev, owner: v }))}
                        options={[
                            { value: 'all', label: 'Todos los Responsables' },
                            ...uniqueOwners.map(o => ({ value: o, label: o }))
                        ]}
                        placeholder="Todos los Responsables"
                    />
                    {/* 5. Tipos */}
                    <CustomSelect
                        value={filters.type}
                        onChange={(v: any) => setFilters(prev => ({ ...prev, type: v }))}
                        options={[
                            { value: 'all', label: 'Todos los Tipos' },
                            ...uniqueTypes.map(t => ({ value: t, label: t }))
                        ]}
                        placeholder="Todos los Tipos"
                    />
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

            {/* Content */}
            <div className="pa-content" style={{ maxWidth: 1200, margin: '0 auto', padding: '40px' }}>
                {/* KPIs */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 32 }}>
                    <div className="glass-panel" style={{ padding: 24 }}>
                        <div className="kpi-label">Total Tareas</div>
                        <div className="kpi-value">{filteredTasks.length}</div>
                    </div>
                    <div className="glass-panel" style={{ padding: 24 }}>
                        <div className="kpi-label">Progreso Global</div>
                        <div className="kpi-value" style={{ color: '#10b981' }}>
                            {filteredTasks.length > 0 ? Math.round(filteredTasks.reduce((acc, t) => acc + getStatusInfo(t).progress, 0) / filteredTasks.length) : 0}%
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
                    <div className="glass-panel" style={{ padding: 24 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, textTransform: 'uppercase', color: 'var(--text-dim)' }}>Estado Consolidado</h3>
                        <div style={{ height: 32, borderRadius: 16, overflow: 'hidden', display: 'flex', marginBottom: 20 }}>
                            {uniqueStatuses.map((s: any) => {
                                const sampleTask = filteredTasks.find(t => getStatusInfo(t).name === s);
                                const { color } = sampleTask ? getStatusInfo(sampleTask) : { color: '#64748b' };
                                const count = filteredTasks.filter(t => getStatusInfo(t).name === s).length;
                                const pct = filteredTasks.length > 0 ? (count / filteredTasks.length) * 100 : 0;
                                if (count === 0) return null;
                                return <div key={s} style={{ width: `${pct}%`, background: color }} title={`${s}: ${count}`}></div>;
                            })}
                        </div>
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                            {uniqueStatuses.map((s: any) => {
                                const sampleTask = filteredTasks.find(t => getStatusInfo(t).name === s);
                                const { color } = sampleTask ? getStatusInfo(sampleTask) : { color: '#64748b' };
                                const count = filteredTasks.filter(t => getStatusInfo(t).name === s).length;
                                return (
                                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }}></div>
                                        <span style={{ fontSize: 13 }}>{s} ({count})</span>
                                    </div>
                                );
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
                                            <div style={{ width: `${filteredTasks.length > 0 ? (count / filteredTasks.length) * 100 : 0}%`, height: '100%', background: colors[p], display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8, fontSize: 11, fontWeight: 600, color: 'white' }}>
                                                {count > 0 && count}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Workload */}
                    <div className="glass-panel" style={{ padding: 24 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, textTransform: 'uppercase', color: 'var(--text-dim)' }}>Carga de Trabajo (Top 10)</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {(() => {
                                const workloadMap = new Map<string, number>();
                                filteredTasks.forEach(t => {
                                    if (t.assignees && t.assignees.length > 0) {
                                        t.assignees.forEach((a: any) => workloadMap.set(a.name, (workloadMap.get(a.name) || 0) + 1));
                                    } else if (t.owner) {
                                        workloadMap.set(t.owner, (workloadMap.get(t.owner) || 0) + 1);
                                    }
                                });
                                const sortedWorkload = Array.from(workloadMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);
                                const max = sortedWorkload.length > 0 ? sortedWorkload[0][1] : 1;
                                return sortedWorkload.map(([o, count]) => (
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
                                ));
                            })()}
                        </div>
                    </div>
                </div>

                {/* Dashboard Table */}
                <div className="glass-panel" style={{ padding: 24, marginTop: 32 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, textTransform: 'uppercase', color: 'var(--text-dim)' }}>
                        Lista de Tableros
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-dim)' }}>
                                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 13, fontWeight: 600, color: 'var(--text-dim)' }}>Tablero</th>
                                    <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: 13, fontWeight: 600, color: 'var(--text-dim)' }}>Tareas</th>
                                    <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: 13, fontWeight: 600, color: 'var(--text-dim)' }}>Progreso</th>
                                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: 13, fontWeight: 600, color: 'var(--text-dim)' }}>Propietario</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    const dashboardsToShow = filters.dashboardId === 'all'
                                        ? combinedDashboards
                                        : combinedDashboards.filter(d => String(d.id) === String(filters.dashboardId));

                                    if (dashboardsToShow.length === 0) {
                                        return (
                                            <tr>
                                                <td colSpan={4} style={{ textAlign: 'center', padding: 24, color: 'var(--text-dim)', fontSize: 13 }}>
                                                    No hay tableros disponibles
                                                </td>
                                            </tr>
                                        );
                                    }

                                    return dashboardsToShow.map((dashboard: any) => {
                                        const dashboardTasks = tasks.filter(t => String(t.dashboard_id) === String(dashboard.id));
                                        const avgProgress = dashboardTasks.length > 0
                                            ? Math.round(dashboardTasks.reduce((acc, t) => acc + getStatusInfo(t).progress, 0) / dashboardTasks.length)
                                            : 0;
                                        // Each board links to its OWN public version when the owner has
                                        // published it; otherwise it stays a plain (unpublished) label.
                                        const isBoardPublic = dashboard.is_public && dashboard.public_token;

                                        return (
                                            <tr key={dashboard.id} style={{ borderBottom: '1px solid var(--border-dim)', transition: 'background 0.2s' }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--panel-hover)'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <td style={{ padding: '12px 8px' }}>
                                                    {isBoardPublic ? (
                                                        <a
                                                            href={`/public/board/${dashboard.public_token}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{
                                                                color: 'var(--primary)', fontSize: 14, fontWeight: 600,
                                                                textDecoration: 'underline', textDecorationStyle: 'dotted',
                                                                display: 'inline-flex', alignItems: 'center', gap: 6
                                                            }}
                                                        >
                                                            {dashboard.name || 'Sin nombre'}
                                                            <ExternalLink size={12} />
                                                        </a>
                                                    ) : (
                                                        <span style={{ fontSize: 14, fontWeight: 600 }}>
                                                            {dashboard.name || 'Sin nombre'}
                                                            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic' }}>
                                                                (no publicado)
                                                            </span>
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ textAlign: 'center', padding: '12px 8px', fontSize: 13 }}>
                                                    {dashboardTasks.length}
                                                </td>
                                                <td style={{ textAlign: 'center', padding: '12px 8px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                                        <div style={{ flex: 1, maxWidth: 100, height: 6, background: 'var(--panel-hover)', borderRadius: 3, overflow: 'hidden' }}>
                                                            <div style={{ width: `${avgProgress}%`, height: '100%', background: avgProgress === 100 ? '#10b981' : 'var(--primary)', borderRadius: 3 }}></div>
                                                        </div>
                                                        <span style={{ fontSize: 12, fontWeight: 600, minWidth: 35 }}>{avgProgress}%</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '12px 8px', fontSize: 13 }}>
                                                    {dashboard.owner_name || 'N/A'}
                                                </td>
                                            </tr>
                                        );
                                    });
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @media (max-width: 768px) {
                    .glass-panel { padding: 16px !important; }
                    .kpi-value { font-size: 24px !important; }
                    h1 { font-size: 20px !important; }
                    /* Trim the generous desktop padding so content isn't cramped */
                    .pa-header { padding: 16px !important; }
                    .pa-toolbar { padding: 0 16px !important; }
                    .pa-content { padding: 20px 16px !important; }
                    .pa-toolbar > :global(*) { flex: 1 1 100%; min-width: 0 !important; }
                }
            `}</style>
        </div>
    );
}
