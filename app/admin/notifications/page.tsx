"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ToastProvider";

interface User {
    id: string;
    email: string;
    name?: string;
}

export default function AdminNotificationsPage() {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [target, setTarget] = useState("all");
    const [users, setUsers] = useState<User[]>([]);
    const { showToast } = useToast();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/admin/users");
            if (res.ok) {
                setUsers(await res.json());
            }
        } catch (error) {
            console.error("Error fetching users:", error);
        }
    };

    const handleSend = async () => {
        const payload: any = { action: 'create', title, message, target };

        // If not broadcast, we need to send target_user_id specifically if backend expects it differently
        // Looking at backend: if (body.target === 'all') ... else ... [body.target_user_id]
        // So if target is a UUID, we should map it to target_user_id
        if (target !== 'all') {
            payload.target = 'single'; // Or just keep target as 'single' and pass target_user_id? 
            // Let's re-read the backend code quickly:
            // if (body.target === 'all') { ... } else { ... [body.target_user_id] }
            // So if target is NOT 'all', it expects `target_user_id` to be present.
            payload.target_user_id = target;
        }

        const res = await fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (res.ok) {
            showToast("Notificación enviada", "success");
            setTitle("");
            setMessage("");
            setTarget("all");
        } else {
            showToast("Error al enviar", "error");
        }
    };

    return (
        <div style={{ maxWidth: 600 }}>
            <h1 style={{ fontSize: 24, marginBottom: 10 }}>🔔 Centro de Mensajes</h1>
            <p style={{ color: 'var(--text-dim)', marginBottom: 30 }}>Envía anuncios importantes a tus usuarios.</p>

            <div style={{ background: 'var(--bg-panel)', padding: 25, borderRadius: 12, border: '1px solid var(--border-dim)' }}>
                <h3 style={{ marginTop: 0 }}>Nueva Notificación</h3>

                <div style={{ marginBottom: 15 }}>
                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Destinatarios</label>
                    <select className="input" value={target} onChange={(e) => setTarget(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border-dim)', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
                        <option value="all">Todos los Usuarios (Broadcast)</option>
                        {users.map(u => (
                            <option key={u.id} value={u.id}>
                                {u.name ? `${u.name} (${u.email})` : u.email}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: 15 }}>
                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Título</label>
                    <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Mantenimiento programado" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border-dim)', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
                </div>

                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Mensaje</label>
                    <textarea className="input" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Escribe tu mensaje aquí..." style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--border-dim)', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
                </div>

                <div style={{ textAlign: 'right' }}>
                    <button className="btn-primary" onClick={handleSend}>🚀 Enviar Anuncio</button>
                </div>
            </div>
        </div>
    );
}
