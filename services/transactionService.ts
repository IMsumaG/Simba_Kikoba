import { addDoc, collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import type { DashboardTotals, GroupMonthlyReport, MemberStats, MonthlyReport, Transaction } from '../types';
import { activityLogger } from './activityLogger';
import { db } from './firebase';
import { memberService, UserProfile } from './memberService';

// Re-export types for backwards compatibility
export type { DashboardTotals, GroupMonthlyReport, MemberStats, MonthlyReport, Transaction };

export const transactionService = {
    // Add a new transaction
    async addTransaction(transaction: Omit<Transaction, 'id'>, currentUser?: UserProfile, groupCode?: string) {
        try {
            const docRef = await addDoc(collection(db, 'transactions'), transaction);
            
            // Log activity if user and groupCode are provided
            if (currentUser && groupCode) {
                try {
                    await activityLogger.logTransactionCreated(
                        currentUser.uid,
                        currentUser,
                        { ...transaction, id: docRef.id },
                        groupCode
                    );
                } catch (error) {
                    console.warn('Failed to log activity:', error);
                    // Don't fail the transaction if activity logging fails
                }
            }
            
            return docRef;
        } catch (error) {
            // Log failed activity if user and groupCode are provided
            if (currentUser && groupCode) {
                try {
                    await activityLogger.logFailedActivity(
                        'transaction_created',
                        currentUser.uid,
                        currentUser,
                        'transaction',
                        'pending',
                        error,
                        groupCode,
                        {
                            transactionAmount: transaction.amount,
                            transactionType: transaction.type,
                        }
                    );
                } catch (logError) {
                    console.warn('Failed to log activity error:', logError);
                }
            }
            throw error;
        }
    },

    // Get all transactions
    async getAllTransactions(): Promise<Transaction[]> {
        const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));
        const querySnapshot = await getDocs(q);
        const transactions: Transaction[] = [];
        querySnapshot.forEach((doc) => {
            transactions.push({ id: doc.id, ...doc.data() } as Transaction);
        });
        return transactions;
    },

    // Calculate Dashboard Totals
    async getDashboardTotals() {
        const transactions = await this.getAllTransactions();
        let totalContributions = 0;
        let totalLoans = 0;
        let activeLoansCount = 0;

        transactions.forEach(t => {
            if (t.type === 'Contribution') {
                totalContributions += t.amount;
            } else if (t.type === 'Loan') {
                totalLoans += t.amount;
                activeLoansCount++;
            } else if (t.type === 'Loan Repayment') {
                totalLoans -= t.amount;
            }
        });

        return {
            vaultBalance: totalContributions - totalLoans, // Total in vault is all contributions minus what is currently lent out
            loanPool: totalLoans, // This is the total outstanding debt
            activeLoans: activeLoansCount,
            totalMembers: 0
        };
    },

    // Get stats for a specific member
    async getMemberStats(memberId: string) {
        const q = query(collection(db, 'transactions'), where('memberId', '==', memberId));
        const querySnapshot = await getDocs(q);

        let totalContributions = 0;
        let totalLoans = 0;
        let totalRepayments = 0;

        querySnapshot.forEach((doc) => {
            const data = doc.data() as Transaction;
            if (data.type === 'Contribution') {
                totalContributions += data.amount;
            } else if (data.type === 'Loan') {
                totalLoans += data.amount;
            } else if (data.type === 'Loan Repayment') {
                totalRepayments += data.amount;
            }
        });

        return {
            totalContributions,
            currentLoan: totalLoans - totalRepayments,
            totalLoans
        };
    },

    async getMemberTransactions(memberId: string, limitCount: number = 5): Promise<Transaction[]> {
        const q = query(
            collection(db, 'transactions'),
            where('memberId', '==', memberId)
        );
        const querySnapshot = await getDocs(q);
        const transactions: Transaction[] = [];
        querySnapshot.forEach((doc) => {
            transactions.push({ id: doc.id, ...doc.data() } as Transaction);
        });

        // Sort by date descending in memory
        return transactions
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, limitCount);
    },

    // Get loan balance by category for a member
    async getLoanBalanceByCategory(memberId: string) {
        const q = query(collection(db, 'transactions'), where('memberId', '==', memberId));
        const querySnapshot = await getDocs(q);

        const loansByCategory: { [key in 'Hisa' | 'Jamii' | 'Standard' | 'Dharura']: number } = {
            Hisa: 0,
            Jamii: 0,
            Standard: 0,
            Dharura: 0
        };

        const repaymentsByCategory: { [key in 'Hisa' | 'Jamii' | 'Standard' | 'Dharura']: number } = {
            Hisa: 0,
            Jamii: 0,
            Standard: 0,
            Dharura: 0
        };

        querySnapshot.forEach((doc) => {
            const data = doc.data() as Transaction;
            if (data.type === 'Loan' && data.category) {
                loansByCategory[data.category] += data.amount;
            } else if (data.type === 'Loan Repayment' && data.category) {
                repaymentsByCategory[data.category] += data.amount;
            }
        });

        // Calculate current loan balance per category
        const balanceByCategory: { [key in 'Hisa' | 'Jamii' | 'Standard' | 'Dharura']: number } = {
            Hisa: loansByCategory.Hisa - repaymentsByCategory.Hisa,
            Jamii: loansByCategory.Jamii - repaymentsByCategory.Jamii,
            Standard: loansByCategory.Standard - repaymentsByCategory.Standard,
            Dharura: loansByCategory.Dharura - repaymentsByCategory.Dharura
        };

        return balanceByCategory;
    },

    // Get contribution balance by category for a member
    async getContributionBalanceByCategory(memberId: string) {
        const q = query(collection(db, 'transactions'), where('memberId', '==', memberId));
        const querySnapshot = await getDocs(q);

        const contributionsByCategory: { [key in 'Hisa' | 'Jamii' | 'Standard' | 'Dharura']: number } = {
            Hisa: 0,
            Jamii: 0,
            Standard: 0,
            Dharura: 0
        };

        querySnapshot.forEach((doc) => {
            const data = doc.data() as Transaction;
            if (data.type === 'Contribution' && data.category) {
                contributionsByCategory[data.category] += data.amount;
            }
        });

        return contributionsByCategory;
    },

    // Get total contributions by category across all members
    async getTotalContributionsByCategory() {
        const q = query(collection(db, 'transactions'));
        const querySnapshot = await getDocs(q);

        const contributionsByCategory: { [key in 'Hisa' | 'Jamii' | 'Standard' | 'Dharura']: number } = {
            Hisa: 0,
            Jamii: 0,
            Standard: 0,
            Dharura: 0
        };

        querySnapshot.forEach((doc) => {
            const data = doc.data() as Transaction;
            if (data.type === 'Contribution' && data.category) {
                contributionsByCategory[data.category] += data.amount;
            }
        });

        return contributionsByCategory;
    },

    // Get total loans by category across all members
    async getTotalLoansByCategory() {
        const q = query(collection(db, 'transactions'));
        const querySnapshot = await getDocs(q);

        const loansByCategory: { [key in 'Hisa' | 'Jamii' | 'Standard' | 'Dharura']: number } = {
            Hisa: 0,
            Jamii: 0,
            Standard: 0,
            Dharura: 0
        };

        const repaymentsByCategory: { [key in 'Hisa' | 'Jamii' | 'Standard' | 'Dharura']: number } = {
            Hisa: 0,
            Jamii: 0,
            Standard: 0,
            Dharura: 0
        };

        querySnapshot.forEach((doc) => {
            const data = doc.data() as Transaction;
            if (data.type === 'Loan' && data.category) {
                loansByCategory[data.category] += data.amount;
            } else if (data.type === 'Loan Repayment' && data.category) {
                repaymentsByCategory[data.category] += data.amount;
            }
        });

        const balanceByCategory: { [key in 'Hisa' | 'Jamii' | 'Standard' | 'Dharura']: number } = {
            Hisa: loansByCategory.Hisa - repaymentsByCategory.Hisa,
            Jamii: loansByCategory.Jamii - repaymentsByCategory.Jamii,
            Standard: loansByCategory.Standard - repaymentsByCategory.Standard,
            Dharura: loansByCategory.Dharura - repaymentsByCategory.Dharura
        };

        return balanceByCategory;
    },

    // Generate monthly report for a member
    async getMemberMonthlyReport(memberId: string, month: number, year: number) {
        const q = query(collection(db, 'transactions'), where('memberId', '==', memberId));
        const querySnapshot = await getDocs(q);

        const transactions: Transaction[] = [];
        querySnapshot.forEach((doc) => {
            transactions.push({ id: doc.id, ...doc.data() } as Transaction);
        });

        // Helper function to check if transaction is in a specific month
        const isInMonth = (dateString: string, targetMonth: number, targetYear: number) => {
            const date = new Date(dateString);
            return date.getMonth() === targetMonth - 1 && date.getFullYear() === targetYear;
        };

        const isBeforeMonth = (dateString: string, targetMonth: number, targetYear: number) => {
            const date = new Date(dateString);
            const targetDate = new Date(targetYear, targetMonth - 1, 1);
            return date < targetDate;
        };

        // Calculate Hisa (Shares)
        let previousHisaBalance = 0;
        let currentMonthHisaContribution = 0;

        transactions.forEach(t => {
            if (t.type === 'Contribution' && t.category === 'Hisa') {
                if (isBeforeMonth(t.date, month, year)) {
                    previousHisaBalance += t.amount;
                } else if (isInMonth(t.date, month, year)) {
                    currentMonthHisaContribution += t.amount;
                }
            }
        });

        const totalHisa = previousHisaBalance + currentMonthHisaContribution;

        // Calculate Jamii
        let jamiiAmount = 0;
        transactions.forEach(t => {
            if (t.type === 'Contribution' && t.category === 'Jamii') {
                jamiiAmount += t.amount;
            }
        });

        // Calculate Standard Loan
        let totalStandardLoaned = 0;
        let previousStandardRepayments = 0;
        let currentMonthStandardRepayment = 0;

        transactions.forEach(t => {
            if (t.type === 'Loan' && t.category === 'Standard') {
                totalStandardLoaned += t.amount;
            } else if (t.type === 'Loan Repayment' && t.category === 'Standard') {
                if (isBeforeMonth(t.date, month, year)) {
                    previousStandardRepayments += t.amount;
                } else if (isInMonth(t.date, month, year)) {
                    currentMonthStandardRepayment += t.amount;
                }
            }
        });

        const standardLoanWithInterest = totalStandardLoaned * 1.1; // 10% interest
        const totalStandardRepayments = previousStandardRepayments + currentMonthStandardRepayment;
        const remainingStandardLoan = Math.max(0, standardLoanWithInterest - totalStandardRepayments);

        // Calculate Dharura Loan
        let totalDhauraLoaned = 0;
        let previousDhauraRepayments = 0;
        let currentMonthDhauraRepayment = 0;

        transactions.forEach(t => {
            if (t.type === 'Loan' && t.category === 'Dharura') {
                totalDhauraLoaned += t.amount;
            } else if (t.type === 'Loan Repayment' && t.category === 'Dharura') {
                if (isBeforeMonth(t.date, month, year)) {
                    previousDhauraRepayments += t.amount;
                } else if (isInMonth(t.date, month, year)) {
                    currentMonthDhauraRepayment += t.amount;
                }
            }
        });

        const totalDhauraRepayments = previousDhauraRepayments + currentMonthDhauraRepayment;
        const remainingDhauraLoan = Math.max(0, totalDhauraLoaned - totalDhauraRepayments);

        return {
            month,
            year,
            hisa: {
                previousBalance: previousHisaBalance,
                currentMonthContribution: currentMonthHisaContribution,
                totalHisa: totalHisa
            },
            jamii: jamiiAmount,
            standardLoan: {
                totalLoaned: totalStandardLoaned,
                totalWithInterest: standardLoanWithInterest,
                previousRepayments: previousStandardRepayments,
                currentMonthRepayment: currentMonthStandardRepayment,
                totalRepayments: totalStandardRepayments,
                remainingBalance: remainingStandardLoan
            },
            dharuraLoan: {
                totalLoaned: totalDhauraLoaned,
                previousRepayments: previousDhauraRepayments,
                currentMonthRepayment: currentMonthDhauraRepayment,
                totalRepayments: totalDhauraRepayments,
                remainingBalance: remainingDhauraLoan
            }
        };
    },

    // Generate group monthly report for all active members
    async getGroupMonthlyReport(month: number, year: number) {
        const allMembers = await memberService.getAllUsers();
        
        // Include all members and admins
        const groupData = await Promise.all(
            allMembers.map(async (member) => {
                const report = await this.getMemberMonthlyReport(member.uid, month, year);
                return {
                    memberId: member.uid,
                    memberName: member.displayName || 'Unknown',
                    memberEmail: member.email || '',
                    ...report
                };
            })
        );

        return {
            month,
            year,
            members: groupData,
            totalMembers: allMembers.length
        };
    },

    // Delete a transaction
    async deleteTransaction(transactionId: string) {
        const { deleteDoc, doc } = await import('firebase/firestore');
        return await deleteDoc(doc(db, 'transactions', transactionId));
    }
};
