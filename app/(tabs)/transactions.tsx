import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as XLSX from 'xlsx';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../services/AuthContext';
import { bulkUploadService } from '../../services/bulkUploadService';
import { memberService, UserProfile } from '../../services/memberService';
import { transactionService } from '../../services/transactionService';
import { BulkUploadValidationResult } from '../../types';

export default function TransactionsScreen() {
    const { t } = useTranslation();
    const { colors, theme } = useTheme();
    const styles = createStyles(colors, theme);
    const { user: currentUser, role, userProfile } = useAuth();
    const isAdmin = role === 'Admin';

    const [amount, setAmount] = useState('');
    const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
    const [type, setType] = useState<'Contribution' | 'Loan' | 'Loan Repayment'>('Contribution');
    const [category, setCategory] = useState<'Hisa' | 'Jamii' | 'Standard' | 'Dharura'>('Hisa');
    const [loading, setLoading] = useState(false);
    const [memberLoanBalance, setMemberLoanBalance] = useState(0);
    const [loanBalanceByCategory, setLoanBalanceByCategory] = useState<{ [key in 'Hisa' | 'Jamii' | 'Standard' | 'Dharura']: number }>({
        Hisa: 0,
        Jamii: 0,
        Standard: 0,
        Dharura: 0
    });

    // Member Selection State
    const [members, setMembers] = useState<UserProfile[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [search, setSearch] = useState('');

    // Bulk Upload State
    const [showBulkPreview, setShowBulkPreview] = useState(false);
    const [bulkValidation, setBulkValidation] = useState<BulkUploadValidationResult | null>(null);
    const [bulkProcessing, setBulkProcessing] = useState(false);

    const handleBulkUpload = async () => {
        try {
            const res = await DocumentPicker.getDocumentAsync({
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                copyToCacheDirectory: true
            });

            if (res.canceled) return;

            setLoading(true);
            // parseExcelFile in service now handles file reading
            const rows = await bulkUploadService.parseExcelFile(res.assets[0].uri);
            const validation = await bulkUploadService.validateBulkData(rows);
            setBulkValidation(validation);
            setShowBulkPreview(true);

        } catch (err: any) {
            console.error(err);
            Alert.alert("Error", "Failed to process file: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            setLoading(true);
            // Generate template data using the service
            const rows = await bulkUploadService.generateTemplate();

            // Create workbook
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
            XLSX.utils.book_append_sheet(wb, ws, "Transactions"); // Changed sheet name to "Transactions"
            const b64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }); // Renamed wbout to b64

            const filename = `SBK_Batch_Template.xlsx`; // Changed filename
            const fileUri = `${FileSystem.documentDirectory}${filename}`; // Changed to documentDirectory

            await FileSystem.writeAsStringAsync(fileUri, b64, { // Used new variables
                encoding: 'base64'
            });

            // Share/Export
            await Sharing.shareAsync(fileUri, {
                mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                dialogTitle: 'Download Template'
            });

        } catch (error: any) {
            console.error(error);
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    const confirmBulkProcess = async () => {
        if (!bulkValidation || !bulkValidation.validRows.length) return;

        setBulkProcessing(true);
        try {
            const result = await bulkUploadService.processBulkTransactions(
                bulkValidation.validRows,
                currentUser!.uid,
                {
                    totalAffectedUsers: bulkValidation.totalAffectedUsers,
                    hisaAmount: bulkValidation.totals.hisaAmount,
                    jamiiAmount: bulkValidation.totals.jamiiAmount,
                    standardRepayAmount: bulkValidation.totals.standardRepayAmount,
                    dharuraRepayAmount: bulkValidation.totals.dharuraRepayAmount,
                    standardLoanAmount: bulkValidation.totals.standardLoanAmount,
                    dharuraLoanAmount: bulkValidation.totals.dharuraLoanAmount,
                }
            );

            setShowBulkPreview(false);

            Alert.alert(
                "Success",
                `Processed ${result.successCount} transactions successfully.` +
                (result.failedCount > 0 ? `\nFailed: ${result.failedCount}` : "") +
                (result.skippedCount > 0 ? `\nSkipped: ${result.skippedCount}` : "")
            );
        } catch (err: any) {
            Alert.alert("Date Processing Error", err.message);
        } finally {
            setBulkProcessing(false);
        }
    };

    const fetchMembers = useCallback(async () => {
        if (!currentUser) return;
        setMembersLoading(true);
        try {
            const data = await memberService.getAllUsers();
            setMembers(data);
        } catch (error) {
            console.error(error);
        } finally {
            setMembersLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        if (isAdmin) {
            fetchMembers();
        }
    }, [isAdmin, fetchMembers]);

    const handleSave = async () => {
        if (!amount || isNaN(Number(amount))) {
            Alert.alert(t('common.error'), t('common.error')); // Placeholder or generic error
            return;
        }

        if (isAdmin && !selectedMember) {
            Alert.alert(t('common.error'), t('transactions.selectMember'));
            return;
        }

        setLoading(true);
        try {
            const enteredAmount = Number(amount);
            let finalAmount = enteredAmount;
            let originalAmount = enteredAmount;

            // Calculate interest for Standard loans
            if (type === 'Loan' && category === 'Standard') {
                const calculation = transactionService.calculateLoanWithInterest(enteredAmount, category);
                finalAmount = calculation.totalAmount;
                originalAmount = calculation.originalAmount;
            }

            await transactionService.addTransaction({
                type,
                amount: finalAmount, // Total amount with interest for Standard loans
                originalAmount: type === 'Loan' ? originalAmount : null,
                memberId: isAdmin ? selectedMember!.uid : currentUser!.uid,
                memberName: isAdmin ? selectedMember!.displayName : (currentUser?.displayName || 'Self'),
                category: type === 'Contribution' ? category : (type === 'Loan' ? category : category),
                interestRate: 0, // Automated interest disabled
                date: new Date().toISOString(),
                createdBy: currentUser!.uid,
                status: 'Completed'
            }, userProfile!, userProfile?.groupCode || 'DEFAULT');

            Alert.alert(t('common.success'), t('transactions.success'));
            setAmount('');
            setSelectedMember(null);
        } catch (error) {
            console.error(error);
            Alert.alert(t('common.error'), t('transactions.error'));
        } finally {
            setLoading(false);
        }
    };

    const filteredMembers = members.filter(m =>
        m.displayName?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <SafeAreaView style={styles.container as ViewStyle}>
            <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.flex1 as ViewStyle}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                <ScrollView
                    style={styles.flex1 as ViewStyle}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent as ViewStyle}
                    keyboardShouldPersistTaps="handled"
                >
                    <Text style={styles.title as TextStyle}>{t('transactions.title')}</Text>

                    <View style={styles.form as ViewStyle}>
                        {/* Bulk Upload Button (Admin Only) */}
                        {isAdmin && (
                            <View style={{ marginBottom: 20 }}>
                                <TouchableOpacity style={styles.bulkUploadBtn as ViewStyle} onPress={handleBulkUpload}>
                                    <Ionicons name="document-text-outline" size={20} color="white" />
                                    <Text style={styles.bulkUploadText as TextStyle}>Bulk Upload (Excel)</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.bulkUploadBtn as ViewStyle,
                                        { marginTop: 10, backgroundColor: theme === 'dark' ? 'rgba(2, 132, 199, 0.1)' : '#E0F2FE', borderWidth: 1, borderColor: theme === 'dark' ? 'rgba(2, 132, 199, 0.3)' : '#BAE6FD' }
                                    ]}
                                    onPress={handleDownloadTemplate}
                                >
                                    <Ionicons name="download-outline" size={20} color="#0284C7" />
                                    <Text style={[styles.bulkUploadText as TextStyle, { color: '#0284C7' }]}>Download Template</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Member Selection (Admin Only) */}
                        <View style={styles.inputGroup as ViewStyle}>
                            <Text style={styles.label as TextStyle}>
                                {t('transactions.member')}
                            </Text>
                            <TouchableOpacity
                                onPress={() => setShowMemberModal(true)}
                                style={[styles.inputWrapper, { flex: 1 }]}
                            >
                                <Ionicons name="person-outline" size={20} color={colors.primary} />
                                <Text style={[styles.filterInput, !selectedMember ? { color: colors.textSecondary } : {}]}>
                                    {selectedMember?.displayName || 'Select Member'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Transaction Type */}
                        <View style={styles.inputGroup as ViewStyle}>
                            <Text style={styles.label as TextStyle}>
                                {t('transactions.type')}
                            </Text>
                            <View style={styles.typeGrid as ViewStyle}>
                                {(['Contribution', 'Loan', 'Loan Repayment'] as const).map((row) => {
                                    const isRepay = row === 'Loan Repayment';
                                    const isDisabled = isRepay && memberLoanBalance <= 0;

                                    return (
                                        <TouchableOpacity
                                            key={row}
                                            onPress={() => {
                                                if (!isDisabled) {
                                                    setType(row);
                                                    if (row === 'Contribution') setCategory('Hisa');
                                                    if (row === 'Loan') setCategory('Standard');
                                                }
                                            }}
                                            disabled={isDisabled}
                                            style={[
                                                styles.typeCard as ViewStyle,
                                                type === row ? (styles.typeCardActive as ViewStyle) : (styles.typeCardInactive as ViewStyle),
                                                isDisabled && { opacity: 0.3 }
                                            ]}
                                        >
                                            <Text style={[
                                                styles.typeText as TextStyle,
                                                type === row ? (styles.typeTextActive as TextStyle) : (styles.typeTextInactive as TextStyle)
                                            ]}>
                                                {isRepay ? t('transactions.repay') : (row === 'Contribution' ? t('transactions.contribution') : t('transactions.loan'))}
                                            </Text>
                                            {isDisabled && (
                                                <Text style={{ fontSize: 8, color: colors.textSecondary, marginTop: 2, textAlign: 'center' }}>{t('transactions.noLoan')}</Text>
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Sub-Category Selection */}
                            {type !== 'Loan Repayment' && (
                                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                                    {type === 'Contribution' ? (
                                        <>
                                            <TouchableOpacity
                                                onPress={() => setCategory('Hisa')}
                                                style={[styles.subTypeBtn, category === 'Hisa' ? styles.subTypeBtnActive : styles.subTypeBtnInactive]}
                                            >
                                                <Text style={[styles.subTypeText, category === 'Hisa' ? { color: 'white' } : { color: colors.textSecondary }, { textAlign: 'center' }]}>{t('dashboard.hisa')}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => setCategory('Jamii')}
                                                style={[styles.subTypeBtn, category === 'Jamii' ? styles.subTypeBtnActive : styles.subTypeBtnInactive]}
                                            >
                                                <Text style={[styles.subTypeText, category === 'Jamii' ? { color: 'white' } : { color: colors.textSecondary }, { textAlign: 'center' }]}>{t('dashboard.jamii')}</Text>
                                            </TouchableOpacity>
                                        </>
                                    ) : (
                                        <>
                                            <TouchableOpacity
                                                onPress={() => setCategory('Standard')}
                                                style={[styles.subTypeBtn, category === 'Standard' ? styles.subTypeBtnActiveRed : styles.subTypeBtnInactive]}
                                            >
                                                <Text style={[styles.subTypeText, category === 'Standard' ? { color: 'white' } : { color: colors.textSecondary }, { textAlign: 'center' }]}>{t('dashboard.standard')}</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={() => setCategory('Dharura')}
                                                style={[styles.subTypeBtn, category === 'Dharura' ? styles.subTypeBtnActiveRed : styles.subTypeBtnInactive]}
                                            >
                                                <Text style={[styles.subTypeText, category === 'Dharura' ? { color: 'white' } : { color: colors.textSecondary }, { textAlign: 'center' }]}>{t('dashboard.dharura')}</Text>
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </View>
                            )}

                            {/* Loan Repayment Category Selection */}
                            {type === 'Loan Repayment' && (
                                <View style={{ marginTop: 16 }}>
                                    <Text style={styles.label as TextStyle}>{t('transactions.repaymentCategory')}</Text>
                                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                                        {(['Standard', 'Dharura'] as const).map((cat) => {
                                            const hasBalance = loanBalanceByCategory[cat] > 0;
                                            return (
                                                <TouchableOpacity
                                                    key={cat}
                                                    onPress={() => {
                                                        if (hasBalance) {
                                                            setCategory(cat);
                                                        }
                                                    }}
                                                    disabled={!hasBalance}
                                                    style={[
                                                        styles.subTypeBtn,
                                                        hasBalance ? (category === cat ? styles.subTypeBtnActiveRed : styles.subTypeBtnInactive) : styles.subTypeBtnDisabled,
                                                        !hasBalance && { opacity: 0.4 }
                                                    ]}
                                                >
                                                    <View>
                                                        <Text style={[styles.subTypeText, category === cat && hasBalance ? { color: 'white' } : { color: colors.textSecondary }, { textAlign: 'center' }]}>
                                                            {cat === 'Standard' ? t('dashboard.standard') : t('dashboard.dharura')}
                                                        </Text>
                                                        <Text style={{ fontSize: 12, color: hasBalance ? colors.success : colors.danger, marginTop: 4, textAlign: 'center' }}>
                                                            {t('transactions.balance')}: {loanBalanceByCategory[cat].toFixed(2)}
                                                        </Text>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Amount */}
                        <View style={styles.inputGroup as ViewStyle}>
                            <Text style={styles.label as TextStyle}>
                                {t('transactions.amount')} (TSh)
                            </Text>
                            <View style={styles.amountInputContainer as ViewStyle}>
                                <View style={styles.amountIconContainer as ViewStyle}>
                                    <Ionicons name="cash-outline" size={20} color="white" />
                                </View>
                                <TextInput
                                    style={styles.amountInput as TextStyle}
                                    placeholder="0.00"
                                    placeholderTextColor={colors.textSecondary}
                                    keyboardType="numeric"
                                    value={amount}
                                    onChangeText={setAmount}
                                />
                            </View>

                            {/* Interest Preview for Standard Loans (Re-enabled) */}
                            {type === 'Loan' && category === 'Standard' && amount && !isNaN(Number(amount)) && Number(amount) > 0 && (
                                <View style={styles.interestPreview as ViewStyle}>
                                    <View style={styles.interestRow}>
                                        <Text style={styles.interestLabel}>Principal:</Text>
                                        <Text style={styles.interestValue}>
                                            {Number(amount).toLocaleString()} TZS
                                        </Text>
                                    </View>
                                    <View style={styles.interestRow}>
                                        <Text style={styles.interestLabel}>Interest (10%):</Text>
                                        <Text style={styles.interestValue}>
                                            {(Number(amount) * 0.1).toLocaleString()} TZS
                                        </Text>
                                    </View>
                                    <View style={{ height: 1, backgroundColor: colors.warningBorder, marginVertical: 8 }} />
                                    <View style={styles.interestRow}>
                                        <Text style={[styles.interestLabel, { fontWeight: '700', color: colors.primary, fontSize: 14 }]}>Total:</Text>
                                        <Text style={[styles.interestValue, { fontWeight: '700', color: colors.primary, fontSize: 16 }]}>
                                            {(Number(amount) * 1.1).toLocaleString()} TZS
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        <TouchableOpacity
                            style={styles.saveBtn as ViewStyle}
                            onPress={handleSave}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Text style={styles.saveBtnText as TextStyle}>{t('transactions.submit')}</Text>
                                    <Ionicons name="checkmark-circle" size={24} color="white" />
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Member Selection Modal */}
            <Modal visible={showMemberModal} animationType="slide">
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
                    <View style={styles.modalHeader as ViewStyle}>
                        <TouchableOpacity onPress={() => setShowMemberModal(false)}>
                            <Ionicons name="close" size={28} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle as TextStyle}>{t('transactions.selectRecipient')}</Text>
                        <View style={{ width: 28 }} />
                    </View>

                    <View style={styles.searchBar as ViewStyle}>
                        <Ionicons name="search" size={20} color={colors.textSecondary} />
                        <TextInput
                            placeholder={t('transactions.searchNames')}
                            placeholderTextColor={colors.textSecondary}
                            style={styles.modalSearchInput as TextStyle}
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>

                    {membersLoading ? (
                        <View style={{ padding: 24, gap: 12 }}>
                            <SkeletonLoader height={56} count={5} marginVertical={8} borderRadius={16} />
                        </View>
                    ) : (
                        <FlatList
                            data={filteredMembers}
                            keyExtractor={item => item.uid}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.memberListItem as ViewStyle}
                                    onPress={async () => {
                                        setSelectedMember(item);
                                        setShowMemberModal(false);
                                        // Fetch their loan balance and balance by category
                                        const stats = await transactionService.getMemberStats(item.uid);
                                        const balanceByCategory = await transactionService.getLoanBalanceByCategory(item.uid);
                                        setMemberLoanBalance(stats.currentLoan);
                                        setLoanBalanceByCategory(balanceByCategory);
                                        if (stats.currentLoan <= 0 && type === 'Loan Repayment') {
                                            setType('Contribution'); // Reset if they don't have a loan
                                        }
                                    }}
                                >
                                    <View style={styles.avatarMini as ViewStyle}>
                                        <Text style={styles.avatarTextMini as TextStyle}>{item.displayName?.[0]}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.memberNameMain as TextStyle}>{item.displayName}</Text>
                                        <Text style={styles.memberRole as TextStyle}>{item.role === 'Admin' ? t('common.admin') : t('common.member')}</Text>
                                    </View>
                                </TouchableOpacity>
                            )}
                            ItemSeparatorComponent={() => <View style={styles.separator as ViewStyle} />}
                            contentContainerStyle={{ padding: 24 }}
                        />
                    )}
                </SafeAreaView>
            </Modal>

            {/* Bulk Upload Preview Modal */}
            <Modal visible={showBulkPreview} animationType="slide" transparent>
                <View style={styles.previewModalContainer as ViewStyle}>
                    <View style={styles.previewModalContent as ViewStyle}>
                        <View style={styles.previewHeader as ViewStyle}>
                            <Text style={styles.previewTitle as TextStyle}>Bulk Import Preview</Text>
                            <TouchableOpacity onPress={() => setShowBulkPreview(false)}>
                                <Ionicons name="close" size={24} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView>
                            {/* Summary Stats */}
                            <View style={styles.previewSection as ViewStyle}>
                                <Text style={styles.sectionTitle as TextStyle}>Summary</Text>
                                <View style={styles.statRow as ViewStyle}>
                                    <Text style={styles.statLabel as TextStyle}>Valid Transactions:</Text>
                                    <Text style={[styles.statValue as TextStyle, { color: colors.success }]}>{bulkValidation?.validRows.length || 0}</Text>
                                </View>
                                <View style={styles.statRow as ViewStyle}>
                                    <Text style={styles.statLabel as TextStyle}>Users Affected:</Text>
                                    <Text style={[styles.statValue as TextStyle, { color: colors.info }]}>{bulkValidation?.totalAffectedUsers || 0}</Text>
                                </View>
                                <View style={styles.statRow as ViewStyle}>
                                    <Text style={styles.statLabel as TextStyle}>Duplicates (Skipped):</Text>
                                    <Text style={[styles.statValue as TextStyle, { color: colors.warning }]}>{bulkValidation?.duplicateRows.length || 0}</Text>
                                </View>
                                <View style={styles.statRow as ViewStyle}>
                                    <Text style={styles.statLabel as TextStyle}>Invalid Rows:</Text>
                                    <Text style={[styles.statValue as TextStyle, { color: colors.danger }]}>{bulkValidation?.invalidRows.length || 0}</Text>
                                </View>
                            </View>

                            {/* Transaction Totals */}
                            {bulkValidation?.validRows.length ? (
                                <View style={styles.previewSection as ViewStyle}>
                                    <Text style={styles.sectionTitle as TextStyle}>Transaction Breakdown</Text>
                                    <View style={styles.totalsGrid as ViewStyle}>
                                        {(bulkValidation?.totals.hisaAmount || 0) > 0 && (
                                            <View style={[styles.totalBox as ViewStyle, { backgroundColor: colors.successBackground, borderLeftColor: colors.success }]}>
                                                <Text style={styles.totalLabel as TextStyle}>Hisa (Shares)</Text>
                                                <Text style={[styles.totalAmount as TextStyle, { color: colors.success }]}>
                                                    TSH {(bulkValidation?.totals.hisaAmount || 0).toLocaleString()}
                                                </Text>
                                            </View>
                                        )}
                                        {(bulkValidation?.totals.jamiiAmount || 0) > 0 && (
                                            <View style={[styles.totalBox as ViewStyle, { backgroundColor: colors.successBackground, borderLeftColor: colors.success }]}>
                                                <Text style={styles.totalLabel as TextStyle}>Jamii</Text>
                                                <Text style={[styles.totalAmount as TextStyle, { color: colors.success }]}>
                                                    TSH {(bulkValidation?.totals.jamiiAmount || 0).toLocaleString()}
                                                </Text>
                                            </View>
                                        )}
                                        {(bulkValidation?.totals.standardLoanAmount || 0) > 0 && (
                                            <View style={[styles.totalBox as ViewStyle, { backgroundColor: colors.dangerBackground, borderLeftColor: colors.danger }]}>
                                                <Text style={styles.totalLabel as TextStyle}>Standard Loan</Text>
                                                <Text style={[styles.totalAmount as TextStyle, { color: colors.danger }]}>
                                                    TSH {(bulkValidation?.totals.standardLoanAmount || 0).toLocaleString()}
                                                </Text>
                                            </View>
                                        )}
                                        {(bulkValidation?.totals.dharuraLoanAmount || 0) > 0 && (
                                            <View style={[styles.totalBox as ViewStyle, { backgroundColor: colors.dangerBackground, borderLeftColor: colors.danger }]}>
                                                <Text style={styles.totalLabel as TextStyle}>Dharura Loan</Text>
                                                <Text style={[styles.totalAmount as TextStyle, { color: colors.danger }]}>
                                                    TSH {(bulkValidation?.totals.dharuraLoanAmount || 0).toLocaleString()}
                                                </Text>
                                            </View>
                                        )}
                                        {(bulkValidation?.totals.standardRepayAmount || 0) > 0 && (
                                            <View style={[styles.totalBox as ViewStyle, { backgroundColor: colors.warningBackground, borderLeftColor: colors.warning }]}>
                                                <Text style={styles.totalLabel as TextStyle}>Standard Repay</Text>
                                                <Text style={[styles.totalAmount as TextStyle, { color: colors.warning }]}>
                                                    TSH {(bulkValidation?.totals.standardRepayAmount || 0).toLocaleString()}
                                                </Text>
                                            </View>
                                        )}
                                        {(bulkValidation?.totals.dharuraRepayAmount || 0) > 0 && (
                                            <View style={[styles.totalBox as ViewStyle, { backgroundColor: colors.warningBackground, borderLeftColor: colors.warning }]}>
                                                <Text style={styles.totalLabel as TextStyle}>Dharura Repay</Text>
                                                <Text style={[styles.totalAmount as TextStyle, { color: colors.warning }]}>
                                                    TSH {(bulkValidation?.totals.dharuraRepayAmount || 0).toLocaleString()}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            ) : null}

                            {bulkValidation?.errors && bulkValidation.errors.length > 0 && (
                                <View style={styles.warningBox as ViewStyle}>
                                    <Text style={[styles.warningText as TextStyle, { fontWeight: 'bold' }]}>File Errors:</Text>
                                    {bulkValidation.errors.map((err: string, i: number) => (
                                        <Text key={i} style={styles.warningText as TextStyle}>• {err}</Text>
                                    ))}
                                </View>
                            )}

                            {bulkValidation?.warnings && bulkValidation.warnings.length > 0 && (
                                <View style={[styles.warningBox as ViewStyle, { backgroundColor: colors.warningBackground }]}>
                                    <Text style={[styles.warningText as TextStyle, { fontWeight: 'bold', color: colors.warning }]}>Warnings:</Text>
                                    {bulkValidation.warnings.map((warn: string, i: number) => (
                                        <Text key={i} style={[styles.warningText as TextStyle, { color: colors.warning }]}>• {warn}</Text>
                                    ))}
                                </View>
                            )}

                            <TouchableOpacity
                                style={[styles.processBtn as ViewStyle, (!bulkValidation?.isValid || bulkValidation?.validRows.length === 0) && { opacity: 0.5 }]}
                                onPress={confirmBulkProcess}
                                disabled={!bulkValidation?.isValid || bulkValidation?.validRows.length === 0 || bulkProcessing}
                            >
                                {bulkProcessing ? (
                                    <ActivityIndicator color="white" />
                                ) : (
                                    <Text style={styles.processBtnText as TextStyle}>Process Transactions</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const createStyles = (colors: any, theme: string) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    flex1: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 40,
    },
    title: {
        color: colors.text,
        fontSize: 30,
        fontWeight: '900',
        letterSpacing: -0.5,
        marginBottom: 32,
    },
    form: {
        gap: 32,
    },
    inputGroup: {
        marginBottom: 8,
    },
    label: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 12,
        marginLeft: 4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundMuted,
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterInput: {
        flex: 1,
        fontSize: 16,
        color: colors.text,
        marginLeft: 12,
    },
    typeGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    typeCard: {
        flex: 1,
        paddingVertical: 20,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeCardActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        elevation: 8,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    typeCardInactive: {
        backgroundColor: colors.card,
        borderColor: colors.border,
    },
    typeText: {
        fontWeight: '900',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
        textAlign: 'center',
    },
    typeTextActive: {
        color: 'white',
    },
    typeTextInactive: {
        color: colors.textSecondary,
    },
    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundMuted,
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    amountIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    amountInput: {
        flex: 1,
        fontSize: 24,
        fontWeight: '900',
        color: colors.text,
    },
    saveBtn: {
        backgroundColor: colors.primary,
        borderRadius: 24,
        paddingVertical: 24,
        marginTop: 24,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        elevation: 12,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
    },
    saveBtnText: {
        color: 'white',
        fontWeight: '900',
        fontSize: 18,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: colors.text,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 24,
        padding: 16,
        backgroundColor: colors.backgroundMuted,
        borderRadius: 16,
        gap: 12,
    },
    modalSearchInput: {
        flex: 1,
        fontSize: 16,
        color: colors.text,
    },
    memberListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    avatarMini: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primaryBackground,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    avatarTextMini: {
        color: colors.primary,
        fontWeight: 'bold',
    },
    memberNameMain: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    memberRole: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    separator: {
        height: 1,
        backgroundColor: colors.border,
    },
    subTypeBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    subTypeBtnActive: {
        backgroundColor: colors.success,
        borderColor: colors.success,
    },
    subTypeBtnActiveRed: {
        backgroundColor: colors.danger,
        borderColor: colors.danger,
    },
    subTypeBtnInactive: {
        backgroundColor: colors.card,
        borderColor: colors.border,
    },
    subTypeBtnDisabled: {
        backgroundColor: colors.backgroundMuted,
        borderColor: colors.backgroundMuted,
    },
    subTypeText: {
        fontWeight: 'bold',
        fontSize: 12,
    },
    interestPreview: {
        marginTop: 16,
        padding: 16,
        backgroundColor: colors.warningBackground,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.warningBorder,
    },
    interestRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    interestLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    interestValue: {
        fontSize: 12,
        color: colors.text,
        fontWeight: '600',
    },
    bulkUploadBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.success,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 8,
        marginBottom: 8,
        elevation: 2,
        shadowColor: colors.success,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    bulkUploadText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    previewModalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    previewModalContent: {
        backgroundColor: colors.card,
        borderRadius: 24,
        maxHeight: '80%',
        padding: 24,
    },
    previewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: 16,
    },
    previewTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: colors.text,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    statLabel: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    statValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text,
    },
    previewSection: {
        marginBottom: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    totalsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    totalBox: {
        flex: 1,
        minWidth: '48%',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 3,
    },
    totalLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 6,
    },
    totalAmount: {
        fontSize: 14,
        fontWeight: '700',
    },
    warningBox: {
        backgroundColor: colors.dangerBackground,
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        marginTop: 8
    },
    warningText: {
        color: colors.danger,
        fontSize: 12,
    },
    processBtn: {
        backgroundColor: colors.success,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 24,
    },
    processBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
    }
});
