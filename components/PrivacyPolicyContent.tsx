"use client";

import React from 'react';

export default function PrivacyPolicyContent() {
    return (
        <div className="space-y-6 text-white/70 leading-relaxed">
            <section>
                <h2 className="text-white font-semibold text-lg mb-2">1. Recolección de Información</h2>
                <p>Recopilamos información necesaria para la gestión de proyectos, incluyendo nombre, correo electrónico y actividad dentro de la plataforma para mejorar tu experiencia y la eficiencia del equipo.</p>
            </section>

            <section>
                <h2 className="text-white font-semibold text-lg mb-2">2. Uso de los Datos</h2>
                <p>Tus datos se utilizan exclusivamente para:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Autenticación y seguridad de la cuenta.</li>
                    <li>Notificaciones sobre actualizaciones en tus proyectos.</li>
                    <li>Colaboración en tiempo real con otros miembros de tu organización.</li>
                    <li>Análisis interno para optimizar el rendimiento de la herramienta.</li>
                </ul>
            </section>

            <section>
                <h2 className="text-white font-semibold text-lg mb-2">3. Protección de la Información</h2>
                <p>Implementamos medidas de seguridad técnicas y organizativas para proteger tus datos contra acceso no autorizado, alteración o destrucción. No compartimos tus datos con terceros con fines comerciales.</p>
            </section>

            <section>
                <h2 className="text-white font-semibold text-lg mb-2">4. Tus Derechos</h2>
                <p>Puedes solicitar el acceso, rectificación o eliminación de tus datos personales en cualquier momento contactando al administrador de tu organización o a través de nuestro equipo de soporte.</p>
            </section>

            <section className="pt-4 border-t border-white/5 text-sm italic">
                Última actualización: 9 de enero de 2026
            </section>
        </div>
    );
}
