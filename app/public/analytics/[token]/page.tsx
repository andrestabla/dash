"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { Shield, FolderOpen, ArrowLeft } from "lucide-react";
import Link from 'next/link';

export default function PublicAnalyticsPage() {
    const params = useParams();
    const token = params.token as string;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<{ folderName: string, tasks: any[] } | null>(null);

    // Helper for loose status matching (Same as internal)
    const isTaskDone = (status: string) => {
        if (!status) return false;
        const s = status.toLowerCase();
        return s === 'done' || s.includes('validado') || s.includes('final') || s.includes('complet') || s.includes('entregado') || s.includes('aprobado') || s.includes('closed');
    };

    // Filters State (Client-side)
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

    // Helper to get status info including color from task's dashboard settings
    const getStatusInfo = (task: any) => {
        const settings = task.dashboard_settings;

        if (!settings || !settings.statuses) {
            const isDone = isTaskDone(task.status);
            return {
                name: task.status,
                color: isDone ? '#10b981' : '#64748b',
                progress: isDone ? 100 : 0
            };
        }

        const columns = settings.statuses;
        const colIndex = columns.findIndex((c: any) => c.id === task.status);

        if (colIndex === -1) {
            const isDone = isTaskDone(task.status);
            return {
                name: task.status,
                color: isDone ? '#10b981' : '#64748b',
                progress: isDone ? 100 : 0
            };
        }

        const col = columns[colIndex];
        const name = col.name;
        const color = col.color || '#64748b';

        // Progress Logic
        let progress = 0;
        if (typeof col.percentage === 'number') {
            progress = col.percentage;
        } else {
            if (columns.length <= 1) progress = 100;
            else progress = Math.round((colIndex / (columns.length - 1)) * 100);
        }

        return { name, color, progress };
    };

    // --- FILTER LOGIC ---
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            const matchesSearch = t.name.toLowerCase().includes(filters.search.toLowerCase());
            const matchesStatus = filters.status === 'all' || t.status === filters.status;
            const matchesOwner = filters.owner === 'all' || t.owner === filters.owner;
            const matchesDash = filters.dashboardId === 'all' || String(t.dashboard_id) === String(filters.dashboardId);
            const matchesType = filters.type === 'all' || t.type === filters.type;
            return matchesSearch && matchesStatus && matchesOwner && matchesDash && matchesType;
        });
    }, [tasks, filters]);

    // Unique values
    const uniqueStatuses = useMemo(() => [...new Set(tasks.map(t => t.status).filter(Boolean))], [tasks]);
    const uniqueTypes = useMemo(() => [...new Set(tasks.map(t => t.type).filter(Boolean))], [tasks]);
    const uniqueOwners = useMemo(() => [...new Set(tasks.map(t => t.owner).filter(Boolean))], [tasks]);
    const uniqueDashboards = useMemo(() => {
        const map = new Map();
        tasks.forEach(t => map.set(t.dashboard_id, t.dashboard_name));
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [tasks]);


    if (loading) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', background: '#0f172a', color: 'white' }}>
            <div className="spinner" style={{ width: 40, height: 40, border: '4px solid rgba(255,255,255,0.1)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p style={{ marginTop: 20, opacity: 0.7 }}>Cargando analítica pública...</p>
            <style jsx global>{` @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } } `}</style>
        </div>
    );

    if (error) return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', background: '#0f172a', color: 'white' }}>
            <Shield size={64} color="#ef4444" style={{ marginBottom: 20 }} />
            <h1 style={{ fontSize: 24, fontWeight: 700 }}>Acceso no disponible</h1>
            <p style={{ opacity: 0.7, marginTop: 8 }}>{error}</p>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', fontFamily: 'Inter, sans-serif' }}>
            {/* Header */}
            <div style={{ padding: '24px 40px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1200, margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ background: 'var(--primary-gradient)', padding: 8, borderRadius: 8 }}>
                            <FolderOpen size={20} color="white" />
                        </div>
                        <div>
                            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{data?.folderName}</h1>
                            <p style={{ fontSize: 12, margin: 0, opacity: 0.6 }}>Analítica Consolidada (Vista Pública)</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div style={{ background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '16px 0' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 40px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <input
                        className="input-glass"
                        placeholder="Buscar..."
                        value={filters.search}
                        onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 12px', borderRadius: 8 }}
                    />
                    <select
                        value={filters.status}
                        onChange={e => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 12px', borderRadius: 8 }}
                    >
                        <option value="all">Todos los Estados</option>
                        {uniqueStatuses.map((s: any) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select
                        value={filters.owner}
                        onChange={e => setFilters(prev => ({ ...prev, owner: e.target.value }))}
                        style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 12px', borderRadius: 8 }}
                    >
                        <option value="all">Todos los Responsables</option>
                        {uniqueOwners.map((o: any) => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <select
                        value={filters.dashboardId}
                        onChange={e => setFilters(prev => ({ ...prev, dashboardId: e.target.value }))}
                        style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 12px', borderRadius: 8 }}
                    >
                        <option value="all">Todos los Proyectos</option>
                        {uniqueDashboards.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <select
                        value={filters.type}
                        onChange={e => setFilters(prev => ({ ...prev, type: e.target.value }))}
                        style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 12px', borderRadius: 8 }}
                    >
                        <option value="all">Todos los Tipos</option>
                        {uniqueTypes.map((t: any) => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
            </div>

            {/* Content */}
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 40 }}>
                    <div className="card" style={{ background: '#1e293b', padding: 20, borderRadius: 12 }}>
                        <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>Total Tareas</div>
                        <div style={{ fontSize: 32, fontWeight: 700, color: '#3b82f6' }}>{filteredTasks.length}</div>
                    </div>
                    <div className="card" style={{ background: '#1e293b', padding: 20, borderRadius: 12 }}>
                        <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>Progreso Global</div>
                        <div style={{ fontSize: 32, fontWeight: 700, color: '#10b981' }}>
                            {filteredTasks.length > 0 ? Math.round((filteredTasks.reduce((acc, t) => acc + getStatusInfo(t).progress, 0) / filteredTasks.length)) : 0}%
                        </div>
                    </div>
                    <div className="card" style={{ background: '#1e293b', padding: 20, borderRadius: 12 }}>
                        <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>Proyectos Activos</div>
                        <div style={{ fontSize: 32, fontWeight: 700, color: '#f59e0b' }}>
                            {new Set(filteredTasks.map(t => t.dashboard_id)).size}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
                    {/* Status Chart */}
                    <div style={{ background: '#1e293b', padding: 24, borderRadius: 16 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, textTransform: 'uppercase' }}>Estado Consolidado</h3>
                        <div style={{ height: 32, borderRadius: 16, overflow: 'hidden', display: 'flex', marginBottom: 20 }}>
                            {uniqueStatuses.map((s: any) => {
                                // Find representative color
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
                                // Find representative color
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

                    {/* Workload */}
                    <div style={{ background: '#1e293b', padding: 24, borderRadius: 16 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, textTransform: 'uppercase' }}>Carga de Trabajo</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {Array.from(new Set(filteredTasks.map(t => t.owner))).slice(0, 8).map(o => {
                                const count = filteredTasks.filter(t => t.owner === o).length;
                                const max = Math.max(...Array.from(new Set(filteredTasks.map(t => t.owner))).map(ow => filteredTasks.filter(t => t.owner === ow).length));
                                return (
                                    <div key={o} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#3b82f6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                                            {o?.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                                <span>{o}</span>
                                                <span>{count}</span>
                                            </div>
                                            <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                                                <div style={{ width: `${(count / max) * 100}%`, height: '100%', background: '#10b981', borderRadius: 2 }}></div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
