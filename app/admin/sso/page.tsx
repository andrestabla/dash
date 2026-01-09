"use client";

import { useState } from 'react';
import {
    Shield,
    ChevronRight,
    ChevronLeft,
    Check,
    Globe,
    Lock,
    Key,
    Server,
    CheckCircle2,
    AlertCircle,
    Copy,
    ExternalLink
} from 'lucide-react';
import { useToast } from "@/components/ToastProvider";

const PLATFORMS = [
    { id: 'google', name: 'Google Workspace', icon: '🌐', desc: 'OAuth 2.0 para cuentas de Google Business.' },
    { id: 'microsoft', name: 'Microsoft Azure AD', icon: '🔷', desc: 'Integración con Entra ID (Office 365).' },
    { id: 'saml', name: 'SAML 2.0 / OIDC Custom', icon: '🔐', desc: 'Para Okta, OneLogin o soluciones propias.' },
];

export default function SSOWizard() {
    const [step, setStep] = useState(1);
    const [platform, setPlatform] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        clientId: '',
        clientSecret: '',
        authority: '',
        enabled: false
    });
    const [isSaving, setIsSaving] = useState(false);
    const { showToast } = useToast();

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/admin/sso', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform, ...formData })
            });
            if (res.ok) {
                setStep(4);
                showToast("Configuración guardada correctamente", "success");
            } else {
                showToast("Error al guardar la configuración", "error");
            }
        } catch (error) {
            showToast("Error de conexión", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showToast("Copiado al portapapeles", "success");
    };

    const callbackUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/auth/callback/sso` : '...';

    return (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ marginBottom: 32 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Shield size={32} className="text-blue-500" />
                    Configuración de SSO
                </h1>
                <p style={{ color: 'var(--text-dim)' }}>
                    Permite que tus usuarios inicien sesión de forma segura usando sus credenciales corporativas.
                </p>
            </div>

            {/* Stepper Header */}
            <div style={{ display: 'flex', marginBottom: 40, position: 'relative', justifyContent: 'space-between' }}>
                <div style={{ position: 'absolute', top: 16, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,0.05)', zIndex: 0 }} />
                {[1, 2, 3, 4].map((s) => (
                    <div key={s} style={{ zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                        <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: step >= s ? 'var(--primary-gradient)' : 'var(--bg-panel)',
                            border: step >= s ? 'none' : '2px solid var(--border-dim)',
                            color: step >= s ? 'white' : 'var(--text-dim)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 14,
                            transition: 'all 0.3s'
                        }}>
                            {step > s ? <Check size={16} /> : s}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 600, color: step >= s ? 'var(--text-main)' : 'var(--text-dim)', textTransform: 'uppercase' }}>
                            {s === 1 ? 'Plataforma' : s === 2 ? 'Credenciales' : s === 3 ? 'Técnico' : 'Finalizar'}
                        </span>
                    </div>
                ))}
            </div>

            <div className="glass-panel" style={{ padding: 40, minHeight: 400, display: 'flex', flexDirection: 'column' }}>

                {/* STEP 1: Platform Selection */}
                {step === 1 && (
                    <div className="animate-fade-in">
                        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>1. Selecciona tu proveedor de identidad</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(1, 1fr)', gap: 16 }}>
                            {PLATFORMS.map((p) => (
                                <div
                                    key={p.id}
                                    onClick={() => setPlatform(p.id)}
                                    style={{
                                        padding: 20,
                                        borderRadius: 16,
                                        border: platform === p.id ? '2px solid var(--primary)' : '1px solid var(--border-dim)',
                                        background: platform === p.id ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255,255,255,0.02)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 20,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ fontSize: 32 }}>{p.icon}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{p.name}</div>
                                        <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>{p.desc}</div>
                                    </div>
                                    {platform === p.id && <CheckCircle2 size={24} className="text-blue-500" />}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* STEP 2: Credentials */}
                {step === 2 && (
                    <div className="animate-fade-in">
                        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>2. Configura las credenciales de {PLATFORMS.find(p => p.id === platform)?.name}</h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Key size={14} /> Client ID
                                </label>
                                <input
                                    className="input-glass"
                                    placeholder="Ingrese el ID de cliente proporcionado por el proveedor"
                                    value={formData.clientId}
                                    onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Lock size={14} /> Client Secret
                                </label>
                                <input
                                    type="password"
                                    className="input-glass"
                                    placeholder="••••••••••••••••••••••••"
                                    value={formData.clientSecret}
                                    onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                                />
                            </div>
                            {platform !== 'google' && (
                                <div className="form-group">
                                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <Server size={14} /> Authority URL / Issuer
                                    </label>
                                    <input
                                        className="input-glass"
                                        placeholder="https://login.microsoftonline.com/tenant-id/v2.0"
                                        value={formData.authority}
                                        onChange={(e) => setFormData({ ...formData, authority: e.target.value })}
                                    />
                                    <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>URL base del punto de conexión de autenticación.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* STEP 3: Technical Config */}
                {step === 3 && (
                    <div className="animate-fade-in">
                        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>3. URLs de Retorno y Configuración Técnica</h2>
                        <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.1)', padding: 16, borderRadius: 12, marginBottom: 24, display: 'flex', gap: 12 }}>
                            <AlertCircle className="text-amber-500" size={20} style={{ flexShrink: 0 }} />
                            <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                                Debe registrar la siguiente URL en la consola de su proveedor (Google Cloud Console o Azure Entra ID) como <b>Authorized Redirect URI</b>.
                            </p>
                        </div>

                        <div style={{ padding: 20, borderRadius: 12, background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <code style={{ fontSize: 14, color: 'var(--primary)' }}>{callbackUrl}</code>
                            <button className="btn-ghost" onClick={() => copyToClipboard(callbackUrl)} style={{ padding: 8 }}>
                                <Copy size={16} />
                            </button>
                        </div>

                        <div style={{ marginTop: 32 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.enabled}
                                    onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                                    style={{ width: 20, height: 20 }}
                                />
                                <div>
                                    <div style={{ fontWeight: 700 }}>Activar SSO inmediatamente</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>Una vez activo, los usuarios verán la opción de ingresar con su cuenta corporativa en el login.</div>
                                </div>
                            </label>
                        </div>
                    </div>
                )}

                {/* STEP 4: Success */}
                {step === 4 && (
                    <div className="animate-fade-in" style={{ textAlign: 'center', padding: '40px 0' }}>
                        <div style={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            background: 'rgba(16, 185, 129, 0.1)',
                            color: '#10b981',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px'
                        }}>
                            <Check size={40} />
                        </div>
                        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>¡Configuración Exitosa!</h2>
                        <p style={{ color: 'var(--text-dim)', maxWidth: 400, margin: '0 auto 32px' }}>
                            SSO ha sido configurado correctamente para <b>{PLATFORMS.find(p => p.id === platform)?.name}</b>.
                            Ahora tus usuarios pueden autenticarse de forma segura.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                            <button className="btn-primary" onClick={() => window.location.href = '/admin/users'}>Ir a Gestión de Usuarios</button>
                            <button className="btn-ghost" onClick={() => setStep(1)}>Volver a empezar</button>
                        </div>
                    </div>
                )}

                {/* Navigation Footer (except step 4) */}
                {step < 4 && (
                    <div style={{ marginTop: 'auto', paddingTop: 40, display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-dim)' }}>
                        <button
                            className="btn-ghost"
                            disabled={step === 1}
                            onClick={() => setStep(step - 1)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                            <ChevronLeft size={18} /> Anterior
                        </button>

                        <div style={{ display: 'flex', gap: 12 }}>
                            {step < 3 ? (
                                <button
                                    className="btn-primary"
                                    disabled={step === 1 && !platform}
                                    onClick={() => setStep(step + 1)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                                >
                                    Siguiente <ChevronRight size={18} />
                                </button>
                            ) : (
                                <button
                                    className="btn-primary"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    style={{ background: '#10b981', display: 'flex', alignItems: 'center', gap: 8 }}
                                >
                                    {isSaving ? 'Guardando...' : 'Finalizar y Guardar'} <Check size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div style={{ marginTop: 24, display: 'flex', gap: 16 }}>
                <a href="/docs/sso" target="_blank" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-dim)', textDecoration: 'none' }}>
                    <BookOpen size={14} className="" /> Guía de configuración avanzada <ExternalLink size={12} />
                </a>
            </div>

            <style jsx>{`
                .animate-fade-in {
                    animation: fadeIn 0.4s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

// Mock icon for book open since it might not be imported from the parent layout
function BookOpen({ size, className }: { size: number, className: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
    );
}
