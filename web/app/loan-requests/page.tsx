
"use client";

import { onAuthStateChanged } from 'firebase/auth';
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import {
    Calendar,
    Check,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Filter,
    Plus,
    Search,
    Wallet,
    X,
    XCircle
} from "lucide-react";
import React, { useEffect, useState } from 'react';
import { LoanRequest, UserProfile } from '../../../types';
import AppLayout from '../../components/AppLayout';
import { activityLogger } from '../../lib/activityLogger';
import { auth, db } from '../../lib/firebase';

export default function LoanRequestsPage() {
    const [user, setUser] = useState<any>(null);
    const [role, setRole] = useState<string>('Member');
    const [requests, setRequests] = useState<LoanRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // New Request State
    const [amount, setAmount] = useState('');
    const [loanType, setLoanType] = useState<'Standard' | 'Dharura'>('Standard');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Rejection State
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<LoanRequest | null>(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

    // Filtering & Pagination State
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
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
                    setRole(userDoc.data().role || 'Member');
                }
            } else {
                window.location.href = '/login';
            }
        });

        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!user) return;

        const q = role === 'Admin'
            ? query(collection(db, 'loan_requests'), orderBy('requestedDate', 'desc'))
            : query(collection(db, 'loan_requests'), where('memberId', '==', user.uid), orderBy('requestedDate', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LoanRequest));
            setRequests(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, role]);

    const handleSubmitRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            alert("Please enter a valid amount");
            return;
        }

        if (!description || description.trim().length < 5) {
            alert("Please provide a more detailed purpose for this loan (at least 5 characters)");
            return;
        }

        try {
            setSubmitting(true);

            // 1. Get Admins using a specific query
            const adminsQuery = query(
                collection(db, 'users'),
                where('role', '==', 'Admin'),
                where('status', '==', 'Active')
            );
            const usersSnap = await getDocs(adminsQuery);
            const admins = usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));

            if (admins.length === 0) throw new Error("No active admins found");

            const approvals: Record<string, 'approved' | 'rejected' | 'pending'> = {};
            const adminNames: Record<string, string> = {};

            admins.forEach(admin => {
                approvals[admin.uid] = 'pending';
                adminNames[admin.uid] = admin.displayName || 'Admin';
            });

            // Get user's memberId for reference
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            const memberId = userDoc.exists() ? userDoc.data().memberId : '';

            await addDoc(collection(db, 'loan_requests'), {
                memberId: user.uid,
                requesterMemberId: memberId || '', // Store for easier searching
                memberName: user.displayName || 'Member',
                amount: Number(amount),
                type: loanType,
                status: 'Pending',
                requestedDate: new Date().toISOString(),
                description,
                approvals,
                adminNames,
                createdAt: serverTimestamp()
            });

            setShowModal(false);
            setAmount('');
            setDescription('');
        } catch (error: any) {
            alert(error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleVote = async (requestId: string, decision: 'approved' | 'rejected') => {
        try {
            const requestRef = doc(db, 'loan_requests', requestId);
            const requestSnap = await getDoc(requestRef);
            if (!requestSnap.exists()) return;

            const request = requestSnap.data() as LoanRequest;
            const newApprovals = { ...request.approvals, [user.uid]: decision };

            let newStatus: 'Pending' | 'Approved' | 'Rejected' = 'Pending';
            let reason = rejectionReason;

            if (decision === 'rejected') {
                newStatus = 'Rejected';
                reason = rejectionReason || 'Rejected by admin';
            } else {
                const allApproved = Object.values(newApprovals).every(v => v === 'approved');
                if (allApproved) newStatus = 'Approved';
            }

            await updateDoc(requestRef, {
                approvals: newApprovals,
                status: newStatus,
                rejectionReason: reason,
                updatedAt: serverTimestamp()
            });

            // Log activity
            try {
                const adminDoc = await getDoc(doc(db, 'users', user.uid));
                const adminName = adminDoc.exists() ? adminDoc.data().displayName : user.displayName;

                // Fetch affected member's custom member ID
                let memberIdCustom = 'N/A';
                try {
                    const memberDoc = await getDoc(doc(db, 'users', request.memberId));
                    if (memberDoc.exists() && memberDoc.data().memberId) {
                        memberIdCustom = memberDoc.data().memberId;
                    }
                } catch (e) {
                    console.warn('Failed to fetch member ID:', e);
                }

                await activityLogger.logLoanVoted(
                    user.uid,
                    adminName,
                    requestId,
                    request.memberName,
                    request.memberId,
                    memberIdCustom,
                    request.type || 'Standard',
                    decision,
                    reason,
                    'DEFAULT'
                );
            } catch (logError) {
                console.warn("Failed to log activity:", logError);
            }

            if (newStatus === 'Approved') {
                // Create Transaction
                await addDoc(collection(db, 'transactions'), {
                    memberId: request.memberId,
                    memberName: request.memberName,
                    amount: request.type === 'Standard' ? Math.round(request.amount * 1.1) : request.amount,
                    originalAmount: request.amount,
                    type: 'Loan',
                    category: request.type,
                    interestRate: request.type === 'Standard' ? 10 : 0,
                    date: new Date().toISOString(),
                    status: 'Completed',
                    createdBy: `System (Approved by ${Object.keys(newApprovals).length} Admins)`,
                    source: 'Loan Request'
                });
            }

            setShowRejectModal(false);
            setRejectionReason('');
        } catch (error: any) {
            alert(error.message);
        }
    };

    // Filter Logic
    const filteredRequests = requests.filter(request => {
        const matchesSearch = searchTerm === '' ||
            request.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (request as any).requesterMemberId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            request.memberId.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'All' || request.status === statusFilter;

        const requestDate = new Date(request.requestedDate);
        const matchesStartDate = !startDate || requestDate >= new Date(startDate);
        const matchesEndDate = !endDate || requestDate <= new Date(new Date(endDate).setHours(23, 59, 59, 999));

        return matchesSearch && matchesStatus && matchesStartDate && matchesEndDate;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
    const paginatedRequests = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, startDate, endDate, itemsPerPage]);

    return (
        <AppLayout>
            <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>

                {/* Header Section */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--text-primary)' }}>Loan Management</h1>
                        <p style={{ color: 'var(--text-secondary)' }}>Submit and track your loan requests</p>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            backgroundColor: '#F57C00',
                            color: 'white',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '0.75rem',
                            fontWeight: '700',
                            border: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(245, 124, 0, 0.2)'
                        }}
                    >
                        <Plus size={20} />
                        Request New Loan
                    </button>
                </div>

                {/* Filters Section */}
                <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Search Member</label>
                            <div style={{ position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    type="text"
                                    placeholder="Name or ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2.25rem', borderRadius: '0.5rem', border: '1px solid var(--border)', backgroundColor: 'var(--background-muted)', color: 'var(--text-primary)', outline: 'none' }}
                                />
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
                                    <option value="Pending">Pending</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Rejected">Rejected</option>
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
                                    style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2.25rem', borderRadius: '0.5rem', border: '1px solid var(--border)', outline: 'none', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}
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
                                    style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2.25rem', borderRadius: '0.5rem', border: '1px solid var(--border)', outline: 'none', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #F59E0B' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', borderRadius: '0.75rem' }}>
                                <Clock size={24} />
                            </div>
                            <div>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Pending Approval</p>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-primary)' }}>
                                    {requests.filter(r => r.status === 'Pending').length}
                                </h3>
                            </div>
                        </div>
                    </div>
                    <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #10B981' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <div style={{ padding: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', borderRadius: '0.75rem' }}>
                                <CheckCircle2 size={24} />
                            </div>
                            <div>
                                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total Approved</p>
                                <h3 style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-primary)' }}>
                                    {requests.filter(r => r.status === 'Approved').length}
                                </h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Requests List */}
                <div className="card" style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)' }}>Request History</h2>
                    </div>

                    {loading ? (
                        <div style={{ padding: '4rem', textAlign: 'center' }}>
                            <div className="animate-spin" style={{ margin: '0 auto', width: '2rem', height: '2rem', border: '3px solid var(--background-muted)', borderTopColor: '#F57C00', borderRadius: '50%' }}></div>
                        </div>
                    ) : filteredRequests.length === 0 ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <Wallet size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
                            <p>No loan requests matching your filters.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead style={{ backgroundColor: 'var(--background-muted)', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                                    <tr>
                                        <th style={{ padding: '1rem 1.5rem' }}>Member</th>
                                        <th style={{ padding: '1rem 1.5rem' }}>Type</th>
                                        <th style={{ padding: '1rem 1.5rem' }}>Amount</th>
                                        <th style={{ padding: '1rem 1.5rem' }}>Status</th>
                                        <th style={{ padding: '1rem 1.5rem' }}>Admin Approvals</th>
                                        <th style={{ padding: '1rem 1.5rem' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody style={{ fontSize: '0.875rem' }}>
                                    {paginatedRequests.map((request) => {
                                        const myStatus = request.approvals[user?.uid] || 'pending';
                                        const approvedCount = Object.values(request.approvals).filter(v => v === 'approved').length;
                                        const totalAdmins = Object.keys(request.approvals).length;
                                        const isExpanded = expandedRequestId === request.id;

                                        return (
                                            <React.Fragment key={request.id}>
                                                <tr
                                                    onClick={() => setExpandedRequestId(isExpanded ? null : request.id!)}
                                                    style={{
                                                        borderBottom: isExpanded ? 'none' : '1px solid var(--border)',
                                                        cursor: 'pointer',
                                                        backgroundColor: isExpanded ? 'var(--background-muted)' : 'transparent',
                                                        transition: 'background-color 0.2s'
                                                    }}
                                                >
                                                    <td style={{ padding: '1rem 1.5rem' }}>
                                                        <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{request.memberName}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-disabled)' }}>{new Date(request.requestedDate).toLocaleDateString()}</div>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem' }}>
                                                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: '1rem', backgroundColor: 'var(--background-muted)', color: 'var(--text-secondary)', fontWeight: '600', fontSize: '0.75rem' }}>
                                                            {request.type}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem', fontWeight: '800', color: '#F57C00' }}>
                                                        {request.amount.toLocaleString()} TZS
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem' }}>
                                                        <span style={{
                                                            padding: '0.25rem 0.75rem',
                                                            borderRadius: '1rem',
                                                            fontWeight: '700',
                                                            fontSize: '0.7rem',
                                                            backgroundColor: request.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : request.status === 'Rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 124, 0, 0.1)',
                                                            color: request.status === 'Approved' ? '#10B981' : request.status === 'Rejected' ? '#EF4444' : '#F57C00'
                                                        }}>
                                                            {request.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem' }}>
                                                        <div style={{ fontSize: '0.75rem', marginBottom: '0.5rem', fontWeight: '600' }}>{approvedCount} of {totalAdmins} Approved</div>
                                                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                            {Object.keys(request.approvals).map(aid => (
                                                                <div
                                                                    key={aid}
                                                                    title={`${request.adminNames[aid]}: ${request.approvals[aid]}`}
                                                                    style={{
                                                                        width: '8px',
                                                                        height: '8px',
                                                                        borderRadius: '50%',
                                                                        backgroundColor: request.approvals[aid] === 'approved' ? '#10B981' : request.approvals[aid] === 'rejected' ? '#EF4444' : 'var(--border)'
                                                                    }}
                                                                />
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1rem 1.5rem' }}>
                                                        {role === 'Admin' && request.status === 'Pending' && myStatus === 'pending' ? (
                                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); handleVote(request.id!, 'approved'); }}
                                                                    style={{ padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: '#10B981', color: 'white', border: 'none', cursor: 'pointer' }}
                                                                >
                                                                    <Check size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setSelectedRequest(request); setShowRejectModal(true); }}
                                                                    style={{ padding: '0.5rem', borderRadius: '0.5rem', backgroundColor: '#EF4444', color: 'white', border: 'none', cursor: 'pointer' }}
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            role === 'Admin' && request.status === 'Pending' && (
                                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>You {myStatus}</span>
                                                            )
                                                        )}
                                                    </td>
                                                </tr>
                                                {isExpanded && (
                                                    <tr style={{ backgroundColor: 'var(--background-muted)', borderBottom: '1px solid var(--border)' }}>
                                                        <td colSpan={6} style={{ padding: '0 1.5rem 1.5rem' }}>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', padding: '1.5rem', backgroundColor: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--border)' }}>
                                                                <div>
                                                                    <h4 style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Admin Approval Track</h4>
                                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                                        {Object.keys(request.approvals).map(aid => (
                                                                            <div key={aid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', backgroundColor: 'var(--background-muted)', borderRadius: '0.5rem' }}>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                                    {request.approvals[aid] === 'approved' ? <CheckCircle2 size={14} color="#10B981" /> : request.approvals[aid] === 'rejected' ? <XCircle size={14} color="#EF4444" /> : <Clock size={14} color="var(--text-secondary)" />}
                                                                                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)' }}>{request.adminNames[aid]}</span>
                                                                                </div>
                                                                                <span style={{
                                                                                    fontSize: '0.7rem',
                                                                                    fontWeight: '800',
                                                                                    color: request.approvals[aid] === 'approved' ? '#10B981' : request.approvals[aid] === 'rejected' ? '#EF4444' : 'var(--text-secondary)'
                                                                                }}>
                                                                                    {request.approvals[aid].toUpperCase()}
                                                                                </span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                                <div>
                                                                    <h4 style={{ fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Request Details</h4>
                                                                    <div style={{ backgroundColor: 'var(--background-muted)', padding: '1rem', borderRadius: '0.75rem' }}>
                                                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontStyle: 'italic' }}>
                                                                            "{request.description || 'No description provided'}"
                                                                        </p>
                                                                    </div>
                                                                    {request.status === 'Rejected' && request.rejectionReason && (
                                                                        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '0.75rem', borderLeft: '4px solid #EF4444' }}>
                                                                            <p style={{ fontSize: '0.75rem', fontWeight: '800', color: '#EF4444', marginBottom: '0.25rem' }}>REJECTION REASON</p>
                                                                            <p style={{ fontSize: '0.85rem', color: '#EF4444' }}>{request.rejectionReason}</p>
                                                                        </div>
                                                                    )}
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

                    {/* Pagination Controls */}
                    {filteredRequests.length > 0 && (
                        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--background-muted)' }}>
                            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                Showing <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{((currentPage - 1) * itemsPerPage) + 1}</span> to <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{Math.min(currentPage * itemsPerPage, filteredRequests.length)}</span> of <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{filteredRequests.length}</span> results
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
                                                fontSize: '0.875rem'
                                            }}
                                        >
                                            {i + 1}
                                        </button>
                                    )).slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))}
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
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

                {/* New Request Modal */}
                {showModal && (
                    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
                        <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-primary)' }}>Request Loan</h2>
                                <button onClick={() => setShowModal(false)} style={{ color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}><X /></button>
                            </div>

                            <form onSubmit={handleSubmitRequest}>
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '0.875rem' }}>Loan Type</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <button
                                            type="button"
                                            onClick={() => setLoanType('Standard')}
                                            style={{
                                                padding: '1rem', borderRadius: '1rem', border: '2px solid',
                                                borderColor: loanType === 'Standard' ? '#F57C00' : 'var(--border)',
                                                backgroundColor: loanType === 'Standard' ? 'rgba(245, 124, 0, 0.1)' : 'var(--card-bg)',
                                                cursor: 'pointer',
                                                color: 'var(--text-primary)'
                                            }}
                                        >
                                            <div style={{ fontWeight: '800' }}>Standard</div>
                                            <div style={{ fontSize: '0.7rem', color: '#F97316' }}>10% Interest</div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setLoanType('Dharura')}
                                            style={{
                                                padding: '1rem', borderRadius: '1rem', border: '2px solid',
                                                borderColor: loanType === 'Dharura' ? '#F57C00' : 'var(--border)',
                                                backgroundColor: loanType === 'Dharura' ? 'rgba(245, 124, 0, 0.1)' : 'var(--card-bg)',
                                                cursor: 'pointer',
                                                color: 'var(--text-primary)'
                                            }}
                                        >
                                            <div style={{ fontWeight: '800' }}>Dharura</div>
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>No Interest</div>
                                        </button>
                                    </div>
                                </div>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '0.875rem' }}>Amount (TZS)</label>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        style={{ width: '100%', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--border)', outline: 'none', fontSize: '1.125rem', fontWeight: '700', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}
                                    />
                                    {loanType === 'Standard' && amount && !isNaN(Number(amount)) && (
                                        <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'var(--background-muted)', borderRadius: '0.75rem', fontSize: '0.8rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                                <span>Principal:</span>
                                                <span style={{ color: 'var(--text-primary)' }}>{Number(amount).toLocaleString()} TZS</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                                                <span>Interest (10%):</span>
                                                <span style={{ color: 'var(--text-primary)' }}>{Math.round(Number(amount) * 0.1).toLocaleString()} TZS</span>
                                            </div>
                                            <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '0.25rem 0' }}></div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', color: '#F57C00' }}>
                                                <span>Total Repayment:</span>
                                                <span>{Math.round(Number(amount) * 1.1).toLocaleString()} TZS</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div style={{ marginBottom: '2rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '700', fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                                        Purpose <span style={{ color: '#EF4444' }}>*</span>
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Explain why you need this loan..."
                                        style={{ width: '100%', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--border)', outline: 'none', minHeight: '100px', resize: 'none', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    style={{
                                        width: '100%', padding: '1.25rem', borderRadius: '1.25rem', backgroundColor: '#F57C00',
                                        color: 'white', fontWeight: '900', fontSize: '1.125rem', border: 'none', cursor: 'pointer',
                                        opacity: submitting ? 0.7 : 1
                                    }}
                                >
                                    {submitting ? 'Submitting...' : 'Submit Loan Request'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Reject Modal */}
                {showRejectModal && (
                    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110, padding: '1rem' }}>
                        <div className="card" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '900', marginBottom: '1rem', color: '#EF4444' }}>Reject Loan Request</h2>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Please provide a reason for rejecting this loan request from {selectedRequest?.memberName}.</p>

                            <textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Reason for rejection..."
                                style={{ width: '100%', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--border)', outline: 'none', minHeight: '100px', resize: 'none', marginBottom: '1.5rem', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}
                            />

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={() => setShowRejectModal(false)}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', border: '1px solid var(--border)', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', fontWeight: '700', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => selectedRequest && handleVote(selectedRequest.id!, 'rejected')}
                                    style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', border: 'none', backgroundColor: '#EF4444', color: 'white', fontWeight: '700', cursor: 'pointer' }}
                                >
                                    Confirm Rejection
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </AppLayout>
    );
}
