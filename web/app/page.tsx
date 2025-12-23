"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Eye, EyeOff, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { auth, db } from "../lib/firebase";

export default function LoginPage() {
    const { user, role, loading } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        // Only run logic if loading is complete
        if (!loading && user) {
            if (role === "Admin") {
                router.replace("/dashboard");
            } else {
                setError("Access denied. Only admins can access the web portal.");
            }
        }
    }, [user, role, loading, router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));

            if (userDoc.exists() && userDoc.data().role === "Admin") {
                router.push("/dashboard");
            } else {
                // If not admin, sign them out immediately to prevent access
                await auth.signOut();
                setError("Access denied. Admin role required.");
            }
        } catch (err: any) {
            setError(err.message || "Failed to login");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return null;

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        backgroundColor: 'var(--primary)',
                        width: '64px',
                        height: '64px',
                        borderRadius: '1.25rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '1.5rem',
                        boxShadow: '0 10px 15px -3px rgba(245, 124, 0, 0.3)'
                    }}>
                        <TrendingUp size={36} color="white" />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-primary)' }}>KIKOBA Insights</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Admin Portal</p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-secondary)' }}>EMAIL ADDRESS</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@kikoba.com"
                            style={{
                                padding: '0.875rem 1rem',
                                borderRadius: '0.75rem',
                                border: '1px solid var(--border)',
                                backgroundColor: 'var(--background-muted)',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.875rem', fontWeight: '700', color: 'var(--text-secondary)' }}>PASSWORD</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 1rem',
                                    paddingRight: '3rem',
                                    borderRadius: '0.75rem',
                                    border: '1px solid var(--border)',
                                    backgroundColor: 'var(--background-muted)',
                                    outline: 'none'
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '1rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                            </button>
                        </div>
                    </div>

                    {error && <div style={{ color: '#F43F5E', fontSize: '0.875rem', textAlign: 'center' }}>{error}</div>}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-primary"
                        style={{ marginTop: '0.5rem' }}
                    >
                        {isSubmitting ? "Logging in..." : "Login to Portal"}
                    </button>
                </form>
            </div>
        </div>
    );
}
