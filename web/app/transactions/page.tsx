"use client";

import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, RefreshCw, UserSearch } from "lucide-react";
import { useEffect, useState } from "react";
import AppLayout from "../../components/AppLayout";
import { db } from "../../lib/firebase";

interface Member {
    uid: string;
    displayName: string;
    role: string;
}

export default function TransactionsPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [type, setType] = useState<'Contribution' | 'Loan' | 'Loan Repayment'>('Contribution');
    const [category, setCategory] = useState<'Hisa' | 'Jamii' | 'Standard' | 'Dharura'>('Hisa');
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [standardLoanBalance, setStandardLoanBalance] = useState(0);
    const [dharuraLoanBalance, setDhauraLoanBalance] = useState(0);

    useEffect(() => {
        fetchMembers();
    }, []);

    useEffect(() => {
        if (selectedMember) {
            fetchMemberLoanBalance(selectedMember.uid);
        }
    }, [selectedMember]);

    const fetchMembers = async () => {
        try {
            setLoading(true);
            const snapshot = await getDocs(collection(db, "users"));
            const data = snapshot.docs.map(doc => doc.data() as Member);
            setMembers(data);
        } catch (error) {
            console.error("Error fetching members:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMemberLoanBalance = async (uid: string) => {
        try {
            const q = query(collection(db, "transactions"), where("memberId", "==", uid));
            const snapshot = await getDocs(q);
            let standardBalance = 0;
            let dharuraBalance = 0;

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.type === 'Loan' && data.category === 'Standard') {
                    standardBalance += data.amount;
                }
                if (data.type === 'Loan' && data.category === 'Dharura') {
                    dharuraBalance += data.amount;
                }
                if (data.type === 'Loan Repayment') {
                    if (data.category === 'Standard') {
                        standardBalance -= data.amount;
                    } else if (data.category === 'Dharura') {
                        dharuraBalance -= data.amount;
                    }
                }
            });

            setStandardLoanBalance(Math.max(0, standardBalance));
            setDhauraLoanBalance(Math.max(0, dharuraBalance));
        } catch (err) {
            console.error(err);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMember || !amount) {
            alert("Please select a member and enter amount");
            return;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "transactions"), {
                memberId: selectedMember.uid,
                memberName: selectedMember.displayName,
                amount: parseFloat(amount),
                type: type,
                category: category,
                interestRate: (type === 'Loan' && category === 'Standard') ? 10 : 0,
                date: new Date().toISOString(),
                createdBy: selectedMember.uid,
                status: 'Completed'
            });

            alert("Transaction recorded successfully!");
            setAmount("");
            setSelectedMember(null);
            setSearchTerm("");
            setCategory('Hisa');
            setType('Contribution');
        } catch (error) {
            alert("Failed to record transaction");
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredMembers = members.filter(m =>
        m.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <AppLayout>
            <div style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: '900', letterSpacing: '-0.5px' }}>New Transaction</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Record financial activities for society members</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', alignItems: 'start' }}>
                {/* Form Selection */}
                <div className="card" style={{ padding: '2.5rem' }}>
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div>
                            <label style={{ fontSize: '0.875rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '1rem' }}>TRANSACTION TYPE</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                {[
                                    { id: 'Contribution', icon: ArrowDownLeft, label: 'Deposit', color: '#10B981' },
                                    { id: 'Loan', icon: ArrowUpRight, label: 'Loan', color: '#EF4444' },
                                    { id: 'Loan Repayment', icon: RefreshCw, label: 'Repay', color: '#F57C00' },
                                ].map((t) => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        disabled={t.id === 'Loan Repayment' && standardLoanBalance <= 0 && dharuraLoanBalance <= 0}
                                        onClick={() => {
                                            setType(t.id as any);
                                            // Reset category defaults when type changes
                                            if (t.id === 'Contribution') setCategory('Hisa');
                                            if (t.id === 'Loan') setCategory('Standard');
                                            if (t.id === 'Loan Repayment') setCategory(standardLoanBalance > 0 ? 'Standard' : 'Dharura');
                                        }}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '8px',
                                            padding: '1rem',
                                            borderRadius: '1rem',
                                            border: '2px solid',
                                            borderColor: type === t.id ? t.color : 'var(--border)',
                                            backgroundColor: type === t.id ? `${t.color}08` : 'white',
                                            opacity: (t.id === 'Loan Repayment' && standardLoanBalance <= 0 && dharuraLoanBalance <= 0) ? 0.3 : 1,
                                            cursor: (t.id === 'Loan Repayment' && standardLoanBalance <= 0 && dharuraLoanBalance <= 0) ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <t.icon size={24} color={type === t.id ? t.color : '#94A3B8'} />
                                        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: type === t.id ? t.color : '#94A3B8' }}>{t.label}</span>
                                    </button>
                                ))}
                            </div>

                            {/* Sub-Category Selection */}
                            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                                {type === 'Contribution' ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setCategory('Hisa')}
                                            style={{
                                                flex: 1, padding: '0.75rem', borderRadius: '0.75rem', fontWeight: '700', fontSize: '0.875rem',
                                                backgroundColor: category === 'Hisa' ? '#10B981' : '#F1F5F9',
                                                color: category === 'Hisa' ? 'white' : '#64748B',
                                                border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                        >
                                            Hisa (Shares)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCategory('Jamii')}
                                            style={{
                                                flex: 1, padding: '0.75rem', borderRadius: '0.75rem', fontWeight: '700', fontSize: '0.875rem',
                                                backgroundColor: category === 'Jamii' ? '#10B981' : '#F1F5F9',
                                                color: category === 'Jamii' ? 'white' : '#64748B',
                                                border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                        >
                                            Jamii
                                        </button>
                                    </>
                                ) : type === 'Loan' ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setCategory('Standard')}
                                            style={{
                                                flex: 1, padding: '0.75rem', borderRadius: '0.75rem', fontWeight: '700', fontSize: '0.875rem',
                                                backgroundColor: category === 'Standard' ? '#EF4444' : '#F1F5F9',
                                                color: category === 'Standard' ? 'white' : '#64748B',
                                                border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                        >
                                            Standard (10% Interest)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCategory('Dharura')}
                                            style={{
                                                flex: 1, padding: '0.75rem', borderRadius: '0.75rem', fontWeight: '700', fontSize: '0.875rem',
                                                backgroundColor: category === 'Dharura' ? '#EF4444' : '#F1F5F9',
                                                color: category === 'Dharura' ? 'white' : '#64748B',
                                                border: 'none', cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                        >
                                            Dharura (No Interest)
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setCategory('Standard')}
                                            disabled={standardLoanBalance <= 0}
                                            style={{
                                                flex: 1, padding: '0.75rem', borderRadius: '0.75rem', fontWeight: '700', fontSize: '0.875rem',
                                                backgroundColor: category === 'Standard' ? '#F59E0B' : '#F1F5F9',
                                                color: category === 'Standard' ? 'white' : '#64748B',
                                                border: 'none', cursor: standardLoanBalance > 0 ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
                                                opacity: standardLoanBalance > 0 ? 1 : 0.3
                                            }}
                                        >
                                            Standard {standardLoanBalance > 0 ? `(TSh ${standardLoanBalance.toLocaleString()})` : '(Paid)'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCategory('Dharura')}
                                            disabled={dharuraLoanBalance <= 0}
                                            style={{
                                                flex: 1, padding: '0.75rem', borderRadius: '0.75rem', fontWeight: '700', fontSize: '0.875rem',
                                                backgroundColor: category === 'Dharura' ? '#F59E0B' : '#F1F5F9',
                                                color: category === 'Dharura' ? 'white' : '#64748B',
                                                border: 'none', cursor: dharuraLoanBalance > 0 ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
                                                opacity: dharuraLoanBalance > 0 ? 1 : 0.3
                                            }}
                                        >
                                            Dharura {dharuraLoanBalance > 0 ? `(TSh ${dharuraLoanBalance.toLocaleString()})` : '(Paid)'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.875rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '1rem' }}>SELECT MEMBER</label>
                            <div style={{
                                padding: '1rem',
                                borderRadius: '1rem',
                                border: '1px solid var(--border)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                backgroundColor: selectedMember ? '#F0F9FF' : 'var(--background-muted)'
                            }}>
                                {selectedMember ? (
                                    <>
                                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#0EA5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                            {selectedMember.displayName[0]}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontWeight: '700', fontSize: '0.875rem' }}>{selectedMember.displayName}</p>
                                            {(type === 'Loan Repayment') && (
                                                <p style={{ fontSize: '0.7rem', color: '#0EA5E9' }}>
                                                    {category === 'Standard' ? `Standard Debt: TSh ${standardLoanBalance.toLocaleString()}` : `Dharura Debt: TSh ${dharuraLoanBalance.toLocaleString()}`}
                                                </p>
                                            )}
                                        </div>
                                        <button onClick={() => setSelectedMember(null)} style={{ color: 'var(--text-secondary)' }}>Change</button>
                                    </>
                                ) : (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <UserSearch size={18} /> Search and select from the list
                                    </p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.875rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '1rem' }}>AMOUNT (TSH)</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="e.g. 50000"
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    borderRadius: '1rem',
                                    border: '1px solid var(--border)',
                                    fontSize: '1.25rem',
                                    fontWeight: '800',
                                    textAlign: 'center',
                                    outline: 'none',
                                    color: 'var(--text-primary)'
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={isSubmitting || !selectedMember}
                            style={{ padding: '1.25rem', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                        >
                            {isSubmitting ? "Processing..." : (
                                <>
                                    Record Transaction <CheckCircle2 size={20} />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Member Search List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Search member..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                borderRadius: '1rem',
                                border: '1px solid var(--border)',
                                outline: 'none',
                                backgroundColor: 'white'
                            }}
                        />
                    </div>
                    <div className="card" style={{ overflow: 'hidden', maxHeight: '500px', overflowY: 'auto' }}>
                        {filteredMembers.map(member => (
                            <button
                                key={member.uid}
                                onClick={() => setSelectedMember(member)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '1rem',
                                    padding: '1rem 1.5rem',
                                    borderBottom: '1px solid var(--border)',
                                    backgroundColor: selectedMember?.uid === member.uid ? '#F0F9FF' : 'white',
                                    textAlign: 'left'
                                }}
                            >
                                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: 'var(--background-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: '800' }}>
                                    {member.displayName[0]}
                                </div>
                                <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{member.displayName}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
