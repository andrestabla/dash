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
    gates: ["A", "B", "C", "D"]
};

export default function Workspace() {
    const [dashboards, setDashboards] = useState<Dashboard[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const router = useRouter();

    // Wizard State
    const [wizName, setWizName] = useState("");
    const [wizDesc, setWizDesc] = useState("");
    const [wizWeeks, setWizWeeks] = useState(9); // Count of weeks
    const [wizOwners, setWizOwners] = useState<string[]>(["Andrés Tabla"]);
    const [newOwner, setNewOwner] = useState("");

    useEffect(() => {
        fetch('/api/dashboards')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setDashboards(data);
            })
            .catch(err => console.error(err));
    }, []);

    const generateWeeks = (count: number) => {
        return Array.from({ length: count }, (_, i) => ({
            id: `W${i + 1}`,
            name: `W${i + 1} · Semana ${i + 1}`
        }));
    };

    const createDashboard = async () => {
        if (!wizName.trim()) return;

        const finalSettings = {
            ...DEFAULT_SETTINGS,
            weeks: generateWeeks(wizWeeks),
            owners: wizOwners.length > 0 ? wizOwners : DEFAULT_SETTINGS.owners
        };

        try {
            const res = await fetch('/api/dashboards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: wizName,
                    description: wizDesc,
                    settings: finalSettings
                })
            });
            if (res.ok) {
                const dash = await res.json();
                setDashboards([dash, ...dashboards]);
                resetWizard();
                router.push(`/board/${dash.id}`);
            }
        } catch (err) {
            alert("Error creando tablero");
        }
    };

    const resetWizard = () => {
        setIsCreating(false);
        setWizardStep(1);
        setWizName("");
        setWizDesc("");
        setWizWeeks(9);
        setWizOwners(["Andrés Tabla"]);
    };

    const addOwner = () => {
        if (newOwner.trim()) {
            setWizOwners([...wizOwners, newOwner.trim()]);
            setNewOwner("");
        }
    };

    const removeOwner = (idx: number) => {
        setWizOwners(wizOwners.filter((_, i) => i !== idx));
    };

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: 40 }}>
            <header style={{ marginBottom: 40, borderBottom: '1px solid var(--border)', paddingBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>🗂️ Tu Espacio de Trabajo</h1>
                    <p style={{ color: 'var(--text-dim)', margin: '4px 0 0 0' }}>Gestiona tus roadmaps y proyectos</p>
                </div>
                <button className="btn-primary" onClick={() => setIsCreating(true)}>
                    + Nuevo Tablero
                </button>
            </header>

            {isCreating && (
                <div className="wizard-modal" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'var(--panel)', padding: 30, borderRadius: 16, width: 500, border: '1px solid var(--border)', boxShadow: '0 20px 50px rgba(0,0,0,0.3)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h2 style={{ margin: 0 }}>Nuevo Proyecto ({wizardStep}/3)</h2>
                            <button className="btn-ghost" onClick={resetWizard}>✕</button>
                        </div>

                        {wizardStep === 1 && (
                            <div className="wiz-step">
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Nombre del Proyecto</label>
                                <input value={wizName} onChange={e => setWizName(e.target.value)} autoFocus style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border)', marginBottom: 16 }} placeholder="Ej: Lanzamiento 2026" />

                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Descripción (Opcional)</label>
                                <input value={wizDesc} onChange={e => setWizDesc(e.target.value)} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }} placeholder="Breve resumen..." />
                            </div>
                        )}

                        {wizardStep === 2 && (
                            <div className="wiz-step">
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Duración (Semanas)</label>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                    <input type="range" min="4" max="52" value={wizWeeks} onChange={e => setWizWeeks(Number(e.target.value))} style={{ flex: 1 }} />
                                    <span style={{ fontWeight: 700, fontSize: 18, width: 40, textAlign: 'center' }}>{wizWeeks}</span>
                                </div>
                                <p style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>
                                    Se generarán {wizWeeks} semanas (W1 - W{wizWeeks}). Podrás editar sus nombres después.
                                </p>
                            </div>
                        )}

                        {wizardStep === 3 && (
                            <div className="wiz-step">
                                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Equipo (Responsables)</label>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                                    <input value={newOwner} onChange={e => setNewOwner(e.target.value)} placeholder="Nombre..." style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid var(--border)' }} onKeyDown={e => e.key === 'Enter' && addOwner()} />
                                    <button className="btn-ghost" onClick={addOwner}>➕</button>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {wizOwners.map((o, i) => (
                                        <div key={i} style={{ background: 'var(--panel-hover)', padding: '4px 10px', borderRadius: 20, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {o} <span style={{ cursor: 'pointer', opacity: 0.5 }} onClick={() => removeOwner(i)}>✕</span>
                                        </div>
                                    ))}
                                    {wizOwners.length === 0 && <span style={{ fontSize: 12, color: 'var(--danger)' }}>Añade al menos uno</span>}
                                </div>
                            </div>
                        )}

                        <div className="wiz-footer" style={{ marginTop: 30, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            {wizardStep > 1 && <button className="btn-ghost" onClick={() => setWizardStep(s => s - 1)}>Atrás</button>}
                            {wizardStep < 3 && <button className="btn-primary" onClick={() => setWizardStep(s => s + 1)} disabled={!wizName}>Siguiente</button>}
                            {wizardStep === 3 && <button className="btn-primary" onClick={createDashboard} disabled={wizOwners.length === 0}>✨ Crear Tablero</button>}
                        </div>
                    </div>
                </div>
            )}

            <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                {dashboards.map(d => (
                    <Link href={`/board/${d.id}`} key={d.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="dash-card" style={{
                            background: 'var(--panel)',
                            border: '1px solid var(--border)',
                            padding: 20,
                            borderRadius: 12,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            transition: 'transform 0.2s, border-color 0.2s'
                        }}>
                            <div style={{ fontSize: 32, marginBottom: 10 }}>🗺️</div>
                            <h3 style={{ margin: '0 0 8px 0', fontSize: 18 }}>{d.name}</h3>
                            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-dim)', flex: 1 }}>
                                {d.description || "Sin descripción"}
                            </p>
                            <div style={{ marginTop: 15, fontSize: 11, color: 'var(--text-dim)', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                                Creado: {new Date(d.created_at).toLocaleDateString()}
                            </div>
                        </div>
                    </Link>
                ))}

                {dashboards.length === 0 && !isCreating && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: 'var(--text-dim)', border: '2px dashed var(--border)', borderRadius: 12 }}>
                        No tienes tableros aún. ¡Crea el primero!
                    </div>
                )}
            </div>

            <style jsx>{`
                .dash-card:hover {
                    transform: translateY(-2px);
                    border-color: var(--primary) !important;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
            `}</style>
        </div>
    );
}
