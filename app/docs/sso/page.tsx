"use client";

import Link from 'next/link';
import {
    ArrowLeft,
    Shield,
    Key,
    Globe,
    Lock,
    CheckCircle2,
    AlertCircle,
    Server,
    ExternalLink
} from "lucide-react";

export default function SSODocs() {
    return (
        <div className="docs-root">
            <header className="docs-header animate-fade-in">
                <div className="container">
                    <div className="header-content">
                        <Link href="/docs" className="back-link">
                            <ArrowLeft size={16} /> Volver a Docs
                        </Link>
                        <div className="logo">
                            <img src="https://imageneseiconos.s3.us-east-1.amazonaws.com/iconos/logo_misproyectos.png" alt="Mis Proyectos" style={{ height: 32 }} />
                        </div>
                    </div>
                </div>
            </header>

            <main className="container docs-main">
                <div className="docs-layout">
                    <aside className="docs-sidebar animate-slide-up">
                        <nav className="docs-nav">
                            <h3>Configuración SSO</h3>
                            <ul>
                                <li><a href="#overview">Resumen</a></li>
                                <li><a href="#google">Google Workspace</a></li>
                                <li><a href="#microsoft">Microsoft Azure AD</a></li>
                                <li><a href="#troubleshooting">Solución de Problemas</a></li>
                            </ul>
                        </nav>
                    </aside>

                    <section className="docs-content animate-fade-in delay-100">
                        <div id="overview" className="doc-section">
                            <h1 className="doc-title"><Shield className="icon-blue" /> Configuración de SSO</h1>
                            <p className="lead">
                                Single Sign-On (SSO) permite a tus colaboradores acceder a **MisProyectos** utilizando sus credenciales corporativas existentes, mejorando la seguridad y la experiencia de usuario.
                            </p>

                            <div className="doc-card glass-panel">
                                <h3>Protocolos Soportados</h3>
                                <p>
                                    Actualmente soportamos integración nativa con **Google Workspace (OpenID Connect)** y **Microsoft Entra ID (Azure AD)**.
                                </p>
                            </div>
                        </div>

                        <div id="google" className="doc-section">
                            <h2><Globe className="icon-blue" /> Google Workspace</h2>
                            <p>Sigue estos pasos para configurar la autenticación con Google:</p>
                            <div className="steps-list">
                                <div className="step-item">
                                    <div className="step-num">1</div>
                                    <div className="step-text">
                                        <strong>Google Cloud Console:</strong> Crea un nuevo proyecto en la [consola de Google Cloud](https://console.cloud.google.com/).
                                    </div>
                                </div>
                                <div className="step-item">
                                    <div className="step-num">2</div>
                                    <div className="step-text">
                                        <strong>OAuth Consent Screen:</strong> Configura la pantalla de consentimiento como "Internal" o "External" según tu organización.
                                    </div>
                                </div>
                                <div className="step-item">
                                    <div className="step-num">3</div>
                                    <div className="step-text">
                                        <strong>Credenciales:</strong> Crea credenciales de tipo "ID de cliente de OAuth 2.0" para una "Aplicación Web".
                                    </div>
                                </div>
                                <div className="step-item">
                                    <div className="step-num">4</div>
                                    <div className="step-text">
                                        <strong>URIs de Redireccionamiento:</strong> Agrega la URL de retorno proporcionada en el Panel de Administración (ej: <code>https://tu-dominio.com/api/auth/callback/sso</code>).
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="microsoft" className="doc-section">
                            <h2><Server className="icon-purple" /> Microsoft Azure AD / Entra ID</h2>
                            <p>Para configurar la integración con Microsoft:</p>
                            <ul className="check-list">
                                <li>Registra una nueva aplicación en el portal de Azure.</li>
                                <li>Configura los permisos de API (openid, email, profile).</li>
                                <li>Genera un "Client Secret" y cópialo de inmediato.</li>
                                <li>Copia el "ID de directorio (inquilino)" para la URL de Authority.</li>
                            </ul>
                        </div>

                        <div id="troubleshooting" className="doc-section">
                            <h2><AlertCircle className="icon-orange" /> Solución de Problemas</h2>
                            <div className="doc-card glass-panel" style={{ borderLeft: '4px solid #f59e0b' }}>
                                <h4 style={{ color: 'white', marginBottom: 8 }}>Error: redirect_uri_mismatch</h4>
                                <p>
                                    Asegúrate de que la URL configurada en el proveedor de identidad coincida exactamente con la URL desde la que se accede a la aplicación (incluyendo HTTP vs HTTPS).
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            <style jsx>{`
                .docs-root { background: #0f172a; color: white; min-height: 100vh; font-family: 'Outfit', sans-serif; }
                .container { max-width: 1240px; margin: 0 auto; padding: 0 40px; }
                .docs-header { height: 80px; display: flex; align-items: center; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(24px); border-bottom: 1px solid rgba(255,255,255,0.05); position: sticky; top: 0; z-index: 100; }
                .header-content { display: flex; justify-content: space-between; align-items: center; width: 100%; }
                .back-link { color: #94a3b8; text-decoration: none; font-size: 14px; display: flex; align-items: center; gap: 8px; transition: color 0.2s; }
                .back-link:hover { color: white; }
                .docs-main { padding: 60px 0; }
                .docs-layout { display: grid; grid-template-columns: 280px 1fr; gap: 60px; }
                .docs-sidebar { position: sticky; top: 140px; height: fit-content; }
                .docs-nav h3 { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #3b82f6; margin-bottom: 16px; font-weight: 800; }
                .docs-nav ul { list-style: none; padding: 0; margin-bottom: 32px; }
                .docs-nav li { margin-bottom: 10px; }
                .docs-nav a { color: #94a3b8; text-decoration: none; font-size: 15px; transition: all 0.2s; }
                .docs-nav a:hover { color: white; padding-left: 4px; }
                .docs-content { max-width: 800px; }
                .doc-section { margin-bottom: 80px; scroll-margin-top: 120px; }
                .doc-title { font-size: 48px; font-weight: 800; margin-bottom: 24px; display: flex; align-items: center; gap: 16px; }
                .lead { font-size: 20px; color: #94a3b8; line-height: 1.6; margin-bottom: 40px; }
                .doc-card { padding: 32px; border-radius: 24px; margin-top: 24px; }
                .glass-panel { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); }
                h2 { font-size: 28px; font-weight: 800; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; }
                .steps-list { display: flex; flex-direction: column; gap: 20px; }
                .step-item { display: flex; gap: 20px; align-items: flex-start; }
                .step-num { width: 32px; height: 32px; background: #3b82f6; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; flex-shrink: 0; }
                .step-text { color: #94a3b8; line-height: 1.6; }
                .step-text strong { color: white; display: block; margin-bottom: 4px; }
                .check-list { list-style: none; padding: 0; }
                .check-list li { margin-bottom: 12px; color: #94a3b8; display: flex; align-items: center; gap: 12px; font-size: 15px; }
                .check-list li::before { content: '✓'; color: #10b981; font-weight: 800; }
                .icon-blue { color: #3b82f6; }
                .icon-purple { color: #8b5cf6; }
                .icon-orange { color: #f59e0b; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
                .animate-slide-up { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .delay-100 { animation-delay: 100ms; }
                @media (max-width: 1024px) { .docs-layout { grid-template-columns: 1fr; } .docs-sidebar { display: none; } }
            `}</style>
        </div>
    );
}
