"use client";

import { useState, useEffect } from "react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Dashboard {
    id: string;
    name: string;
    description: string;
    created_at: string;
    settings: any;
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
    owners: ["Andrés Tabla (Metodólogo)", "Carmenza Alarcón (Cliente)"],
    types: ["Gestión", "Inventario", "Metodología", "Evaluación", "Producción", "Comité", "IP-Ready"],
    gates: ["A", "B", "C", "D"],
    icon: "🗺️",
    color: "#3b82f6"
};

const ICONS = ["🗺️", "🚀", "💻", "🎨", "📈", "📅", "🔥", "⚙️", "📱", "🌐"];
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#64748b"];

export default function Workspace() {
    const [dashboards, setDashboards] = useState<Dashboard[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const router = useRouter();

    // Wizard State
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

    // Editing State
    const [editingDash, setEditingDash] = useState<Dashboard | null>(null);

    const loadDashboards = () => {
        fetch('/api/dashboards')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setDashboards(data);
            })
            .catch(err => console.error(err));
    };

    const generateWeeks = (count: number) => {
        return Array.from({ length: count }, (_, i) => ({
            id: `W${i + 1}`,
            name: `W${i + 1} · Semana ${i + 1}`
        }));
    };

    const handleSave = async () => {
        const isEdit = !!editingDash;
        if (!wizName.trim()) return;

        const currentSettings = isEdit ? editingDash.settings : DEFAULT_SETTINGS;

        const finalSettings = {
            weeks: isEdit ? currentSettings.weeks : generateWeeks(wizWeeks),
            owners: wizOwners.length > 0 ? wizOwners : ["Sin Asignar"],
            types: wizTypes.length > 0 ? wizTypes : ["General"],
            gates: wizGates,
            icon: wizIcon,
            color: wizColor
        };

        const payload = isEdit ? {
            id: editingDash.id,
            name: wizName,
            description: wizDesc,
            settings: { ...editingDash.settings, icon: wizIcon, color: wizColor, name: wizName }
        } : {
            name: wizName,
            description: wizDesc,
            settings: finalSettings
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
                    router.push(`/board/${dash.id}`);
                }
                resetWizard();
            }
        } catch (err) {
            alert("Error guardando tablero");
        }
    };

    const startCreate = () => {
        resetWizard();
        setIsCreating(true);
    };

    const startEdit = (e: React.MouseEvent, d: Dashboard) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingDash(d);
        setWizName(d.name);
        setWizDesc(d.description);
        setWizIcon(d.settings.icon || "🗺️");
        setWizColor(d.settings.color || "#3b82f6");
        setIsCreating(true);
    };

    const deleteDash = async (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm("⚠️ ¿Eliminar este tablero y TODAS sus tareas? Esta acción no se puede deshacer.")) return;

        try {
            await fetch(`/api/dashboards?id=${id}`, { method: 'DELETE' });
            setDashboards(dashboards.filter(d => d.id !== id));
        } catch (err) {
            alert("Error eliminando");
        }
    };

    const resetWizard = () => {
        setIsCreating(false);
        setEditingDash(null);
        setWizardStep(1);
        setWizName("");
        setWizDesc("");
        setWizWeeks(9);
        setWizOwners(["Andrés Tabla"]);
        setWizTypes(DEFAULT_SETTINGS.types);
        setWizGates(DEFAULT_SETTINGS.gates);
        setWizIcon("🗺️");
        setWizColor("#3b82f6");
    };

    const addItem = (list: string[], setList: any, item: string, setItem: any) => {
        if (item.trim()) {
            setList([...list, item.trim()]);
            setItem("");
        }
    };

    const removeItem = (list: string[], setList: any, idx: number) => {
        setList(list.filter((_, i) => i !== idx));
    };

    const [showLogout, setShowLogout] = useState(false);
    const [user, setUser] = useState<any>(null);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
    };

    useEffect(() => {
        loadDashboards();
        fetch('/api/auth/me').then(res => res.json()).then(data => setUser(data.user));
    }, []);

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
            <header style={{ marginBottom: 40, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }} className="text-gradient">Espacio de Trabajo</h1>
                    <p style={{ color: 'var(--text-dim)', margin: '8px 0 0 0' }}>Tus proyectos estratégicos en un solo lugar</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    {user?.role === 'admin' && (
                        <Link href="/admin/users" style={{ textDecoration: 'none' }}>
                            <button className="btn-ghost" title="Panel de Admin" style={{ color: 'var(--primary-gradient)' }}>
                                🛡️
                            </button>
                        </Link>
                    )}

                    <Link href="/profile">
                        <button className="btn-ghost" title="Mi Perfil y Tema">
                            👤
                        </button>
                    </Link>

                    <button className="btn-ghost" onClick={() => setShowLogout(true)} title="Cerrar Sesión">
                        🛑
                    </button>

                    <button className="btn-primary" onClick={startCreate}>
                        + Nuevo Proyecto
                    </button>
                </div>
            </header>

            {/* Logout Modal */}
            {showLogout && (
                <div className="backdrop">
                    <div className="glass-panel animate-slide-up" style={{ padding: 32, width: 400, textAlign: 'center' }}>
                        <h2 style={{ marginTop: 0, marginBottom: 12 }}>¿Cerrar Sesión?</h2>
                        <p style={{ color: 'var(--text-dim)', marginBottom: 32 }}>Tendrás que ingresar tus credenciales para volver a entrar.</p>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button className="btn-ghost" onClick={() => setShowLogout(false)}>Cancelar</button>
                            <button className="btn-primary" onClick={handleLogout} style={{ background: 'var(--danger-gradient)', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)' }}>Sí, Salir</button>
                        </div>
                    </div>
                </div>
            )}

            {isCreating && (
                <div className="backdrop">
                    <div className="glass-panel animate-slide-up" style={{ padding: 0, width: 700, overflow: 'hidden' }}>
                        <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
                            <h2 style={{ margin: 0, fontSize: 20 }}>{editingDash ? "Editar Tablero" : `Nuevo Proyecto (${wizardStep}/4)`}</h2>
                            <button className="btn-ghost" onClick={resetWizard} style={{ padding: 4 }}>✕</button>
                        </div>

                        <div style={{ padding: 32 }}>
                            {/* STEP 1: Basic Info & Visuals */}
                            {(wizardStep === 1 || editingDash) && (
                                <div>
                                    <div style={{ marginBottom: 24 }}>
                                        <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Nombre del Proyecto</label>
                                        <input className="input-glass" value={wizName} onChange={e => setWizName(e.target.value)} autoFocus placeholder="Ej: Lanzamiento 2026" />
                                    </div>

                                    <div style={{ marginBottom: 24 }}>
                                        <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Descripción</label>
                                        <input className="input-glass" value={wizDesc} onChange={e => setWizDesc(e.target.value)} placeholder="Breve resumen..." />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: 12, fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Ícono</label>
                                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                                {ICONS.map(ic => (
                                                    <div key={ic} onClick={() => setWizIcon(ic)} style={{ cursor: 'pointer', padding: 10, borderRadius: 8, background: wizIcon === ic ? 'var(--primary-gradient)' : 'rgba(255,255,255,0.05)', transition: 'all 0.2s' }}>{ic}</div>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: 12, fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Color Principal</label>
                                            <div style={{ display: 'flex', gap: 12 }}>
                                                {COLORS.map(c => (
                                                    <div key={c} onClick={() => setWizColor(c)} style={{ width: 32, height: 32, borderRadius: '50%', background: c, cursor: 'pointer', boxShadow: wizColor === c ? `0 0 0 3px var(--bg-card), 0 0 0 5px ${c}` : 'none', transition: 'all 0.2s' }}></div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* STEPS 2-4: Only for Creation */}
                            {!editingDash && wizardStep === 2 && (
                                <div className="wiz-step">
                                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Duración (Semanas)</label>
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                        <input type="range" min="4" max="52" value={wizWeeks} onChange={e => setWizWeeks(Number(e.target.value))} style={{ flex: 1 }} />
                                        <span style={{ fontWeight: 700, fontSize: 18, width: 40, textAlign: 'center' }}>{wizWeeks}</span>
                                    </div>
                                    <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>
                                        Se generarán {wizWeeks} semanas (W1 - W{wizWeeks}).
                                    </p>
                                </div>
                            )}

                            {!editingDash && wizardStep === 3 && (
                                <div className="wiz-step">
                                    <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Equipo (Responsables)</label>
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                                        <input value={newOwner} onChange={e => setNewOwner(e.target.value)} placeholder="Nombre..." style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid var(--border)' }} onKeyDown={e => e.key === 'Enter' && addItem(wizOwners, setWizOwners, newOwner, setNewOwner)} />
                                        <button className="btn-ghost" onClick={() => addItem(wizOwners, setWizOwners, newOwner, setNewOwner)}>➕</button>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 150, overflowY: 'auto' }}>
                                        {wizOwners.map((o, i) => (
                                            <div key={i} style={{ background: 'var(--panel-hover)', padding: '4px 10px', borderRadius: 20, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {o} <span style={{ cursor: 'pointer', opacity: 0.5 }} onClick={() => removeItem(wizOwners, setWizOwners, i)}>✕</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {!editingDash && wizardStep === 4 && (
                                <div className="wiz-step" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Tipos</label>
                                        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                                            <input value={newType} onChange={e => setNewType(e.target.value)} placeholder="Tipo..." style={{ flex: 1, padding: 6, borderRadius: 4, border: '1px solid var(--border)' }} onKeyDown={e => e.key === 'Enter' && addItem(wizTypes, setWizTypes, newType, setNewType)} />
                                            <button className="btn-ghost" onClick={() => addItem(wizTypes, setWizTypes, newType, setNewType)}>➕</button>
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
                                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Gates</label>
                                        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                                            <input value={newGate} onChange={e => setNewGate(e.target.value)} placeholder="Gate..." style={{ flex: 1, padding: 6, borderRadius: 4, border: '1px solid var(--border)' }} onKeyDown={e => e.key === 'Enter' && addItem(wizGates, setWizGates, newGate, setNewGate)} />
                                            <button className="btn-ghost" onClick={() => addItem(wizGates, setWizGates, newGate, setNewGate)}>➕</button>
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

                        <div style={{ padding: '20px 32px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end', gap: 12, background: 'rgba(0,0,0,0.2)' }}>
                            {!editingDash && wizardStep > 1 && <button className="btn-ghost" onClick={() => setWizardStep(s => s - 1)}>Atrás</button>}
                            {!editingDash && wizardStep < 4 && <button className="btn-primary" onClick={() => setWizardStep(s => s + 1)} disabled={!wizName}>Siguiente</button>}
                            {!editingDash && wizardStep === 4 && <button className="btn-primary" onClick={handleSave} disabled={wizOwners.length === 0}>✨ Crear Tablero</button>}
                            {editingDash && <button className="btn-primary" onClick={handleSave}>Guardar Cambios</button>}
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
                {dashboards.map(d => (
                    <Link href={`/board/${d.id}`} key={d.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="glass-panel hover-lift" style={{
                            padding: 24,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            borderTop: `4px solid ${d.settings?.color || '#3b82f6'}`
                        }}>
                            <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
                                <button className="btn-ghost" onClick={(e) => startEdit(e, d)} style={{ padding: 6, fontSize: 14 }}>✏️</button>
                                <button className="btn-ghost" onClick={(e) => deleteDash(e, d.id)} style={{ padding: 6, fontSize: 14, color: '#f87171' }}>🗑️</button>
                            </div>

                            <div style={{ fontSize: 48, marginBottom: 16 }}>{d.settings?.icon || "🗺️"}</div>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: 20 }}>{d.name}</h3>
                            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-dim)', flex: 1, lineHeight: 1.5 }}>
                                {d.description || "Sin descripción"}
                            </p>

                            <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 12, color: 'var(--text-dim)', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Actualizado: {new Date(d.created_at).toLocaleDateString()}</span>
                                <span style={{ fontWeight: 600, color: d.settings?.color || 'white' }}>Abrir →</span>
                            </div>
                        </div>
                    </Link>
                ))}

                {dashboards.length === 0 && !isCreating && (
                    <div className="glass-panel" style={{ gridColumn: '1/-1', textAlign: 'center', padding: 80, color: 'var(--text-dim)', border: '2px dashed rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>📂</div>
                        <h3 style={{ color: 'var(--text-main)' }}>No hay proyectos activos</h3>
                        <p>Comienza creando tu primer tablero estratégico.</p>
                        <button className="btn-primary" onClick={startCreate} style={{ marginTop: 20 }}>+ Crear Proyecto</button>
                    </div>
                )}
            </div>
        </div>
    );
}
