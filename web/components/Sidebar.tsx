"use client";

import {
    BarChart3,
    ChevronLeft,
    ChevronRight,
    LayoutDashboard,
    Mail,
    Moon,
    PlusCircle,
    Settings,
    Shield,
    Sun,
    Users
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

interface SidebarProps {
    isMinimized: boolean;
    setIsMinimized: (val: boolean) => void;
    isMobile?: boolean; // Optional to avoid breaking other usages immediately
}

export default function Sidebar({ isMinimized, setIsMinimized, isMobile = false }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { role } = useAuth();
    const { theme, toggleTheme } = useTheme();

    const menuItems = [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "Members", href: "/members", icon: Users },
        { name: "Transactions", href: "/transactions", icon: PlusCircle },
        { name: "Loan Requests", href: "/loan-requests", icon: PlusCircle },
        { name: "Reports", href: "/reports", icon: BarChart3 },
        { name: "Reminders", href: "/reminders", icon: Mail },
    ];

    if (role === 'Admin') {
        menuItems.push({ name: "Audit Logs", href: "/audit-logs", icon: Shield });
    }

    const handleSettings = () => {
        router.push('/settings');
    };

    const sidebarWidth = isMobile
        ? (isMinimized ? '0px' : '260px')
        : (isMinimized ? '80px' : '260px');

    return (
        <div
            style={{
                width: sidebarWidth,
                height: '100vh',
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text-primary)',
                borderRight: '1px solid var(--border)',
                transition: 'width 0.3s ease, transform 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                position: 'fixed',
                left: 0,
                top: 0,
                zIndex: 50,
                overflow: 'hidden', // Hide content when width is 0
                transform: isMobile && isMinimized ? 'translateX(-100%)' : 'translateX(0)',
            }}
        >
            <div style={{ height: '80px', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: isMinimized ? 'center' : 'space-between' }}>
                {!isMinimized && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src="/sbk-logo.png" alt="SBK" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                        <h2 style={{ fontSize: '14px', fontWeight: '900', letterSpacing: '0.5px' }}>SBK ENDELEVU</h2>
                    </div>
                )}
                <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    style={{
                        padding: '8px',
                        borderRadius: '8px',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        color: '#94A3B8'
                    }}
                >
                    {isMinimized ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                </button>
            </div>

            <nav style={{ flex: 1, padding: '12px' }}>
                {menuItems.map((item) => {
                    const isActive = pathname === item.href;
                    const handleItemClick = () => {
                        if (isMobile) {
                            setIsMinimized(true);
                        }
                    };
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={handleItemClick}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '14px 16px',
                                marginBottom: '8px',
                                borderRadius: '12px',
                                textDecoration: 'none',
                                color: isActive ? 'white' : 'var(--text-secondary)',
                                backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                                justifyContent: isMinimized ? 'center' : 'flex-start',
                                transition: 'all 0.2s',
                                boxShadow: isActive ? '0 4px 12px rgba(245, 124, 0, 0.3)' : 'none'
                            }}
                        >
                            <item.icon size={20} style={{ marginRight: isMinimized ? 0 : '12px' }} />
                            {!isMinimized && <span style={{ fontWeight: '600', fontSize: '14px' }}>{item.name}</span>}
                        </Link>
                    );
                })}
            </nav>

            <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
                <button
                    onClick={toggleTheme}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: '12px',
                        color: 'var(--text-secondary)',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        justifyContent: isMinimized ? 'center' : 'flex-start',
                        transition: 'all 0.2s',
                        marginBottom: '8px'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--background-muted)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                    {theme === 'dark' ? (
                        <Moon size={20} style={{ marginRight: isMinimized ? 0 : '12px' }} />
                    ) : (
                        <Sun size={20} style={{ marginRight: isMinimized ? 0 : '12px' }} />
                    )}
                    {!isMinimized && <span style={{ fontWeight: '600', fontSize: '14px' }}>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>}
                </button>

                <button
                    onClick={handleSettings}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: '12px',
                        color: 'var(--text-secondary)',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        justifyContent: isMinimized ? 'center' : 'flex-start',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--background-muted)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                    <Settings size={20} style={{ marginRight: isMinimized ? 0 : '12px' }} />
                    {!isMinimized && <span style={{ fontWeight: '600', fontSize: '14px' }}>Settings</span>}
                </button>
            </div>
        </div>
    );
}
