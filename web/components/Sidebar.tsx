"use client";

import {
    BarChart3,
    ChevronLeft,
    ChevronRight,
    LayoutDashboard,
    LogOut,
    PlusCircle,
    Users
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { auth } from "../lib/firebase";

interface SidebarProps {
    isMinimized: boolean;
    setIsMinimized: (val: boolean) => void;
}

export default function Sidebar({ isMinimized, setIsMinimized }: SidebarProps) {
    const pathname = usePathname();

    const menuItems = [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "Members", href: "/members", icon: Users },
        { name: "Transactions", href: "/transactions", icon: PlusCircle },
        { name: "Reports", href: "/reports", icon: BarChart3 },
    ];

    const handleLogout = () => {
        auth.signOut();
    };

    return (
        <div
            style={{
                width: isMinimized ? '80px' : '260px',
                height: '100vh',
                backgroundColor: '#1E293B',
                color: 'white',
                transition: 'width 0.3s ease',
                display: 'flex',
                flexDirection: 'column',
                position: 'fixed',
                left: 0,
                top: 0,
                zIndex: 50
            }}
        >
            <div style={{ height: '80px', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: isMinimized ? 'center' : 'space-between' }}>
                {!isMinimized && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', backgroundColor: '#F57C00', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <PlusCircle size={20} color="white" />
                        </div>
                        <h2 style={{ fontSize: '16px', fontWeight: '900', letterSpacing: '1px' }}>KIKOBA</h2>
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
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '14px 16px',
                                marginBottom: '8px',
                                borderRadius: '12px',
                                textDecoration: 'none',
                                color: isActive ? 'white' : '#94A3B8',
                                backgroundColor: isActive ? '#F57C00' : 'transparent',
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

            <div style={{ padding: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <button
                    onClick={handleLogout}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: '12px',
                        color: '#F43F5E',
                        justifyContent: isMinimized ? 'center' : 'flex-start',
                        transition: 'all 0.2s'
                    }}
                >
                    <LogOut size={20} style={{ marginRight: isMinimized ? 0 : '12px' }} />
                    {!isMinimized && <span style={{ fontWeight: '600', fontSize: '14px' }}>Logout</span>}
                </button>
            </div>
        </div>
    );
}
