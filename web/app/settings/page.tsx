"use client";

import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { ArrowLeft, LogOut, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import AppLayout from "../../components/AppLayout";
import { auth, db } from "../../lib/firebase";

export default function SettingsPage() {
    const [user, setUser] = useState<any>(null);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [loggingOut, setLoggingOut] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            if (u) {
                setUser(u);
                try {
                    const userDoc = await getDoc(doc(db, 'users', u.uid));
                    if (userDoc.exists()) {
                        setUserProfile(userDoc.data());
                    }
                } catch (error) {
                    console.error('Error fetching user profile:', error);
                }
            } else {
                window.location.href = '/login';
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        try {
            setLoggingOut(true);
            await signOut(auth);
            window.location.href = '/login';
        } catch (error) {
            console.error('Error logging out:', error);
            setLoggingOut(false);
        }
    };

    return (
        <AppLayout>
            <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link href="/dashboard" style={{ textDecoration: 'none' }}>
                        <button style={{
                            padding: '0.5rem',
                            borderRadius: '0.5rem',
                            backgroundColor: 'transparent',
                            border: '1px solid var(--border)',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <ArrowLeft size={20} />
                        </button>
                    </Link>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Settings</h1>
                        <p style={{ color: 'var(--text-secondary)' }}>Manage your account and preferences</p>
                    </div>
                </div>

                {/* Profile Section */}
                <div className="card" style={{ padding: '2rem', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <User size={20} />
                        Profile Information
                    </h2>

                    {loading ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <div className="animate-spin" style={{ margin: '0 auto 1rem', width: '2rem', height: '2rem', border: '3px solid var(--background-muted)', borderTopColor: '#F57C00', borderRadius: '50%' }}></div>
                            <p>Loading profile...</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Full Name</label>
                                <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--background-muted)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                                    {user?.displayName || 'N/A'}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Email</label>
                                <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--background-muted)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                                    {user?.email || 'N/A'}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Member ID</label>
                                <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--background-muted)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontWeight: '500', fontFamily: 'monospace' }}>
                                    {userProfile?.memberId || 'N/A'}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Role</label>
                                <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--background-muted)', borderRadius: '0.5rem', color: 'var(--text-primary)', fontWeight: '500' }}>
                                    {userProfile?.role || 'Member'}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Status</label>
                                <div style={{
                                    padding: '0.75rem 1rem',
                                    backgroundColor: userProfile?.status === 'Active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: '0.5rem',
                                    color: userProfile?.status === 'Active' ? '#10B981' : '#EF4444',
                                    fontWeight: '500'
                                }}>
                                    {userProfile?.status || 'Unknown'}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Account Actions */}
                <div className="card" style={{ padding: '2rem' }}>
                    <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>Account Actions</h2>

                    <button
                        onClick={handleLogout}
                        disabled={loggingOut}
                        style={{
                            width: '100%',
                            padding: '0.875rem 1.5rem',
                            borderRadius: '0.75rem',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: '#EF4444',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            fontWeight: '600',
                            cursor: loggingOut ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem',
                            transition: 'all 0.2s',
                            opacity: loggingOut ? 0.6 : 1
                        }}
                        onMouseEnter={(e) => !loggingOut && (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)')}
                        onMouseLeave={(e) => !loggingOut && (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)')}
                    >
                        <LogOut size={18} />
                        {loggingOut ? 'Logging out...' : 'Logout'}
                    </button>

                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1rem', textAlign: 'center' }}>
                        You will be logged out of your account
                    </p>
                </div>
            </div>
        </AppLayout>
    );
}
