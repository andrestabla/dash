"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
    Folder,
    Layout,
    Columns,
    CheckSquare,
    Share2,
    BarChart3,
    ArrowLeft,
    ChevronRight,
    PlayCircle,
    BookOpen,
    Settings,
    UserPlus,
    MousePointer2,
    Calendar,
    Search
} from 'lucide-react';

const sections = [
    {
        id: 'folders',
        title: 'Gestión de Carpetas',
        icon: <Folder className="w-6 h-6" />,
        color: '#fbbf24',
        content: `
            Las carpetas te permiten organizar tus proyectos por departamentos, clientes o periodos de tiempo. 
            Para crear una:
            1. Haz clic en el botón "Nueva Carpeta" en el Espacio de Trabajo.
            2. Asigna un nombre descriptivo, elige un ícono representativo y un color para identificarla fácilmente.
            3. Puedes mover tableros existentes dentro de carpetas usando la opción "Mover" en el menú de cada tablero.
        `
    },
    {
        id: 'boards',
        title: 'Creación de Tableros',
        icon: <Layout className="w-6 h-6" />,
        color: '#3b82f6',
        content: `
            Un tablero es donde ocurre la acción. Sigue el asistente de creación:
            1. Haz clic en "Nuevo Proyecto".
            2. Paso 1: Nombre y descripción del proyecto.
            3. Paso 2: Define el número de semanas y la fecha de inicio. La fecha de fin se calculará automáticamente.
            4. Paso 3: Configura el ícono, color y los tipos de tareas predominantes.
            5. Paso 4: Importa tareas desde un CSV o empieza desde cero.
        `
    },
    {
        id: 'columns',
        title: 'Columnas y Estados',
        icon: <Columns className="w-6 h-6" />,
        color: '#10b981',
        content: `
            Personaliza tu flujo de trabajo añadiendo o editando columnas:
            1. Dentro de un tablero, haz clic en "Nueva Columna".
            2. Define el nombre del estado (ej: "En Pruebas") y asigna un porcentaje de progreso (0% a 100%).
            3. El porcentaje de la columna determina cuánto contribuyen las tareas en ese estado al progreso total del proyecto.
            4. Puedes editar o eliminar columnas existentes desde los íconos en el encabezado de cada columna.
        `
    },
    {
        id: 'tasks',
        title: 'Gestión de Tareas',
        icon: <CheckSquare className="w-6 h-6" />,
        color: '#f43f5e',
        content: `
            Las tareas son el núcleo de tu planificación:
            1. En la vista de tablero, haz clic en "Nueva Tarea" o en el botón "+" dentro de una columna.
            2. Completa los detalles: nombre, responsable, semana de ejecución, prioridad y etiquetas.
            3. Usa el sistema Drag & Drop para mover tareas entre columnas y actualizar su estado instantáneamente.
            4. Haz clic en una tarea para abrir el panel de detalles, donde puedes añadir comentarios y ver el historial.
        `
    },
    {
        id: 'sharing',
        title: 'Colaboración y Compartir',
        icon: <Share2 className="w-6 h-6" />,
        color: '#8b5cf6',
        content: `
            Dash es colaborativo por naturaleza:
            1. Comparte Internamente: Haz clic en "Compartir" en el tablero para invitar a otros usuarios registrados. Podrán editar o ver según los permisos.
            2. Enlace Público: Genera un token público para que personas sin cuenta puedan ver el progreso en tiempo real (solo lectura).
            3. Colaboradores: Los usuarios asignados a tareas recibirán notificaciones sobre actualizaciones relevantes.
        `
    },
    {
        id: 'analytics',
        title: 'Analítica y Reportes',
        icon: <BarChart3 className="w-6 h-6" />,
        color: '#06b6d4',
        content: `
            Toma decisiones basadas en datos:
            1. Vista de Analítica: Cambia a la pestaña "Analítica" dentro de cualquier tablero para ver la distribución de tareas por prioridad, responsable y semana.
            2. Analítica Consolidada: Desde el Espacio de Trabajo, usa la opción "Analítica Consolidada" para ver el progreso de múltiples proyectos a la vez.
            3. Exportación: Descarga reportes en formato Excel/CSV para auditorías externas o presentaciones.
        `
    }
];

export default function TutorialsPage() {
    const [activeSection, setActiveSection] = useState(sections[0].id);

    return (
        <div className="min-h-screen bg-[#f6f7f9] text-[#1a1d21]">
            <style jsx global>{`
                .glass-card {
                    background: #ffffff;
                    border: 1px solid #e4e6e9;
                    border-radius: 20px;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
                }
                .sidebar-item {
                    transition: all 0.15s ease;
                }
                .sidebar-item:hover {
                    background: #f1f2f4;
                }
                .sidebar-item.active {
                    background: rgba(37, 99, 235, 0.08);
                }
                .text-gradient {
                    color: #1a1d21;
                }
                .section-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 24px;
                }
                .content-p {
                    font-size: 1.1rem;
                    line-height: 1.8;
                    color: #374151;
                    white-space: pre-line;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade {
                    animation: fadeIn 0.4s ease forwards;
                }
            `}</style>

            <div className="max-w-7xl mx-auto px-6 py-12">
                {/* Header Navigation */}
                <div className="flex items-center justify-between mb-12">
                    <Link href="/workspace" className="flex items-center gap-2 text-slate-500 hover:text-[#1a1d21] transition-colors">
                        <ArrowLeft size={20} />
                        <span>Volver al Workspace</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="px-4 py-2 rounded-full glass-card flex items-center gap-2 text-sm">
                            <BookOpen size={16} className="text-blue-600" />
                            <span>Guía Completa 2026</span>
                        </div>
                    </div>
                </div>

                <div className="mb-16">
                    <h1 className="text-5xl font-bold mb-4 text-gradient">Centro de Aprendizaje</h1>
                    <p className="text-lg text-slate-500 max-w-2xl">
                        Descubre cómo dominar Dash para gestionar tus proyectos con máxima eficiencia. Aprende desde los conceptos básicos hasta las funciones avanzadas.
                    </p>
                </div>

                {/* Demo Dashboard CTA */}
                <div className="mb-12 glass-card p-8">
                    <div className="flex items-center justify-between flex-wrap gap-6">
                        <div className="flex-1 min-w-[300px]">
                            <div className="flex items-center gap-3 mb-3">
                                <PlayCircle size={32} className="text-blue-600" />
                                <h3 className="text-2xl font-bold">🎯 Explora el Demo Interactivo</h3>
                            </div>
                            <p className="text-slate-600 mb-4">
                                Descubre todas las funcionalidades de Dash en acción. Tablero demo con 17 tareas reales,
                                múltiples vistas (Kanban, Timeline, Analítica) y flujos de trabajo profesionales.
                            </p>
                            <div className="flex gap-4 flex-wrap">
                                <Link
                                    href="/public/board/b64b9858-70db-41ac-b6a5-5e309c9033b4"
                                    target="_blank"
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all flex items-center gap-2"
                                >
                                    <PlayCircle size={20} />
                                    Ver Demo en Vivo
                                </Link>
                                <div className="px-4 py-3 bg-slate-100 rounded-xl text-sm text-slate-500 flex items-center gap-2">
                                    <MousePointer2 size={16} />
                                    Sin registro · Acceso público
                                </div>
                            </div>
                        </div>
                        <div className="text-6xl opacity-20">💎</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                    {/* Sidebar Navigation */}
                    <div className="lg:col-span-1 space-y-4">
                        {sections.map((section) => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSection(section.id)}
                                className={`sidebar-item w-full text-left p-4 rounded-xl flex items-center gap-4 ${activeSection === section.id ? 'active' : ''
                                    }`}
                            >
                                <div style={{ color: section.color }}>
                                    {section.icon}
                                </div>
                                <span className={`font-medium ${activeSection === section.id ? 'text-blue-600' : 'text-slate-500'}`}>
                                    {section.title}
                                </span>
                                {activeSection === section.id && <ChevronRight size={16} className="ml-auto text-blue-600" />}
                            </button>
                        ))}
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-3">
                        <div className="glass-card p-10 min-h-[500px] animate-fade">
                            {sections.map((section) => (
                                section.id === activeSection && (
                                    <div key={section.id}>
                                        <div className="section-header">
                                            <div className="p-3 rounded-2xl" style={{ backgroundColor: `${section.color}15`, color: section.color }}>
                                                {section.icon}
                                            </div>
                                            <h2 className="text-3xl font-bold">{section.title}</h2>
                                        </div>

                                        <div className="content-p mb-10">
                                            {section.content}
                                        </div>

                                        {/* Visual/Demo Placeholder */}
                                        <div className="mt-12 p-8 rounded-2xl bg-[#f6f7f9] border border-[#e4e6e9] flex flex-col items-center justify-center text-center">
                                            <PlayCircle size={48} className="text-slate-300 mb-4" />
                                            <h4 className="text-lg font-medium text-slate-700">Video Tutorial Próximamente</h4>
                                            <p className="text-slate-500 max-w-sm">Estamos preparando guías visuales paso a paso para que no te pierdas ningún detalle.</p>
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>

                        {/* Quick Tips */}
                        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="glass-card p-6">
                                <Settings size={24} className="text-amber-500 mb-4" />
                                <h5 className="font-bold mb-2">Editor Rápido</h5>
                                <p className="text-sm text-slate-500">Usa el ícono de lápiz para editar cualquier elemento sin salir de tu vista actual.</p>
                            </div>
                            <div className="glass-card p-6">
                                <Search size={24} className="text-blue-600 mb-4" />
                                <h5 className="font-bold mb-2">Filtros Inteligentes</h5>
                                <p className="text-sm text-slate-500">Combina filtros de semana, responsable y texto para encontrar tareas específicas en segundos.</p>
                            </div>
                            <div className="glass-card p-6">
                                <UserPlus size={24} className="text-purple-600 mb-4" />
                                <h5 className="font-bold mb-2">Permisos Flexibles</h5>
                                <p className="text-sm text-slate-500">Configura quién puede ver o editar cada proyecto desde el panel de colaboradores.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="mt-20 border-t border-[#e4e6e9] py-12 text-center text-slate-500">
                <p>&copy; 2026 Dash Platform · Todos los derechos reservados</p>
                <div className="flex justify-center gap-6 mt-4">
                    <Link href="/help" className="hover:text-[#1a1d21]">Ayuda</Link>
                    <Link href="/docs" className="hover:text-[#1a1d21]">Documentación</Link>
                    <Link href="/workspace" className="hover:text-[#1a1d21]">Workspace</Link>
                </div>
            </footer>
        </div>
    );
}
