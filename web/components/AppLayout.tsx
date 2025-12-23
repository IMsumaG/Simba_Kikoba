"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import Sidebar from "./Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const { user, role, loading } = useAuth();
    const router = useRouter();
    const [isMinimized, setIsMinimized] = useState(false);

    useEffect(() => {
        if (!loading && (!user || role !== "Admin")) {
            router.replace("/");
        }
    }, [user, role, loading, router]);

    if (loading || !user || role !== "Admin") {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p>Loading Admin Dashboard...</p>
            </div>
        );
    }

    const sidebarWidth = isMinimized ? '80px' : '260px';

    return (
        <div style={{ display: 'flex' }}>
            <Sidebar isMinimized={isMinimized} setIsMinimized={setIsMinimized} />
            <main style={{
                flex: 1,
                marginLeft: sidebarWidth,
                minHeight: '100vh',
                backgroundColor: 'var(--background-muted)',
                transition: 'margin-left 0.3s ease'
            }}>
                <div style={{ padding: '2.5rem' }}>
                    {children}
                </div>
            </main>
        </div>
    );
}
