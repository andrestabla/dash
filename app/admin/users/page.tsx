"use client";

import { useState, useEffect } from "react";
import Link from 'next/link';
import { useToast } from "@/components/ToastProvider";
import ConfirmModal from "@/components/ConfirmModal";
import { Users, UserPlus, Trash2, Shield, ArrowLeft } from "lucide-react";

interface User {
    id: string;
    email: string;
    role: string;
    created_at: string;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [newEmail, setNewEmail] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [newRole, setNewRole] = useState("user");
    const [sendCredentials, setSendCredentials] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    const { showToast } = useToast();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        const res = await fetch("/api/admin/users");
        if (res.ok) {
            setUsers(await res.json());
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch("/api/admin/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole, sendEmail: sendCredentials }),
        });

        if (res.ok) {
            setIsCreating(false);
            setNewEmail("");
            setNewPassword("");
            fetchUsers();
            showToast("Usuario creado", "success");
        } else {
            showToast("Error al crear usuario", "error");
        }
    };

    const requestDelete = (id: string) => {
        setConfirmCallback(() => () => executeDelete(id));
        setConfirmOpen(true);
    };

    const executeDelete = async (id: string) => {
        await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
        fetchUsers();
        setConfirmOpen(false);
        showToast("Usuario eliminado", "info");
    };

    return (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 20px" }}>
            <header style={{ marginBottom: 30, paddingBottom: 20, borderBottom: '1px solid var(--border-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Users size={28} className="text-primary" /> Gestión de Usuarios
                    </h1>
                    <p style={{ color: 'var(--text-dim)', margin: '4px 0 0 0', paddingLeft: 38 }}>Administra el acceso al sistema</p>
                </div>
                <button className="btn-primary" onClick={() => setIsCreating(true)}>
                    <UserPlus size={18} style={{ marginRight: 8 }} /> Nuevo Usuario
                </button>
            </header>

            {isCreating && (
                <div style={{ background: "var(--bg-panel)", padding: 20, borderRadius: 12, marginBottom: 30, border: "1px solid var(--border-dim)" }}>
                    <h3 style={{ marginTop: 0 }}>Crear Usuario</h3>
                    <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
                        <div>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Email</label>
                            <input value={newEmail} onChange={e => setNewEmail(e.target.value)} required style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--border-dim)" }} />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Password</label>
                            <input value={newPassword} onChange={e => setNewPassword(e.target.value)} required style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--border-dim)" }} />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Role</label>
                            <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--border-dim)" }}>
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                            <input
                                type="checkbox"
                                id="sendCreds"
                                checked={sendCredentials}
                                onChange={e => setSendCredentials(e.target.checked)}
                                style={{ transform: "scale(1.2)" }}
                            />
                            <label htmlFor="sendCreds" style={{ fontSize: 13, cursor: "pointer", userSelect: "none" }}>Enviar credenciales de acceso al correo</label>
                        </div>
                        <div style={{ display: 'flex', gap: 10, gridColumn: "1 / -1", justifyContent: "flex-end" }}>
                            <button type="button" className="btn-ghost" onClick={() => setIsCreating(false)}>Cancelar</button>
                            <button type="submit" className="btn-primary">Crear Usuario</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="glass-panel" style={{ overflow: "hidden", padding: 0, borderRadius: 16 }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th style={{ padding: '16px 24px' }}>Email</th>
                            <th>Rol</th>
                            <th>Creado</th>
                            <th style={{ textAlign: "right", paddingRight: 24 }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                                <td style={{ padding: '16px 24px', fontWeight: 500 }}>{u.email}</td>
                                <td>
                                    <span style={{
                                        padding: "4px 10px",
                                        borderRadius: 20,
                                        background: u.role === 'admin' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                        color: u.role === 'admin' ? '#10b981' : '#3b82f6',
                                        fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
                                        display: 'inline-flex', alignItems: 'center', gap: 4
                                    }}>
                                        {u.role === 'admin' && <Shield size={12} />}
                                        {u.role.toUpperCase()}
                                    </span>
                                </td>
                                <td style={{ fontSize: 13, color: "var(--text-dim)" }}>{new Date(u.created_at).toLocaleDateString()}</td>
                                <td style={{ textAlign: "right", paddingRight: 24 }}>
                                    <button className="btn-ghost" style={{ color: "#ef4444", padding: 8 }} onClick={() => requestDelete(u.id)} title="Eliminar Usuario">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ConfirmModal
                isOpen={confirmOpen}
                title="Eliminar Usuario"
                message="¿Eliminar este usuario permanentemente? Perderá acceso inmediato."
                onConfirm={confirmCallback || (() => { })}
                onCancel={() => setConfirmOpen(false)}
                isDestructive={true}
            />
        </div>
    );
}
