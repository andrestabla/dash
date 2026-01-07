"use client";

import Link from 'next/link';
import {
    ArrowLeft,
    Book,
    Layout,
    BarChart3,
    Shield,
    Zap,
    ChevronRight,
    Database,
    Users,
    Settings
} from "lucide-react";

export default function DocsPage() {
    return (
        <div className="docs-root">
            {/* HEADER */}
            <header className="docs-header animate-fade-in">
                <div className="container">
                    <div className="header-content">
                        <Link href="/" className="back-link">
                            <ArrowLeft size={16} /> Volver al Inicio
                        </Link>
                        <div className="logo">
                            <img src="https://imageneseiconos.s3.us-east-1.amazonaws.com/iconos/logo_misproyectos.png" alt="Mis Proyectos" style={{ height: 32 }} />
                        </div>
                    </div>
                </div>
            </header>

            <main className="container docs-main">
                <div className="docs-layout">
                    {/* SIDEBAR NAVIGATION */}
                    <aside className="docs-sidebar animate-slide-up">
                        <nav className="docs-nav">
                            <h3>Introducción</h3>
                            <ul>
                                <li><a href="#intro">¿Qué es MisProyectos?</a></li>
                                <li><a href="#vision">Nuestra Visión</a></li>
                            </ul>

                            <h3>Primeros Pasos</h3>
                            <ul>
                                <li><a href="#setup">Configuración Inicial</a></li>
                                <li><a href="#boards">Crear tu primer Tablero</a></li>
                            </ul>

                            <h3>Funcionalidades</h3>
                            <ul>
                                <li><a href="#kanban">Gestión Kanban</a></li>
                                <li><a href="#analytics">Analítica en Tiempo Real</a></li>
                                <li><a href="#permissions">Gobernanza y Permisos</a></li>
                            </ul>
                        </nav>
                    </aside>

                    {/* CONTENT */}
                    <section className="docs-content animate-fade-in delay-100">
                        <div id="intro" className="doc-section">
                            <h1 className="doc-title"><Book className="icon-blue" /> Documentación</h1>
                            <p className="lead">
                                Bienvenido a la guía oficial de **MisProyectos**. Aquí encontrarás todo lo necesario para dominar la plataforma de gobernanza de proyectos líder en el mercado.
                            </p>

                            <div className="doc-card glass-panel">
                                <h3>¿Qué es MisProyectos?</h3>
                                <p>
                                    MisProyectos es una solución integral diseñada por **Algoritmo T** para centralizar la operación,
                                    estrategia y analítica de múltiples proyectos en un único ecosistema visual.
                                </p>
                            </div>
                        </div>

                        <div id="setup" className="doc-section">
                            <h2><Zap className="icon-orange" /> Primeros Pasos</h2>
                            <div className="steps-list">
                                <div className="step-item">
                                    <div className="step-num">1</div>
                                    <div className="step-text">
                                        <strong>Registro:</strong> Crea tu cuenta administrativa o de usuario para acceder al workspace.
                                    </div>
                                </div>
                                <div className="step-item">
                                    <div className="step-num">2</div>
                                    <div className="step-text">
                                        <strong>Dashboard:</strong> Visualiza el resumen de tus portafolios y carpetas activas.
                                    </div>
                                </div>
                                <div className="step-item">
                                    <div className="step-num">3</div>
                                    <div className="step-text">
                                        <strong>Configuración:</strong> Define los usuarios y roles que colaborarán en tu organización.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="kanban" className="doc-section">
                            <h2><Layout className="icon-purple" /> Gestión Kanban</h2>
                            <p>
                                Nuestra interfaz Kanban v11 permite un flujo de trabajo dinámico e intuitivo.
                            </p>
                            <div className="feature-grid">
                                <div className="feature-item glass-panel">
                                    <ChevronRight size={14} />
                                    <strong>Arrastrar y Soltar:</strong> Mueve tareas entre estados con total fluidez.
                                </div>
                                <div className="feature-item glass-panel">
                                    <ChevronRight size={14} />
                                    <strong>Prioridades:</strong> Visualiza cuellos de botella con códigos de color dinámicos.
                                </div>
                            </div>
                        </div>

                        <div id="analytics" className="doc-section">
                            <h2><BarChart3 className="icon-green" /> Analítica y Datos</h2>
                            <p>
                                Toma decisiones basadas en datos reales. Nuestra plataforma genera métricas automáticas de:
                            </p>
                            <ul className="check-list">
                                <li>Progreso porcentual del proyecto.</li>
                                <li>Carga de trabajo por colaborador.</li>
                                <li>Velocidad de ejecución semanal.</li>
                            </ul>
                        </div>

                        <div id="permissions" className="doc-section">
                            <h2><Shield className="icon-blue" /> Gobernanza</h2>
                            <p>
                                La seguridad y trazabilidad son nuestra prioridad.
                                Utiliza el sistema de **Permisos de Granularidad** para definir quién puede ver, editar o administrar cada tablero.
                            </p>
                        </div>
                    </section>
                </div>
            </main>

            <style jsx>{`
        .docs-root {
          background: #0f172a;
          color: white;
          min-height: 100vh;
          font-family: 'Outfit', sans-serif;
        }

        .container {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 40px;
        }

        .docs-header {
          height: 80px;
          display: flex;
          align-items: center;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(24px);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }

        .back-link {
          color: #94a3b8;
          text-decoration: none;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: color 0.2s;
        }

        .back-link:hover {
          color: white;
        }

        .docs-main {
          padding: 60px 0;
        }

        .docs-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 60px;
        }

        .docs-sidebar {
          position: sticky;
          top: 140px;
          height: fit-content;
        }

        .docs-nav h3 {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #3b82f6;
          margin-bottom: 16px;
          font-weight: 800;
        }

        .docs-nav ul {
          list-style: none;
          padding: 0;
          margin-bottom: 32px;
        }

        .docs-nav li {
          margin-bottom: 10px;
        }

        .docs-nav a {
          color: #94a3b8;
          text-decoration: none;
          font-size: 15px;
          transition: all 0.2s;
        }

        .docs-nav a:hover {
          color: white;
          padding-left: 4px;
        }

        .docs-content {
          max-width: 800px;
        }

        .doc-section {
          margin-bottom: 80px;
          scroll-margin-top: 120px;
        }

        .doc-title {
          font-size: 48px;
          font-weight: 800;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .lead {
          font-size: 20px;
          color: #94a3b8;
          line-height: 1.6;
          margin-bottom: 40px;
        }

        .doc-card {
          padding: 32px;
          border-radius: 24px;
          margin-top: 24px;
        }

        .doc-card h3 {
          font-size: 20px;
          margin-bottom: 16px;
          color: #e2e8f0;
        }

        .doc-card p {
          color: #94a3b8;
          line-height: 1.7;
        }

        h2 {
          font-size: 28px;
          font-weight: 800;
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        h2 :global(svg) {
          flex-shrink: 0;
        }

        .steps-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .step-item {
          display: flex;
          gap: 20px;
          align-items: flex-start;
        }

        .step-num {
          width: 32px;
          height: 32px;
          background: #3b82f6;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 14px;
          flex-shrink: 0;
        }

        .step-text {
          color: #94a3b8;
          line-height: 1.6;
        }

        .step-text strong {
          color: white;
          display: block;
          margin-bottom: 4px;
        }

        .feature-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 24px;
        }

        .feature-item {
          padding: 20px;
          border-radius: 16px;
          display: flex;
          gap: 12px;
          align-items: center;
          font-size: 14px;
          color: #94a3b8;
        }

        .feature-item strong {
          color: white;
        }

        .check-list {
          list-style: none;
          padding: 0;
        }

        .check-list li {
          margin-bottom: 12px;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .check-list li::before {
          content: '✓';
          color: #10b981;
          font-weight: 800;
        }

        .glass-panel {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
        }

        .icon-blue { color: #3b82f6; }
        .icon-orange { color: #f59e0b; }
        .icon-purple { color: #8b5cf6; }
        .icon-green { color: #10b981; }

        /* Animations */
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        
        .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .delay-100 { animation-delay: 100ms; }

        @media (max-width: 1024px) {
          .docs-layout {
            grid-template-columns: 1fr;
          }
          .docs-sidebar {
            display: none;
          }
        }

        @media (max-width: 640px) {
          .doc-title { font-size: 32px; }
          .feature-grid { grid-template-columns: 1fr; }
        }
      `}</style>
        </div>
    );
}
