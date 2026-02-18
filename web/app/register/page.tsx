"use client";

import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { errorHandler } from "../../lib/errorHandler";
import { auth, db } from "../../lib/firebase";
import { groupCodeService } from "../../lib/groupCodeService";
import { getNextMemberId } from "../../lib/memberIdService";
import { validateEmail, validateGroupCodeFormat, validateName, validatePassword, validatePasswordMatch, validatePhoneNumber } from "../../lib/validationService";

export default function RegisterPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [groupCode, setGroupCode] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        // Validation
        const nameVal = validateName(name);
        if (!nameVal.isValid) return setError(nameVal.error!);

        const emailVal = validateEmail(email);
        if (!emailVal.isValid) return setError(emailVal.error!);

        const phoneVal = validatePhoneNumber(phoneNumber);
        if (!phoneVal.isValid) return setError(phoneVal.error!);

        const groupCodeVal = validateGroupCodeFormat(groupCode);
        if (!groupCodeVal.isValid) return setError(groupCodeVal.error!);

        const passVal = validatePassword(password);
        if (!passVal.isValid) return setError(passVal.error!);

        const matchVal = validatePasswordMatch(password, confirmPassword);
        if (!matchVal.isValid) return setError(matchVal.error!);

        setIsSubmitting(true);

        try {
            // 1. Validate group code
            const codeRes = await groupCodeService.validateGroupCode(groupCode);
            if (!codeRes.isValid) {
                setError(codeRes.error!);
                setIsSubmitting(false);
                return;
            }

            // 2. Create user
            const userCredential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
            const user = userCredential.user;

            // 3. Update profile
            await updateProfile(user, { displayName: name.trim() });

            // 4. Get next member ID
            let memberId = "";
            try {
                memberId = await getNextMemberId();
            } catch (err) {
                console.error("Error generating ID:", err);
            }

            // 5. Create Firestore record
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                displayName: name.trim(),
                email: email.trim().toLowerCase(),
                phoneNumber: phoneNumber.trim(),
                groupCode: groupCode.trim().toUpperCase(),
                role: "Member",
                status: "Active",
                memberId: memberId || null,
                createdAt: new Date().toISOString()
            });

            // 6. Send verification
            await sendEmailVerification(user);

            // 7. Increment group code redemption count
            await groupCodeService.incrementRedemptionCount(groupCode);

            setSuccess(true);
            await auth.signOut();
        } catch (err: any) {
            const { userMessage } = errorHandler.handle(err);
            setError(userMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (success) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyItems: 'center', padding: '1rem', justifyContent: 'center' }}>
                <div className="card" style={{ width: '100%', maxWidth: '450px', padding: '2.5rem', textAlign: 'center' }}>
                    <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: '#10B98115', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img src="/sbk-logo.png" alt="Logo" style={{ width: '40px', height: '40px' }} />
                        </div>
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '1rem' }}>Registration Successful!</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.5' }}>
                        Your account has been created. We've sent a verification email to <strong>{email}</strong>. Please verify your email before logging in.
                    </p>
                    <Link href="/" className="btn-primary" style={{ display: 'block', textDecoration: 'none' }}>
                        Go to Login
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
            <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: '600', marginBottom: '1.5rem' }}>
                        <ArrowLeft size={16} /> Back to Login
                    </Link>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--text-primary)' }}>Create Member Account</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Join the Simba Bingwa Kikoba community</p>
                </div>

                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Full Name</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="John Doe"
                                style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', backgroundColor: 'var(--background-muted)', outline: 'none' }}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Phone Number</label>
                            <input
                                type="tel"
                                required
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                placeholder="0712345678"
                                style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', backgroundColor: 'var(--background-muted)', outline: 'none' }}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="john@example.com"
                            style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', backgroundColor: 'var(--background-muted)', outline: 'none' }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Group Code</label>
                        <input
                            type="text"
                            required
                            value={groupCode}
                            onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
                            placeholder="SIMB2025"
                            style={{ padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid var(--border)', backgroundColor: 'var(--background-muted)', outline: 'none' }}
                        />
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Get this from your group administrator</p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    style={{ width: '100%', padding: '0.75rem 1rem', paddingRight: '2.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)', backgroundColor: 'var(--background-muted)', outline: 'none' }}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Confirm</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    style={{ width: '100%', padding: '0.75rem 1rem', paddingRight: '2.5rem', borderRadius: '0.75rem', border: '1px solid var(--border)', backgroundColor: 'var(--background-muted)', outline: 'none' }}
                                />
                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {error && <div style={{ color: '#F43F5E', fontSize: '0.875rem', textAlign: 'center', backgroundColor: '#F43F5E10', padding: '0.75rem', borderRadius: '0.5rem' }}>{error}</div>}

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-primary"
                        style={{ marginTop: '0.5rem' }}
                    >
                        {isSubmitting ? "Creating Account..." : "Create Account"}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        Already have an account? <Link href="/" style={{ color: 'var(--primary)', fontWeight: '700', textDecoration: 'none' }}>Login</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
