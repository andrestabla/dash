"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Settings, Bell, ArrowLeft, Menu, X, Shield } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Auto-close on navigation
    useEffect(() => {
        setIsMobileOpen(false);
    }, [pathname]);

    const menu = [
        { name: 'Usuarios', href: '/admin/users', icon: Users },
        { name: 'Tableros', href: '/admin/dashboards', icon: LayoutDashboard },
        { name: 'Configuración', href: '/admin/settings', icon: Settings },
        { name: 'Notificaciones', href: '/admin/notifications', icon: Bell },
        { name: 'Seguridad & SSO', href: '/admin/sso', icon: Shield },
    ];

    return (
        <div className="admin-layout">

            {/* MOBILE HEADER / TOGGLE */}
            <div className="mobile-header">
                <button className="btn-ghost icon-btn" onClick={() => setIsMobileOpen(true)}>
                    <Menu size={20} />
                </button>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Admin Suite</div>
            </div>

            {/* BACKDROP */}
            {isMobileOpen && (
                <div className="sidebar-backdrop" onClick={() => setIsMobileOpen(false)} />
            )}

            {/* SIDEBAR */}
            <aside className={`glass-panel admin-sidebar ${isMobileOpen ? 'open' : ''}`}>
                <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Link href="/workspace" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-main)' }}>
                        <ArrowLeft size={20} />
                        <div>
                            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--text-dim)' }}>Regresar a</div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>Workspace</div>
                        </div>
                    </Link>
                    {/* Mobile Close Button */}
                    <button className="btn-ghost mobile-close-btn" onClick={() => setIsMobileOpen(false)}><X size={20} /></button>
                </div>

                <div style={{ padding: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Admin Suite
                    </div>
                    <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {menu.map(item => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`nav-item ${isActive ? 'active' : ''}`}
                                >
                                    <Icon size={18} />
                                    <span style={{ fontSize: 14 }}>{item.name}</span>
                                </Link>
                            )
                        })}
                    </nav>
                </div>

                <div style={{ marginTop: 'auto', padding: 20, textAlign: 'center', fontSize: 11, color: 'var(--text-dim)' }}>
                    Project control &copy; 2026 by Algoritmo T<br />v10.6
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="admin-main">
                <div className="glass-panel content-panel">
                    {children}
                </div>
            </main>

            <style jsx>{`
                .admin-layout {
                    display: flex;
                    min-height: 100vh;
                    background: var(--bg-main);
                    color: var(--text-main);
                    position: relative;
                }

                /* SIDEBAR BASE SIZING (Desktop) */
                .admin-sidebar {
                    width: 260px;
                    margin: 16px;
                    border-radius: 24px;
                    display: flex;
                    flex-direction: column;
                    border: 1px solid var(--border-dim);
                    background: var(--bg-panel);
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    z-index: 50;
                }

                .mobile-header { display: none; }
                .sidebar-backdrop { display: none; }
                .mobile-close-btn { display: none; }

                /* MAIN AREA */
                .admin-main {
                    flex: 1;
                    padding: 16px 16px 16px 0;
                    overflow: hidden;
                    display: flex;
                }
                .content-panel {
                    flex: 1;
                    padding: 40px;
                    overflow-y: auto;
                    border-radius: 24px;
                    background: var(--bg-card);
                    border: 1px solid var(--border-dim);
                }

                /* NAV LINKS */
                .nav-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 16px;
                    border-radius: 12px;
                    background: transparent;
                    color: var(--text-dim);
                    font-weight: 500;
                    text-decoration: none;
                    transition: all 0.2s;
                }
                .nav-item.active {
                    background: var(--primary-gradient);
                    color: white;
                    font-weight: 600;
                    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                }
                .nav-item:hover:not(.active) {
                    background: rgba(0,0,0,0.05);
                    color: var(--text-main);
                }
                .dark .nav-item:hover:not(.active) {
                    background: rgba(255,255,255,0.05);
                }

                /* --- MOBILE RESPONSIVENESS (< 768px) --- */
                @media (max-width: 900px) {
                    .admin-layout {
                        flex-direction: column;
                    }

                    .mobile-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 16px;
                        background: var(--bg-panel);
                        border-bottom: 1px solid var(--border-dim);
                        position: sticky;
                        top: 0;
                        z-index: 40;
                    }

                    .admin-sidebar {
                        position: fixed;
                        top: 0;
                        left: 0;
                        bottom: 0;
                        margin: 0;
                        border-radius: 0 24px 24px 0;
                        transform: translateX(-110%);
                        background: var(--bg-card);
                        box-shadow: 10px 0 30px rgba(0,0,0,0.1);
                        border-right: 1px solid var(--border-dim);
                    }
                    .admin-sidebar.open {
                        transform: translateX(0);
                    }

                    .sidebar-backdrop {
                        display: block;
                        position: fixed;
                        inset: 0;
                        background: rgba(0,0,0,0.4);
                        backdrop-filter: blur(4px);
                        z-index: 45;
                        animation: fadeIn 0.3s;
                    }

                    .mobile-close-btn { display: block; }

                    .admin-main {
                        padding: 16px;
                    }
                    .content-panel {
                        padding: 20px;
                    }
                }
            `}</style>
        </div>
    );
}
