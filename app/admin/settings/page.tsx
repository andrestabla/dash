"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ToastProvider";
import { Mail, Shield, Server, User, Key, CheckCircle, ArrowRight, ArrowLeft, LayoutTemplate } from "lucide-react";

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const { showToast } = useToast();

    // Wizard State
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [wizData, setWizData] = useState({
        host: "",
        port: "",
        user: "",
        pass: "",
        secure: true
    });
    const [info, setInfo] = useState({ testEmail: "" });
    const [testing, setTesting] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = () => {
        fetch("/api/admin/settings").then(res => res.json()).then(data => {
            setSettings(data);
            setWizData({
                host: data.smtp_host || "",
                port: data.smtp_port || "587",
                user: data.smtp_user || "",
                pass: data.smtp_pass || "",
                secure: data.smtp_secure === "true"
            });
            setLoading(false);
        });
    };

    const handleChange = (key: string, value: string) => {
        setSettings({ ...settings, [key]: value });
    };

    const saveSettings = async (finalSettings: any) => {
        const res = await fetch("/api/admin/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(finalSettings),
        });
        if (res.ok) {
            showToast("Configuración guardada correctamente", "success");
            setSettings(finalSettings);
            setIsWizardOpen(false);
        } else {
            showToast("Error al guardar configuración", "error");
        }
    };

    const handleWizardFinish = () => {
        const newSettings = {
            ...settings,
            smtp_host: wizData.host,
            smtp_port: wizData.port,
            smtp_user: wizData.user,
            smtp_pass: wizData.pass,
            smtp_secure: String(wizData.secure)
        };
        saveSettings(newSettings);
    };

    const openWizard = () => {
        setWizardStep(1);
        setIsWizardOpen(true);
    };

    if (loading) return <div style={{ padding: 40, color: 'var(--text-dim)' }}>Cargando configuración...</div>;

    return (
        <div style={{ maxWidth: 800 }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>⚙️ Configuración del Sistema</h1>
            <p style={{ color: 'var(--text-dim)', marginBottom: 30 }}>Ajustes generales y conexiones.</p>

            <div style={{ display: 'grid', gap: 24 }}>
                {/* General Section */}
                <div style={{ background: 'var(--bg-panel)', padding: 24, borderRadius: 16, border: '1px solid var(--border-dim)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <div style={{ padding: 8, borderRadius: 8, background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}><LayoutTemplate size={20} /></div>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>General</h3>
                    </div>
                    <div style={{ marginBottom: 0 }}>
                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 13, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Nombre de la App</label>
                        <input className="input-glass" value={settings.app_name || ''} onChange={(e) => handleChange('app_name', e.target.value)} />
                    </div>
                </div>

                {/* SMTP Section */}
                <div style={{ background: 'var(--bg-panel)', padding: 24, borderRadius: 16, border: '1px solid var(--border-dim)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ padding: 8, borderRadius: 8, background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}><Mail size={20} /></div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Correo Saliente (SMTP)</h3>
                                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{settings.smtp_host ? `Conectado a ${settings.smtp_host}` : 'No configurado'}</div>
                            </div>
                        </div>
                        <button className="btn-primary" onClick={openWizard}>
                            {settings.smtp_host ? 'Reconfigurar' : 'Configurar'}
                        </button>
                    </div>

                    {settings.smtp_host && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13, color: 'var(--text-dim)', background: 'var(--bg-card)', padding: 16, borderRadius: 12 }}>
                            <div>
                                <span style={{ fontWeight: 600 }}>Host:</span> {settings.smtp_host}
                            </div>
                            <div>
                                <span style={{ fontWeight: 600 }}>Port:</span> {settings.smtp_port}
                            </div>
                            <div>
                                <span style={{ fontWeight: 600 }}>User:</span> {settings.smtp_user}
                            </div>
                            <div>
                                <span style={{ fontWeight: 600 }}>Secure:</span> {settings.smtp_secure === 'true' ? 'Sí' : 'No'}
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ textAlign: 'right' }}>
                    <button className="btn-primary" onClick={() => saveSettings(settings)}>Guardar Cambios Generales</button>
                </div>
            </div>

            {/* WIZARD MODAL */}
            {isWizardOpen && (
                <div className="backdrop">
                    <div className="glass-panel animate-slide-up" style={{ padding: 0, width: 500, overflow: 'hidden' }}>
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0 }}>Asistente de Correo ({wizardStep}/3)</h3>
                            <button className="btn-ghost" onClick={() => setIsWizardOpen(false)}>✕</button>
                        </div>

                        <div style={{ padding: 32, minHeight: 280 }}>
                            {/* STEP 1: SERVER */}
                            {wizardStep === 1 && (
                                <div className="animate-fade-in">
                                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                        <div style={{ display: 'inline-flex', padding: 16, borderRadius: '50%', background: 'var(--bg-panel)', marginBottom: 16 }}><Server size={32} color="#3b82f6" /></div>
                                        <h4 style={{ margin: 0, fontSize: 18 }}>Servidor de Correo</h4>
                                        <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>Selecciona tu proveedor o configura uno personalizado.</p>
                                    </div>

                                    {/* Provider Selection */}
                                    <div style={{ display: 'flex', gap: 10, marginBottom: 20, justifyContent: 'center' }}>
                                        {[
                                            { id: 'gmail', name: 'Gmail', icon: 'M' },
                                            { id: 'outlook', name: 'Outlook', icon: 'O' },
                                            { id: 'custom', name: 'Otro / Custom', icon: '⚙️' }
                                        ].map(p => (
                                            <button
                                                key={p.id}
                                                className="btn-ghost"
                                                onClick={() => {
                                                    if (p.id === 'gmail') setWizData({ ...wizData, host: 'smtp.gmail.com', port: '587' });
                                                    if (p.id === 'outlook') setWizData({ ...wizData, host: 'smtp.office365.com', port: '587' });
                                                    if (p.id === 'custom') setWizData({ ...wizData, host: '', port: '' });
                                                }}
                                                style={{
                                                    border: (wizData.host === 'smtp.gmail.com' && p.id === 'gmail') ||
                                                        (wizData.host === 'smtp.office365.com' && p.id === 'outlook') ||
                                                        ((!['smtp.gmail.com', 'smtp.office365.com'].includes(wizData.host)) && p.id === 'custom')
                                                        ? '1px solid var(--primary)' : '1px solid var(--border-dim)',
                                                    background: 'var(--bg-card)',
                                                    padding: '8px 16px'
                                                }}
                                            >
                                                <span style={{ marginRight: 6 }}>{p.icon}</span> {p.name}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Dynamic Instructions */}
                                    {wizData.host === 'smtp.gmail.com' && (
                                        <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', padding: 12, borderRadius: 8, fontSize: 12, marginBottom: 20, color: '#3b82f6' }}>
                                            <strong>ℹ️ Instrucciones para Gmail:</strong><br />
                                            Debes usar una <b>Contraseña de Aplicación</b>, no tu contraseña normal.<br />
                                            Ve a <a href="https://myaccount.google.com/apppasswords" target="_blank" style={{ textDecoration: 'underline' }}>Google Account &gt; Seguridad &gt; Contraseñas de aplicación</a>.
                                        </div>
                                    )}
                                    {wizData.host === 'smtp.office365.com' && (
                                        <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', padding: 12, borderRadius: 8, fontSize: 12, marginBottom: 20, color: '#3b82f6' }}>
                                            <strong>ℹ️ Instrucciones para Outlook:</strong><br />
                                            Asegúrate de que el <b>SMTP Authenticated Submission</b> esté habilitado en la administración de Office 365.
                                        </div>
                                    )}

                                    <div style={{ display: 'grid', gap: 16 }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', color: 'var(--text-dim)' }}>Host del Servidor</label>
                                            <input className="input-glass" placeholder="smtp.example.com" value={wizData.host} onChange={e => setWizData({ ...wizData, host: e.target.value })} autoFocus />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', color: 'var(--text-dim)' }}>Puerto</label>
                                            <input className="input-glass" placeholder="587" value={wizData.port} onChange={e => setWizData({ ...wizData, port: e.target.value })} type="number" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: AUTH */}
                            {wizardStep === 2 && (
                                <div className="animate-fade-in">
                                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                        <div style={{ display: 'inline-flex', padding: 16, borderRadius: '50%', background: 'var(--bg-panel)', marginBottom: 16 }}><User size={32} color="#f59e0b" /></div>
                                        <h4 style={{ margin: 0, fontSize: 18 }}>Credenciales</h4>
                                        <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>Usuario y contraseña para autenticar el envío.</p>
                                    </div>
                                    <div style={{ display: 'grid', gap: 16 }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', color: 'var(--text-dim)' }}>Usuario / Email</label>
                                            <input className="input-glass" placeholder="admin@empresa.com" value={wizData.user} onChange={e => setWizData({ ...wizData, user: e.target.value })} autoFocus />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', color: 'var(--text-dim)' }}>Contraseña</label>
                                            <input className="input-glass" type="password" placeholder="••••••••" value={wizData.pass} onChange={e => setWizData({ ...wizData, pass: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: SECURITY */}
                            {wizardStep === 3 && (
                                <div className="animate-fade-in">
                                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                        <div style={{ display: 'inline-flex', padding: 16, borderRadius: '50%', background: 'var(--bg-panel)', marginBottom: 16 }}><Shield size={32} color="#10b981" /></div>
                                        <h4 style={{ margin: 0, fontSize: 18 }}>Seguridad y Confirmación</h4>
                                        <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>Revisa los ajustes finales.</p>
                                    </div>

                                    <div style={{ background: 'var(--bg-panel)', padding: 16, borderRadius: 12, marginBottom: 20 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                            <span style={{ fontWeight: 600 }}>Usar conexión segura (TLS/SSL)</span>
                                            <input type="checkbox" checked={wizData.secure} onChange={e => setWizData({ ...wizData, secure: e.target.checked })} style={{ transform: 'scale(1.5)', cursor: 'pointer' }} />
                                        </div>
                                        <hr style={{ border: 0, borderTop: '1px solid var(--border-dim)', margin: '12px 0' }} />
                                        <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                                            Host: <b style={{ color: 'var(--text-main)' }}>{wizData.host}</b><br />
                                            Puerto: <b style={{ color: 'var(--text-main)' }}>{wizData.port}</b><br />
                                            Usuario: <b style={{ color: 'var(--text-main)' }}>{wizData.user}</b>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{ padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            {wizardStep > 1 && (
                                <button className="btn-ghost" onClick={() => setWizardStep(s => s - 1)}>
                                    <ArrowLeft size={16} style={{ marginRight: 6 }} /> Atrás
                                </button>
                            )}

                            {wizardStep < 3 ? (
                                <button className="btn-primary" onClick={() => setWizardStep(s => s + 1)} disabled={
                                    (wizardStep === 1 && (!wizData.host || !wizData.port)) ||
                                    (wizardStep === 2 && (!wizData.user || !wizData.pass))
                                }>
                                    Siguiente <ArrowRight size={16} style={{ marginLeft: 6 }} />
                                </button>
                            ) : (
                                <button className="btn-primary" onClick={handleWizardFinish} style={{ background: 'var(--primary-gradient)' }}>
                                    <CheckCircle size={16} style={{ marginRight: 6 }} /> Finalizar Configuración
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
