"use client";

import { useState, useEffect } from "react";
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Dashboard {
    id: string;
    name: string;
    description: string;
    created_at: string;
}

export default function Workspace() {
    const [dashboards, setDashboards] = useState<Dashboard[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [newDashName, setNewDashName] = useState("");
    const router = useRouter();

    useEffect(() => {
        fetch('/api/dashboards')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setDashboards(data);
            })
            .catch(err => console.error(err));
    }, []);

    const createDashboard = async () => {
        if (!newDashName.trim()) return;

        try {
            const res = await fetch('/api/dashboards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newDashName, description: 'Nuevo roadmap' })
            });
            if (res.ok) {
                const dash = await res.json();
                setDashboards([dash, ...dashboards]);
                setNewDashName("");
                setIsCreating(false);
                router.push(`/board/${dash.id}`);
            }
        } catch (err) {
            alert("Error creando tablero");
        }
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
                <div style={{ padding: 20, background: 'var(--panel)', borderRadius: 12, marginBottom: 30, border: '1px solid var(--primary)' }}>
                    <h3 style={{ marginTop: 0 }}>Crear Nuevo Tablero</h3>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <input
                            value={newDashName}
                            onChange={(e) => setNewDashName(e.target.value)}
                            placeholder="Nombre del proyecto..."
                            style={{ flex: 1, padding: 10, borderRadius: 6, border: '1px solid var(--border)' }}
                            autoFocus
                        />
                        <button className="btn-primary" onClick={createDashboard}>Crear</button>
                        <button className="btn-ghost" onClick={() => setIsCreating(false)}>Cancelar</button>
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
