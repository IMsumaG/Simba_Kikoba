'use client';

import { getAuth } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AppLayout from '../../components/AppLayout';
import { useAuth } from '../../context/AuthContext';

export default function RemindersPage() {
    const router = useRouter();
    const { user, role, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Redirect if not admin
    useEffect(() => {
        if (!authLoading && (!user || role !== 'Admin')) {
            router.push('/');
        }
    }, [user, role, authLoading, router]);

    const handleContributionReminder = async () => {
        if (!window.confirm('Send contribution reminder to all members? This will send one email to all members with their addresses in BCC.')) {
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const auth = getAuth();
            const currentUser = auth.currentUser;
            if (!currentUser) {
                throw new Error('User not authenticated. Please log in again.');
            }

            const token = await currentUser.getIdToken();
            if (!token) {
                throw new Error('Authentication token not found. Please refresh the page.');
            }

            const response = await fetch('/api/email/send-contribution-reminders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send reminders');
            }

            setMessage({
                type: 'success',
                text: `✅ Contribution reminder sent to ${data.recipientCount} members`,
            });
        } catch (error: any) {
            setMessage({
                type: 'error',
                text: `❌ Error: ${error.message || 'Failed to send reminders'}`,
            });
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleLoanReminder = async () => {
        if (!window.confirm('Send loan repayment reminders? This will send individual emails to members with outstanding loans.')) {
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const auth = getAuth();
            const currentUser = auth.currentUser;
            if (!currentUser) {
                throw new Error('User not authenticated. Please log in again.');
            }

            const token = await currentUser.getIdToken();
            if (!token) {
                throw new Error('Authentication token not found. Please refresh the page.');
            }

            const response = await fetch('/api/email/send-loan-reminders', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to send reminders');
            }

            setMessage({
                type: 'success',
                text: `✅ Loan reminders sent to ${data.successCount}/${data.recipientCount} members with outstanding loans`,
            });
        } catch (error: any) {
            setMessage({
                type: 'error',
                text: `❌ Error: ${error.message || 'Failed to send reminders'}`,
            });
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleMigration = async () => {
        if (!window.confirm('Migrate Standard Loans to include 10% interest?\n\nThis will apply 10% interest to all existing Standard loans that don\'t have interest applied yet. This is a one-time operation.\n\nContinue?')) {
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const auth = getAuth();
            const currentUser = auth.currentUser;
            if (!currentUser) {
                throw new Error('User not authenticated. Please log in again.');
            }

            const token = await currentUser.getIdToken();
            if (!token) {
                throw new Error('Authentication token not found. Please refresh the page.');
            }

            const response = await fetch('/api/migration/standard-loans-interest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to run migration');
            }

            setMessage({
                type: 'success',
                text: `✅ Migration complete! Updated ${data.updatedCount} Standard loan transactions`,
            });
        } catch (error: any) {
            setMessage({
                type: 'error',
                text: `❌ Error: ${error.message || 'Failed to run migration'}`,
            });
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AppLayout>
            <div style={{ minHeight: '100vh', backgroundColor: 'var(--background-muted)' }}>
                {/* Header */}
                <div style={{ backgroundColor: 'var(--card-bg)', borderBottom: '1px solid var(--border)', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
                    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '2rem 1rem', paddingTop: '2rem' }}>
                        <h1 style={{ fontSize: '1.875rem', fontWeight: '900', letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>Send Reminders</h1>
                        <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)' }}>Manage email notifications for members and admins</p>
                    </div>
                </div>

                {/* Messages */}
                {message && (
                    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem', marginTop: '1.5rem' }}>
                        <div style={{
                            padding: '1rem',
                            borderRadius: 'var(--radius)',
                            backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                            color: message.type === 'success' ? '#10B981' : '#EF4444'
                        }}>
                            <p>{message.text}</p>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 1rem', paddingTop: '2rem', paddingBottom: '2rem' }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                        gap: '2rem'
                    }}>
                        {/* Contribution Reminder Card */}
                        <div className="card" style={{ padding: '1.5rem', transition: 'box-shadow 0.2s' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Contribution Reminder</h2>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                        Remind all members to contribute their monthly savings
                                    </p>
                                </div>
                                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
                                    <svg style={{ width: '1.5rem', height: '1.5rem', color: '#10B981' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>

                            <div style={{ backgroundColor: 'var(--background-muted)', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '1.5rem' }}>
                                <h3 style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Email Details:</h3>
                                <ul style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', listStyle: 'none', padding: 0 }}>
                                    <li style={{ marginBottom: '0.25rem' }}>✓ Sent to: All active members</li>
                                    <li style={{ marginBottom: '0.25rem' }}>✓ Method: Single email with BCC (privacy-preserving)</li>
                                    <li style={{ marginBottom: '0.25rem' }}>✓ Content: HISA (30,000) & JAMII (5,000) contributions</li>
                                    <li style={{ marginBottom: '0.25rem' }}>✓ Frequency: One-time send</li>
                                </ul>
                            </div>

                            <button
                                onClick={handleContributionReminder}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    backgroundColor: '#10B981',
                                    color: 'white',
                                    fontWeight: '600',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.5rem',
                                    border: 'none',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    opacity: loading ? 0.6 : 1,
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#059669')}
                                onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#10B981')}
                            >
                                {loading ? 'Sending...' : 'Send Contribution Reminder'}
                            </button>
                        </div>

                        {/* Loan Repayment Reminder Card */}
                        <div className="card" style={{ padding: '1.5rem', transition: 'box-shadow 0.2s' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Loan Repayment Reminder</h2>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                        Remind members with outstanding loans to make repayments
                                    </p>
                                </div>
                                <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
                                    <svg style={{ width: '1.5rem', height: '1.5rem', color: '#EF4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4v2m0 4v2m-6-4a2 2 0 11-4 0 2 2 0 014 0zM7 20a7 7 0 1114 0M17 12a5 5 0 11-10 0 5 5 0 0110 0z" />
                                    </svg>
                                </div>
                            </div>

                            <div style={{ backgroundColor: 'var(--background-muted)', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '1.5rem' }}>
                                <h3 style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Email Details:</h3>
                                <ul style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', listStyle: 'none', padding: 0 }}>
                                    <li style={{ marginBottom: '0.25rem' }}>✓ Sent to: Members with outstanding loans</li>
                                    <li style={{ marginBottom: '0.25rem' }}>✓ Method: Individual personalized emails</li>
                                    <li style={{ marginBottom: '0.25rem' }}>✓ Content: Standard & Dharura loan balances</li>
                                    <li style={{ marginBottom: '0.25rem' }}>✓ Frequency: One-time send</li>
                                </ul>
                            </div>

                            <button
                                onClick={handleLoanReminder}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    backgroundColor: '#DC2626',
                                    color: 'white',
                                    fontWeight: '600',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.5rem',
                                    border: 'none',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    opacity: loading ? 0.6 : 1,
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#B91C1C')}
                                onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#DC2626')}
                            >
                                {loading ? 'Sending...' : 'Send Loan Reminder'}
                            </button>
                        </div>

                        {/* Standard Loans Migration Card (Hidden - Automated Interest Disabled) */}
                        {/*
                        <div className="card" style={{ padding: '1.5rem', transition: 'box-shadow 0.2s', borderWidth: '2px', borderColor: '#8B5CF6' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Standard Loans Migration</h2>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                        Apply 10% interest to existing Standard loans (One-time operation)
                                    </p>
                                </div>
                                <div style={{ backgroundColor: '#F3E8FF', padding: '0.75rem', borderRadius: 'var(--radius)' }}>
                                    <svg style={{ width: '1.5rem', height: '1.5rem', color: '#8B5CF6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                                    </svg>
                                </div>
                            </div>

                            <div style={{ backgroundColor: 'var(--background-muted)', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '1.5rem' }}>
                                <h3 style={{ fontWeight: '600', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Migration Details:</h3>
                                <ul style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', listStyle: 'none', padding: 0 }}>
                                    <li style={{ marginBottom: '0.25rem' }}>✓ Updates: All Standard loans without interest</li>
                                    <li style={{ marginBottom: '0.25rem' }}>✓ Adds: 10% interest to loan amounts</li>
                                    <li style={{ marginBottom: '0.25rem' }}>✓ Stores: Both principal and total amount</li>
                                    <li style={{ marginBottom: '0.25rem' }}>✓ Safe: Can be run multiple times</li>
                                </ul>
                            </div>

                            <button
                                onClick={handleMigration}
                                disabled={loading}
                                style={{
                                    width: '100%',
                                    backgroundColor: '#8B5CF6',
                                    color: 'white',
                                    fontWeight: '600',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '0.5rem',
                                    border: 'none',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    opacity: loading ? 0.6 : 1,
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#7C3AED')}
                                onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#8B5CF6')}
                            >
                                {loading ? 'Migrating...' : 'Run Migration'}
                            </button>
                        </div>
                        */}
                    </div>

                    {/* Information Section */}
                    <div style={{
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: 'var(--radius)',
                        padding: '1.5rem',
                        marginTop: '2rem'
                    }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#3B82F6', marginBottom: '0.75rem' }}>📧 How Email Reminders Work</h3>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                            gap: '1.5rem',
                            fontSize: '0.875rem',
                            color: 'var(--text-secondary)'
                        }}>
                            <div>
                                <h4 style={{ fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Contribution Reminder</h4>
                                <ul style={{ listStyle: 'none', padding: 0, color: 'var(--text-secondary)' }}>
                                    <li>• Sends to all active members</li>
                                    <li>• Uses BCC for privacy (members can't see others)</li>
                                    <li>• Single batch email to all</li>
                                    <li>• Mentions both HISA and JAMII amounts</li>
                                </ul>
                            </div>
                            <div>
                                <h4 style={{ fontWeight: '600', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Loan Reminder</h4>
                                <ul style={{ listStyle: 'none', padding: 0, color: 'var(--text-secondary)' }}>
                                    <li>• Sends only to members with outstanding loans</li>
                                    <li>• Individual personalized emails</li>
                                    <li>• Includes current loan balance for each loan</li>
                                    <li>• Shows both Standard & Dharura loans if applicable</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
