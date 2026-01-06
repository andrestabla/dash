"use client";

import Link from 'next/link';
import {
    ArrowRight,
    Layout,
    Clock,
    BarChart3,
    Shield,
    Users,
    Target,
    Zap,
    Globe,
    Briefcase,
    CheckCircle2,
    ChevronRight
} from "lucide-react";

export default function LandingPage() {
    return (
        <div className="landing-root">
            {/* NAVIGATION */}
            <nav className="landing-nav animate-fade-in">
                <div className="container">
                    <div className="nav-content">
                        <div className="logo">
                            <span className="logo-icon">🚀</span>
                            <span className="logo-text">Mis <strong>Proyectos</strong></span>
                        </div>
                        <div className="nav-links">
                            <Link href="/login" className="btn-nav">Iniciar Sesión</Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* HERO SECTION */}
            <section className="hero-section">
                <div className="container hero-container">
                    <div className="hero-content animate-slide-up">
                        <div className="badge animate-bounce-subtle">✨ Nueva Versión V11</div>
                        <h1 className="hero-title">
                            Controla tus proyectos con <span className="text-gradient">Precisión Absoluta</span>
                        </h1>
                        <p className="hero-subtitle">
                            La plataforma definitiva para visualizar flujos de trabajo, gestionar tiempos y alcanzar hitos estratégicos en un solo lugar.
                        </p>
                        <div className="hero-actions">
                            <Link href="/login" className="btn-hero-primary">
                                Descúbrela Ahora <ArrowRight size={20} />
                            </Link>
                            <a href="#features" className="btn-hero-secondary">Ver Características</a>
                        </div>
                    </div>
                    <div className="hero-visual animate-fade-in delay-200">
                        <div className="visual-card">
                            <div className="visual-header">
                                <div className="dots"><span></span><span></span><span></span></div>
                            </div>
                            <div className="visual-body">
                                <div className="skeleton-line full"></div>
                                <div className="skeleton-grid">
                                    <div className="skeleton-box"></div>
                                    <div className="skeleton-box"></div>
                                    <div className="skeleton-box"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="hero-bg-glow"></div>
            </section>

            {/* WHAT IS IT? */}
            <section className="section-padding" id="about">
                <div className="container">
                    <div className="section-header center">
                        <h2 className="section-title">¿Qué es Mis Proyectos?</h2>
                        <p className="section-desc">
                            Es un ecosistema digital diseñado para líderes que demandan visibilidad total. Olvídate de las hojas de cálculo dispersas; centraliza tu estrategia.
                        </p>
                    </div>
                    <div className="features-grid">
                        <div className="feat-card glass-panel hover-lift">
                            <div className="feat-icon"><Layout /></div>
                            <h3>Visualización Kanban</h3>
                            <p>Gestiona tareas por estados, prioridades y semanas con un arrastrar y soltar fluido.</p>
                        </div>
                        <div className="feat-card glass-panel hover-lift">
                            <div className="feat-icon"><Clock /></div>
                            <h3>Línea de Tiempo</h3>
                            <p>Visualiza el progreso cronológico y asegúrate de cumplir con los Gates de cada etapa.</p>
                        </div>
                        <div className="feat-card glass-panel hover-lift">
                            <div className="feat-icon"><BarChart3 /></div>
                            <h3>Analytics Avanzado</h3>
                            <p>Toma decisiones basadas en datos reales con gráficos de rendimiento y KPIs automáticos.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* BENEFITS */}
            <section className="section-padding bg-alt">
                <div className="container">
                    <div className="split-layout">
                        <div className="split-content">
                            <h2 className="section-title">Beneficios que impulsan tu <span className="text-gradient">Productividad</span></h2>
                            <ul className="benefits-list">
                                <li><CheckCircle2 size={24} className="icon-success" /> <strong>Transparencia:</strong> Todos saben quién hace qué y para cuándo.</li>
                                <li><CheckCircle2 size={24} className="icon-success" /> <strong>Reducción de Riesgos:</strong> Identifica cuellos de botella antes de que ocurran.</li>
                                <li><CheckCircle2 size={24} className="icon-success" /> <strong>Agilidad:</strong> Adapta el tablero a tu metodología en segundos.</li>
                                <li><CheckCircle2 size={24} className="icon-success" /> <strong>Acceso Público/Privado:</strong> Comparte avances con clientes de forma segura.</li>
                            </ul>
                        </div>
                        <div className="split-visual">
                            <div className="benefits-stats glass-panel">
                                <div className="stat-item">
                                    <span className="stat-val">+40%</span>
                                    <span className="stat-lab">Eficiencia Operativa</span>
                                </div>
                                <div className="stat-divider"></div>
                                <div className="stat-item">
                                    <span className="stat-val">100%</span>
                                    <span className="stat-lab">Visibilidad de Hitos</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* USE CASES */}
            <section className="section-padding" id="use-cases">
                <div className="container">
                    <div className="section-header center">
                        <h2 className="section-title">Diseñado para cada Escenario</h2>
                    </div>
                    <div className="use-cases-grid">
                        {[
                            { title: "Desarrollo de Software", icon: <Zap />, desc: "Sprints, deploys y control de bugs." },
                            { title: "Campañas de Marketing", icon: <Target />, desc: "Lanzamientos, activos y seguimiento de KPI." },
                            { title: "Gestión Administrativa", icon: <Briefcase />, desc: "Procesos internos y cumplimiento normativo." },
                            { title: "Proyectos Globales", icon: <Globe />, desc: "Equipos remotos sincronizados en tiempo real." }
                        ].map((uc, i) => (
                            <div key={i} className="uc-item hover-lift">
                                <div className="uc-icon">{uc.icon}</div>
                                <h4>{uc.title}</h4>
                                <p>{uc.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FINAL CTA */}
            <section className="cta-section">
                <div className="container">
                    <div className="cta-card glass-panel animate-slide-up">
                        <h2>¿Listo para transformar tu gestión?</h2>
                        <p>Únete a los equipos que ya están optimizando sus resultados con Mis Proyectos.</p>
                        <Link href="/login" className="btn-hero-primary large">
                            Descubre la Plataforma <ChevronRight />
                        </Link>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="landing-footer">
                <div className="container">
                    <div className="footer-content">
                        <div className="logo-small">🚀 Mis Proyectos</div>
                        <div className="footer-copyright">© 2026 Algoritmo T. Todos los derechos reservados.</div>
                    </div>
                </div>
            </footer>

            <style jsx>{`
        .landing-root {
          background: #0f172a;
          color: white;
          font-family: 'Outfit', sans-serif;
          overflow-x: hidden;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
        }

        /* Nav */
        .landing-nav {
          height: 80px;
          display: flex;
          align-items: center;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .nav-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 20px;
        }

        .logo-text strong {
          color: #3b82f6;
        }

        .btn-nav {
          background: rgba(255,255,255,0.05);
          padding: 8px 20px;
          border-radius: 30px;
          text-decoration: none;
          color: white;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .btn-nav:hover {
          background: white;
          color: #0f172a;
        }

        /* Hero */
        .hero-section {
          padding: 160px 0 100px;
          position: relative;
        }

        .hero-container {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 60px;
          align-items: center;
        }

        .hero-title {
          font-size: 64px;
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 24px;
          letter-spacing: -2px;
        }

        .hero-subtitle {
          font-size: 20px;
          color: #94a3b8;
          max-width: 600px;
          margin-bottom: 40px;
          line-height: 1.6;
        }

        .badge {
          display: inline-block;
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          margin-bottom: 20px;
          border: 1px solid rgba(59,130,246,0.2);
        }

        .hero-actions {
          display: flex;
          gap: 16px;
        }

        .btn-hero-primary {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          padding: 16px 32px;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.3s;
          box-shadow: 0 10px 30px rgba(37, 99, 235, 0.3);
        }

        .btn-hero-primary:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(37, 99, 235, 0.5);
        }

        .btn-hero-secondary {
          padding: 16px 32px;
          color: #94a3b8;
          text-decoration: none;
          font-weight: 600;
          transition: color 0.2s;
        }

        .btn-hero-secondary:hover {
          color: white;
        }

        /* Visual Card */
        .visual-card {
          background: #1e293b;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.1);
          overflow: hidden;
          box-shadow: 0 40px 80px rgba(0,0,0,0.5);
          position: relative;
          z-index: 2;
        }

        .visual-header {
          background: #334155;
          padding: 12px 20px;
          display: flex;
        }

        .dots { display: flex; gap: 6px; }
        .dots span { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,0.2); }

        .visual-body { padding: 30px; }
        .skeleton-line { height: 12px; background: rgba(255,255,255,0.05); border-radius: 6px; margin-bottom: 20px; }
        .skeleton-line.full { width: 100%; }
        .skeleton-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        .skeleton-box { height: 100px; background: rgba(255,255,255,0.05); border-radius: 12px; }

        .hero-bg-glow {
          position: absolute;
          top: 0;
          right: 0;
          width: 800px;
          height: 800px;
          background: radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%);
          z-index: 1;
        }

        /* Sections */
        .section-padding { padding: 120px 0; }
        .bg-alt { background: #0c1222; }

        .section-header.center { text-align: center; margin-bottom: 70px; }
        .section-title { font-size: 48px; font-weight: 800; margin-bottom: 20px; }
        .section-desc { font-size: 18px; color: #94a3b8; max-width: 700px; margin: 0 auto; }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 30px;
        }

        .feat-card {
          padding: 40px;
          text-align: center;
        }

        .feat-icon {
          width: 60px;
          height: 60px;
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
        }

        .feat-card h3 { font-size: 24px; margin-bottom: 16px; font-weight: 700; }
        .feat-card p { color: #94a3b8; line-height: 1.6; }

        /* Split */
        .split-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 100px;
          align-items: center;
        }

        .benefits-list { list-style: none; padding: 0; margin-top: 40px; }
        .benefits-list li {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          font-size: 18px;
        }

        .icon-success { color: #10b981; flex-shrink: 0; }

        .benefits-stats {
          padding: 50px;
          display: flex;
          flex-direction: column;
          gap: 30px;
          text-align: center;
        }

        .stat-val { font-size: 48px; font-weight: 800; color: #3b82f6; display: block; }
        .stat-lab { font-size: 14px; text-transform: uppercase; color: #94a3b8; letter-spacing: 2px; }
        .stat-divider { height: 1px; background: rgba(255,255,255,0.05); }

        /* Use Cases */
        .use-cases-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        .uc-item {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          padding: 30px;
          border-radius: 20px;
          transition: all 0.3s;
        }

        .uc-item:hover { background: rgba(255,255,255,0.06); border-color: #3b82f6; }
        .uc-icon { color: #3b82f6; margin-bottom: 20px; }
        .uc-item h4 { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
        .uc-item p { font-size: 14px; color: #94a3b8; line-height: 1.5; }

        /* CTA */
        .cta-section { padding-bottom: 120px; }
        .cta-card {
          background: linear-gradient(135deg, rgba(37,99,235,0.1) 0%, rgba(139,92,246,0.1) 100%);
          padding: 80px;
          text-align: center;
          border-radius: 32px;
        }

        .cta-card h2 { font-size: 42px; font-weight: 800; margin-bottom: 16px; }
        .cta-card p { font-size: 20px; color: #94a3b8; margin-bottom: 40px; }

        /* Footer */
        .landing-footer {
          padding: 60px 0;
          border-top: 1px solid rgba(255,255,255,0.05);
        }

        .footer-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .logo-small { font-weight: 700; color: #94a3b8; }
        .footer-copyright { font-size: 14px; color: #64748b; }

        /* Utilities */
        .text-gradient {
          background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        @media (max-width: 1024px) {
           .hero-container { grid-template-columns: 1fr; text-align: center; }
           .hero-visual { display: none; }
           .hero-subtitle { margin: 0 auto 40px; }
           .hero-actions { justify-content: center; }
           .features-grid { grid-template-columns: 1fr 1fr; }
           .split-layout { grid-template-columns: 1fr; gap: 60px; }
           .use-cases-grid { grid-template-columns: 1fr 1fr; }
        }

        @media (max-width: 640px) {
           .hero-title { font-size: 42px; }
           .features-grid { grid-template-columns: 1fr; }
           .use-cases-grid { grid-template-columns: 1fr; }
           .cta-card { padding: 40px 24px; }
           .cta-card h2 { font-size: 32px; }
           .footer-content { flex-direction: column; gap: 20px; }
        }
      `}</style>
        </div>
    );
}
