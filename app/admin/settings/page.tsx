"use client";

import { useState, useEffect } from "react";

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<any>({});
    const [loading, setLoading] = useState(true);

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
        if (res.ok) alert("Configuración guardada.");
        else alert("Error al guardar.");
    };

    if (loading) return <div>Cargando...</div>;

    return (
        <div style={{ maxWidth: 800 }}>
            <h1 style={{ fontSize: 24, marginBottom: 10 }}>⚙️ Configuración del Sistema</h1>
            <p style={{ color: 'var(--text-dim)', marginBottom: 30 }}>Ajustes generales y conexiones.</p>

            <div style={{ display: 'grid', gap: 20 }}>
                {/* General Section */}
                <div style={{ background: 'var(--panel)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                    <h3 style={{ marginTop: 0, marginBottom: 15 }}>General</h3>
                    <div style={{ marginBottom: 15 }}>
                        <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Nombre de la App</label>
                        <input className="input" value={settings.app_name || ''} onChange={(e) => handleChange('app_name', e.target.value)} style={{ width: '100%' }} />
                    </div>
                </div>

                {/* SMTP Section */}
                <div style={{ background: 'var(--panel)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                    <h3 style={{ marginTop: 0, marginBottom: 15 }}>Correo Saliente (SMTP)</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15, marginBottom: 15 }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Servidor (Host)</label>
                            <input className="input" placeholder="smtp.gmail.com" value={settings.smtp_host || ''} onChange={(e) => handleChange('smtp_host', e.target.value)} style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Puerto</label>
                            <input className="input" placeholder="587" value={settings.smtp_port || ''} onChange={(e) => handleChange('smtp_port', e.target.value)} style={{ width: '100%' }} />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Usuario</label>
                            <input className="input" value={settings.smtp_user || ''} onChange={(e) => handleChange('smtp_user', e.target.value)} style={{ width: '100%' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Contraseña</label>
                            <input className="input" type="password" value={settings.smtp_pass || ''} onChange={(e) => handleChange('smtp_pass', e.target.value)} style={{ width: '100%' }} />
                        </div>
                    </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <button className="btn-primary" onClick={handleSave} style={{ padding: '12px 24px' }}>Guardar Cambios</button>
                </div>
            </div>
        </div>
    );
}
