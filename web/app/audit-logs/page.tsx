
"use client";

import { onAuthStateChanged } from 'firebase/auth';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    Timestamp
} from 'firebase/firestore';
import {
    Calendar,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    Clock,
    History,
    Info,
    Search,
    Shield,
    User
} from "lucide-react";
import React, { useEffect, useState } from 'react';
import { ActivityLog } from '../../../types/ActivityLog';
import AppLayout from '../../components/AppLayout';
import { auth, db } from '../../lib/firebase';

export default function AuditLogsPage() {
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState<string>('Member');
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

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
                const userDoc = await getDoc(doc(db, 'users', u.uid));
                if (userDoc.exists()) {
                    const r = userDoc.data().role || 'Member';
                    setRole(r);
                    if (r !== 'Admin') {
                        window.location.href = '/dashboard';
                    }
                }
            } else {
                window.location.href = '/login';
            }
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
                    limit(500) // Reasonable limit for client-side filtering
                );
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog));
                setLogs(data);
            } catch (error) {
                console.error("Error fetching logs:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [user, role]);

    const filteredLogs = logs.filter(log => {
        const matchesSearch = searchTerm === '' ||
            log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.userId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.description.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = typeFilter === 'All' || log.activityType === typeFilter;
        const matchesStatus = statusFilter === 'All' || log.status === statusFilter;

        const logDate = log.createdAt instanceof Timestamp ? log.createdAt.toDate() : new Date(log.createdAtISO || '');
        const matchesStartDate = !startDate || logDate >= new Date(startDate);
        const matchesEndDate = !endDate || logDate <= new Date(new Date(endDate).setHours(23, 59, 59, 999));

        return matchesSearch && matchesType && matchesStatus && matchesStartDate && matchesEndDate;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, typeFilter, statusFilter, startDate, endDate, itemsPerPage]);

    const formatActivityType = (type: string) => {
        return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    if (role !== 'Admin') return null;

    return (
        <AppLayout>
            <div style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Shield size={32} color="#F57C00" />
                            Audit Logs
                        </h1>
                        <p style={{ color: '#64748B' }}>Track and monitor all admin activities and system changes</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#64748B', marginBottom: '0.5rem' }}>Search Admin/Action</label>
                            <div style={{ position: 'relative' }}>
                                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                                <input
                                    type="text"
                                    placeholder="Name, ID or description..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="input"
                                    style={{ paddingLeft: '40px' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#64748B', marginBottom: '0.5rem' }}>Action Type</label>
                            <select
                                className="input"
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                            >
                                <option value="All">All Actions</option>
                                <option value="transaction_created">Transaction Created</option>
                                <option value="loan_approved">Loan Approved</option>
                                <option value="loan_rejected">Loan Rejected</option>
                                <option value="member_added">Member Added</option>
                                <option value="member_status_changed">Status Changed</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#64748B', marginBottom: '0.5rem' }}>Date From</label>
                            <div style={{ position: 'relative' }}>
                                <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="input"
                                    style={{ paddingLeft: '40px' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#64748B', marginBottom: '0.5rem' }}>Date To</label>
                            <div style={{ position: 'relative' }}>
                                <Calendar size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="input"
                                    style={{ paddingLeft: '40px' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Logs Table */}
                <div className="card" style={{ overflow: 'hidden' }}>
                    {loading ? (
                        <div style={{ padding: '4rem', textAlign: 'center' }}>
                            <div className="animate-spin" style={{ margin: '0 auto', width: '2rem', height: '2rem', border: '3px solid #F1F5F9', borderTopColor: '#F57C00', borderRadius: '50%' }}></div>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: '#94A3B8' }}>
                            <History size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                            <p>No activity logs matching your filters.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ backgroundColor: '#F8FAFC', fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748B' }}>
                                    <tr>
                                        <th style={{ padding: '1rem 1.5rem' }}>Admin / User ID</th>
                                        <th style={{ padding: '1rem 1.5rem' }}>Action</th>
                                        <th style={{ padding: '1rem 1.5rem' }}>Type</th>
                                        <th style={{ padding: '1rem 1.5rem' }}>Time</th>
                                        <th style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>Details</th>
                                    </tr>
                                </thead>
                                <tbody style={{ fontSize: '0.875rem' }}>
                                    {paginatedLogs.map((log) => {
                                        const isExpanded = expandedLogId === log.id;
                                        const date = log.createdAt instanceof Timestamp ? log.createdAt.toDate() : new Date(log.createdAtISO || '');

                                        return (
                                            <React.Fragment key={log.id}>
                                                <tr
                                                    style={{
                                                        borderBottom: isExpanded ? 'none' : '1px solid #F1F5F9',
                                                        backgroundColor: isExpanded ? '#F8FAFC' : 'transparent',
                                                        transition: 'background-color 0.2s'
                                                    }}
                                                >
                                                    <td style={{ padding: '1rem 1.5rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <div style={{
                                                                width: '32px',
                                                                height: '32px',
                                                                borderRadius: '50%',
                                                                backgroundColor: '#E2E8F0',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: '#64748B'
                                                            }}>
                                                                <User size={16} />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: '700', color: '#0F172A' }}>{log.userName}</div>
                                                                <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontFamily: 'monospace' }}>{log.userId}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem' }}>
                                                        <div style={{ color: '#334155', fontWeight: '500' }}>{log.description}</div>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem' }}>
                                                        <span style={{
                                                            padding: '0.25rem 0.75rem',
                                                            borderRadius: '1rem',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '700',
                                                            backgroundColor: '#F1F5F9',
                                                            color: '#475569'
                                                        }}>
                                                            {formatActivityType(log.activityType)}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748B' }}>
                                                            <Clock size={14} />
                                                            <span>{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                                        <button
                                                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                                            style={{
                                                                padding: '0.5rem',
                                                                borderRadius: '0.5rem',
                                                                backgroundColor: 'transparent',
                                                                border: '1px solid #E2E8F0',
                                                                cursor: 'pointer',
                                                                color: '#64748B'
                                                            }}
                                                        >
                                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                        </button>
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr>
                                                        <td colSpan={5} style={{ padding: '0 1.5rem 1.5rem', backgroundColor: '#F8FAFC', borderBottom: '1px solid #F1F5F9' }}>
                                                            <div style={{
                                                                backgroundColor: 'white',
                                                                borderRadius: '0.75rem',
                                                                padding: '1.5rem',
                                                                border: '1px solid #E2E8F0',
                                                                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                                            }}>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                                                    <div>
                                                                        <h4 style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                            <Info size={14} />
                                                                            Metadata
                                                                        </h4>
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                                <span style={{ color: '#64748B' }}>Entity Type:</span>
                                                                                <span style={{ fontWeight: '600', color: '#0F172A' }}>{log.entityType}</span>
                                                                            </div>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                                <span style={{ color: '#64748B' }}>Entity ID:</span>
                                                                                <span style={{ fontWeight: '600', color: '#0F172A', fontFamily: 'monospace' }}>{log.entityId}</span>
                                                                            </div>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                                                <span style={{ color: '#64748B' }}>Status:</span>
                                                                                <span style={{
                                                                                    fontWeight: '700',
                                                                                    color: log.status === 'success' ? '#059669' : '#DC2626'
                                                                                }}>{log.status.toUpperCase()}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <h4 style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: '#94A3B8', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                            <History size={14} />
                                                                            Changes
                                                                        </h4>
                                                                        <pre style={{
                                                                            backgroundColor: '#F1F5F9',
                                                                            padding: '1rem',
                                                                            borderRadius: '0.5rem',
                                                                            fontSize: '0.75rem',
                                                                            overflow: 'auto',
                                                                            maxHeight: '200px',
                                                                            color: '#334155'
                                                                        }}>
                                                                            {JSON.stringify(log.changes, null, 2)}
                                                                        </pre>
                                                                    </div>
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
                    <div style={{ padding: '1.5rem', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.875rem', color: '#64748B' }}>
                            Showing <strong>{(currentPage - 1) * itemsPerPage + 1}</strong> to <strong>{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</strong> of <strong>{filteredLogs.length}</strong> results
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="icon-btn"
                                style={{ opacity: currentPage === 1 ? 0.5 : 1 }}
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 1rem', fontSize: '0.875rem', fontWeight: '600' }}>
                                Page {currentPage} of {totalPages}
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="icon-btn"
                                style={{ opacity: currentPage === totalPages ? 0.5 : 1 }}
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
