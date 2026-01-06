"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ToastProvider";

export default function AdminDashboardsPage() {
    const [boards, setBoards] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingBoard, setEditingBoard] = useState<any>(null);

    // Edit Form State
    const [editName, setEditName] = useState("");
    const [editDesc, setEditDesc] = useState("");
    const [editOwners, setEditOwners] = useState<string[]>([]);
    const [sendInvite, setSendInvite] = useState(false);

    const { showToast } = useToast();

    useEffect(() => {
        fetchData();
        fetchUsers();
    }, []);

    const fetchData = async () => {
        const res = await fetch("/api/admin/dashboards");
        if (res.ok) setBoards(await res.json());
    };

    const fetchUsers = async () => {
        const res = await fetch("/api/admin/users");
        if (res.ok) setUsers(await res.json());
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`⚠️ PELIGRO: Esto borrará permanentemente el tablero "${name}" y TODAS sus tareas para TODOS los usuarios. ¿Estás seguro?`)) return;

        await fetch(`/api/admin/dashboards?id=${id}`, { method: "DELETE" });
        fetchData();
    };

    const openEdit = (board: any) => {
        setEditingBoard(board);
        setEditName(board.name);
        setEditDesc(board.description || "");
        // We need to fetch the specific settings (owners) for this board as the list doesn't return full settings to save bandwidth
        // But for V1 we might assuming fetching single board settings relative to the list is better?
        // Actually the list query in route.ts doesn't select settings. 
        // Let's quick-fetch the single board details or just update api to return settings slightly
        // For now, I will fetch single board details on open.
        fetch(`/api/dashboards/${board.id}`).then(res => res.json()).then(data => {
            setEditOwners(data.settings?.owners || []);
            setIsEditOpen(true);
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch("/api/admin/dashboards", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id: editingBoard.id,
                name: editName,
                description: editDesc,
                owners: editOwners,
                sendInvite
            })
        });

        if (res.ok) {
            showToast("Tablero actualizado " + (sendInvite ? "e invitaciones enviadas" : ""), "success");
            setIsEditOpen(false);
            fetchData();
            setSendInvite(false);
        } else {
            showToast("Error al actualizar", "error");
        }
    };

    const toggleOwner = (email: string) => {
        setEditOwners(prev =>
            prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
        );
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
                                <td style={{ padding: 15, textAlign: "right", display: "flex", gap: 10, justifyContent: "flex-end" }}>
                                    <button className="btn-ghost" onClick={() => openEdit(b)} title="Editar">✏️</button>
                                    <button className="btn-ghost" style={{ color: "var(--danger)", fontSize: 12 }} onClick={() => handleDelete(b.id, b.name)}>🗑️</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* EDIT MODAL */}
            {isEditOpen && (
                <div className="backdrop fade-in" onClick={() => setIsEditOpen(false)}>
                    <div className="modal animate-slide-up" onClick={e => e.stopPropagation()} style={{ width: 500 }}>
                        <div className="m-head">
                            <h3>Editar Tablero</h3>
                            <button className="btn-ghost" onClick={() => setIsEditOpen(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSave} className="m-body">
                            <div className="form-row">
                                <label>Nombre</label>
                                <input value={editName} onChange={e => setEditName(e.target.value)} required />
                            </div>
                            <div className="form-row">
                                <label>Descripción</label>
                                <input value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                            </div>

                            <div className="form-row">
                                <label>Asignar Colaboradores (Usuarios Registrados)</label>
                                <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid var(--border-dim)', borderRadius: 8, padding: 8 }}>
                                    {users.map(u => (
                                        <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                                            <input
                                                type="checkbox"
                                                checked={editOwners.includes(u.email)}
                                                onChange={() => toggleOwner(u.email)}
                                                style={{ cursor: 'pointer' }}
                                            />
                                            <span style={{ fontSize: 13 }}>{u.email}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="form-row" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 15, background: 'rgba(59, 130, 246, 0.1)', padding: 10, borderRadius: 8 }}>
                                <input
                                    type="checkbox"
                                    id="invite"
                                    checked={sendInvite}
                                    onChange={e => setSendInvite(e.target.checked)}
                                    style={{ transform: 'scale(1.2)', cursor: 'pointer' }}
                                />
                                <label htmlFor="invite" style={{ color: '#3b82f6', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Enviar notificación de invitación por correo</label>
                            </div>

                            <div className="m-foot">
                                <button type="button" className="btn-ghost" onClick={() => setIsEditOpen(false)}>Cancelar</button>
                                <button type="submit" className="btn-primary">Guardar Cambios</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
