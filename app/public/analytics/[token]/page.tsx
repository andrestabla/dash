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

    // Filters State (Client-side)
    const [filters, setFilters] = useState({ search: '', status: 'all', owner: 'all', dashboardId: 'all' });

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

    // --- FILTER LOGIC ---
    const filteredTasks = useMemo(() => {
        return tasks.filter(t => {
            const matchesSearch = t.name.toLowerCase().includes(filters.search.toLowerCase());
            const matchesStatus = filters.status === 'all' || t.status === filters.status;
            const matchesOwner = filters.owner === 'all' || t.owner === filters.owner; // t.owner is name string in API response
            const matchesDash = filters.dashboardId === 'all' || String(t.dashboard_id) === String(filters.dashboardId);
            return matchesSearch && matchesStatus && matchesOwner && matchesDash;
        });
    }, [tasks, filters]);

    // Unique values
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
                        <option value="todo">Pendiente</option>
                        <option value="doing">En Proceso</option>
                        <option value="review">Revisión</option>
                        <option value="done">Hecho</option>
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
                            {filteredTasks.length > 0 ? Math.round((filteredTasks.filter(t => t.status === 'done').length / filteredTasks.length) * 100) : 0}%
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
                            {['done', 'doing', 'review', 'todo'].map(s => {
                                const count = filteredTasks.filter(t => t.status === s).length;
                                const pct = (count / filteredTasks.length) * 100;
                                const colors: any = { done: '#10b981', doing: '#3b82f6', review: '#f59e0b', todo: '#64748b' };
                                if (count === 0) return null;
                                return <div key={s} style={{ width: `${pct}%`, background: colors[s] }} title={`${s}: ${count}`}></div>
                            })}
                        </div>
                        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                            {/* Legend items similar to main app */}
                            {[{ l: 'Hecho', c: '#10b981', k: 'done' }, { l: 'En Progreso', c: '#3b82f6', k: 'doing' }, { l: 'Pendiente', c: '#64748b', k: 'todo' }].map(i => (
                                <div key={i.k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: i.c }}></div>
                                    <span style={{ fontSize: 13 }}>{i.l} ({filteredTasks.filter(t => t.status === i.k).length})</span>
                                </div>
                            ))}
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
