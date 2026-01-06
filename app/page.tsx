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
  ChevronRight,
  Sparkles,
  ZapOff,
  Database,
  Lock,
  ExternalLink,
  BookOpen,
  LifeBuoy
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
              <Link href="/login" className="btn-nav secondary">Entrar</Link>
              <Link href="/register" className="btn-nav primary">Regístrate Gratis</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="container hero-container">
          <div className="hero-content animate-slide-up">
            <div className="badge animate-bounce-subtle">
              <Sparkles size={14} /> Versión 11.4 · Estable & Rápida
            </div>
            <h1 className="hero-title">
              La evolución del <span className="text-gradient">Control de Proyectos</span>
            </h1>
            <p className="hero-subtitle">
              Visualiza flujos de trabajo, gestiona tiempos y alcanza hitos con la herramienta que ha refinado su experiencia durante 11 generaciones.
            </p>
            <div className="hero-actions-container">
              <div className="hero-actions">
                <Link href="/register" className="btn-hero-primary">
                  Empezar Ahora - Es Gratis <ArrowRight size={20} />
                </Link>
              </div>
              <p className="friction-reduction">
                No requiere tarjeta de crédito • Acceso inmediato • 100% Cloud
              </p>
            </div>
          </div>

          <div className="hero-visual animate-fade-in delay-200">
            <div className="mockup-frame shadow-large">
              <div className="mockup-header">
                <div className="dots"><span></span><span></span><span></span></div>
                <div className="mockup-address">misproyectos.com.co/board/123</div>
              </div>
              <div className="mockup-body">
                <div className="mockup-sidebar"></div>
                <div className="mockup-main">
                  <div className="mockup-title-bar"></div>
                  <div className="mockup-grid">
                    <div className="mockup-col">
                      <div className="mockup-card-dummy animate-drag">
                        <div className="card-top"></div>
                        <div className="card-mid"></div>
                      </div>
                      <div className="mockup-card-dummy"></div>
                    </div>
                    <div className="mockup-col">
                      <div className="mockup-card-dummy target-pos">
                        <div className="card-top"></div>
                        <div className="card-mid"></div>
                      </div>
                    </div>
                    <div className="mockup-col">
                      <div className="mockup-card-dummy"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="floating-stat animate-float">
                <div className="stat-icon"><CheckCircle2 size={16} /></div>
                <div className="stat-txt">
                  <strong>92%</strong>
                  <span>Progreso Proyecto</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-bg-glow"></div>
      </section>

      {/* TRUST / V11 NARRATIVE */}
      <section className="maturity-section section-padding">
        <div className="container">
          <div className="maturity-grid">
            <div className="maturity-info">
              <h3 className="section-label">Madurez y Estabilidad</h3>
              <h2 className="section-title">11 Versiones <span className="text-gradient">Refinando el Éxito</span></h2>
              <p className="section-desc text-left">
                No somos una herramienta nueva experimentando con tus datos. Llevamos 11 versiones evolucionando la interfaz y la lógica de negocio basándonos en feedback real de directivos y gerentes de proyectos.
              </p>
              <div className="tech-pills">
                <div className="tech-pill"><Zap size={18} /> Sincronización Real-time</div>
                <div className="tech-pill"><Database size={18} /> Base de Datos Distribuida</div>
                <div className="tech-pill"><Lock size={18} /> Seguridad Grado Industrial</div>
              </div>
            </div>
            <div className="maturity-stats">
              <div className="stat-card">
                <span className="stat-big">+1000</span>
                <p>Usuarios VIP</p>
              </div>
              <div className="stat-card">
                <span className="stat-big">99.9%</span>
                <p>Uptime Garantizado</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VIEW GALLERY (Show Don't Tell) */}
      <section className="section-padding bg-alt" id="gallery">
        <div className="container">
          <div className="section-header center">
            <h2 className="section-title">La Estética del Orden</h2>
            <p className="section-desc">Mantenemos la complejidad oculta bajo una interfaz minimalista y elegante.</p>
          </div>

          <div className="gallery-tabs">
            <div className="gallery-item glass-panel hover-lift">
              <div className="gallery-visual bg-v1">
                <div className="v-card"></div>
                <div className="v-card"></div>
              </div>
              <div className="gallery-info">
                <h4>Dashboard Maestro</h4>
                <p>Visión global de todas tus carpetas y proyectos en un solo panel central.</p>
              </div>
            </div>
            <div className="gallery-item glass-panel hover-lift">
              <div className="gallery-visual bg-v2">
                <div className="v-timeline">
                  <div className="v-bar"></div>
                  <div className="v-bar delay"></div>
                </div>
              </div>
              <div className="gallery-info">
                <h4>Línea de Tiempo</h4>
                <p>Control exacto de fechas de inicio, fin y hitos críticos (Gates).</p>
              </div>
            </div>
            <div className="gallery-item glass-panel hover-lift">
              <div className="gallery-visual bg-v3">
                <div className="v-chart"></div>
              </div>
              <div className="gallery-info">
                <h4>Reportes de Impacto</h4>
                <p>Analítica consolidada por carpeta para medir el rendimiento real del equipo.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KILLER FEATURE: PUBLIC ACCESS */}
      <section className="section-padding">
        <div className="container">
          <div className="killer-feature glass-panel">
            <div className="killer-content">
              <div className="killer-badge">Killer Feature 🔥</div>
              <h2>Comparte tus avances <span className="text-gradient">Sin Fricción</span></h2>
              <p>
                Genera enlaces públicos protegidos para que tus clientes o inversores vean el progreso en tiempo real.
                <strong> No necesitan registrarse, no necesitan pagar.</strong> Transparencia radical que genera confianza.
              </p>
              <Link href="/register" className="btn-hero-secondary">Probar Enlaces Públicos <ExternalLink size={16} /></Link>
            </div>
            <div className="killer-visual">
              <div className="public-link-box">
                <span>misproyectos.com.co/public/board/7x2h...</span>
                <button>Copiar Link</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* USE CASES SPECIFIC */}
      <section className="section-padding" id="use-cases">
        <div className="container">
          <div className="section-header center">
            <h2 className="section-title">Diseñado para tu Rol</h2>
          </div>
          <div className="use-cases-grid">
            <div className="uc-item hover-lift">
              <div className="uc-icon"><Zap /></div>
              <h4>Para Desarrolladores</h4>
              <p>Conecta tus flujos de trabajo con tus tareas y prioriza técnicamente sin perder el foco del negocio.</p>
              <span className="uc-benefit">"Lanza más rápido con menos bugs."</span>
            </div>
            <div className="uc-item hover-lift">
              <div className="uc-icon"><Target /></div>
              <h4>Para Marketing</h4>
              <p>Visualiza calendarios de contenido, gestiona activos y aprueba creativos con un solo clic.</p>
              <span className="uc-benefit">"Sincroniza tus campañas globales."</span>
            </div>
            <div className="uc-item hover-lift">
              <div className="uc-icon"><Briefcase /></div>
              <h4>Para Administrativos</h4>
              <p>Control de procesos internos, auditorías y cumplimiento normativo con trazabilidad completa.</p>
              <span className="uc-benefit">"Orden total en tu documentación."</span>
            </div>
            <div className="uc-item hover-lift">
              <div className="uc-icon"><Globe /></div>
              <h4>Para Equipos Remotos</h4>
              <p>La verdad única para equipos distribuidos por el mundo sincronizados al milisegundo.</p>
              <span className="uc-benefit">"Elimina las reuniones de estado."</span>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-card glass-panel animate-slide-up">
            <h2>Únete a la nueva era de la Gestión</h2>
            <p>Crea tu primer tablero en menos de 30 segundos. Sin compromisos.</p>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <Link href="/register" className="btn-hero-primary large">
                Crear mi cuenta gratis <ChevronRight />
              </Link>
              <p className="cta-sub">¿Ya tienes cuenta? <Link href="/login" style={{ color: 'white', fontWeight: 600 }}>Inicia sesión aquí</Link></p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <div className="logo-small">🚀 Mis Proyectos</div>
              <p className="brand-desc">Refinando la gestión de proyectos desde 2018.</p>
              <div className="corporate-badge">
                <span>Respaldado por</span>
                <Link href="https://algoritmot.com" target="_blank">Algoritmo T</Link>
              </div>
            </div>
            <div className="footer-nav">
              <div className="footer-col">
                <h5>Producto</h5>
                <Link href="#gallery">Galería</Link>
                <Link href="#use-cases">Casos de Uso</Link>
                <Link href="/register">Precios (Gratis)</Link>
              </div>
              <div className="footer-col">
                <h5>Soporte</h5>
                <Link href="/docs" className="flex-link"><BookOpen size={14} /> Documentación</Link>
                <Link href="/help" className="flex-link"><LifeBuoy size={14} /> Guía de Inicio</Link>
              </div>
              <div className="footer-col">
                <h5>Plataforma</h5>
                <Link href="/login">Acceso Cliente</Link>
                <Link href="/register">Registro</Link>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-copyright">© 2026 Algoritmo T. Todos los derechos reservados.</div>
            <div className="social-links">
              <Link href="https://linkedin.com/company/algoritmo-t" target="_blank">LinkedIn</Link>
            </div>
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

        .nav-links {
          display: flex;
          gap: 12px;
        }

        .btn-nav {
          padding: 8px 20px;
          border-radius: 30px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .btn-nav.secondary {
          background: rgba(255,255,255,0.05);
          color: white;
        }

        .btn-nav.primary {
          background: white;
          color: #0f172a;
        }

        .btn-nav:hover {
          transform: translateY(-2px);
        }

        /* Hero */
        .hero-section {
          padding: 160px 0 100px;
          position: relative;
        }

        .hero-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
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
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 700;
          margin-bottom: 20px;
          border: 1px solid rgba(59,130,246,0.2);
        }

        .hero-actions-container {
           margin-top: 40px;
        }

        .hero-actions {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
        }

        .friction-reduction {
           font-size: 14px;
           color: #64748b;
           font-weight: 500;
        }

        .btn-hero-primary {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          padding: 18px 36px;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.3s;
          box-shadow: 0 10px 30px rgba(37, 99, 235, 0.3);
        }

        .btn-hero-primary.large {
           padding: 20px 48px;
           font-size: 18px;
        }

        .btn-hero-primary:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(37, 99, 235, 0.5);
        }

        .btn-hero-secondary {
          padding: 12px 24px;
          background: rgba(255,255,255,0.05);
          color: white;
          text-decoration: none;
          font-weight: 600;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.1);
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        .btn-hero-secondary:hover {
          background: white;
          color: #0f172a;
        }

        /* Mockup Frame */
        .mockup-frame {
          background: #1e293b;
          border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.1);
          overflow: hidden;
          position: relative;
          aspect-ratio: 4/3;
        }

        .mockup-header {
          background: #334155;
          padding: 10px 20px;
          display: flex;
          align-items: center;
        }

        .dots { display: flex; gap: 6px; }
        .dots span { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.2); }
        .mockup-address { margin: 0 auto; color: #94a3b8; font-size: 10px; opacity: 0.5; }

        .mockup-body { display: flex; height: 100%; }
        .mockup-sidebar { width: 60px; background: #0f172a; opacity: 0.5; }
        .mockup-main { flex: 1; padding: 20px; background: #0c1222; }
        .mockup-title-bar { height: 12px; width: 40%; background: #1e293b; border-radius: 6px; margin-bottom: 20px; }
        .mockup-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        .mockup-col { display: flex; flexDirection: column; gap: 8px; }
        .mockup-card-dummy { background: #1e293b; border-radius: 8px; height: 80px; padding: 10px; }
        .card-top { height: 6px; width: 60%; background: #334155; border-radius: 3px; margin-bottom: 8px;}
        .card-mid { height: 4px; width: 40%; background: #334155; border-radius: 2px; }

        .target-pos { border: 2px dashed #3b82f6; background: rgba(59,130,246,0.05); }

        .floating-stat {
           position: absolute;
           bottom: 40px;
           left: -30px;
           background: white;
           color: #0f172a;
           padding: 16px 24px;
           border-radius: 16px;
           box-shadow: 0 20px 40px rgba(0,0,0,0.3);
           display: flex;
           align-items: center;
           gap: 12px;
        }

        .stat-icon { color: #10b981; }
        .stat-txt strong { display: block; font-size: 18px; line-height: 1; }
        .stat-txt span { font-size: 11px; color: #64748b; font-weight: 600; }

        /* Maturity Section */
        .maturity-grid {
           display: grid;
           grid-template-columns: 1fr 1fr;
           gap: 80px;
           align-items: center;
        }

        .section-label { font-size: 14px; text-transform: uppercase; letter-spacing: 2px; color: #3b82f6; margin-bottom: 12px; }
        .tech-pills { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 32px; }
        .tech-pill { padding: 10px 18px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 30px; font-size: 14px; display: flex; align-items: center; gap: 8px; font-weight: 500; }

        .maturity-stats { display: flex; gap: 24px; }
        .stat-card {
           flex: 1;
           background: rgba(255,255,255,0.03);
           padding: 40px;
           border-radius: 24px;
           text-align: center;
           border: 1px solid rgba(255,255,255,0.05);
        }
        .stat-big { font-size: 48px; font-weight: 800; color: #3b82f6; display: block; line-height: 1; margin-bottom: 8px; }
        .stat-card p { font-size: 14px; color: #94a3b8; margin: 0; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }

        /* Gallery */
        .gallery-tabs {
           display: grid;
           grid-template-columns: repeat(3, 1fr);
           gap: 24px;
        }
        .gallery-item {
           padding: 32px;
           overflow: hidden;
        }
        .gallery-visual {
           height: 200px;
           border-radius: 12px;
           margin-bottom: 24px;
           background: #1e293b;
           display: flex;
           align-items: center;
           justify-content: center;
        }
        .bg-v1 { background: radial-gradient(circle at center, #1e1b4b 0%, #0c1222 100%); }
        .bg-v2 { background: radial-gradient(circle at center, #064e3b 0%, #0c1222 100%); }
        .bg-v3 { background: radial-gradient(circle at center, #4c1d95 0%, #0c1222 100%); }

        .gallery-info h4 { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
        .gallery-info p { font-size: 14px; color: #94a3b8; line-height: 1.6; }

        /* Killer Feature */
        .killer-feature {
           padding: 80px;
           display: grid;
           grid-template-columns: 1fr 1fr;
           gap: 60px;
           align-items: center;
        }
        .killer-badge { color: #f59e0b; font-weight: 800; font-size: 14px; text-transform: uppercase; margin-bottom: 16px; }
        .killer-content h2 { font-size: 42px; font-weight: 800; margin-bottom: 24px; }
        .killer-content p { font-size: 18px; color: #94a3b8; margin-bottom: 32px; line-height: 1.6; }
        .killer-content strong { color: white; }

        .public-link-box {
           background: #0f172a;
           padding: 20px;
           border-radius: 12px;
           border: 1px solid #3b82f6;
           display: flex;
           flex-direction: column;
           gap: 16px;
           box-shadow: 0 0 40px rgba(59,130,246,0.2);
        }
        .public-link-box span { font-size: 14px; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; }
        .public-link-box button { background: #3b82f6; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 700; cursor: pointer; }

        /* Sections */
        .section-padding { padding: 120px 0; }
        .bg-alt { background: #0c1222; }

        .section-header.center { text-align: center; margin-bottom: 70px; }
        .section-title { font-size: 48px; font-weight: 800; margin-bottom: 20px; }
        .section-desc { font-size: 18px; color: #94a3b8; max-width: 700px; margin: 0 auto; }

        /* Split */
        .split-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 100px;
          align-items: center;
        }

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
          display: flex;
          flex-direction: column;
        }

        .uc-item:hover { background: rgba(255,255,255,0.06); border-color: #3b82f6; }
        .uc-icon { color: #3b82f6; margin-bottom: 20px; }
        .uc-item h4 { font-size: 18px; font-weight: 700; margin-bottom: 12px; }
        .uc-item p { font-size: 14px; color: #94a3b8; line-height: 1.5; margin-bottom: 20px; flex: 1; }
        .uc-benefit { font-size: 12px; color: #3b82f6; font-style: italic; font-weight: 600; padding: 10px; background: rgba(59,130,246,0.1); border-radius: 6px; }

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
        .cta-sub { color: #64748b; font-size: 15px; }

        /* Footer */
        .landing-footer {
          padding: 80px 0 40px;
          border-top: 1px solid rgba(255,255,255,0.05);
          background: #0c1222;
        }

        .footer-top {
           display: grid;
           grid-template-columns: 1fr 2fr;
           gap: 100px;
           margin-bottom: 80px;
        }

        .footer-brand { max-width: 300px; }
        .brand-desc { color: #64748b; font-size: 14px; margin: 16px 0 24px; }
        .corporate-badge { font-size: 12px; display: flex; align-items: center; gap: 8px; color: #94a3b8; }
        .corporate-badge a { color: #3b82f6; text-decoration: none; font-weight: 600; }

        .footer-nav {
           display: grid;
           grid-template-columns: repeat(3, 1fr);
           gap: 40px;
        }

        .footer-col h5 { font-size: 16px; margin-bottom: 20px; font-weight: 700; }
        .footer-col a { display: block; color: #94a3b8; text-decoration: none; margin-bottom: 12px; font-size: 14px; transition: color 0.2s; }
        .footer-col a:hover { color: white; }
        .flex-link { display: flex !important; align-items: center; gap: 8px; }

        .footer-bottom {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 40px;
          border-top: 1px solid rgba(255,255,255,0.03);
        }

        .logo-small { font-weight: 700; font-size: 18px; }
        .footer-copyright { font-size: 14px; color: #64748b; }
        .social-links a { font-size: 14px; color: #64748b; text-decoration: none; }

        /* Utilities */
        .text-gradient {
          background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* Animations */
        @keyframes drag {
           0% { transform: translate(0, 0); }
           40% { transform: translate(110%, 0); scale: 1.05; }
           60% { transform: translate(110%, 0); scale: 1.05; }
           100% { transform: translate(0, 0); }
        }
        .animate-drag { animation: drag 5s infinite; }

        @keyframes float {
           0%, 100% { transform: translateY(0); }
           50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 4s infinite; }

        @media (max-width: 1024px) {
           .hero-container { grid-template-columns: 1fr; text-align: center; }
           .hero-visual { display: none; }
           .hero-subtitle { margin: 0 auto 40px; }
           .hero-actions { justify-content: center; }
           .maturity-grid { grid-template-columns: 1fr; gap: 40px; }
           .gallery-tabs { grid-template-columns: 1fr 1fr; }
           .killer-feature { grid-template-columns: 1fr; padding: 40px; }
           .footer-top { grid-template-columns: 1fr; gap: 60px; }
        }

        @media (max-width: 640px) {
           .hero-title { font-size: 42px; }
           .gallery-tabs { grid-template-columns: 1fr; }
           .use-cases-grid { grid-template-columns: 1fr; }
           .footer-nav { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
