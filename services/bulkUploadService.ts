import * as FileSystem from 'expo-file-system/legacy';
import { addDoc, collection, getDocs, query } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { BulkUploadProcessResult, BulkUploadRow, BulkUploadValidationResult, UserProfile } from '../types';
import { db } from './firebase';

/**
 * Service for handling bulk transaction uploads from Excel
 */
export const bulkUploadService = {
    /**
     * Parse Excel file and return rows
     */
    async parseExcelFile(fileUri: string): Promise<any[]> {
        try {
            console.log("Reading file from:", fileUri);
            const content = await FileSystem.readAsStringAsync(fileUri, {
                encoding: 'base64'
            });

            console.log("File read success, parsing content...");
            const workbook = XLSX.read(content, { type: 'base64' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });
            console.log(`Parsed ${jsonData.length} rows`);
            return jsonData;
        } catch (error) {
            console.error('Error parsing Excel file:', error);
            throw error;
        }
    },

    /**
     * Validate bulk data rows
     */
    async validateBulkData(rows: any[]): Promise<BulkUploadValidationResult> {
        const result: BulkUploadValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            validRows: [],
            invalidRows: [],
            duplicateRows: []
        };

        if (!rows || rows.length === 0) {
            result.isValid = false;
            result.errors.push("File is empty");
            return result;
        }

        // Check columns
        const requiredColumns = ['Date', 'Member ID', 'Full name', 'HISA Amount', 'Jamii Amount', 'Standard Repay', 'Dharura Repay'];
        const firstRow = rows[0];
        const missingColumns = requiredColumns.filter(col => !Object.keys(firstRow).some(k => k.trim() === col));

        if (missingColumns.length > 0) {
            result.isValid = false;
            result.errors.push(`Missing columns: ${missingColumns.join(', ')}`);
            return result;
        }

        // Cache existing users map for performance
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const memberIdMap = new Map<string, string>(); // MemberID -> UID
        const memberNameMap = new Map<string, string>(); // MemberID -> DisplayName

        usersSnapshot.forEach(doc => {
            const data = doc.data() as UserProfile;
            if (data.memberId) {
                memberIdMap.set(data.memberId.toUpperCase(), doc.id);
                memberNameMap.set(data.memberId.toUpperCase(), data.displayName);
            }
        });

        // 🚀 FETCH ALL TRANSACTIONS TO CALCULATE BALANCES FOR VALIDATION
        const transSnapshot = await getDocs(query(collection(db, 'transactions')));
        const memberBalances = new Map<string, { Standard: number, Dharura: number }>();

        transSnapshot.forEach(doc => {
            const t = doc.data();
            if (t.type === 'Loan' || t.type === 'Loan Repayment') {
                const uid = t.memberId;
                const cat = t.category as 'Standard' | 'Dharura';
                if (!memberBalances.has(uid)) {
                    memberBalances.set(uid, { Standard: 0, Dharura: 0 });
                }
                const balance = memberBalances.get(uid)!;
                if (t.type === 'Loan') {
                    balance[cat] += t.amount || 0;
                } else {
                    balance[cat] -= t.amount || 0;
                }
            }
        });

        // Process rows
        for (let i = 0; i < rows.length; i++) {
            const rawRow = rows[i];
            const rowNumber = i + 2;
            const rowErrors: string[] = [];

            // Extract values
            const dateStr = String(rawRow['Date'] || '').trim();
            const memberId = String(rawRow['Member ID'] || '').trim().toUpperCase();
            const fullName = String(rawRow['Full name'] || '').trim();
            const hisaAmount = Number(rawRow['HISA Amount'] || 0);
            const jamiiAmount = Number(rawRow['Jamii Amount'] || 0);
            const standardRepay = Number(rawRow['Standard Repay'] || 0);
            const dharuraRepay = Number(rawRow['Dharura Repay'] || 0);

            const uid = memberIdMap.get(memberId);

            // 1. Validate Member ID
            if (!memberId) {
                rowErrors.push("Missing Member ID");
            } else if (!uid) {
                rowErrors.push(`Member ID '${memberId}' not found in system`);
            }

            // 2. Validate Amounts
            if (isNaN(hisaAmount) || isNaN(jamiiAmount) || isNaN(standardRepay) || isNaN(dharuraRepay)) {
                rowErrors.push("Invalid amount format");
            }

            // 3. Validate Loan Balances for Repayments
            if (uid) {
                const balances = memberBalances.get(uid) || { Standard: 0, Dharura: 0 };
                if (standardRepay > 0 && balances.Standard <= 0) {
                    rowErrors.push(`Incorrect Repayment: No active Standard loan balance for ${memberId}`);
                }
                if (dharuraRepay > 0 && balances.Dharura <= 0) {
                    rowErrors.push(`Incorrect Repayment: No active Dharura loan balance for ${memberId}`);
                }
            }

            // 4. Validate Date
            if (!dateStr || new Date(dateStr).toString() === 'Invalid Date') {
                rowErrors.push(`Invalid date format: ${dateStr}`);
            }

            // If valid so far, create typed row
            if (rowErrors.length === 0) {
                if (hisaAmount <= 0 && jamiiAmount <= 0 && standardRepay <= 0 && dharuraRepay <= 0) {
                    rowErrors.push("No valid amount to process (all are 0)");
                } else {
                    const cleanRow: BulkUploadRow = {
                        date: dateStr,
                        memberId: memberId,
                        fullName: memberNameMap.get(memberId) || fullName,
                        hisaAmount,
                        jamiiAmount,
                        standardRepayAmount: standardRepay,
                        dharuraRepayAmount: dharuraRepay
                    };

                    // Check for duplicates
                    const isDuplicate = result.validRows.some(r =>
                        r.memberId === cleanRow.memberId &&
                        r.date === cleanRow.date &&
                        r.hisaAmount === cleanRow.hisaAmount &&
                        r.jamiiAmount === cleanRow.jamiiAmount &&
                        r.standardRepayAmount === cleanRow.standardRepayAmount &&
                        r.dharuraRepayAmount === cleanRow.dharuraRepayAmount
                    );

                    if (isDuplicate) {
                        result.duplicateRows.push(cleanRow);
                        result.warnings.push(`Row ${rowNumber}: Duplicate entry for ${memberId} removed`);
                    } else {
                        result.validRows.push(cleanRow);
                    }
                }
            }

            if (rowErrors.length > 0) {
                result.invalidRows.push({
                    row: {
                        date: dateStr,
                        memberId,
                        fullName,
                        hisaAmount,
                        jamiiAmount,
                        standardRepayAmount: standardRepay,
                        dharuraRepayAmount: dharuraRepay
                    },
                    errors: rowErrors
                });
            }
        }

        if (result.validRows.length === 0) {
            result.isValid = false;
            result.errors.push("No valid rows found to process");
        }

        return result;
    },

    /**
     * Process validated rows into transactions
     */
    async processBulkTransactions(rows: BulkUploadRow[], createdBy: string): Promise<BulkUploadProcessResult> {
        const result: BulkUploadProcessResult = {
            success: true,
            totalRows: rows.length,
            successCount: 0,
            failedCount: 0,
            skippedCount: 0,
            details: []
        };

        const usersSnapshot = await getDocs(collection(db, 'users'));
        const memberIdMap = new Map<string, { uid: string, name: string }>();

        usersSnapshot.forEach(doc => {
            const data = doc.data() as UserProfile;
            if (data.memberId) {
                memberIdMap.set(data.memberId.toUpperCase(), { uid: doc.id, name: data.displayName });
            }
        });

        for (const row of rows) {
            try {
                const member = memberIdMap.get(row.memberId.toUpperCase());
                if (!member) {
                    result.failedCount++;
                    result.details.push({ row, status: 'failed', message: 'Member not found' });
                    continue;
                }

                const transactionDate = new Date(row.date).toISOString();

                // 1. Process HISA Contribution
                if (row.hisaAmount > 0) {
                    await addDoc(collection(db, "transactions"), {
                        memberId: member.uid,
                        memberName: member.name,
                        amount: row.hisaAmount,
                        type: 'Contribution',
                        category: 'Hisa',
                        date: transactionDate,
                        createdBy: createdBy,
                        status: 'Completed',
                        source: 'Bulk Upload',
                        reference: `BULK-${row.date}-${row.memberId}`
                    });
                }

                // 2. Process Jamii Contribution
                if (row.jamiiAmount > 0) {
                    await addDoc(collection(db, "transactions"), {
                        memberId: member.uid,
                        memberName: member.name,
                        amount: row.jamiiAmount,
                        type: 'Contribution',
                        category: 'Jamii',
                        date: transactionDate,
                        createdBy: createdBy,
                        status: 'Completed',
                        source: 'Bulk Upload',
                        reference: `BULK-${row.date}-${row.memberId}`
                    });
                }

                // 3. Process Standard Repayment
                if (row.standardRepayAmount && row.standardRepayAmount > 0) {
                    await addDoc(collection(db, "transactions"), {
                        memberId: member.uid,
                        memberName: member.name,
                        amount: row.standardRepayAmount,
                        type: 'Loan Repayment',
                        category: 'Standard',
                        date: transactionDate,
                        createdBy: createdBy,
                        status: 'Completed',
                        source: 'Bulk Upload',
                        reference: `BULK-${row.date}-${row.memberId}`
                    });
                }

                // 4. Process Dharura Repayment
                if (row.dharuraRepayAmount && row.dharuraRepayAmount > 0) {
                    await addDoc(collection(db, "transactions"), {
                        memberId: member.uid,
                        memberName: member.name,
                        amount: row.dharuraRepayAmount,
                        type: 'Loan Repayment',
                        category: 'Dharura',
                        date: transactionDate,
                        createdBy: createdBy,
                        status: 'Completed',
                        source: 'Bulk Upload',
                        reference: `BULK-${row.date}-${row.memberId}`
                    });
                }

                result.successCount++;
                result.details.push({ row, status: 'success' });

            } catch (error: any) {
                console.error(`Error processing row for ${row.memberId}:`, error);
                result.failedCount++;
                result.details.push({ row, status: 'failed', message: error.message });
            }
        }

        return result;
    },

    /**
     * Generate Excel template with all members
     */
    async generateTemplate(): Promise<any[]> {
        const usersQuery = query(collection(db, 'users'));
        const snapshot = await getDocs(usersQuery);

        const rows: any[] = [];
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        snapshot.forEach(doc => {
            const data = doc.data() as UserProfile;
            if (data.memberId) {
                rows.push({
                    'Date': today,
                    'Member ID': data.memberId,
                    'Full name': data.displayName,
                    'HISA Amount': '',
                    'Jamii Amount': '',
                    'Standard Repay': '',
                    'Dharura Repay': ''
                });
            }
        });

        rows.sort((a, b) => a['Member ID'].localeCompare(b['Member ID']));

        return rows;
    }
};
