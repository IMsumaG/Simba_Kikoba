"use client";

import { collection, deleteDoc, doc, getDocs, updateDoc } from "firebase/firestore";
import { Mail, ShieldCheck, ShieldX, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import AppLayout from "../../components/AppLayout";
import { db } from "../../lib/firebase";

interface UserProfile {
    uid: string;
    memberId?: string; // Added Member ID
    displayName: string;
    email: string;
    role: 'Admin' | 'Member';
    status?: 'Active' | 'Inactive';
    createdAt: string;
}

export default function MembersPage() {
    const [members, setMembers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

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

    const handleUpdateRole = async (uid: string, newRole: 'Admin' | 'Member') => {
        const action = newRole === 'Admin' ? 'GRANT admin access to' : 'REVOKE admin access from';
        if (!confirm(`Are you sure you want to ${action} this user?`)) return;

        try {
            await updateDoc(doc(db, "users", uid), { role: newRole });
            setMembers(prev => prev.map(m => m.uid === uid ? { ...m, role: newRole } : m));
        } catch (error) {
            alert("Failed to update role");
        }
    };

    const handleDeleteMember = async (uid: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) return;

        try {
            await deleteDoc(doc(db, "users", uid));
            setMembers(prev => prev.filter(m => m.uid !== uid));
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
                fetchMembers(); // Refresh list
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
                                <tr key={member.uid} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}>
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
                                                    onClick={() => handleUpdateRole(member.uid, 'Admin')}
                                                    style={{
                                                        padding: '0.625rem 1rem',
                                                        borderRadius: '0.75rem',
                                                        color: '#059669',
                                                        backgroundColor: '#DCFCE7',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '800',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <ShieldCheck size={14} /> Grant Admin Access
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleUpdateRole(member.uid, 'Member')}
                                                    style={{
                                                        padding: '0.625rem 1rem',
                                                        borderRadius: '0.75rem',
                                                        color: '#DC2626',
                                                        backgroundColor: '#FEE2E2',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '800',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    <ShieldX size={14} /> Revoke Admin Access
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteMember(member.uid, member.displayName)}
                                                title="Delete User Account"
                                                style={{
                                                    padding: '8px',
                                                    borderRadius: '10px',
                                                    color: '#94A3B8',
                                                    backgroundColor: 'transparent',
                                                    border: '1px solid #E2E8F0',
                                                    transition: 'all 0.2s'
                                                }}
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
        </AppLayout>
    );
}
