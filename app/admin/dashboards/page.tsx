"use client";

import { useState, useEffect } from "react";

export default function AdminDashboardsPage() {
    const [boards, setBoards] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const res = await fetch("/api/admin/dashboards");
        if (res.ok) setBoards(await res.json());
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`⚠️ PELIGRO: Esto borrará permanentemente el tablero "${name}" y TODAS sus tareas para TODOS los usuarios. ¿Estás seguro?`)) return;

        await fetch(`/api/admin/dashboards?id=${id}`, { method: "DELETE" });
        fetchData();
    };

    return (
        <div>
            <h1 style={{ fontSize: 24, marginBottom: 10 }}>📊 Gestión de Tableros</h1>
            <p style={{ color: 'var(--text-dim)', marginBottom: 30 }}>Supervisa todos los proyectos activos en la plataforma.</p>

            <div style={{ background: "var(--panel)", borderRadius: 12, border: "1px solid var(--border)", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left", background: "var(--panel-hover)" }}>
                            <th style={{ padding: 15 }}>Nombre</th>
                            <th style={{ padding: 15 }}>Descripción</th>
                            <th style={{ padding: 15 }}>Tareas</th>
                            <th style={{ padding: 15 }}>Creado</th>
                            <th style={{ padding: 15, textAlign: "right" }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {boards.map(b => (
                            <tr key={b.id} style={{ borderBottom: "1px solid var(--border)" }}>
                                <td style={{ padding: 15, fontWeight: 600 }}>{b.name}</td>
                                <td style={{ padding: 15, color: 'var(--text-dim)' }}>{b.description || '-'}</td>
                                <td style={{ padding: 15 }}>{b.task_count}</td>
                                <td style={{ padding: 15, fontSize: 13, color: "var(--text-dim)" }}>{new Date(b.created_at).toLocaleDateString()}</td>
                                <td style={{ padding: 15, textAlign: "right" }}>
                                    <button className="btn-ghost" style={{ color: "var(--danger)", fontSize: 12 }} onClick={() => handleDelete(b.id, b.name)}>Forzar Eliminación</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
