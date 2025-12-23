import { addDoc, collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from './firebase';

export interface Transaction {
    id?: string;
    type: 'Contribution' | 'Loan' | 'Loan Repayment';
    amount: number;
    memberId: string;
    memberName: string;
    date: string;
    createdBy: string;
    status: 'Completed' | 'Pending';
}

export const transactionService = {
    // Add a new transaction
    async addTransaction(transaction: Omit<Transaction, 'id'>) {
        return await addDoc(collection(db, 'transactions'), transaction);
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

    // Delete a transaction
    async deleteTransaction(transactionId: string) {
        const { deleteDoc, doc } = await import('firebase/firestore');
        return await deleteDoc(doc(db, 'transactions', transactionId));
    }
};
