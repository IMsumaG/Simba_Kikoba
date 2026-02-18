"use client";

import { sendEmailVerification, signInWithEmailAndPassword, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { errorHandler } from "../lib/errorHandler";
import { auth, db } from "../lib/firebase";

export default function LoginPage() {
    const { user, role, loading } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State for verification flow
    const [verificationNeeded, setVerificationNeeded] = useState(false);
    const [userToVerify, setUserToVerify] = useState<User | null>(null);
    const [verificationSent, setVerificationSent] = useState(false);

    useEffect(() => {
        // Only run logic if loading is complete
        // If verification is needed, ignore the redirect or error logic
        if (!loading && user && !verificationNeeded) {
            // Check if email is verified
            if (user.emailVerified) {
                if (role === "Admin" || role === "Member") {
                    router.replace("/dashboard");
                } else if (role) {
                    setError("Access denied. You do not have permission to access the portal.");
                }
            } else {
                // If user somehow exists in context but email not verified (and not handled by handleLogin)
                // We might want to handle it, but usually handleLogin catches it first.
            }
        }
    }, [user, role, loading, router, verificationNeeded]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsSubmitting(true);
        setVerificationNeeded(false);

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);

            if (!userCredential.user.emailVerified) {
                // Do NOT sign out yet. Keep user to allow sending verification email.
                // We prevent navigation by setting verificationNeeded state.
                setUserToVerify(userCredential.user);
                setVerificationNeeded(true);
                setIsSubmitting(false);
                return;
            }

            const userDoc = await getDoc(doc(db, "users", userCredential.user.uid));

            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.role === "Admin" || userData.role === "Member") {
                    router.push("/dashboard");
                } else {
                    await auth.signOut();
                    setError("Access denied. Unauthorized role.");
                }
            } else {
                await auth.signOut();
                setError("User record not found.");
            }
        } catch (err: any) {
            const { userMessage } = errorHandler.handle(err);
            setError(userMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendVerification = async () => {
        if (!userToVerify) return;
        setIsSubmitting(true);
        try {
            await sendEmailVerification(userToVerify);
            setVerificationSent(true);
            setError(""); // Clear any previous errors
        } catch (err: any) {
            console.error(err);
            setError("Failed to send verification email. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBackToLogin = async () => {
        await auth.signOut();
        setVerificationNeeded(false);
        setUserToVerify(null);
        setVerificationSent(false);
        setError("");
    };

    if (loading) return null;

    if (verificationNeeded) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '1rem'
            }}>
                <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', textAlign: 'center' }}>
                    <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                        <div style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--background-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <img src="/sbk-logo.png" alt="SBK Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                        </div>
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                        Verification Required
                    </h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.5' }}>
                        {verificationSent
                            ? "Verification email sent! Please check your inbox and follow the link to verify your account."
                            : "Please verify your email address to access the portal."}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {!verificationSent && (
                            <button
                                onClick={handleResendVerification}
                                disabled={isSubmitting}
                                className="btn-primary"
                            >
                                {isSubmitting ? "Sending..." : "Resend Verification Email"}
                            </button>
                        )}
                        <button
                            onClick={handleBackToLogin}
                            style={{
                                padding: '0.875rem 1rem',
                                borderRadius: '0.75rem',
                                border: '1px solid var(--border)',
                                backgroundColor: 'transparent',
                                color: 'var(--text-primary)',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            Back to Login
                        </button>
                    </div>
                    {error && <div style={{ color: '#F43F5E', fontSize: '0.875rem', marginTop: '1rem' }}>{error}</div>}
                </div>
            </div>
        );
    }

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
                        width: 'auto',
                        height: 'auto',
                        marginBottom: '1.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <img src="/sbk-logo.png" alt="SBK Logo" style={{ width: '120px', height: '120px', objectFit: 'contain' }} />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-primary)' }}>Simba Bingwa Kikoba Endelevu</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Web Portal</p>
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

                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        Don't have an account? <Link href="/register" style={{ color: 'var(--primary)', fontWeight: '700', textDecoration: 'none' }}>Sign Up</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
