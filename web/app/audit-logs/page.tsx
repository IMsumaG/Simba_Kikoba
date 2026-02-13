
"use client";

import { onAuthStateChanged } from 'firebase/auth';
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    Timestamp,
    where
} from 'firebase/firestore';
import {
    Calendar,
    ChevronLeft,
    ChevronRight,
    Filter,
    History,
    Search,
    Shield,
    Trash2,
    User
} from "lucide-react";
import React, { useEffect, useState } from 'react';
import { ActivityLog } from '../../../types/ActivityLog';
import AppLayout from '../../components/AppLayout';
import { auth, db } from '../../lib/firebase';

export default function AuditLogsPage() {
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState<string | null>(null); // Start as null to avoid wrong default
    const [authLoading, setAuthLoading] = useState(true); // New loading state for auth
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
    const [memberIdMap, setMemberIdMap] = useState<{ [key: string]: string }>({});

    // Filtering & Pagination State
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
            if (u) {
                setUser(u);
                try {
                    const userDoc = await getDoc(doc(db, 'users', u.uid));
                    if (userDoc.exists()) {
                        const r = userDoc.data().role || 'Member';
                        setRole(r);
                        if (r !== 'Admin') {
                            window.location.href = '/dashboard';
                            return;
                        }
                    }
                } catch (error) {
                    console.error("Error fetching user role", error);
                }
            } else {
                window.location.href = '/';
            }
            setAuthLoading(false);
        });

        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!user || role !== 'Admin') return;

        const fetchLogs = async () => {
            setLoading(true);
            try {
                const q = query(
                    collection(db, 'activityLogs'),
                    orderBy('createdAt', 'desc'),
                    limit(100) // Reduced limit for faster initial load
                );
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog));

                // OPTIMIZATION: Render logs immediately!
                setLogs(data);
                setLoading(false);

                // Fetch member IDs in background (Parallelized)
                const memberIds = new Set<string>();
                data.forEach(log => {
                    if (log.userId) memberIds.add(log.userId);
                    if (log.affectedMemberId) memberIds.add(log.affectedMemberId);
                    if (log.entityId) memberIds.add(log.entityId);
                });

                // Fetch in batch/parallel
                const promises = Array.from(memberIds).map(async (memberId) => {
                    try {
                        // First try direct document lookup (most efficient)
                        const userDocRef = doc(db, 'users', memberId);
                        const userDoc = await getDoc(userDocRef);

                        if (userDoc.exists() && userDoc.data()?.memberId) {
                            return { id: memberId, memberId: userDoc.data().memberId };
                        }

                        // Fallback: Query by 'uid' field if document lookup fails
                        const q = query(collection(db, 'users'), where('uid', '==', memberId), limit(1));
                        const snapshot = await getDocs(q);
                        if (!snapshot.empty) {
                            const data = snapshot.docs[0].data();
                            if (data.memberId) {
                                return { id: memberId, memberId: data.memberId };
                            }
                        }
                    } catch (e) {
                        return null;
                    }
                    return null;
                });

                const results = await Promise.all(promises);
                const newMap: { [key: string]: string } = {};
                results.forEach(res => {
                    if (res) newMap[res.id] = res.memberId;
                });

                setMemberIdMap(prev => ({ ...prev, ...newMap }));

            } catch (error) {
                console.error("Error fetching logs:", error);
                setLoading(false);
            }
        };

        fetchLogs();
    }, [user, role]);

    const handleDeleteLog = async (logId: string) => {
        if (!confirm('Are you sure you want to delete this activity log? This cannot be undone.')) return;
        try {
            await deleteDoc(doc(db, 'activityLogs', logId));
            setLogs(prev => prev.filter(log => log.id !== logId));
            if (expandedLogId === logId) setExpandedLogId(null);
        } catch (error) {
            console.error("Error deleting log:", error);
            alert("Failed to delete activity log.");
        }
    };

    const handleDeleteAssociatedTransaction = async (txId: string, logId: string) => {
        if (!confirm('Are you sure you want to delete the underlying transaction? This will affect the member balance and cannot be undone.')) return;
        try {
            await deleteDoc(doc(db, 'transactions', txId));
            alert("Transaction deleted successfully.");
            // Optionally delete the log too? Let's just keep the log but maybe mark it.
            // For now, just deleting the transaction as requested.
        } catch (error) {
            console.error("Error deleting transaction:", error);
            alert("Failed to delete associated transaction. It might have already been deleted.");
        }
    };

    // Helper functions must be defined before use
    const formatActivityType = (type?: string) => {
        return (type || '').split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const getStatusFromLog = (log: ActivityLog): string => {
        // Try to get status from changes.after first
        if (log.changes?.after?.status) {
            return log.changes.after.status.toLowerCase();
        }
        // Fall back to direct status field
        return log.status?.toLowerCase() || 'pending';
    };

    const getStatusColor = (status: string): { bg: string; text: string; border: string } => {
        const statusLower = status.toLowerCase();
        if (statusLower === 'approved') {
            return { bg: '#D1FAE5', text: '#059669', border: '#6EE7B7' };
        }
        if (statusLower === 'rejected') {
            return { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' };
        }
        if (statusLower === 'success') {
            return { bg: '#D1FAE5', text: '#059669', border: '#6EE7B7' };
        }
        if (statusLower === 'failed') {
            return { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' };
        }
        if (statusLower === 'pending') {
            return { bg: '#FEF3C7', text: '#D97706', border: '#FCD34D' };
        }
        return { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB' };
    };

    // Return a text color for the action column based on activity type
    const getActionTextColor = (activityType?: string): string => {
        const t = (activityType || '').toLowerCase();
        if (t.includes('loan')) return '#F57C00'; // orange for loan-related
        if (t.includes('transaction')) return '#10B981'; // green for transactions
        if (t.includes('member')) return '#2563EB'; // blue for member actions
        return '#374151'; // default dark
    };

    // Filter logs
    const filteredLogs = logs.filter(log => {
        const term = searchTerm.toLowerCase();
        const matchesSearch = searchTerm === '' ||
            (log.userName || '').toLowerCase().includes(term) ||
            (log.userId || '').toLowerCase().includes(term) ||
            (log.description || '').toLowerCase().includes(term);

        const matchesType = typeFilter === 'All' || (log.activityType || '') === typeFilter;
        const logStatus = getStatusFromLog(log);
        const matchesStatus = statusFilter === 'All' || logStatus === statusFilter.toLowerCase();

        const logDate = log.createdAt instanceof Timestamp ? log.createdAt.toDate() : (log.createdAtISO ? new Date(log.createdAtISO) : null);
        const matchesStartDate = !startDate || (logDate && logDate >= new Date(startDate));
        const matchesEndDate = !endDate || (logDate && logDate <= new Date(new Date(endDate).setHours(23, 59, 59, 999)));

        return matchesSearch && matchesType && matchesStatus && matchesStartDate && matchesEndDate;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, typeFilter, statusFilter, startDate, endDate, itemsPerPage]);

    // Ensure current page is within bounds when totalPages changes
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(Math.max(1, totalPages));
        }
    }, [totalPages]);

    if (authLoading) {
        return (
            <AppLayout>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 80px)' }}>
                    <div className="animate-spin" style={{ width: '3rem', height: '3rem', border: '3px solid var(--background-muted)', borderTopColor: '#F57C00', borderRadius: '50%' }}></div>
                </div>
            </AppLayout>
        );
    }

    if (role !== 'Admin') return null;


    return (
        <AppLayout>
            <div style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Shield size={32} color="#F57C00" />
                            Audit Logs
                        </h1>
                        <p style={{ color: 'var(--text-secondary)' }}>Track and monitor all admin activities and system changes</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Search Admin/Action</label>
                            <div style={{ position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    type="text"
                                    placeholder="Name, ID or description..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2.25rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', outline: 'none' }}
                                />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Action Type</label>
                            <div style={{ position: 'relative' }}>
                                <Filter size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2.25rem', borderRadius: '0.5rem', border: '1px solid var(--border)', outline: 'none', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}
                                >
                                    <option value="All">All Actions</option>
                                    <option value="transaction_created">Transaction Created</option>
                                    <option value="loan_approved">Loan Approved</option>
                                    <option value="loan_rejected">Loan Rejected</option>
                                    <option value="member_added">Member Added</option>
                                    <option value="member_status_changed">Status Changed</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Status</label>
                            <div style={{ position: 'relative' }}>
                                <Filter size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2.25rem', borderRadius: '0.5rem', border: '1px solid var(--border)', outline: 'none', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="approved">Approved</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="pending">Pending</option>
                                    <option value="success">Success</option>
                                    <option value="failed">Failed</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>From Date</label>
                            <div style={{ position: 'relative' }}>
                                <Calendar size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2.25rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', outline: 'none' }}
                                />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>To Date</label>
                            <div style={{ position: 'relative' }}>
                                <Calendar size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2.25rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', outline: 'none' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Logs Table */}
                <div className="card" style={{ overflow: 'hidden' }}>
                    {loading ? (
                        <div style={{ padding: '4rem', textAlign: 'center' }}>
                            <div className="animate-spin" style={{ margin: '0 auto', width: '2rem', height: '2rem', border: '3px solid var(--background-muted)', borderTopColor: '#F57C00', borderRadius: '50%' }}></div>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <History size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                            <p>No activity logs matching your filters.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ backgroundColor: 'var(--background-muted)', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: '600' }}>
                                    <tr>
                                        <th style={{ padding: '1rem 1.5rem', borderBottom: '2px solid var(--border)' }}>User</th>
                                        <th style={{ padding: '1rem 1.5rem', borderBottom: '2px solid var(--border)' }}>Action</th>
                                        <th style={{ padding: '1rem 1.5rem', borderBottom: '2px solid var(--border)' }}>Type</th>
                                        <th style={{ padding: '1rem 1.5rem', borderBottom: '2px solid var(--border)' }}>Timestamp</th>
                                        <th style={{ padding: '1rem 1.5rem', borderBottom: '2px solid var(--border)', textAlign: 'right' }}>Details</th>
                                    </tr>
                                </thead>
                                <tbody style={{ fontSize: '0.875rem' }}>
                                    {paginatedLogs.map((log, index) => {
                                        const isExpanded = expandedLogId === log.id;
                                        const date = log.createdAt instanceof Timestamp ? log.createdAt.toDate() : new Date(log.createdAtISO || '');
                                        const userRole = 'Admin'; // Default to Admin for audit logs

                                        return (
                                            <React.Fragment key={log.id}>
                                                <tr
                                                    style={{
                                                        borderBottom: '1px solid var(--border)',
                                                        backgroundColor: isExpanded ? 'var(--background-muted)' : 'transparent',
                                                        transition: 'background-color 0.2s'
                                                    }}
                                                >
                                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <div style={{
                                                                width: '36px',
                                                                height: '36px',
                                                                borderRadius: '50%',
                                                                backgroundColor: 'var(--background-muted)',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: 'var(--text-secondary)',
                                                                flexShrink: 0
                                                            }}>
                                                                <User size={18} />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{log.userName}</div>
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{log.adminMemberId || memberIdMap[log.userId] || 'N/A'}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                                        <div style={{ color: getActionTextColor(log.activityType), fontWeight: '700', fontSize: '0.75rem', letterSpacing: '0.02em' }}>
                                                            {formatActivityType(log.activityType)}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                                        <span style={{
                                                            padding: '0.25rem 0.75rem',
                                                            borderRadius: '1rem',
                                                            backgroundColor: 'var(--background-muted)',
                                                            fontWeight: '600',
                                                            fontSize: '0.75rem',
                                                            color: 'var(--text-primary)'
                                                        }}>
                                                            {formatActivityType(log.activityType)}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                                            {date.toLocaleDateString()} <br /> {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                                                        <button
                                                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                                            style={{
                                                                padding: '0.5rem 0.75rem',
                                                                borderRadius: '0.375rem',
                                                                backgroundColor: 'transparent',
                                                                border: 'none',
                                                                cursor: 'pointer',
                                                                color: 'var(--primary)',
                                                                fontSize: '0.875rem',
                                                                fontWeight: '600',
                                                                transition: 'opacity 0.2s'
                                                            }}
                                                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.7')}
                                                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                                                        >
                                                            View detail
                                                        </button>
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan={5} style={{ padding: '1.5rem', backgroundColor: 'var(--background-muted)', borderBottom: '1px solid var(--border)' }}>
                                                            <div style={{
                                                                backgroundColor: 'var(--card-bg)',
                                                                borderRadius: '0.5rem',
                                                                padding: '1.5rem',
                                                                border: '1px solid var(--border)',
                                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                                            }}>
                                                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
                                                                    <div>
                                                                        <h4 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1.25rem', letterSpacing: '0.05em' }}>
                                                                            Activity Details
                                                                        </h4>
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                                                            {/* For Bulk Uploads */}
                                                                            {log.metadata?.bulkUpload && (
                                                                                <>
                                                                                    <div>
                                                                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Detail Transaction Type:</span>
                                                                                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{log.metadata.detailTransactionType || 'N/A'}</div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Users Affected:</span>
                                                                                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{log.metadata.bulkTotalAffectedUsers || 0}</div>
                                                                                    </div>
                                                                                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                                                                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '0.75rem' }}>Transaction Breakdown:</span>
                                                                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.8rem' }}>
                                                                                            {(log.metadata.bulkHisaAmount || 0) > 0 && (
                                                                                                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', padding: '0.5rem', borderRadius: '0.375rem' }}>
                                                                                                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Hisa (Shares):</div>
                                                                                                    <div style={{ fontWeight: '600', color: '#10B981' }}>TSH {(log.metadata.bulkHisaAmount || 0).toLocaleString()}</div>
                                                                                                </div>
                                                                                            )}
                                                                                            {(log.metadata.bulkJamiiAmount || 0) > 0 && (
                                                                                                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', padding: '0.5rem', borderRadius: '0.375rem' }}>
                                                                                                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Jamii:</div>
                                                                                                    <div style={{ fontWeight: '600', color: '#10B981' }}>TSH {(log.metadata.bulkJamiiAmount || 0).toLocaleString()}</div>
                                                                                                </div>
                                                                                            )}
                                                                                            {(log.metadata.bulkStandardLoanAmount || 0) > 0 && (
                                                                                                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', padding: '0.5rem', borderRadius: '0.375rem' }}>
                                                                                                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Standard Loan:</div>
                                                                                                    <div style={{ fontWeight: '600', color: '#EF4444' }}>TSH {(log.metadata.bulkStandardLoanAmount || 0).toLocaleString()}</div>
                                                                                                </div>
                                                                                            )}
                                                                                            {(log.metadata.bulkDharuraLoanAmount || 0) > 0 && (
                                                                                                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', padding: '0.5rem', borderRadius: '0.375rem' }}>
                                                                                                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Dharura Loan:</div>
                                                                                                    <div style={{ fontWeight: '600', color: '#EF4444' }}>TSH {(log.metadata.bulkDharuraLoanAmount || 0).toLocaleString()}</div>
                                                                                                </div>
                                                                                            )}
                                                                                            {(log.metadata.bulkStandardRepayAmount || 0) > 0 && (
                                                                                                <div style={{ backgroundColor: 'rgba(245, 124, 0, 0.05)', padding: '0.5rem', borderRadius: '0.375rem' }}>
                                                                                                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Standard Repay:</div>
                                                                                                    <div style={{ fontWeight: '600', color: '#F59E0B' }}>TSH {(log.metadata.bulkStandardRepayAmount || 0).toLocaleString()}</div>
                                                                                                </div>
                                                                                            )}
                                                                                            {(log.metadata.bulkDharuraRepayAmount || 0) > 0 && (
                                                                                                <div style={{ backgroundColor: 'rgba(245, 124, 0, 0.05)', padding: '0.5rem', borderRadius: '0.375rem' }}>
                                                                                                    <div style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Dharura Repay:</div>
                                                                                                    <div style={{ fontWeight: '600', color: '#F59E0B' }}>TSH {(log.metadata.bulkDharuraRepayAmount || 0).toLocaleString()}</div>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                            {/* For Single Transactions */}
                                                                            {!log.metadata?.bulkUpload && (
                                                                                <>
                                                                                    <div>
                                                                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Affected Member:</span>
                                                                                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
                                                                                            {log.entityName || (log.activityType === 'loan_penalty_applied' ? log.userName : 'N/A')}
                                                                                        </div>
                                                                                    </div>
                                                                                    <div>
                                                                                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Affected Member ID:</span>
                                                                                        {(() => {
                                                                                            const getMapped = (id?: string) => id ? (memberIdMap[id] || id) : null;
                                                                                            // Try affectedMemberId first, then entityId
                                                                                            let mapped = getMapped(log.affectedMemberId) || (log.entityType !== 'loan' ? getMapped(log.entityId) : null);

                                                                                            // For penalty logs where entityId is a loan ID, fallback to userId which is the member UID
                                                                                            if (!mapped || log.activityType === 'loan_penalty_applied') {
                                                                                                const userMapped = getMapped(log.userId);
                                                                                                if (userMapped && userMapped.length < 20) mapped = userMapped;
                                                                                                else if (!mapped) mapped = userMapped;
                                                                                            }

                                                                                            const display = mapped ? (mapped.toString().length > 15 ? mapped.toString().substring(0, 15) + '...' : mapped) : 'N/A';
                                                                                            return <div style={{ fontFamily: 'monospace', fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{display}</div>;
                                                                                        })()}
                                                                                    </div>
                                                                                    {log.metadata?.transactionType && (
                                                                                        <div>
                                                                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Transaction Type:</span>
                                                                                            <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{log.metadata.transactionType}</div>
                                                                                        </div>
                                                                                    )}
                                                                                    {log.metadata?.subTransactionType && (
                                                                                        <div>
                                                                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Sub Transaction Type:</span>
                                                                                            <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{log.metadata.subTransactionType}</div>
                                                                                        </div>
                                                                                    )}
                                                                                    {log.metadata?.loanType && (
                                                                                        <div>
                                                                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Loan Type:</span>
                                                                                            <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{log.metadata?.loanType}</div>
                                                                                        </div>
                                                                                    )}
                                                                                    {log.metadata?.originalAmount && (
                                                                                        <div>
                                                                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Origin Loan Amount:</span>
                                                                                            <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9375rem' }}>TSH {Number(log.metadata.originalAmount).toLocaleString()}</div>
                                                                                        </div>
                                                                                    )}
                                                                                    {log.metadata?.penaltyAmount && (
                                                                                        <div>
                                                                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Penalty Applied:</span>
                                                                                            <div style={{ fontWeight: '600', color: '#EF4444', fontSize: '0.9375rem' }}>TSH {Number(log.metadata.penaltyAmount).toLocaleString()}</div>
                                                                                        </div>
                                                                                    )}
                                                                                    {log.metadata?.newAmount && (
                                                                                        <div>
                                                                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Amount + Penalty:</span>
                                                                                            <div style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '1rem' }}>TSH {Number(log.metadata.newAmount).toLocaleString()}</div>
                                                                                        </div>
                                                                                    )}
                                                                                    {log.metadata?.transactionAmount && !log.metadata?.newAmount && (
                                                                                        <div>
                                                                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Amount:</span>
                                                                                            <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9375rem' }}>TSH {Number(log.metadata.transactionAmount || 0).toLocaleString()}</div>
                                                                                        </div>
                                                                                    )}
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <h4 style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1.25rem', letterSpacing: '0.05em' }}>
                                                                            Status & Notes
                                                                        </h4>
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                                                            <div>
                                                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Status:</span>
                                                                                {(() => {
                                                                                    const status = getStatusFromLog(log);
                                                                                    const colors = getStatusColor(status);
                                                                                    return (
                                                                                        <div style={{
                                                                                            padding: '0.25rem 0.75rem',
                                                                                            backgroundColor: colors.bg,
                                                                                            color: colors.text,
                                                                                            border: `1px solid ${colors.border}`,
                                                                                            borderRadius: '1rem',
                                                                                            fontWeight: '700',
                                                                                            display: 'inline-block',
                                                                                            fontSize: '0.7rem'
                                                                                        }}>
                                                                                            {status.toUpperCase()}
                                                                                        </div>
                                                                                    );
                                                                                })()}
                                                                            </div>
                                                                            {log.reason && (
                                                                                <div>
                                                                                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Reason/Notes:</span>
                                                                                    <div style={{
                                                                                        backgroundColor: 'var(--background-muted)',
                                                                                        padding: '0.75rem',
                                                                                        borderRadius: '0.375rem',
                                                                                        fontSize: '0.875rem',
                                                                                        color: 'var(--text-primary)',
                                                                                        lineHeight: '1.5'
                                                                                    }}>
                                                                                        {log.reason}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                            <div>
                                                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Timestamp:</span>
                                                                                <div style={{ fontWeight: '500', color: 'var(--text-primary)', fontSize: '0.9375rem' }}>{date && !isNaN(date.getTime()) ? date.toLocaleString() : '—'}</div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Admin Actions */}
                                                                <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                                                    {(log.activityType === 'transaction_created' && log.entityId) && !log.metadata?.bulkUpload && (
                                                                        <button
                                                                            onClick={() => handleDeleteAssociatedTransaction(log.entityId, log.id)}
                                                                            style={{
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: '0.5rem',
                                                                                padding: '0.6rem 1rem',
                                                                                borderRadius: '0.5rem',
                                                                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                                                                color: '#EF4444',
                                                                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                                                                fontSize: '0.8rem',
                                                                                fontWeight: '700',
                                                                                cursor: 'pointer'
                                                                            }}
                                                                        >
                                                                            <Trash2 size={14} /> Delete Transaction
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => handleDeleteLog(log.id)}
                                                                        style={{
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '0.5rem',
                                                                            padding: '0.6rem 1rem',
                                                                            borderRadius: '0.5rem',
                                                                            backgroundColor: 'var(--background-muted)',
                                                                            color: 'var(--text-secondary)',
                                                                            border: 'none',
                                                                            fontSize: '0.8rem',
                                                                            fontWeight: '600',
                                                                            cursor: 'pointer'
                                                                        }}
                                                                    >
                                                                        <Trash2 size={14} /> Delete Log Entry
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {filteredLogs.length > 0 && (
                        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--background-muted)' }}>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                Showing <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{((currentPage - 1) * itemsPerPage) + 1}</span> to <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</span> of <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{filteredLogs.length}</span> results
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                                    style={{ padding: '0.4rem 0.6rem', borderRadius: '0.4rem', border: '1px solid var(--border)', fontSize: '0.875rem', outline: 'none', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}
                                >
                                    <option value={5}>5 per page</option>
                                    <option value={10}>10 per page</option>
                                    <option value={50}>50 per page</option>
                                    <option value={100}>100 per page</option>
                                </select>

                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        style={{ padding: '0.4rem 0.75rem', borderRadius: '0.4rem', border: '1px solid var(--border)', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.875rem', opacity: currentPage === 1 ? 0.5 : 1 }}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => setCurrentPage(i + 1)}
                                            style={{
                                                padding: '0.4rem 0.75rem',
                                                borderRadius: '0.4rem',
                                                border: currentPage === i + 1 ? '1px solid var(--primary)' : '1px solid var(--border)',
                                                backgroundColor: currentPage === i + 1 ? 'var(--primary)' : 'var(--card-bg)',
                                                color: currentPage === i + 1 ? 'white' : 'var(--text-secondary)',
                                                cursor: 'pointer',
                                                fontSize: '0.875rem',
                                                fontWeight: currentPage === i + 1 ? '600' : '400'
                                            }}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages}
                                        style={{ padding: '0.4rem 0.75rem', borderRadius: '0.4rem', border: '1px solid var(--border)', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontSize: '0.875rem', opacity: currentPage === totalPages ? 0.5 : 1 }}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
