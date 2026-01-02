import { collection, doc, getDoc, getDocs, increment, limit, query, updateDoc, where } from 'firebase/firestore';
import type { GroupCode } from '../types';
import { db } from './firebase';

// Re-export types for backwards compatibility
export type { GroupCode };

export const groupCodeService = {
    /**
     * Validates a group code against Firestore
     * @param code - The group code to validate (e.g., "SIMB2025")
     * @returns Object with validation result and code details
     */
    async validateGroupCode(code: string): Promise<{
        isValid: boolean;
        code?: GroupCode;
        error?: string;
    }> {
        try {
            if (!code || typeof code !== 'string') {
                return {
                    isValid: false,
                    error: 'Group code is required'
                };
            }

            // Trim and uppercase the code for case-insensitive matching
            const normalizedCode = code.trim().toUpperCase();
            console.log(`Validating group code: "${normalizedCode}"`);

            // 1. Try to get by document ID (preferred)
            const groupCodeRef = doc(db, 'groupCodes', normalizedCode);
            let groupCodeDoc = await getDoc(groupCodeRef);
            let groupCodeData: GroupCode | null = null;
            let actualDocRef = groupCodeRef;

            if (groupCodeDoc.exists()) {
                groupCodeData = groupCodeDoc.data() as GroupCode;
                console.log('Group code found by document ID');
            } else {
                // 2. Fallback: Query by 'code' field if ID doesn't match
                console.log('Not found by ID, trying field query...');
                const q = query(
                    collection(db, 'groupCodes'),
                    where('code', '==', normalizedCode),
                    limit(1)
                );
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    groupCodeDoc = querySnapshot.docs[0];
                    groupCodeData = groupCodeDoc.data() as GroupCode;
                    actualDocRef = groupCodeDoc.ref;
                    console.log('Group code found by field query');
                }
            }

            if (!groupCodeData) {
                console.log(`Group code "${normalizedCode}" not found in "groupCodes" collection`);
                return {
                    isValid: false,
                    error: 'Invalid group code. Please check and try again.'
                };
            }

            // Check if code is active
            if (groupCodeData.isActive === false) {
                return {
                    isValid: false,
                    error: 'This group code is no longer active.'
                };
            }

            // Check if code has expired
            if (groupCodeData.expiresAt) {
                const expiryDate = new Date(groupCodeData.expiresAt);
                if (new Date() > expiryDate) {
                    return {
                        isValid: false,
                        error: 'This group code has expired.'
                    };
                }
            }

            // Check if code has reached max redemptions
            if (
                groupCodeData.maxRedemptions &&
                groupCodeData.redeemedCount !== undefined &&
                groupCodeData.redeemedCount >= groupCodeData.maxRedemptions
            ) {
                return {
                    isValid: false,
                    error: 'This group code has reached its maximum redemptions.'
                };
            }

            // Code is valid
            return {
                isValid: true,
                code: {
                    ...groupCodeData,
                    code: normalizedCode // Ensure the code ID is preserved
                }
            };
        } catch (error) {
            console.error('Error validating group code:', error);
            const err = error as any;
            if (err.code === 'permission-denied') {
                return {
                    isValid: false,
                    error: 'Permission denied. Please ensure Firestore rules are updated.'
                };
            }
            return {
                isValid: false,
                error: 'Error validating group code. Please try again.'
            };
        }
    },

    /**
     * Increments the redemption count for a group code
     * @param code - The group code to increment
     */
    async incrementRedemptionCount(code: string): Promise<void> {
        try {
            const normalizedCode = code.trim().toUpperCase();

            // Re-find the document to get the correct reference (could be by ID or by field)
            const groupCodeRef = doc(db, 'groupCodes', normalizedCode);
            const groupCodeDoc = await getDoc(groupCodeRef);

            let targetRef = groupCodeRef;

            if (!groupCodeDoc.exists()) {
                const q = query(
                    collection(db, 'groupCodes'),
                    where('code', '==', normalizedCode),
                    limit(1)
                );
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    targetRef = querySnapshot.docs[0].ref;
                } else {
                    console.warn(`Could not find group code ${normalizedCode} to increment count`);
                    return;
                }
            }

            // Update the redemption count in Firestore using atomic increment
            await updateDoc(targetRef, {
                redeemedCount: increment(1)
            });

            console.log(`Incremented redemption count for code ${normalizedCode}`);
        } catch (error) {
            console.error('Error incrementing redemption count:', error);
        }
    }
};
