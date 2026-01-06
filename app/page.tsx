"use client";

import Link from 'next/link';
import {
  ArrowRight,
  Layout,
  BarChart3,
  Shield,
  Users,
  Target,
  Zap,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  BookOpen,
  LifeBuoy,
  AlertCircle,
  Eye,
  MousePointer2,
  Share2,
  PieChart,
  Layers,
  HelpCircle,
  MessageSquare,
  ZapOff,
  Globe,
  Lock,
  Search,
  Plus
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="landing-root">
      {/* NAVIGATION */}
      <nav className="landing-nav animate-fade-in">
        <div className="container">
          <div className="nav-content">
            <div className="logo">
              <img src="https://imageneseiconos.s3.us-east-1.amazonaws.com/iconos/logo_misproyectos.png" alt="Mis Proyectos" style={{ height: 40 }} />
            </div>
            <div className="nav-menu">
              <a href="#what-is">Qué es</a>
              <a href="#how-works">Cómo funciona</a>
              <a href="#benefits">Beneficios</a>
              <a href="#capabilities">Capacidades</a>
              <a href="#contact">Contacto</a>
            </div>
            <div className="nav-links" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <Link href="/login" className="btn-nav secondary">Entrar</Link>
              <Link href="/register" className="btn-nav primary">Regístrate</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO SECTION - PEDAGOGICAL & VISUAL */}
      <section className="hero-section" id="hero">
        <div className="container hero-container">
          <div className="hero-content animate-slide-up">
            <div className="badge animate-bounce-subtle">
              <Sparkles size={14} /> Gestión de Proyectos de Nueva Generación
            </div>
            <h1 className="hero-title">
              Una plataforma integral para <span className="text-gradient">organizar, hacer seguimiento y tomar decisiones</span> sobre tus proyectos, equipos y resultados.
            </h1>
            <p className="hero-subtitle">
              Diseñada para organizaciones que gestionan múltiples proyectos y requieren visibilidad, control y trazabilidad en un solo lugar.
            </p>
            <div className="hero-actions">
              <a href="#how-works" className="btn-hero-primary shadow-glow">
                Conocer la plataforma <ArrowRight size={20} />
              </a>
              <a href="#contact" className="btn-hero-ghost">
                Solicitar una demo guiada
              </a>
            </div>
          </div>

          <div className="hero-visual animate-fade-in delay-200">
            <div className="main-mockup-frame shadow-large">
              <img src="/Users/andrestabla/.gemini/antigravity/brain/2468aa2b-68ea-45d7-8573-a603e4fe7dc0/kanban_board_mockup_1767741346726.png" alt="Kanban Board Mockup" className="mockup-img" />
              <div className="floating-badge top-right animate-float">
                <Target size={16} /> 100% Trazable
              </div>
              <div className="floating-badge bottom-left animate-float delay-500">
                <Users size={16} /> Colaboración Real
              </div>
            </div>
          </div>
        </div>
        <div className="hero-bg-glow"></div>
      </section>

      {/* THE PROBLEM SECTION */}
      <section className="section-padding bg-alt" id="problem">
        <div className="container">
          <div className="section-header center">
            <h3 className="section-label">El desafío</h3>
            <h2 className="section-title">¿Tu organización sufre de desorden operativo?</h2>
            <p className="section-desc">Gestionar múltiples frentes sin la herramienta adecuada genera cuellos de botella invisibles.</p>
          </div>
          <div className="problem-grid">
            <div className="problem-card glass-panel hover-lift">
              <div className="problem-icon-wrapper">
                <AlertCircle className="icon-red" />
              </div>
              <h4>Información Dispersa</h4>
              <p>Hojas de cálculo, chats y correos que ocultan la realidad del proyecto.</p>
            </div>
            <div className="problem-card glass-panel hover-lift">
              <div className="problem-icon-wrapper">
                <ZapOff className="icon-red" />
              </div>
              <h4>Falta de Visibilidad</h4>
              <p>Dificultad para saber quién hace qué y cuál es el estado real del avance.</p>
            </div>
            <div className="problem-card glass-panel hover-lift">
              <div className="problem-icon-wrapper">
                <Users className="icon-red" />
              </div>
              <h4>Equipos Desalineados</h4>
              <p>Falta de un hilo conductor que asegure la trazabilidad de las decisiones.</p>
            </div>
          </div>
        </div>
      </section>

      {/* THE SOLUTION SECTION */}
      <section className="section-padding" id="what-is">
        <div className="container">
          <div className="split-layout reverse">
            <div className="visual-side">
              <div className="concept-card glass-panel shadow-large">
                <img src="/Users/andrestabla/.gemini/antigravity/brain/2468aa2b-68ea-45d7-8573-a603e4fe7dc0/portfolio_folders_mockup_1767741376330.png" alt="Portfolio Mockup" className="mockup-img-small" />
              </div>
            </div>
            <div className="info-side">
              <h3 className="section-label">La Solución</h3>
              <h2 className="section-title">MisProyectos: El Centro de Comando</h2>
              <p className="section-desc text-left">
                No es solo un gestor de tareas. Es una plataforma de **Gobernanza de Proyectos** que centraliza la operación y la estrategia en un entorno visual e intuitivo.
              </p>
              <ul className="solution-list">
                <li><CheckCircle2 size={18} /> <strong>Portafolios Inteligentes:</strong> Centraliza carpetas por área o cliente.</li>
                <li><CheckCircle2 size={18} /> <strong>Flujos Adaptables:</strong> Metodologías que se ajustan a tu equipo.</li>
                <li><CheckCircle2 size={18} /> <strong>Toma de Decisiones:</strong> Datos reales para acciones inmediatas.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS (Visual Pipeline) */}
      <section className="section-padding bg-alt" id="how-works">
        <div className="container">
          <div className="section-header center">
            <h2 className="section-title">La Estética de la Eficiencia</h2>
            <p className="section-desc">Un flujo lógico diseñado para que nada se pierda de vista.</p>
          </div>

          <div className="pipeline-container">
            <div className="pipeline-step">
              <div className="p-icon"><Eye /></div>
              <h4>01. Visualización</h4>
              <p>Dashboard maestro con vista global de todos tus portafolios.</p>
            </div>
            <div className="p-arrow">➜</div>
            <div className="pipeline-step">
              <div className="p-icon"><MousePointer2 /></div>
              <h4>02. Seguimiento</h4>
              <p>Gestión ágil de tareas con tableros interactivos y estados claros.</p>
            </div>
            <div className="p-arrow">➜</div>
            <div className="pipeline-step">
              <div className="p-icon"><Share2 /></div>
              <h4>03. Colaborar</h4>
              <p>Accesos públicos y notificaciones automáticas para clientes.</p>
            </div>
            <div className="p-arrow">➜</div>
            <div className="pipeline-step">
              <div className="p-icon"><PieChart /></div>
              <h4>04. Control</h4>
              <p>Analítica en tiempo real para medir el impacto de tu equipo.</p>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS (Outcomes over features) */}
      <section className="section-padding" id="benefits">
        <div className="container">
          <div className="section-header center">
            <h2 className="section-title">Lo que logras con nosotros</h2>
            <p className="section-desc">Resultados tangibles para cada nivel de la organización.</p>
          </div>

          <div className="benefits-grid">
            <div className="benefit-card glass-panel hover-lift">
              <div className="benefit-img-box">
                <img src="/Users/andrestabla/.gemini/antigravity/brain/2468aa2b-68ea-45d7-8573-a603e4fe7dc0/analytics_dashboard_mockup_1767741362202.png" alt="Analytics" />
              </div>
              <div className="benefit-content">
                <h3 className="benefit-title">Mejores decisiones con información visible</h3>
                <p>Accede a reportes automáticos que eliminan la incertidumbre en las juntas directivas.</p>
              </div>
            </div>
            <div className="benefit-card glass-panel hover-lift">
              <div className="benefit-content">
                <h3 className="benefit-title">Reducción del 40% en ruido operativo</h3>
                <p>Elimina las reuniones de "estado" y deja que la plataforma hable por sí misma.</p>
              </div>
              <div className="benefit-img-box">
                <div className="abstract-ui">
                  <div className="ui-line"></div>
                  <div className="ui-line short"></div>
                  <div className="ui-circle"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CAPABILITIES (Grid layout with visuals) */}
      <section className="section-padding bg-alt" id="capabilities">
        <div className="container">
          <div className="section-header center">
            <h2 className="section-title">Capacidades de Clase Mundial</h2>
            <p className="section-desc">Todo el poder de una herramienta robusta bajo una interfaz amigable.</p>
          </div>
          <div className="capability-grid">
            <div className="cap-card glass-panel">
              <div className="cap-icon-box blue"><Layout /></div>
              <h4>Gestión Kanban</h4>
              <p>Arrastra y suelta tareas para un flujo de trabajo fluido y visual.</p>
            </div>
            <div className="cap-card glass-panel">
              <div className="cap-icon-box purple"><Share2 /></div>
              <h4>Folder Sharing</h4>
              <p>Comparte portafolios completos con permisos granulares.</p>
            </div>
            <div className="cap-card glass-panel">
              <div className="cap-icon-box green"><Shield /></div>
              <h4>Gobernanza Total</h4>
              <p>Administración centralizada de usuarios, roles y auditoría.</p>
            </div>
            <div className="cap-card glass-panel">
              <div className="cap-icon-box orange"><ExternalLink /></div>
              <h4>Enlaces Públicos</h4>
              <p>Transparencia radical con clientes sin necesidad de registro.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL INVITATION/CONTACT */}
      <section className="cta-section" id="contact">
        <div className="container">
          <div className="cta-card glass-panel animate-slide-up shadow-glow">
            <h2>Transforma la gestión de tu organización</h2>
            <p>Hablemos sobre cómo MisProyectos puede adaptarse a tu estructura y desafíos actuales.</p>
            <div className="cta-actions">
              <a href="https://wa.me/573044544525" target="_blank" className="btn-hero-primary large shadow-glow">
                Hablar con un asesor <MessageSquare size={20} />
              </a>
              <Link href="/register" className="btn-hero-ghost large">
                Empezar ahora gratis
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-top">
            <div className="footer-brand">
              <img src="https://imageneseiconos.s3.us-east-1.amazonaws.com/iconos/logo_misproyectos.png" alt="Mis Proyectos" style={{ height: 32, marginBottom: 16 }} />
              <p className="brand-desc">Refinando la excelencia operativa desde la Versión 1.0 hasta la 11.4.</p>
              <div className="corporate-badge">
                <span>Una solución de</span>
                <Link href="https://algoritmot.com" target="_blank">Algoritmo T</Link>
              </div>
            </div>
            <div className="footer-nav">
              <div className="footer-col">
                <h5>Explorar</h5>
                <a href="#what-is">Qué es</a>
                <a href="#how-works">Cómo funciona</a>
                <a href="#benefits">Beneficios</a>
              </div>
              <div className="footer-col">
                <h5>Recursos</h5>
                <Link href="/docs" className="flex-link"><BookOpen size={14} /> Documentación</Link>
                <Link href="/help" className="flex-link"><LifeBuoy size={14} /> Ayuda</Link>
              </div>
              <div className="footer-col">
                <h5>Plataforma</h5>
                <Link href="/login">Acceso</Link>
                <Link href="/register">Registro</Link>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-copyright">© 2026 Algoritmo T. Todos los derechos reservados.</div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .landing-root {
          background: #0f172a;
          color: white;
          font-family: 'Outfit', sans-serif;
          scroll-behavior: smooth;
          overflow-x: hidden;
        }

        .container {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 40px;
        }

        /* Nav */
        .landing-nav {
          height: 90px;
          display: flex;
          align-items: center;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(24px);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .nav-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .nav-menu {
           display: flex;
           gap: 40px;
        }

        .nav-menu a {
           color: #94a3b8;
           text-decoration: none;
           font-size: 15px;
           font-weight: 500;
           transition: all 0.2s;
        }

        .nav-menu a:hover { color: #3b82f6; transform: translateY(-1px); }

        .btn-nav {
          padding: 10px 24px;
          border-radius: 40px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 700;
          transition: all 0.3s;
        }

        .btn-nav.secondary { color: white; border: 1px solid rgba(255,255,255,0.1); }
        .btn-nav.primary { background: #3b82f6; color: white; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4); }
        .btn-nav:hover { transform: translateY(-2px); filter: brightness(1.1); }

        /* Hero */
        .hero-section {
          padding: 220px 0 140px;
          position: relative;
        }

        .hero-container {
          display: grid;
          grid-template-columns: 1.1fr 0.9fr;
          gap: 80px;
          align-items: center;
        }

        .badge {
           display: inline-flex;
           align-items: center;
           gap: 10px;
           background: rgba(59, 130, 246, 0.1);
           color: #3b82f6;
           padding: 8px 18px;
           border-radius: 30px;
           font-size: 14px;
           font-weight: 600;
           margin-bottom: 30px;
           border: 1px solid rgba(59, 130, 246, 0.2);
        }

        .hero-title {
          font-size: 56px;
          font-weight: 800;
          line-height: 1.15;
          margin-bottom: 32px;
          letter-spacing: -2px;
        }

        .hero-subtitle {
          font-size: 20px;
          color: #94a3b8;
          max-width: 650px;
          margin-bottom: 48px;
          line-height: 1.7;
        }

        .hero-actions {
          display: flex;
          gap: 20px;
        }

        .btn-hero-primary {
          background: #3b82f6;
          color: white;
          padding: 18px 36px;
          border-radius: 14px;
          text-decoration: none;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 14px;
          transition: all 0.3s;
        }

        .btn-hero-ghost {
          background: transparent;
          color: white;
          padding: 18px 36px;
          border-radius: 14px;
          text-decoration: none;
          font-weight: 800;
          border: 1px solid rgba(255,255,255,0.15);
          transition: all 0.3s;
        }

        .btn-hero-primary:hover { transform: translateY(-4px); background: #2563eb; }
        .btn-hero-ghost:hover { background: rgba(255,255,255,0.05); border-color: white; }

        /* Mockups */
        .main-mockup-frame {
           position: relative;
           background: #1e293b;
           border-radius: 24px;
           padding: 8px;
           border: 1px solid rgba(255,255,255,0.1);
           overflow: visible;
        }
        .mockup-img { width: 100%; border-radius: 18px; display: block; }
        .mockup-img-small { width: 100%; border-radius: 16px; display: block; }

        .floating-badge {
           position: absolute;
           background: white;
           color: #0f172a;
           padding: 12px 20px;
           border-radius: 14px;
           font-weight: 700;
           font-size: 13px;
           display: flex;
           align-items: center;
           gap: 10px;
           box-shadow: 0 20px 40px rgba(0,0,0,0.4);
           z-index: 10;
        }
        .top-right { top: 40px; right: -30px; }
        .bottom-left { bottom: 40px; left: -30px; }

        /* Sections */
        .section-padding { padding: 140px 0; }
        .bg-alt { background: #0c1222; }
        .section-header { margin-bottom: 80px; }
        .section-header.center { text-align: center; }
        .section-label { color: #3b82f6; text-transform: uppercase; font-size: 13px; letter-spacing: 3px; font-weight: 800; margin-bottom: 16px; display: block; }
        .section-title { font-size: 42px; font-weight: 800; margin-bottom: 24px; letter-spacing: -1px; }
        .section-desc { font-size: 19px; color: #94a3b8; max-width: 750px; margin: 0 auto; line-height: 1.6; }

        /* Problem Grid */
        .problem-grid {
           display: grid;
           grid-template-columns: repeat(3, 1fr);
           gap: 32px;
        }
        .problem-card { padding: 48px; text-align: center; border-radius: 28px; }
        .problem-icon-wrapper { width: 64px; height: 64px; border-radius: 18px; background: rgba(248, 113, 113, 0.1); display: flex; align-items: center; justify-content: center; margin: 0 auto 30px; }
        .icon-red { color: #f87171; width: 32px; height: 32px; }
        .problem-card h4 { font-size: 20px; margin-bottom: 16px; font-weight: 700; }
        .problem-card p { color: #94a3b8; font-size: 15px; line-height: 1.6; }

        /* Split Layout */
        .split-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 100px; align-items: center; }
        .split-layout.reverse { grid-template-columns: 0.9fr 1.1fr; }
        .solution-list { list-style: none; padding: 0; margin-top: 40px; }
        .solution-list li { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; font-size: 17px; color: #cbd5e1; }
        .solution-list li strong { color: white; }
        .solution-list li :global(svg) { color: #3b82f6; flex-shrink: 0; }

        /* Pipeline */
        .pipeline-container { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-top: 60px; }
        .pipeline-step { flex: 1; text-align: center; max-width: 220px; }
        .p-icon { width: 70px; height: 70px; border-radius: 22px; background: #1e293b; color: #3b82f6; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; border: 1px solid rgba(255,255,255,0.05); }
        .p-icon :global(svg) { width: 30px; height: 30px; }
        .pipeline-step h4 { font-size: 18px; margin-bottom: 12px; font-weight: 800; color: #e2e8f0; }
        .pipeline-step p { font-size: 14px; color: #94a3b8; line-height: 1.5; }
        .p-arrow { color: #1e293b; font-size: 32px; padding-top: 18px; font-weight: 300; }

        /* Benefits */
        .benefits-grid { display: flex; flex-direction: column; gap: 32px; }
        .benefit-card { display: grid; grid-template-columns: 1fr 1fr; border-radius: 32px; overflow: hidden; padding: 0; }
        .benefit-img-box { height: 320px; overflow: hidden; position: relative; }
        .benefit-img-box img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; }
        .benefit-card:hover .benefit-img-box img { transform: scale(1.05); }
        .benefit-content { padding: 60px; display: flex; flex-direction: column; justify-content: center; }
        .benefit-title { font-size: 28px; line-height: 1.3; margin-bottom: 20px; font-weight: 800; }
        .benefit-content p { color: #94a3b8; font-size: 17px; line-height: 1.7; }
        .abstract-ui { height: 100%; background: linear-gradient(135deg, #1e293b, #0f172a); display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 16px; }
        .ui-line { width: 140px; height: 8px; background: rgba(59, 130, 246, 0.4); border-radius: 4px; }
        .ui-line.short { width: 80px; }
        .ui-circle { width: 50px; height: 50px; border: 4px solid #3b82f6; border-radius: 50%; }

        /* Capability */
        .capability-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; }
        .cap-card { padding: 40px; border-radius: 24px; text-align: center; }
        .cap-icon-box { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; }
        .cap-icon-box :global(svg) { width: 26px; height: 26px; color: white; }
        .cap-icon-box.blue { background: #3b82f6; }
        .cap-icon-box.purple { background: #8b5cf6; }
        .cap-icon-box.green { background: #10b981; }
        .cap-icon-box.orange { background: #f59e0b; }
        .cap-card h4 { font-size: 18px; margin-bottom: 12px; font-weight: 800; }
        .cap-card p { font-size: 14px; color: #94a3b8; line-height: 1.6; }

        /* CTA */
        .cta-card { padding: 100px 40px; text-align: center; border-radius: 42px; background: linear-gradient(145deg, rgba(37, 99, 235, 0.1), rgba(139, 92, 246, 0.1)); border: 1px solid rgba(255,255,255,0.05); }
        .cta-card h2 { font-size: 48px; font-weight: 900; margin-bottom: 24px; }
        .cta-card p { font-size: 22px; color: #94a3b8; margin-bottom: 50px; }
        .cta-actions { display: flex; gap: 24px; justify-content: center; }
        .cta-actions .btn-hero-primary.large { padding: 22px 44px; font-size: 18px; }
        .cta-actions .btn-hero-ghost.large { padding: 22px 44px; font-size: 18px; }

        /* Utilities */
        .glass-panel { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); }
        .hover-lift { transition: transform 0.3s, border-color 0.3s, box-shadow 0.3s; }
        .hover-lift:hover { transform: translateY(-8px); border-color: rgba(59, 130, 246, 0.4); box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
        .shadow-glow { box-shadow: 0 0 30px rgba(59, 130, 246, 0.2); }
        .shadow-large { box-shadow: 0 40px 100px rgba(0,0,0,0.5); }
        .text-gradient { background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

        /* Animations */
        @keyframes bounce-subtle { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .animate-bounce-subtle { animation: bounce-subtle 3s infinite ease-in-out; }
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        .animate-float { animation: float 6s infinite ease-in-out; }

        @media (max-width: 1024px) {
           .hero-container { grid-template-columns: 1fr; text-align: center; }
           .hero-subtitle { margin: 0 auto 40px; }
           .hero-actions { justify-content: center; }
           .hero-visual { margin-top: 60px; }
           .problem-grid { grid-template-columns: 1fr; }
           .split-layout { grid-template-columns: 1fr; gap: 60px; }
           .split-layout :global(.visual-side) { order: 2; }
           .pipeline-container { flex-direction: column; align-items: center; gap: 40px; }
           .p-arrow { display: none; }
           .benefit-card { grid-template-columns: 1fr; }
           .benefit-content { padding: 40px; text-align: center; }
           .capability-grid { grid-template-columns: 1fr 1fr; }
           .cta-actions { flex-direction: column; }
           .nav-menu { display: none; }
        }

        @media (max-width: 640px) {
           .hero-title { font-size: 38px; }
           .capability-grid { grid-template-columns: 1fr; }
           .cta-card h2 { font-size: 32px; }
        }
        /* Footer */
        .landing-footer { 
          padding: 80px 0 40px; 
          background: #0c1222; 
          border-top: 1px solid rgba(255,255,255,0.05); 
        }
        .footer-top { 
          display: flex; 
          justify-content: space-between; 
          gap: 60px; 
          margin-bottom: 60px; 
        }
        .footer-brand { max-width: 320px; }
        .brand-desc { color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 20px; }
        .corporate-badge { 
          display: flex; 
          flex-direction: column; 
          gap: 4px; 
          font-size: 12px; 
          color: #64748b; 
        }
        .corporate-badge a { color: #3b82f6; text-decoration: none; font-weight: 700; }
        
        .footer-nav { display: flex; gap: 80px; }
        .footer-col { display: flex; flex-direction: column; gap: 12px; min-width: 140px; }
        .footer-col h5 { color: white; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .footer-col a { color: #94a3b8; text-decoration: none; font-size: 14px; transition: color 0.2s; display: flex; align-items: center; gap: 8px; }
        .footer-col a:hover { color: #3b82f6; }
        
        .footer-bottom { 
          padding-top: 40px; 
          border-top: 1px solid rgba(255,255,255,0.05); 
          text-align: center; 
          color: #64748b; 
          font-size: 12px; 
        }

        @media (max-width: 1024px) {
           .footer-top { flex-direction: column; text-align: center; align-items: center; }
           .footer-brand { margin-bottom: 40px; }
           .footer-nav { flex-direction: column; gap: 40px; }
           .nav-links { display: none !important; }
      `}</style>
    </div>
  );
}

function Sparkles({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />
    </svg>
  );
}
