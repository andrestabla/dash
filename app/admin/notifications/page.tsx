"use client";

import { useState } from "react";

export default function AdminNotificationsPage() {
    const [title, setTitle] = useState("");
    const [message, setMessage] = useState("");
    const [target, setTarget] = useState("all");

    const handleSend = async () => {
        const res = await fetch("/api/notifications", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: 'create', title, message, target }),
        });
        if (res.ok) {
            alert("Enviado correctamente!");
            setTitle("");
            setMessage("");
        }
    };

    return (
        <div style={{ maxWidth: 600 }}>
            <h1 style={{ fontSize: 24, marginBottom: 10 }}>🔔 Centro de Mensajes</h1>
            <p style={{ color: 'var(--text-dim)', marginBottom: 30 }}>Envía anuncios importantes a tus usuarios.</p>

            <div style={{ background: 'var(--panel)', padding: 25, borderRadius: 12, border: '1px solid var(--border)' }}>
                <h3 style={{ marginTop: 0 }}>Nueva Notificación</h3>

                <div style={{ marginBottom: 15 }}>
                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Destinatarios</label>
                    <select className="input" value={target} onChange={(e) => setTarget(e.target.value)} style={{ width: '100%' }}>
                        <option value="all">Todos los Usuarios (Broadcast)</option>
                        {/* Future: Add specific user selection */}
                    </select>
                </div>

                <div style={{ marginBottom: 15 }}>
                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Título</label>
                    <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Mantenimiento programado" style={{ width: '100%' }} />
                </div>

                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Mensaje</label>
                    <textarea className="input" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Escribe tu mensaje aquí..." style={{ width: '100%' }} />
                </div>

                <div style={{ textAlign: 'right' }}>
                    <button className="btn-primary" onClick={handleSend}>🚀 Enviar Anuncio</button>
                </div>
            </div>
        </div>
    );
}
