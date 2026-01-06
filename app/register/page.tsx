"use client";

import { useState } from "react";
import Link from "next/link";
import { User, Mail, Lock, ArrowRight, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

export default function RegisterPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Las contraseñas no coinciden");
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await res.json();

            if (res.ok) {
                setSuccess(true);
            } else {
                setError(data.error || "Ocurrió un error al registrarse");
            }
        } catch (err) {
            setError("Error de conexión");
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', padding: 20 }}>
                <div className="glass-panel animate-fade-in" style={{ maxWidth: 450, width: '100%', padding: '40px 30px', textAlign: 'center' }}>
                    <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                        <CheckCircle2 size={48} />
                    </div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-main)', marginBottom: 16 }}>¡Solicitud Enviada!</h1>
                    <p style={{ color: 'var(--text-dim)', fontSize: 16, lineHeight: 1.6, marginBottom: 32 }}>
                        Tu solicitud de registro ha sido recibida correctamente. Un administrador revisará tu cuenta pronto para activarla.
                    </p>
                    <div style={{ background: 'rgba(59, 130, 246, 0.05)', padding: 20, borderRadius: 16, marginBottom: 32, border: '1px solid var(--border-dim)' }}>
                        <p style={{ margin: 0, fontSize: 14, color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <Mail size={16} /> Te avisaremos por correo electrónico
                        </p>
                    </div>
                    <Link href="/login" className="btn-primary" style={{ display: 'inline-flex', padding: '12px 32px' }}>
                        Volver al Inicio
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)', padding: 20 }}>
            <div className="glass-panel animate-slide-up" style={{ maxWidth: 450, width: '100%', padding: '40px 30px' }}>
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                    <div style={{ display: 'inline-flex', background: 'var(--primary)', color: 'white', padding: 12, borderRadius: 16, marginBottom: 20, boxShadow: '0 8px 16px rgba(59, 130, 246, 0.2)' }}>
                        <ShieldCheck size={32} />
                    </div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Crear Cuenta</h1>
                    <p style={{ color: 'var(--text-dim)', marginTop: 8 }}>Únete y gestiona tus proyectos con control total.</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {error && (
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '12px 16px', borderRadius: 12, fontSize: 14, fontWeight: 600, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Nombre Completo</label>
                        <div style={{ position: 'relative' }}>
                            <User size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                            <input
                                className="input-glass"
                                style={{ paddingLeft: 44 }}
                                placeholder="Pedro Pérez"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Correo Electrónico</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                            <input
                                type="email"
                                className="input-glass"
                                style={{ paddingLeft: 44 }}
                                placeholder="ejemplo@correo.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Contraseña</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                            <input
                                type="password"
                                className="input-glass"
                                style={{ paddingLeft: 44 }}
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                minLength={6}
                                required
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Confirmar Contraseña</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                            <input
                                type="password"
                                className="input-glass"
                                style={{ paddingLeft: 44 }}
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={isLoading}
                        style={{ padding: '14px', marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : (
                            <>Solicitar Registro <ArrowRight size={20} /></>
                        )}
                    </button>
                </form>

                <div style={{ marginTop: 32, textAlign: 'center', paddingTop: 32, borderTop: '1px solid var(--border-dim)' }}>
                    <p style={{ color: 'var(--text-dim)', fontSize: 14 }}>
                        ¿Ya tienes cuenta? <Link href="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Inicia sesión</Link>
                    </p>
                </div>
            </div>

            <style jsx>{`
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slide-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.5s ease-out; }
                .animate-slide-up { animation: slide-up 0.5s ease-out; }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

function get_id() { return "1767721200001"; }
