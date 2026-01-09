import * as FileSystem from 'expo-file-system/legacy';
import { addDoc, collection, getDocs, query } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { BulkUploadProcessResult, BulkUploadRow, BulkUploadValidationResult, UserProfile } from '../types';
import { activityLogger } from './activityLogger';
import { db } from './firebase';
import { memberService } from './memberService';

/**
 * Helper to parse Excel dates (String or Serial)
 */
const parseBulkDate = (dateVal: any): Date | null => {
    if (!dateVal) return null;
    const dateStr = String(dateVal).trim();
    if (!dateStr) return null;

    // 1. Handle Excel Serial Number (e.g., "45664")
    if (!isNaN(Number(dateStr)) && !dateStr.includes('/')) {
        const serial = Number(dateStr);
        // Excel base date is 1899-12-30. JS base date is 1970-01-01.
        // Difference is 25569 days.
        const dObj = new Date((serial - 25569) * 86400 * 1000);
        if (dObj.toString() !== 'Invalid Date' && dObj.getFullYear() > 1900 && dObj.getFullYear() < 2100) {
            return dObj;
        }
    }

    // 2. Handle M/D/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const m = parseInt(parts[0], 10) - 1;
        const d = parseInt(parts[1], 10);
        const y = parseInt(parts[2], 10);
        // Ensure 4-digit year for consistency if user typed 2 digits
        const fullYear = y < 100 ? 2000 + y : y;
        const dObj = new Date(fullYear, m, d);
        if (dObj.getDate() === d && dObj.getMonth() === m) {
            return dObj;
        }
    }

    // 3. Last resort fallback
    const fallbackDate = new Date(dateStr);
    if (fallbackDate.toString() !== 'Invalid Date' && fallbackDate.getFullYear() > 1900 && fallbackDate.getFullYear() < 2100) {
        return fallbackDate;
    }

    return null;
};

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
        const requiredColumns = ['Date', 'Member ID', 'Full name', 'HISA Amount', 'Jamii Amount', 'Standard Repay', 'Dharura Repay', 'Standard Loan', 'Dharura Loan'];
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
            const standardLoan = Number(rawRow['Standard Loan'] || 0);
            const dharuraLoan = Number(rawRow['Dharura Loan'] || 0);

            const uid = memberIdMap.get(memberId);

            // 1. Validate Member ID
            if (!memberId) {
                rowErrors.push("Missing Member ID");
            } else if (!uid) {
                rowErrors.push(`Member ID '${memberId}' not found in system`);
            }

            // 2. Validate Amounts
            if (isNaN(hisaAmount) || isNaN(jamiiAmount) || isNaN(standardRepay) || isNaN(dharuraRepay) || isNaN(standardLoan) || isNaN(dharuraLoan)) {
                rowErrors.push("Invalid amount format");
            }

            // 3. Validate Loan Balances for Repayments (TRACK IN-BATCH FOR HISTORICAL DATA)
            if (uid) {
                const balances = memberBalances.get(uid) || { Standard: 0, Dharura: 0 };

                // Track current batch impact (if rows are ordered logically)
                // Note: For full historical reconstruction, we are more lenient
                if (standardRepay > 0 && (balances.Standard + standardLoan) <= 0) {
                    result.warnings.push(`Row ${rowNumber}: Repayment for ${memberId} with no detected loan balance. (Allowed for historical data)`);
                }
                if (dharuraRepay > 0 && (balances.Dharura + dharuraLoan) <= 0) {
                    result.warnings.push(`Row ${rowNumber}: Repayment for ${memberId} with no detected loan balance. (Allowed for historical data)`);
                }

                // Update simulated balances for next rows in same batch
                balances.Standard += (standardLoan - standardRepay);
                balances.Dharura += (dharuraLoan - dharuraRepay);
                memberBalances.set(uid, balances);
            }

            // 4. Validate Date (Expected M/D/YYYY)
            const parsedDate = parseBulkDate(dateStr);
            if (!parsedDate) {
                rowErrors.push(`Invalid date format: ${dateStr}. Please use M/D/YYYY (e.g., 1/8/2026)`);
            }

            // If valid so far, create typed row
            if (rowErrors.length === 0) {
                if (hisaAmount <= 0 && jamiiAmount <= 0 && standardRepay <= 0 && dharuraRepay <= 0 && standardLoan <= 0 && dharuraLoan <= 0) {
                    rowErrors.push("No valid amount to process (all are 0)");
                } else {
                    const cleanRow: BulkUploadRow = {
                        date: dateStr,
                        memberId: memberId,
                        fullName: memberNameMap.get(memberId) || fullName,
                        hisaAmount,
                        jamiiAmount,
                        standardRepayAmount: standardRepay,
                        dharuraRepayAmount: dharuraRepay,
                        standardLoanAmount: standardLoan,
                        dharuraLoanAmount: dharuraLoan
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
                        dharuraRepayAmount: dharuraRepay,
                        standardLoanAmount: standardLoan,
                        dharuraLoanAmount: dharuraLoan
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

                let transactionDate = new Date().toISOString();
                const parsedDate = parseBulkDate(row.date);
                if (parsedDate) {
                    transactionDate = parsedDate.toISOString();
                }

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

                // 5. Process Standard Loan
                if (row.standardLoanAmount && row.standardLoanAmount > 0) {
                    await addDoc(collection(db, "transactions"), {
                        memberId: member.uid,
                        memberName: member.name,
                        amount: row.standardLoanAmount,
                        type: 'Loan',
                        category: 'Standard',
                        date: transactionDate,
                        createdBy: createdBy,
                        status: 'Completed',
                        source: 'Bulk Upload',
                        reference: `BULK-${row.date}-${row.memberId}`
                    });
                }

                // 6. Process Dharura Loan
                if (row.dharuraLoanAmount && row.dharuraLoanAmount > 0) {
                    await addDoc(collection(db, "transactions"), {
                        memberId: member.uid,
                        memberName: member.name,
                        amount: row.dharuraLoanAmount,
                        type: 'Loan',
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

        // Log the activity
        try {
            const adminProfile = await memberService.getUserProfile(createdBy);
            if (adminProfile) {
                await activityLogger.logBulkUpload(
                    createdBy,
                    adminProfile,
                    result.successCount,
                    result.successCount > 0 ? 'success' : 'failed'
                );
            }
        } catch (logError) {
            console.warn("Failed to log bulk upload activity:", logError);
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
        const now = new Date();
        const today = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`; // M/D/YYYY

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
                    'Dharura Repay': '',
                    'Standard Loan': '',
                    'Dharura Loan': ''
                });
            }
        });

        rows.sort((a, b) => a['Member ID'].localeCompare(b['Member ID']));

        return rows;
    }
};
