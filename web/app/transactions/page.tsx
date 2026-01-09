"use client";

import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, RefreshCw, UserSearch } from "lucide-react";
import { useEffect, useState } from "react";
import AppLayout from "../../components/AppLayout";
import { activityLogger } from "../../lib/activityLogger";
import { auth, db } from "../../lib/firebase";

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
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setCurrentUser(u);
        });
        return () => unsubscribe();
    }, []);

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
            const enteredAmount = parseFloat(amount);
            let finalAmount = enteredAmount;
            let originalAmount = enteredAmount;

            // Calculate interest for Standard loans (Disabled - automated interest removed)
            if (type === 'Loan' && category === 'Standard') {
                finalAmount = enteredAmount * 1.1; // Add 10% interest
                originalAmount = enteredAmount;
            }

            const docRef = await addDoc(collection(db, "transactions"), {
                memberId: selectedMember.uid,
                memberName: selectedMember.displayName,
                amount: finalAmount, // Total amount with interest for Standard loans
                originalAmount: type === 'Loan' ? originalAmount : undefined,
                type: type,
                category: category,
                interestRate: (type === 'Loan' && category === 'Standard') ? 10 : 0, // Automated interest disabled
                date: new Date().toISOString(),
                createdBy: currentUser?.uid || 'web-admin',
                status: 'Completed'
            });

            // Log activity
            try {
                await activityLogger.logTransactionCreated(
                    currentUser?.uid || 'web-admin',
                    currentUser?.displayName || 'Web Admin',
                    {
                        id: docRef.id,
                        type,
                        category,
                        amount: finalAmount,
                        memberId: selectedMember.uid,
                        memberName: selectedMember.displayName
                    },
                    'DEFAULT'
                );
            } catch (logError) {
                console.warn("Failed to log transaction activity:", logError);
            }

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

    // Bulk Upload State
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [bulkValidation, setBulkValidation] = useState<any>(null);
    const [bulkProcessing, setBulkProcessing] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setLoading(true);
            const { bulkUploadService } = await import('../../lib/bulkUploadService');
            const rows = await bulkUploadService.parseExcelFile(file);
            const validation = await bulkUploadService.validateBulkData(rows);
            setBulkValidation(validation);
        } catch (error) {
            console.error(error);
            alert("Error parsing file. Ensure it is a valid Excel file.");
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const { bulkUploadService } = await import('../../lib/bulkUploadService');
            const XLSX = await import('xlsx');

            const rows = await bulkUploadService.generateTemplate();
            const ws = XLSX.utils.json_to_sheet(rows);
            ws['!cols'] = [
                { wch: 15 }, // Date
                { wch: 15 }, // Member ID
                { wch: 20 }, // Full Name
                { wch: 15 }, // Hisa
                { wch: 15 }, // Jamii
                { wch: 15 }, // Standard Repay
                { wch: 15 }, // Dharura Repay
                { wch: 15 }, // Standard Loan
                { wch: 15 }  // Dharura Loan
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Transactions");
            XLSX.writeFile(wb, "SBK_Batch_Template.xlsx");
        } catch (error: any) {
            console.error(error);
            alert("Failed to download template: " + error.message);
        }
    };

    const handleBulkProcess = async () => {
        if (!bulkValidation || !bulkValidation.validRows.length) return;

        setBulkProcessing(true);
        try {
            const { bulkUploadService } = await import('../../lib/bulkUploadService');
            // Mock getting current user ID or use generic
            const result = await bulkUploadService.processBulkTransactions(bulkValidation.validRows, currentUser?.uid || "web-admin");

            // Log bulk upload activity
            try {
                await activityLogger.logBulkUpload(
                    currentUser?.uid || 'web-admin',
                    currentUser?.displayName || 'Web Admin',
                    result.successCount,
                    'success',
                    'DEFAULT'
                );
            } catch (logError) {
                console.warn("Failed to log bulk upload activity:", logError);
            }

            alert(`Processed ${result.successCount} transactions successfully.`);
            setBulkValidation(null);
            setIsBulkMode(false);
            // Refresh member data
            fetchMembers();
            if (selectedMember) fetchMemberLoanBalance(selectedMember.uid);
        } catch (error) {
            console.error(error);
            alert("Error processing transactions");
        } finally {
            setBulkProcessing(false);
        }
    };

    return (
        <AppLayout>
            <div style={{ padding: '2rem' }}>
                {/* Header & Tabs */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#0F172A' }}>Transactions</h1>
                        <p style={{ color: '#64748B' }}>Record financial activities</p>
                    </div>

                    <div style={{ backgroundColor: '#F1F5F9', padding: '0.25rem', borderRadius: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => setIsBulkMode(false)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '0.375rem',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: '600',
                                backgroundColor: !isBulkMode ? 'white' : 'transparent',
                                color: !isBulkMode ? '#0F172A' : '#64748B',
                                boxShadow: !isBulkMode ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            Single Entry
                        </button>
                        <button
                            onClick={() => setIsBulkMode(true)}
                            style={{
                                padding: '0.5rem 1rem',
                                borderRadius: '0.375rem',
                                border: 'none',
                                cursor: 'pointer',
                                fontWeight: '600',
                                backgroundColor: isBulkMode ? '#10B981' : 'transparent',
                                color: isBulkMode ? 'white' : '#64748B',
                                boxShadow: isBulkMode ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
                                transition: 'all 0.2s'
                            }}
                        >
                            Bulk Upload
                        </button>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>

                    {/* LEFT COLUMN: FORM or UPLOADER */}
                    <div className="card" style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
                        {isBulkMode ? (
                            /* BULK UPLOAD MODE */
                            <div className="animate-fade-in">
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0F172A' }}>
                                    <ArrowDownLeft size={24} color="#10B981" />
                                    Bulk Upload (Excel)
                                </h2>

                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Select Excel File</label>
                                    <input
                                        type="file"
                                        accept=".xlsx, .xls"
                                        onChange={handleFileChange}
                                        style={{
                                            display: 'block',
                                            width: '100%',
                                            fontSize: '0.875rem',
                                            color: '#64748B',
                                            padding: '0.5rem',
                                            border: '1px dashed #CBD5E1',
                                            borderRadius: '0.5rem'
                                        }}
                                    />
                                    <p style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#64748B' }}>
                                        Required Columns: Date (M/D/YYYY), Member ID, Full name, HISA Amount, Jamii Amount, Standard Repay, Dharura Repay, Standard Loan, Dharura Loan
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleDownloadTemplate}
                                    style={{
                                        width: '100%',
                                        marginBottom: '1.5rem',
                                        padding: '0.75rem',
                                        backgroundColor: '#F0F9FF',
                                        color: '#0284C7',
                                        border: '1px dashed #7DD3FC',
                                        borderRadius: '0.5rem',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        fontWeight: '600',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem'
                                    }}
                                >
                                    <ArrowDownLeft size={16} /> Download Excel Template
                                </button>

                                {loading && <div style={{ textAlign: 'center', padding: '1rem', color: '#64748B' }}>Parsing file...</div>}

                                {bulkValidation && (
                                    <div style={{ border: '1px solid #E2E8F0', borderRadius: '0.75rem', overflow: 'hidden' }}>
                                        <div style={{ backgroundColor: '#F8FAFC', padding: '1rem', borderBottom: '1px solid #E2E8F0' }}>
                                            <h3 style={{ fontWeight: '600', color: '#0F172A' }}>Preview Results</h3>
                                        </div>
                                        <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                                <span style={{ color: '#64748B' }}>Valid Transactions:</span>
                                                <span style={{ fontWeight: 'bold', color: '#10B981' }}>{bulkValidation.validRows.length}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                                <span style={{ color: '#64748B' }}>Duplicates (Skipped):</span>
                                                <span style={{ fontWeight: 'bold', color: '#F59E0B' }}>{bulkValidation.duplicateRows.length}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                                                <span style={{ color: '#64748B' }}>Invalid Rows:</span>
                                                <span style={{ fontWeight: 'bold', color: '#EF4444' }}>{bulkValidation.invalidRows.length}</span>
                                            </div>

                                            {bulkValidation.errors.length > 0 && (
                                                <div style={{ backgroundColor: '#FEF2F2', padding: '0.75rem', borderRadius: '0.5rem', marginTop: '0.5rem' }}>
                                                    <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#B91C1C', marginBottom: '0.25rem' }}>Errors:</p>
                                                    <ul style={{ paddingLeft: '1rem', fontSize: '0.75rem', color: '#B91C1C' }}>
                                                        {bulkValidation.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
                                                    </ul>
                                                </div>
                                            )}

                                            <button
                                                onClick={handleBulkProcess}
                                                disabled={!bulkValidation.isValid || bulkValidation.validRows.length === 0 || bulkProcessing}
                                                style={{
                                                    width: '100%',
                                                    padding: '0.75rem',
                                                    borderRadius: '0.75rem',
                                                    fontWeight: 'bold',
                                                    color: 'white',
                                                    backgroundColor: (!bulkValidation.isValid || bulkValidation.validRows.length === 0 || bulkProcessing) ? '#94A3B8' : '#10B981',
                                                    border: 'none',
                                                    cursor: (!bulkValidation.isValid || bulkValidation.validRows.length === 0 || bulkProcessing) ? 'not-allowed' : 'pointer',
                                                    marginTop: '1rem'
                                                }}
                                            >
                                                {bulkProcessing ? 'Processing...' : `Process ${bulkValidation.validRows.length} Transactions`}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* SINGLE ENTRY MODE (Original Form Logic) */
                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                {/* Transaction Type */}
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748B', display: 'block', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>TRANSACTION TYPE</label>
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
                                                    if (t.id === 'Contribution') setCategory('Hisa');
                                                    if (t.id === 'Loan') setCategory('Standard');
                                                    if (t.id === 'Loan Repayment') setCategory(standardLoanBalance > 0 ? 'Standard' : 'Dharura');
                                                }}
                                                style={{
                                                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '1rem',
                                                    borderRadius: '1rem', border: '2px solid',
                                                    borderColor: type === t.id ? t.color : '#E2E8F0',
                                                    backgroundColor: type === t.id ? `${t.color}10` : 'white',
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
                                </div>

                                {/* Category Selection */}
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748B', display: 'block', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>CATEGORY</label>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        {type === 'Contribution' ? (
                                            <>
                                                <button type="button" onClick={() => setCategory('Hisa')} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', fontWeight: '700', fontSize: '0.875rem', border: 'none', cursor: 'pointer', backgroundColor: category === 'Hisa' ? '#10B981' : '#F1F5F9', color: category === 'Hisa' ? 'white' : '#64748B' }}>Hisa (Shares)</button>
                                                <button type="button" onClick={() => setCategory('Jamii')} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', fontWeight: '700', fontSize: '0.875rem', border: 'none', cursor: 'pointer', backgroundColor: category === 'Jamii' ? '#10B981' : '#F1F5F9', color: category === 'Jamii' ? 'white' : '#64748B' }}>Jamii</button>
                                            </>
                                        ) : type === 'Loan' ? (
                                            <>
                                                <button type="button" onClick={() => setCategory('Standard')} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', fontWeight: '700', fontSize: '0.875rem', border: 'none', cursor: 'pointer', backgroundColor: category === 'Standard' ? '#EF4444' : '#F1F5F9', color: category === 'Standard' ? 'white' : '#64748B' }}>Standard (10%)</button>
                                                <button type="button" onClick={() => setCategory('Dharura')} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', fontWeight: '700', fontSize: '0.875rem', border: 'none', cursor: 'pointer', backgroundColor: category === 'Dharura' ? '#EF4444' : '#F1F5F9', color: category === 'Dharura' ? 'white' : '#64748B' }}>Dharura (0%)</button>
                                            </>
                                        ) : (
                                            <>
                                                <button type="button" onClick={() => setCategory('Standard')} disabled={standardLoanBalance <= 0} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', fontWeight: '700', fontSize: '0.875rem', border: 'none', cursor: standardLoanBalance > 0 ? 'pointer' : 'not-allowed', backgroundColor: category === 'Standard' ? '#F59E0B' : '#F1F5F9', color: category === 'Standard' ? 'white' : '#64748B', opacity: standardLoanBalance > 0 ? 1 : 0.5 }}>Standard</button>
                                                <button type="button" onClick={() => setCategory('Dharura')} disabled={dharuraLoanBalance <= 0} style={{ flex: 1, padding: '0.75rem', borderRadius: '0.75rem', fontWeight: '700', fontSize: '0.875rem', border: 'none', cursor: dharuraLoanBalance > 0 ? 'pointer' : 'not-allowed', backgroundColor: category === 'Dharura' ? '#F59E0B' : '#F1F5F9', color: category === 'Dharura' ? 'white' : '#64748B', opacity: dharuraLoanBalance > 0 ? 1 : 0.5 }}>Dharura</button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Amount Input */}
                                <div>
                                    <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748B', display: 'block', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>AMOUNT (TSH)</label>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.00"
                                        style={{ width: '100%', padding: '1rem', borderRadius: '1rem', border: '1px solid #E2E8F0', fontSize: '1.25rem', fontWeight: '800', textAlign: 'center', outline: 'none', color: '#0F172A' }}
                                    />
                                    {/* Interest Preview (Re-enabled) */}
                                    {type === 'Loan' && category === 'Standard' && amount && !isNaN(Number(amount)) && Number(amount) > 0 && (
                                        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#FFF7ED', borderRadius: '0.75rem', border: '1px solid #FFEDD5' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span style={{ fontSize: '0.875rem', color: '#7C3AED' }}>Principal Amount:</span>
                                                <span style={{ fontWeight: '600' }}>{Number(amount).toLocaleString()} TZS</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                                <span style={{ fontSize: '0.875rem', color: '#7C3AED' }}>Interest (10%):</span>
                                                <span style={{ fontWeight: '600' }}>{(Number(amount) * 0.1).toLocaleString()} TZS</span>
                                            </div>
                                            <div style={{ height: '1px', backgroundColor: '#FFEDD5', margin: '0.5rem 0' }}></div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontWeight: 'bold', color: '#EA580C' }}>Total Amount:</span>
                                                <span style={{ fontWeight: 'bold', color: '#EA580C', fontSize: '1.125rem' }}>
                                                    {(Number(amount) * 1.1).toLocaleString()} TZS
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Submit Button */}
                                <button type="submit" disabled={isSubmitting || !selectedMember} style={{ padding: '1.25rem', borderRadius: '1rem', backgroundColor: '#0F172A', color: 'white', fontSize: '1rem', fontWeight: '700', border: 'none', cursor: (isSubmitting || !selectedMember) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: (isSubmitting || !selectedMember) ? 0.7 : 1 }}>
                                    {isSubmitting ? "Processing..." : <>Record Transaction <CheckCircle2 size={20} /></>}
                                </button>
                            </form>
                        )}
                    </div>

                    {/* RIGHT COLUMN: MEMBER SEARCH & STATS */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {selectedMember ? (
                            <div className="card" style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #E2E8F0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                    <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>Loan Status</h3>
                                    <button onClick={() => setSelectedMember(null)} style={{ fontSize: '0.875rem', color: '#0EA5E9', border: 'none', background: 'none', cursor: 'pointer' }}>Change Member</button>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', backgroundColor: '#0EA5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.25rem' }}>
                                        {selectedMember.displayName[0]}
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: 'bold', fontSize: '1rem' }}>{selectedMember.displayName}</p>
                                        <p style={{ fontSize: '0.875rem', color: '#64748B' }}>{selectedMember.role}</p>
                                        {/* Show Member ID if available? Need to add to type first. For now skip. */}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ padding: '1rem', backgroundColor: '#EEF2FF', borderRadius: '0.75rem', border: '1px solid #E0E7FF' }}>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#4F46E5', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Standard Loan Balance</p>
                                        <p style={{ fontSize: '1.5rem', fontWeight: '900', color: '#312E81' }}>TSh {standardLoanBalance.toLocaleString()}</p>
                                    </div>
                                    <div style={{ padding: '1rem', backgroundColor: '#FFFBEB', borderRadius: '0.75rem', border: '1px solid #FEF3C7' }}>
                                        <p style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#D97706', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Dharura Loan Balance</p>
                                        <p style={{ fontSize: '1.5rem', fontWeight: '900', color: '#78350F' }}>TSh {dharuraLoanBalance.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Member Search */
                            <div className="card" style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #E2E8F0', flex: 1 }}>
                                <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Select Member</h3>
                                <div style={{ position: 'relative', marginBottom: '1rem' }}>
                                    <UserSearch size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
                                    <input
                                        type="text"
                                        placeholder="Search by name..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        style={{ width: '100%', padding: '1rem 1rem 1rem 3rem', borderRadius: '0.75rem', border: '1px solid #E2E8F0', outline: 'none' }}
                                    />
                                </div>
                                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                    {filteredMembers.map(member => (
                                        <button
                                            key={member.uid}
                                            onClick={() => { setSelectedMember(member); setSearchTerm(''); }}
                                            style={{
                                                width: '100%', display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem',
                                                border: 'none', background: 'none', cursor: 'pointer', textAlign: 'left',
                                                borderRadius: '0.5rem', transition: 'background-color 0.1s'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#64748B' }}>
                                                {member.displayName[0]}
                                            </div>
                                            <span style={{ fontWeight: '500', color: '#334155' }}>{member.displayName}</span>
                                        </button>
                                    ))}
                                    {filteredMembers.length === 0 && (
                                        <p style={{ textAlign: 'center', color: '#94A3B8', padding: '1rem' }}>No members found</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
