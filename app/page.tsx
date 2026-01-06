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
  ZapOff
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
            <div className="nav-links">
              <Link href="/login" className="btn-nav secondary">Entrar</Link>
              <Link href="/register" className="btn-nav primary">Regístrate</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO SECTION - PEDAGOGICAL */}
      <section className="hero-section" id="hero">
        <div className="container hero-container">
          <div className="hero-content animate-slide-up">
            <h1 className="hero-title">
              Una plataforma integral para <span className="text-gradient">organizar, hacer seguimiento y tomar decisiones</span> sobre tus proyectos, equipos y resultados.
            </h1>
            <p className="hero-subtitle">
              Diseñada para organizaciones que gestionan múltiples proyectos y requieren visibilidad, control y trazabilidad en un solo lugar.
            </p>
            <div className="hero-actions">
              <a href="#how-works" className="btn-hero-primary">
                Conocer la plataforma <ArrowRight size={20} />
              </a>
              <a href="#contact" className="btn-hero-secondary">
                Solicitar una demo guiada
              </a>
            </div>
          </div>

          <div className="hero-visual animate-fade-in delay-200">
            <div className="conceptual-diagram">
              <div className="diag-box diag-input animate-float">
                <Layers size={24} />
                <span>Múltiples Proyectos</span>
              </div>
              <div className="diag-arrow">➜</div>
              <div className="diag-box diag-core">
                <img src="https://imageneseiconos.s3.us-east-1.amazonaws.com/iconos/logo_misproyectos.png" alt="Core" style={{ height: 20 }} />
              </div>
              <div className="diag-arrow">➜</div>
              <div className="diag-box diag-output animate-float delay-500">
                <Target size={24} />
                <span>Resultados Visibles</span>
              </div>
            </div>
          </div>
        </div>
        <div className="hero-bg-glow"></div>
      </section>

      {/* THE PROBLEM SECTION */}
      <section className="section-padding bg-alt" id="problem">
        <div className="container">
          <div className="section-header">
            <h3 className="section-label">El desafío</h3>
            <h2 className="section-title">¿Tu organización sufre de desorden operativo?</h2>
            <p className="section-desc">Gestionar múltiples frentes sin la herramienta adecuada genera cuellos de botella invisibles.</p>
          </div>
          <div className="problem-grid">
            <div className="problem-card glass-panel">
              <AlertCircle className="icon-red" />
              <h4>Información Dispersa</h4>
              <p>Hojas de cálculo, chats y correos que ocultan la realidad del proyecto.</p>
            </div>
            <div className="problem-card glass-panel">
              <ZapOff className="icon-red" />
              <h4>Falta de Visibilidad</h4>
              <p>Dificultad para saber quién hace qué y cuál es el estado real del avance.</p>
            </div>
            <div className="problem-card glass-panel">
              <Users className="icon-red" />
              <h4>Equipos Desalineados</h4>
              <p>Falta de un hilo conductor que asegure la trazabilidad de las decisiones.</p>
            </div>
          </div>
        </div>
      </section>

      {/* THE SOLUTION SECTION */}
      <section className="section-padding" id="what-is">
        <div className="container">
          <div className="split-layout">
            <div className="info-side">
              <h3 className="section-label">La Solución</h3>
              <h2 className="section-title">MisProyectos: El Centro de Comando</h2>
              <p className="section-desc text-left">
                No es solo un gestor de tareas. Es una plataforma de **Gobernanza de Proyectos** que centraliza la operación y la estrategia en un entorno visual e intuitivo.
              </p>
              <ul className="solution-list">
                <li><CheckCircle2 size={18} /> Centraliza carpetas y portafolios de proyectos.</li>
                <li><CheckCircle2 size={18} /> Organiza flujos de trabajo adaptables.</li>
                <li><CheckCircle2 size={18} /> Facilita la toma de decisiones basada en datos.</li>
              </ul>
            </div>
            <div className="visual-side">
              <div className="concept-card glass-panel">
                <div className="mock-ui-simple">
                  <div className="mock-sidebar-dot"></div>
                  <div className="mock-content-simple">
                    <div className="mock-bar-long"></div>
                    <div className="mock-grid-simple">
                      <div className="mock-tile"></div>
                      <div className="mock-tile primary"></div>
                      <div className="mock-tile"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS (Alto Nivel) */}
      <section className="section-padding bg-alt" id="how-works">
        <div className="container">
          <div className="section-header center">
            <h2 className="section-title">Cómo funciona</h2>
            <p className="section-desc">Un flujo lógico diseñado para la eficiencia.</p>
          </div>

          <div className="steps-container">
            <div className="step-item">
              <div className="step-number">01</div>
              <h4>Visualización</h4>
              <p>Mira todos tus proyectos en un dashboard maestro sin perder el detalle de cada tarea.</p>
            </div>
            <div className="step-line"></div>
            <div className="step-item">
              <div className="step-number">02</div>
              <h4>Seguimiento</h4>
              <p>Controla tiempos, hitos y responsables mediante metodologías ágiles y visuales.</p>
            </div>
            <div className="step-line"></div>
            <div className="step-item">
              <div className="step-number">03</div>
              <h4>Colaboración</h4>
              <p>Interactúa con tu equipo y clientes externos mediante accesos públicos controlados.</p>
            </div>
            <div className="step-line"></div>
            <div className="step-item">
              <div className="step-number">04</div>
              <h4>Control</h4>
              <p>Analiza el rendimiento con reportes automáticos y toma decisiones informadas.</p>
            </div>
          </div>

          <div className="center" style={{ marginTop: 60 }}>
            <a href="#contact" className="btn-hero-primary">Ver cómo funciona en detalle</a>
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

          <div className="benefits-blocks">
            <div className="benefit-block glass-panel">
              <div className="benefit-icon"><Target size={32} /></div>
              <h3>Mayor claridad sobre el avance real</h3>
              <p>Para líderes de proyecto que necesitan saber exactamente dónde están parados sin preguntar.</p>
            </div>
            <div className="benefit-block glass-panel">
              <div className="benefit-icon"><PieChart size={32} /></div>
              <h3>Mejores decisiones con información visible</h3>
              <p>Para directivos que requieren reportes consolidados para ajustar la estrategia en tiempo real.</p>
            </div>
            <div className="benefit-block glass-panel">
              <div className="benefit-icon"><Zap size={32} /></div>
              <h3>Reducción drástica del ruido operativo</h3>
              <p>Para equipos que quieren enfocarse en ejecutar, no en buscar archivos o estados de tareas.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CAPABILITIES (Features resumidas) */}
      <section className="section-padding bg-alt" id="capabilities">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Capacidades Principales</h2>
          </div>
          <div className="cap-grid">
            <div className="cap-item">
              <div className="cap-icon"><Layout /></div>
              <div>
                <h4>Tableros Kanban Refinados</h4>
                <p>Gestión visual de tareas con priorización y estados personalizables.</p>
              </div>
            </div>
            <div className="cap-item">
              <div className="cap-icon"><Share2 /></div>
              <div>
                <h4>Acceso Público Controlado</h4>
                <p>Muestra avances a tus clientes sin forzarlos a registrarse.</p>
              </div>
            </div>
            <div className="cap-item">
              <div className="cap-icon"><BarChart3 /></div>
              <div>
                <h4>Analítica Consolidada</h4>
                <p>KPIs automáticos por carpeta y proyecto para medir productividad.</p>
              </div>
            </div>
            <div className="cap-item">
              <div className="cap-icon"><Shield /></div>
              <div>
                <h4>Estructura de Gobernanza</h4>
                <p>Jerarquía robusta de carpetas para organizar múltiples portafolios.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL INVITATION/CONTACT */}
      <section className="cta-section" id="contact">
        <div className="container">
          <div className="cta-card glass-panel animate-slide-up">
            <h2>Transforma la gestión de tu organización</h2>
            <p>Hablemos sobre cómo MisProyectos puede adaptarse a tu estructura y desafíos actuales.</p>
            <div className="cta-actions">
              <a href="mailto:social@algoritmot.com" className="btn-hero-primary large">
                Hablar con un asesor <MessageSquare size={20} />
              </a>
              <a href="/register" className="btn-hero-secondary large">
                Solicitar una demo guiada
              </a>
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
              <p className="brand-desc">Una solución de Algoritmo T para la excelencia operativa.</p>
              <div className="corporate-badge">
                <span>Desarrollado por</span>
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
                <Link href="/help" className="flex-link"><LifeBuoy size={14} /> Guía de Inicio</Link>
              </div>
              <div className="footer-col">
                <h5>Legal</h5>
                <Link href="/terms">Términos</Link>
                <Link href="/privacy">Privacidad</Link>
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
          scroll-behavior: smooth;
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
          background: rgba(15, 23, 42, 0.9);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .nav-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .nav-menu {
           display: flex;
           gap: 32px;
        }

        .nav-menu a {
           color: #94a3b8;
           text-decoration: none;
           font-size: 14px;
           font-weight: 500;
           transition: color 0.2s;
        }

        .nav-menu a:hover { color: #3b82f6; }

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
        }

        .btn-nav.secondary { color: white; background: rgba(255,255,255,0.05); }
        .btn-nav.primary { background: #3b82f6; color: white; }
        .btn-nav:hover { transform: translateY(-1px); }

        /* Hero */
        .hero-section {
          padding: 180px 0 100px;
          position: relative;
        }

        .hero-container {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 60px;
          align-items: center;
        }

        .hero-title {
          font-size: 48px;
          font-weight: 800;
          line-height: 1.2;
          margin-bottom: 24px;
          letter-spacing: -1px;
        }

        .hero-subtitle {
          font-size: 20px;
          color: #94a3b8;
          max-width: 650px;
          margin-bottom: 40px;
          line-height: 1.6;
        }

        .hero-actions {
          display: flex;
          gap: 16px;
        }

        .btn-hero-primary {
          background: #3b82f6;
          color: white;
          padding: 16px 32px;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.3s;
        }

        .btn-hero-secondary {
          background: rgba(255,255,255,0.05);
          color: white;
          padding: 16px 32px;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 700;
          border: 1px solid rgba(255,255,255,0.1);
          transition: all 0.2s;
        }

        .btn-hero-primary:hover { transform: scale(1.02); background: #2563eb; }
        .btn-hero-secondary:hover { background: rgba(255,255,255,0.1); }

        /* Conceptual Diagram */
        .conceptual-diagram {
           display: flex;
           align-items: center;
           gap: 20px;
           justify-content: center;
        }

        .diag-box {
           background: rgba(255,255,255,0.03);
           border: 1px solid rgba(255,255,255,0.1);
           padding: 24px;
           border-radius: 20px;
           display: flex;
           flex-direction: column;
           align-items: center;
           gap: 12px;
           text-align: center;
        }

        .diag-box span { font-size: 12px; font-weight: 700; color: #94a3b8; }
        .diag-core { 
           background: #3b82f6; 
           width: 80px; 
           height: 80px; 
           justify-content: center; 
           border: none;
           box-shadow: 0 0 40px rgba(59,130,246,0.3);
        }
        .diag-arrow { color: #334155; font-size: 24px; }

        /* Problem Grid */
        .problem-grid {
           display: grid;
           grid-template-columns: repeat(3, 1fr);
           gap: 24px;
           margin-top: 50px;
        }

        .problem-card {
           padding: 40px;
           text-align: center;
        }

        .icon-red { color: #f87171; margin-bottom: 20px; width: 32px; height: 32px; }
        .problem-card h4 { font-size: 18px; margin-bottom: 12px; }
        .problem-card p { color: #94a3b8; font-size: 14px; line-height: 1.6; }

        /* Split Layout */
        .split-layout {
           display: grid;
           grid-template-columns: 1fr 1fr;
           gap: 80px;
           align-items: center;
        }
        .solution-list { list-style: none; padding: 0; margin-top: 30px; }
        .solution-list li { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; color: #e2e8f0; }
        .solution-list li :global(svg) { color: #3b82f6; }

        .mock-ui-simple {
           background: #1e293b;
           border-radius: 12px;
           height: 200px;
           padding: 20px;
           display: flex;
           gap: 12px;
        }
        .mock-sidebar-dot { width: 40px; background: rgba(255,255,255,0.05); border-radius: 8px; }
        .mock-content-simple { flex: 1; display: flex; flex-direction: column; gap: 12px; }
        .mock-bar-long { height: 20px; background: rgba(255,255,255,0.05); border-radius: 4px; width: 60%; }
        .mock-grid-simple { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; flex: 1; }
        .mock-tile { background: rgba(255,255,255,0.03); border-radius: 6px; }
        .mock-tile.primary { background: rgba(59,130,246,0.2); }

        /* Steps */
        .steps-container {
           display: grid;
           grid-template-columns: 1fr 40px 1fr 40px 1fr 40px 1fr;
           align-items: center;
           margin-top: 60px;
        }
        .step-item { text-align: center; }
        .step-number { font-size: 40px; font-weight: 800; color: #3b82f6; opacity: 0.3; margin-bottom: 16px; }
        .step-item h4 { margin-bottom: 12px; }
        .step-item p { font-size: 14px; color: #94a3b8; }
        .step-line { height: 1px; background: rgba(255,255,255,0.05); }

        /* Benefits Blocks */
        .benefits-blocks {
           display: grid;
           grid-template-columns: repeat(3, 1fr);
           gap: 24px;
           margin-top: 50px;
        }
        .benefit-block { padding: 40px; }
        .benefit-icon { color: #3b82f6; margin-bottom: 24px; }
        .benefit-block h3 { font-size: 20px; line-height: 1.4; margin-bottom: 16px; }
        .benefit-block p { font-size: 14px; color: #94a3b8; line-height: 1.6; }

        /* Cap Grid */
        .cap-grid {
           display: grid;
           grid-template-columns: 1fr 1fr;
           gap: 40px;
           margin-top: 50px;
        }
        .cap-item { display: flex; gap: 20px; }
        .cap-icon { color: #3b82f6; flex-shrink: 0; }
        .cap-item h4 { margin-bottom: 8px; }
        .cap-item p { color: #94a3b8; font-size: 14px; }

        /* CTA */
        .cta-actions { display: flex; gap: 20px; justify-content: center; margin-top: 40px; }
        .cta-actions .btn-hero-primary.large, .cta-actions .btn-hero-secondary.large {
           padding: 20px 40px; font-size: 18px;
        }

        /* Generic */
        .section-padding { padding: 100px 0; }
        .bg-alt { background: #0c1222; }
        .section-header { margin-bottom: 50px; }
        .section-header.center { text-align: center; }
        .section-label { color: #3b82f6; text-transform: uppercase; font-size: 12px; letter-spacing: 2px; font-weight: 700; margin-bottom: 12px; display: block; }
        .section-title { font-size: 36px; font-weight: 800; margin-bottom: 16px; }
        .section-desc { font-size: 18px; color: #94a3b8; max-width: 700px; margin: 0 auto; }
        .section-desc.text-left { margin: 0; }
        .text-gradient { background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .center { text-align: center; }

        /* Animations */
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .animate-float { animation: float 6s infinite ease-in-out; }

        @media (max-width: 1024px) {
           .hero-container { grid-template-columns: 1fr; text-align: center; }
           .hero-subtitle { margin: 0 auto 40px; }
           .hero-actions { justify-content: center; }
           .hero-visual { display: none; }
           .problem-grid { grid-template-columns: 1fr; }
           .split-layout { grid-template-columns: 1fr; gap: 40px; }
           .steps-container { grid-template-columns: 1fr; gap: 40px; }
           .step-line { display: none; }
           .benefits-blocks { grid-template-columns: 1fr; }
           .cap-grid { grid-template-columns: 1fr; }
           .cta-actions { flex-direction: column; }
           .nav-menu { display: none; }
        }
      `}</style>
    </div>
  );
}
