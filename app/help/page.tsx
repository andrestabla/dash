"use client";

import Link from 'next/link';
import {
  ArrowLeft,
  HelpCircle,
  MessageSquare,
  Mail,
  ChevronDown,
  ShieldCheck,
  CreditCard,
  Users2,
  Globe
} from "lucide-react";
import { useState } from 'react';

export default function HelpPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: "¿Es segura mi información?",
      a: "Totalmente. Utilizamos encriptación de grado bancario y bases de datos aisladas para asegurar que tu información corporativa esté siempre protegida y accesible solo para ti.",
      icon: <ShieldCheck className="icon-blue" size={20} />
    },
    {
      q: "¿Cómo invito a colaboradores?",
      a: "Desde el panel de administración, puedes asignar roles y permisos a correos electrónicos específicos. Ellos recibirán una invitación automática para unirse al tablero.",
      icon: <Users2 className="icon-purple" size={20} />
    },
    {
      q: "¿Tienen planes para empresas grandes?",
      a: "Sí. Ofrecemos soluciones Enterprise con límites personalizados, soporte dedicado y opciones de despliegue On-Premise si tu organización lo requiere.",
      icon: <CreditCard className="icon-orange" size={20} />
    },
    {
      q: "¿Puedo compartir vistas públicas?",
      a: "¡Claro! MisProyectos permite generar enlaces públicos de solo lectura tanto para tableros como para analíticas, ideal para reportes externos a clientes.",
      icon: <Globe className="icon-green" size={20} />
    }
  ];

  return (
    <div className="help-root">
      {/* HEADER */}
      <header className="help-header animate-fade-in">
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

      <main className="container help-main">
        <div className="help-hero animate-slide-up">
          <h1 className="help-title"><HelpCircle className="icon-blue" size={48} /> Centro de Ayuda</h1>
          <p className="help-subtitle">Estamos aquí para apoyarte en la optimización de tus flujos de trabajo.</p>
        </div>

        <div className="help-grid">
          {/* FAQ SECTION */}
          <section className="faq-section animate-fade-in delay-100">
            <h2 className="section-title">Preguntas Frecuentes</h2>
            <div className="faq-list">
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className={`faq-item glass-panel ${activeFaq === idx ? 'active' : ''}`}
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                >
                  <div className="faq-header">
                    <div className="faq-q-text">
                      {faq.icon}
                      <span>{faq.q}</span>
                    </div>
                    <ChevronDown size={18} className="faq-chevron" />
                  </div>
                  <div className="faq-answer">
                    <p>{faq.a}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SUPPORT SECTION */}
          <section className="support-section animate-fade-in delay-200">
            <h2 className="section-title">Contacto Directo</h2>
            <div className="support-cards">
              <a href="https://wa.me/573044544525" target="_blank" className="support-card glass-panel hover-lift">
                <div className="support-icon-box whatsapp">
                  <MessageSquare size={24} />
                </div>
                <h3>Soporte por WhatsApp</h3>
                <p>Respuesta inmediata para dudas técnicas y operativas.</p>
                <div className="support-action">Contactar ahora</div>
              </a>

              <a href="/tutorials" className="support-card glass-panel hover-lift">
                <div className="support-icon-box" style={{ background: '#f59e0b', color: 'white' }}>
                  <HelpCircle size={24} />
                </div>
                <h3>Guía Paso a Paso</h3>
                <p>Aprende a usar todas las funciones con tutoriales detallados.</p>
                <div className="support-action">Ir a Tutoriales</div>
              </a>

              <a href="mailto:proyectos@algoritmot.com" className="support-card glass-panel hover-lift">
                <div className="support-icon-box email">
                  <Mail size={24} />
                </div>
                <h3>Correo Electrónico</h3>
                <p>Para solicitudes complejas, cuentas Enterprise o facturación.</p>
                <div className="support-action">proyectos@algoritmot.com</div>
              </a>
            </div>
          </section>
        </div>
      </main>

      <style jsx>{`
        .help-root {
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

        .help-header {
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

        .help-main {
          padding: 80px 0;
        }

        .help-hero {
          text-align: center;
          margin-bottom: 80px;
        }

        .help-title {
          font-size: 48px;
          font-weight: 800;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
        }

        .help-subtitle {
          font-size: 20px;
          color: #94a3b8;
          max-width: 600px;
          margin: 0 auto;
        }

        .help-grid {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 60px;
        }

        .section-title {
          font-size: 24px;
          font-weight: 800;
          margin-bottom: 32px;
          color: #e2e8f0;
        }

        /* FAQ */
        .faq-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .faq-item {
          padding: 0;
          overflow: hidden;
          cursor: pointer;
        }

        .faq-header {
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .faq-q-text {
          display: flex;
          align-items: center;
          gap: 16px;
          font-weight: 600;
          font-size: 17px;
        }

        .faq-chevron {
          color: #94a3b8;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .faq-item.active .faq-chevron {
          transform: rotate(180deg);
        }

        .faq-answer {
          max-height: 0;
          overflow: hidden;
          transition: max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          background: rgba(255,255,255,0.01);
        }

        .faq-item.active .faq-answer {
          max-height: 200px;
        }

        .faq-answer p {
          padding: 0 24px 24px 60px;
          color: #94a3b8;
          line-height: 1.6;
          margin: 0;
        }

        /* SUPPORT */
        .support-cards {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .support-card {
          padding: 40px;
          border-radius: 28px;
          text-decoration: none;
          color: inherit;
        }

        .support-icon-box {
          width: 50px;
          height: 50px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
        }

        .support-icon-box.whatsapp { background: #10b981; color: white; }
        .support-icon-box.email { background: #3b82f6; color: white; }

        .support-card h3 {
          font-size: 20px;
          font-weight: 800;
          margin-bottom: 12px;
        }

        .support-card p {
          color: #94a3b8;
          font-size: 15px;
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .support-action {
          color: #3b82f6;
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 1px;
          text-transform: uppercase;
        }

        .glass-panel {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(10px);
        }

        .hover-lift {
          transition: transform 0.3s, border-color 0.3s, box-shadow 0.3s;
        }

        .hover-lift:hover {
          transform: translateY(-8px);
          border-color: rgba(59, 130, 246, 0.4);
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }

        .icon-blue { color: #3b82f6; }
        .icon-purple { color: #8b5cf6; }
        .icon-orange { color: #f59e0b; }
        .icon-green { color: #10b981; }

        /* Animations */
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        
        .animate-fade-in { animation: fadeIn 0.6s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }

        @media (max-width: 1024px) {
          .help-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .help-title { font-size: 32px; }
          .help-main { padding: 40px 0; }
          .container { padding: 0 20px; }
        }
      `}</style>
    </div>
  );
}
