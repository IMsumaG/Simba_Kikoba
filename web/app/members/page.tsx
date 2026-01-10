"use client";

import { collection, deleteDoc, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import {
    Calendar,
    CreditCard,
    Mail,
    ShieldCheck,
    ShieldX,
    Trash2,
    User,
    Wallet,
    X
} from "lucide-react";
import { useEffect, useState } from "react";
import AppLayout from "../../components/AppLayout";
import { db } from "../../lib/firebase";

interface UserProfile {
    uid: string;
    memberId?: string;
    displayName: string;
    email: string;
    role: 'Admin' | 'Member';
    status?: 'Active' | 'Inactive';
    createdAt: string;
    phone?: string;
}

export default function MembersPage() {
    const [members, setMembers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Member Details Modal State
    const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
    const [memberStats, setMemberStats] = useState({
        balance: 0,
        loanBalance: 0,
        totalContributions: 0,
        contributionsByCategory: { Hisa: 0, Jamii: 0, Standard: 0, Dharura: 0 },
        loansByCategory: { Hisa: 0, Jamii: 0, Standard: 0, Dharura: 0 }
    });
    const [loadingStats, setLoadingStats] = useState(false);

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            setLoading(true);
            const snapshot = await getDocs(collection(db, "users"));
            const data = snapshot.docs.map(doc => doc.data() as UserProfile);
            setMembers(data);
        } catch (error) {
            console.error("Error fetching members:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMemberStats = async (uid: string) => {
        try {
            setLoadingStats(true);
            const q = query(collection(db, "transactions"), where("memberId", "==", uid));
            const snapshot = await getDocs(q);

            let balance = 0;
            let loanBalance = 0;
            let contributions = 0;
            let contribsByCategory = { Hisa: 0, Jamii: 0, Standard: 0, Dharura: 0 };
            let loansByCat = { Hisa: 0, Jamii: 0, Standard: 0, Dharura: 0 };

            snapshot.forEach(doc => {
                const data = doc.data();
                const cat = data.category as keyof typeof contribsByCategory;

                if (data.type === 'Contribution') {
                    balance += data.amount;
                    contributions += data.amount;
                    if (cat && contribsByCategory[cat] !== undefined) {
                        contribsByCategory[cat] += data.amount;
                    }
                } else if (data.type === 'Loan') {
                    loanBalance += data.amount;
                    if (cat && loansByCat[cat] !== undefined) {
                        loansByCat[cat] += data.amount;
                    }
                } else if (data.type === 'Loan Repayment') {
                    loanBalance -= data.amount;
                    if (cat && loansByCat[cat] !== undefined) {
                        loansByCat[cat] -= data.amount;
                    }
                }
            });

            setMemberStats({
                balance,
                loanBalance,
                totalContributions: contributions,
                contributionsByCategory: contribsByCategory,
                loansByCategory: loansByCat
            });
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingStats(false);
        }
    };

    const handleMemberClick = (member: UserProfile) => {
        setSelectedMember(member);
        fetchMemberStats(member.uid);
    };

    const handleUpdateRole = async (uid: string, newRole: 'Admin' | 'Member') => {
        const action = newRole === 'Admin' ? 'GRANT admin access to' : 'REVOKE admin access from';
        if (!confirm(`Are you sure you want to ${action} this user?`)) return;

        try {
            await updateDoc(doc(db, "users", uid), { role: newRole });
            setMembers(prev => prev.map(m => m.uid === uid ? { ...m, role: newRole } : m));
            if (selectedMember?.uid === uid) {
                setSelectedMember(prev => prev ? { ...prev, role: newRole } : null);
            }
        } catch (error) {
            alert("Failed to update role");
        }
    };

    const handleDeleteMember = async (uid: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) return;

        try {
            await deleteDoc(doc(db, "users", uid));
            setMembers(prev => prev.filter(m => m.uid !== uid));
            if (selectedMember?.uid === uid) setSelectedMember(null);
        } catch (error) {
            alert("Failed to delete user");
        }
    };

    const handleGenerateIds = async () => {
        if (!confirm("This will generate unique Member IDs (SBK###) for all users who don't have one.\n\nContinue?")) return;

        try {
            setLoading(true);
            const response = await fetch('/api/admin/generate-ids', {
                method: 'POST',
            });
            const result = await response.json();

            if (result.success) {
                let msg = `Success! Generated IDs for ${result.count} members.`;
                if (result.errors?.length > 0) {
                    msg += `\n\nWarning: ${result.errors.length} errors occurred:\n${result.errors.join('\n')}`;
                }
                alert(msg);
                fetchMembers();
            } else {
                alert(`Error: ${result.error || 'Failed to generate IDs'}`);
            }
        } catch (error) {
            console.error(error);
            alert("An error occurred while generating IDs.");
        } finally {
            setLoading(false);
        }
    };

    const filteredMembers = members.filter(m =>
        m.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.memberId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AppLayout>
            <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: '900', letterSpacing: '-0.5px' }}>Member Directory</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage access levels and account status</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button
                        onClick={handleGenerateIds}
                        style={{
                            padding: '0.875rem 1rem',
                            borderRadius: '0.75rem',
                            backgroundColor: '#0F172A',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: '0.875rem',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        Generate IDs
                    </button>
                    <div style={{ position: 'relative', width: '320px' }}>
                        <input
                            type="text"
                            placeholder="Search by name, email or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.875rem 1rem',
                                borderRadius: '0.75rem',
                                border: '1px solid var(--border)',
                                outline: 'none',
                                backgroundColor: 'white',
                                fontSize: '0.875rem',
                                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                            }}
                        />
                    </div>
                </div>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border)' }}>
                            <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>ID</th>
                            <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Member</th>
                            <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Current Role</th>
                            <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Status</th>
                            <th style={{ padding: '1.25rem 1.5rem', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Access Control</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading members...</td></tr>
                        ) : filteredMembers.length > 0 ? (
                            filteredMembers.map((member) => (
                                <tr
                                    key={member.uid}
                                    onClick={() => handleMemberClick(member)}
                                    style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s', cursor: 'pointer' }}
                                    className="hover-row"
                                >
                                    <td style={{ padding: '1.25rem 1.5rem', fontWeight: 'bold', color: '#64748B', fontFamily: 'monospace' }}>
                                        {member.memberId ? (
                                            <span style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{member.memberId}</span>
                                        ) : '-'}
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <div style={{
                                                width: '44px',
                                                height: '44px',
                                                borderRadius: '12px',
                                                backgroundColor: '#F1F5F9',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'var(--primary)',
                                                fontWeight: '800'
                                            }}>
                                                {member.displayName?.[0] || "U"}
                                            </div>
                                            <div>
                                                <p style={{ fontWeight: '700', fontSize: '0.925rem', color: 'var(--text-primary)' }}>{member.displayName}</p>
                                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                                    <Mail size={12} /> {member.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <span style={{
                                            padding: '4px 12px',
                                            borderRadius: '99px',
                                            fontSize: '0.75rem',
                                            fontWeight: '800',
                                            backgroundColor: member.role === 'Admin' ? '#F57C0015' : '#1E293B10',
                                            color: member.role === 'Admin' ? '#F57C00' : '#1E293B'
                                        }}>
                                            {member.role === 'Admin' ? 'ADMIN' : 'MEMBER'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: member.status === 'Inactive' ? '#EF4444' : '#10B981' }}></div>
                                            <span style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--text-primary)' }}>{member.status || 'Active'}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                            {member.role === 'Member' ? (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleUpdateRole(member.uid, 'Admin'); }}
                                                    style={{
                                                        padding: '0.625rem 1rem',
                                                        borderRadius: '0.75rem',
                                                        color: '#059669',
                                                        backgroundColor: '#DCFCE7',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '800',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    <ShieldCheck size={14} /> Grant Admin
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleUpdateRole(member.uid, 'Member'); }}
                                                    style={{
                                                        padding: '0.625rem 1rem',
                                                        borderRadius: '0.75rem',
                                                        color: '#DC2626',
                                                        backgroundColor: '#FEE2E2',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '800',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}
                                                >
                                                    <ShieldX size={14} /> Revoke Admin
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteMember(member.uid, member.displayName); }}
                                                style={{ padding: '8px', borderRadius: '10px', color: '#94A3B8', backgroundColor: 'transparent', border: '1px solid #E2E8F0' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr><td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No members found matching your search.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Member Detail Modal */}
            {selectedMember && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
                    <div className="card" style={{ width: '100%', maxWidth: '500px', padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem', backgroundColor: '#F8FAFC', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' }}>
                                    {selectedMember.displayName[0]}
                                </div>
                                <div>
                                    <h3 style={{ fontWeight: '800', fontSize: '1.125rem' }}>{selectedMember.displayName}</h3>
                                    <p style={{ fontSize: '0.75rem', color: '#64748B' }}>Member Profile</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedMember(null)} style={{ color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer' }}><X /></button>
                        </div>

                        <div style={{ padding: '2rem' }}>
                            {/* Key Stats */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div style={{ padding: '1.25rem', backgroundColor: '#F0F9FF', borderRadius: '1rem', border: '1px solid #E0F2FE' }}>
                                    <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#0369A1', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Wallet size={14} /> TOTAL SAVINGS
                                    </p>
                                    <p style={{ fontSize: '1.25rem', fontWeight: '900', color: '#0C4A6E' }}>
                                        {loadingStats ? '...' : `${memberStats.totalContributions.toLocaleString()} TZS`}
                                    </p>
                                </div>
                                <div style={{ padding: '1.25rem', backgroundColor: '#FEF2F2', borderRadius: '1rem', border: '1px solid #FEE2E2' }}>
                                    <p style={{ fontSize: '0.75rem', fontWeight: '700', color: '#B91C1C', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <CreditCard size={14} /> TOTAL DEBT
                                    </p>
                                    <p style={{ fontSize: '1.25rem', fontWeight: '900', color: '#7F1D1D' }}>
                                        {loadingStats ? '...' : `${memberStats.loanBalance.toLocaleString()} TZS`}
                                    </p>
                                </div>
                            </div>

                            {/* Detailed Breakdown */}
                            <div style={{ marginBottom: '1.5rem' }}>
                                <p style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.025em', marginBottom: '0.75rem' }}>Contributions by Category</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div style={{ padding: '0.75rem 1rem', backgroundColor: '#F8FAFC', borderRadius: '0.75rem', border: '1px solid #F1F5F9' }}>
                                        <p style={{ fontSize: '0.65rem', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' }}>Hisa</p>
                                        <p style={{ fontSize: '0.925rem', fontWeight: '800', color: '#1E293B' }}>{loadingStats ? '...' : memberStats.contributionsByCategory.Hisa.toLocaleString()} TZS</p>
                                    </div>
                                    <div style={{ padding: '0.75rem 1rem', backgroundColor: '#F8FAFC', borderRadius: '0.75rem', border: '1px solid #F1F5F9' }}>
                                        <p style={{ fontSize: '0.65rem', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' }}>Jamii</p>
                                        <p style={{ fontSize: '0.925rem', fontWeight: '800', color: '#1E293B' }}>{loadingStats ? '...' : memberStats.contributionsByCategory.Jamii.toLocaleString()} TZS</p>
                                    </div>
                                </div>
                            </div>

                            <div style={{ marginBottom: '2rem' }}>
                                <p style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.025em', marginBottom: '0.75rem' }}>Loans by Category</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                    <div style={{ padding: '0.75rem 1rem', backgroundColor: '#F8FAFC', borderRadius: '0.75rem', border: '1px solid #F1F5F9' }}>
                                        <p style={{ fontSize: '0.65rem', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' }}>Standard</p>
                                        <p style={{ fontSize: '0.925rem', fontWeight: '800', color: '#1E293B' }}>{loadingStats ? '...' : memberStats.loansByCategory.Standard.toLocaleString()} TZS</p>
                                    </div>
                                    <div style={{ padding: '0.75rem 1rem', backgroundColor: '#F8FAFC', borderRadius: '0.75rem', border: '1px solid #F1F5F9' }}>
                                        <p style={{ fontSize: '0.65rem', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase' }}>Dharura</p>
                                        <p style={{ fontSize: '0.925rem', fontWeight: '800', color: '#1E293B' }}>{loadingStats ? '...' : memberStats.loansByCategory.Dharura.toLocaleString()} TZS</p>
                                    </div>
                                </div>
                            </div>

                            {/* Info Rows */}
                            <div style={{ border: '1px solid #F1F5F9', borderRadius: '1rem', overflow: 'hidden' }}>
                                <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9' }}>
                                    <span style={{ fontSize: '0.875rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px' }}><ShieldCheck size={16} /> Role</span>
                                    <span style={{ fontSize: '0.875rem', fontWeight: '800', color: '#0F172A' }}>{selectedMember.role.toUpperCase()}</span>
                                </div>
                                <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9' }}>
                                    <span style={{ fontSize: '0.875rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px' }}><Mail size={16} /> Email</span>
                                    <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#0F172A' }}>{selectedMember.email}</span>
                                </div>
                                <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9' }}>
                                    <span style={{ fontSize: '0.875rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={16} /> Joined On</span>
                                    <span style={{ fontSize: '0.875rem', fontWeight: '700', color: '#0F172A' }}>{new Date(selectedMember.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', backgroundColor: '#F8FAFC' }}>
                                    <span style={{ fontSize: '0.875rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '8px' }}><User size={16} /> Member ID</span>
                                    <span style={{ fontSize: '0.875rem', fontWeight: '900', color: '#1E40AF', fontFamily: 'monospace' }}>{selectedMember.memberId || 'PENDING'}</span>
                                </div>
                            </div>

                            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={() => handleUpdateRole(selectedMember.uid, selectedMember.role === 'Admin' ? 'Member' : 'Admin')}
                                    style={{
                                        flex: 1,
                                        padding: '1rem',
                                        borderRadius: '0.75rem',
                                        backgroundColor: selectedMember.role === 'Admin' ? '#FEE2E2' : '#DCFCE7',
                                        color: selectedMember.role === 'Admin' ? '#DC2626' : '#059669',
                                        fontWeight: '900',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {selectedMember.role === 'Admin' ? 'Demote to Member' : 'Promote to Admin'}
                                </button>
                                <button
                                    onClick={() => handleDeleteMember(selectedMember.uid, selectedMember.displayName)}
                                    style={{
                                        padding: '1rem',
                                        borderRadius: '0.75rem',
                                        backgroundColor: '#0F172A',
                                        color: 'white',
                                        fontWeight: '900',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}

