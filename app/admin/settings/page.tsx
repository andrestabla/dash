"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ToastProvider";

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    useEffect(() => {
        fetch("/api/admin/settings").then(res => res.json()).then(data => {
            setSettings(data);
            setLoading(false);
        });
    }, []);

    const handleChange = (key: string, value: string) => {
        setSettings({ ...settings, [key]: value });
    };

    const handleSave = async () => {
        const res = await fetch("/api/admin/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(settings),
        });
        if (res.ok) showToast("Configuración guardada correctamente", "success");
        else showToast("Error al guardar configuración", "error");
    };

    if (loading) return <div style={{ padding: 40, color: 'var(--text-dim)' }}>Cargando configuración...</div>;

    return (
        <div style={{ maxWidth: 800 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>⚙️ Configuración del Sistema</h1>
            <p style={{ color: 'var(--text-dim)', marginBottom: 30 }}>Ajustes generales y conexiones.</p>

            <div style={{ display: 'grid', gap: 24 }}>
                {/* General Section */}
                <div style={{ background: 'var(--bg-panel)', padding: 24, borderRadius: 16, border: '1px solid var(--border-dim)' }}>
                    <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: 16, fontWeight: 700 }}>General</h3>
                    <div style={{ marginBottom: 0 }}>
                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 13, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Nombre de la App</label>
                        <input className="input-glass" value={settings.app_name || ''} onChange={(e) => handleChange('app_name', e.target.value)} />
                    </div>
                </div>

                {/* SMTP Section */}
                <div style={{ background: 'var(--bg-panel)', padding: 24, borderRadius: 16, border: '1px solid var(--border-dim)' }}>
                    <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: 16, fontWeight: 700 }}>Correo Saliente (SMTP)</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 13, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Servidor (Host)</label>
                            <input className="input-glass" placeholder="smtp.gmail.com" value={settings.smtp_host || ''} onChange={(e) => handleChange('smtp_host', e.target.value)} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 13, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Puerto</label>
                            <input className="input-glass" placeholder="587" value={settings.smtp_port || ''} onChange={(e) => handleChange('smtp_port', e.target.value)} />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 13, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Usuario</label>
                            <input className="input-glass" value={settings.smtp_user || ''} onChange={(e) => handleChange('smtp_user', e.target.value)} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 13, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Contraseña</label>
                            <input className="input-glass" type="password" value={settings.smtp_pass || ''} onChange={(e) => handleChange('smtp_pass', e.target.value)} />
                        </div>
                    </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <button className="btn-primary" onClick={handleSave}>Guardar Cambios</button>
                </div>
            </div>
        </div>
    );
}
