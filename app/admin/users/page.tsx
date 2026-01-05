"use client";

import { useState, useEffect } from "react";
import Link from 'next/link';

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
    const [isCreating, setIsCreating] = useState(false);

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
            body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole }),
        });

        if (res.ok) {
            setIsCreating(false);
            setNewEmail("");
            setNewPassword("");
            fetchUsers();
        } else {
            alert("Error creating user");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        await fetch(`/api/admin/users?id=${id}`, { method: "DELETE" });
        fetchUsers();
    };

    return (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: 40 }}>
            <header style={{ marginBottom: 40, borderBottom: '1px solid var(--border)', paddingBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ marginBottom: 10 }}><Link href="/" style={{ color: "var(--primary)", textDecoration: 'none' }}>← Volver al Workspace</Link></div>
                    <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>👥 Gestión de Usuarios</h1>
                    <p style={{ color: 'var(--text-dim)', margin: '4px 0 0 0' }}>Administra el acceso al sistema</p>
                </div>
                <button className="btn-primary" onClick={() => setIsCreating(true)}>
                    + Nuevo Usuario
                </button>
            </header>

            {isCreating && (
                <div style={{ background: "var(--panel)", padding: 20, borderRadius: 12, marginBottom: 30, border: "1px solid var(--border)" }}>
                    <h3 style={{ marginTop: 0 }}>Crear Usuario</h3>
                    <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
                        <div>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Email</label>
                            <input value={newEmail} onChange={e => setNewEmail(e.target.value)} required style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--border)" }} />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Password</label>
                            <input value={newPassword} onChange={e => setNewPassword(e.target.value)} required style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--border)" }} />
                        </div>
                        <div>
                            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Role</label>
                            <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--border)" }}>
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button type="button" className="btn-ghost" onClick={() => setIsCreating(false)}>Cancel</button>
                            <button type="submit" className="btn-primary">Guardar</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="glass-panel" style={{ overflow: "hidden", padding: 0 }}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Creado</th>
                            <th style={{ textAlign: "right" }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.id}>
                                <td>{u.email}</td>
                                <td>
                                    <span style={{
                                        padding: "4px 8px",
                                        borderRadius: 20,
                                        background: u.role === 'admin' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                        color: u.role === 'admin' ? '#10b981' : '#3b82f6',
                                        fontSize: 11, fontWeight: 700, letterSpacing: '0.05em'
                                    }}>
                                        {u.role.toUpperCase()}
                                    </span>
                                </td>
                                <td style={{ fontSize: 13, color: "var(--text-dim)" }}>{new Date(u.created_at).toLocaleDateString()}</td>
                                <td style={{ textAlign: "right" }}>
                                    <button className="btn-ghost" style={{ color: "#ef4444", fontSize: 12 }} onClick={() => handleDelete(u.id)}>Eliminar</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
