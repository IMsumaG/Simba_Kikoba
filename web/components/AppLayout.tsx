"use client";

import { Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, role, loading, timeRemaining } = useAuth();
    const router = useRouter();
    const [isMinimized, setIsMinimized] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    const formatTime = (seconds?: number) => {
        if (seconds === undefined) return "--:--";
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (mobile && !isMinimized) {
                // Optionally auto-collapse on resize to mobile
                // setIsMinimized(true);
            }
        };

        // Initial check
        handleResize();

        // If mobile on load, default to minimized (closed)
        if (window.innerWidth < 768) {
            setIsMinimized(true);
        }

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!loading && (!user || role !== "Admin")) {
            router.replace("/");
        }
    }, [user, role, loading, router]);

    if (loading || !user || role !== "Admin") {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--background)' }}>
                <p>Loading Admin Dashboard...</p>
            </div>
        );
    }

    const sidebarWidth = isMobile
        ? '0px'
        : (isMinimized ? '80px' : '260px');

    return (
        <div style={{ display: 'flex' }}>
            {isMobile && !isMinimized && (
                <div
                    onClick={() => setIsMinimized(true)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        zIndex: 40,
                        backdropFilter: 'blur(2px)'
                    }}
                />
            )}

            {isMobile && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '60px',
                    backgroundColor: 'var(--card-bg)',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 20px',
                    zIndex: 30,
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img src="/sbk-logo.png" alt="SBK" style={{ height: '30px' }} />
                        <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)' }}>SBK ENDELEVU</span>
                        {timeRemaining !== undefined && (
                            <div style={{
                                marginLeft: '10px',
                                backgroundColor: timeRemaining < 60 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontWeight: 'bold',
                                color: timeRemaining < 60 ? '#EF4444' : '#10B981'
                            }}>
                                {formatTime(timeRemaining)}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setIsMinimized(false)}
                        style={{
                            padding: '8px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--background-muted)',
                            border: 'none',
                            color: 'var(--text-primary)',
                            cursor: 'pointer'
                        }}
                    >
                        <Menu size={24} />
                    </button>
                </div>
            )}

            <Sidebar isMinimized={isMinimized} setIsMinimized={setIsMinimized} isMobile={isMobile} />

            <main style={{
                flex: 1,
                marginLeft: sidebarWidth,
                minHeight: '100vh',
                backgroundColor: 'var(--background-muted)',
                transition: 'margin-left 0.3s ease',
                position: 'relative',
                paddingTop: isMobile ? '60px' : '0'
            }}>
                {/* Desktop Session Timer */}
                {!isMobile && timeRemaining !== undefined && (
                    <div style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '2rem',
                        backgroundColor: timeRemaining < 60 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: timeRemaining < 60 ? '#EF4444' : '#10B981',
                        border: `1px solid ${timeRemaining < 60 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`,
                        zIndex: 10
                    }}>
                        Session: {formatTime(timeRemaining)}
                    </div>
                )}
                <div style={{
                    padding: isMobile ? '1.5rem' : '2.5rem',
                    maxWidth: '1200px',
                    margin: '0 auto',
                    width: '100%'
                }}>
                    {children}
                </div>
            </main>
        </div>
    );
}
