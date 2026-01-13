import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { Transaction, transactionService } from '../../services/transactionService';

export default function MemberDetailScreen() {
    const { t } = useTranslation();
    const { id, name } = useLocalSearchParams();
    const router = useRouter();
    const { colors, theme } = useTheme();
    const styles = createStyles(colors, theme);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalContributions: 0,
        currentLoan: 0,
        totalLoans: 0
    });
    const [contributionsByCategory, setContributionsByCategory] = useState<{ [key in 'Hisa' | 'Jamii' | 'Standard' | 'Dharura']: number }>({
        Hisa: 0,
        Jamii: 0,
        Standard: 0,
        Dharura: 0
    });
    const [loansByCategory, setLoansByCategory] = useState<{ [key in 'Hisa' | 'Jamii' | 'Standard' | 'Dharura']: number }>({
        Hisa: 0,
        Jamii: 0,
        Standard: 0,
        Dharura: 0
    });
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [memberIdDisplay, setMemberIdDisplay] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            fetchMemberData();
        }
    }, [id]);

    const fetchMemberData = async () => {
        try {
            setLoading(true);
            const memberId = Array.isArray(id) ? id[0] : id;
            const fetchedStats = await transactionService.getMemberStats(memberId);
            const fetchedTransactions = await transactionService.getMemberTransactions(memberId, 5);
            const fetchedContributions = await transactionService.getContributionBalanceByCategory(memberId);
            const fetchedLoans = await transactionService.getLoanBalanceByCategory(memberId);

            // Fetch user detail to get Member ID (SBK...)
            const { doc, getDoc } = await import('firebase/firestore');
            const { db } = await import('../../services/firebase');
            const userDoc = await getDoc(doc(db, 'users', memberId));
            if (userDoc.exists()) {
                setMemberIdDisplay(userDoc.data().memberId || null);
            }

            setStats(fetchedStats);
            setTransactions(fetchedTransactions);
            setContributionsByCategory(fetchedContributions);
            setLoansByCategory(fetchedLoans);
        } catch (error) {
            console.error('Error fetching member data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTransaction = async (transactionId: string) => {
        Alert.alert(
            t('members.deleteTransaction'),
            t('members.deleteTransactionConfirm'),
            [
                { text: t('common.cancel'), style: "cancel" },
                {
                    text: t('common.save'),
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await transactionService.deleteTransaction(transactionId);
                            fetchMemberData(); // Refresh stats and list
                            Alert.alert(t('common.success'), t('transactions.success'));
                        } catch (error) {
                            Alert.alert(t('common.error'), t('common.error'));
                        }
                    }
                }
            ]
        );
    };

    const TransactionItem = ({ id: transId, type, amount, date }: any) => {
        let sign = '';
        let color = '';
        if (type === 'Contribution') {
            sign = '+';
            color = colors.success;
        } else if (type === 'Loan') {
            sign = '-';
            color = colors.danger;
        } else {
            sign = '+';
            color = colors.warning;
        }

        const iconBg = type === 'Contribution' ? colors.successBackground : (type === 'Loan' ? colors.dangerBackground : colors.warningBackground);
        const iconColor = type === 'Contribution' ? colors.success : (type === 'Loan' ? colors.danger : colors.warning);

        return (
            <View style={styles.transactionItem as ViewStyle}>
                <View style={styles.transactionLeft as ViewStyle}>
                    <View
                        style={[styles.transactionIcon as ViewStyle, { backgroundColor: iconBg }]}
                    >
                        <Ionicons
                            name={type === 'Contribution' ? 'arrow-down-outline' : (type === 'Loan' ? 'arrow-up-outline' : 'refresh-outline')}
                            size={20}
                            color={iconColor}
                        />
                    </View>
                    <View style={styles.transactionTextContainer as ViewStyle}>
                        <Text style={styles.transactionType as TextStyle}>
                            {type === 'Contribution' ? t('transactions.contribution') : (type === 'Loan' ? t('transactions.loan') : t('transactions.repayment'))}
                        </Text>
                        <Text style={styles.transactionDate as TextStyle}>
                            {new Date(date).toLocaleDateString()}
                        </Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.transactionAmount as TextStyle, { color, marginRight: 12 }]}>
                        {sign} TSh {(amount || 0).toLocaleString()}
                    </Text>
                    <TouchableOpacity onPress={() => handleDeleteTransaction(transId)}>
                        <Ionicons name="trash-outline" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container as ViewStyle}>
            <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
            <View style={styles.header as ViewStyle}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton as ViewStyle}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle as TextStyle}>{t('members.memberProfile')}</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.centered as ViewStyle}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <ScrollView
                    style={styles.flex1 as ViewStyle}
                    contentContainerStyle={styles.scrollContent as ViewStyle}
                    showsVerticalScrollIndicator={false}
                >
                    {/* User Profile Header */}
                    <View style={styles.profileHeader as ViewStyle}>
                        <View style={styles.avatarLarge as ViewStyle}>
                            <Text style={styles.avatarTextLarge as TextStyle}>{String(name?.[0] || 'U')}</Text>
                        </View>
                        <Text style={styles.profileName as TextStyle}>{name || t('common.member')}</Text>

                        {/* Member ID Display */}
                        {memberIdDisplay ? (
                            <View style={styles.memberIdBadge}>
                                <Text style={styles.memberIdText}>ID: {memberIdDisplay}</Text>
                            </View>
                        ) : null}
                    </View>

                    {/* Financial Summary Cards */}
                    <View style={styles.summaryContainer as ViewStyle}>
                        <View style={styles.summaryCard as ViewStyle}>
                            <View style={[styles.summaryIcon as ViewStyle, { backgroundColor: colors.successBackground }]}>
                                <Ionicons name="wallet-outline" size={20} color={colors.success} />
                            </View>
                            <Text style={styles.summaryLabel as TextStyle}>{t('members.totalContribution')}</Text>
                            <Text style={styles.summaryValue as TextStyle}>TSh {stats.totalContributions.toLocaleString()}</Text>
                        </View>

                        <View style={styles.summaryCard as ViewStyle}>
                            <View style={[styles.summaryIcon as ViewStyle, { backgroundColor: colors.dangerBackground }]}>
                                <Ionicons name="cash-outline" size={20} color={colors.danger} />
                            </View>
                            <Text style={styles.summaryLabel as TextStyle}>{t('members.currentLoan')}</Text>
                            <Text style={styles.summaryValue as TextStyle}>TSh {stats.currentLoan.toLocaleString()}</Text>
                        </View>
                    </View>

                    {/* Contributions by Category */}
                    <View style={styles.section as ViewStyle}>
                        <Text style={styles.sectionTitle as TextStyle}>{t('members.contributionsByCategory')}</Text>
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                            <View style={[styles.categoryCard as ViewStyle, { flex: 1, borderLeftColor: colors.success, borderLeftWidth: 4 }]}>
                                <Text style={styles.categoryLabel as TextStyle}>{t('dashboard.hisa')} ({t('reports.memberAccount')})</Text>
                                <Text style={styles.categoryValue as TextStyle}>TSh {contributionsByCategory.Hisa.toLocaleString()}</Text>
                            </View>
                            <View style={[styles.categoryCard as ViewStyle, { flex: 1, borderLeftColor: colors.info, borderLeftWidth: 4 }]}>
                                <Text style={styles.categoryLabel as TextStyle}>{t('dashboard.jamii')}</Text>
                                <Text style={styles.categoryValue as TextStyle}>TSh {contributionsByCategory.Jamii.toLocaleString()}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Loans by Category */}
                    <View style={styles.section as ViewStyle}>
                        <Text style={styles.sectionTitle as TextStyle}>{t('members.loansByCategory')}</Text>
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                            <View style={[styles.categoryCard as ViewStyle, { flex: 1, borderLeftColor: colors.danger, borderLeftWidth: 4 }]}>
                                <Text style={styles.categoryLabel as TextStyle}>{t('dashboard.standard')}</Text>
                                <Text style={styles.categoryValue as TextStyle}>TSh {loansByCategory.Standard.toLocaleString()}</Text>
                            </View>
                            <View style={[styles.categoryCard as ViewStyle, { flex: 1, borderLeftColor: colors.warning, borderLeftWidth: 4 }]}>
                                <Text style={styles.categoryLabel as TextStyle}>{t('dashboard.dharura')}</Text>
                                <Text style={styles.categoryValue as TextStyle}>TSh {loansByCategory.Dharura.toLocaleString()}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Recent Transactions */}
                    <View style={styles.section as ViewStyle}>
                        <Text style={styles.sectionTitle as TextStyle}>{t('members.last5Transactions')}</Text>
                        {transactions.length > 0 ? (
                            transactions.map((item, index) => (
                                <TransactionItem
                                    key={item.id || index}
                                    id={item.id}
                                    type={item.type}
                                    amount={item.amount}
                                    date={item.date}
                                />
                            ))
                        ) : (
                            <View style={styles.emptyBox as ViewStyle}>
                                <Text style={styles.emptyText as TextStyle}>{t('members.noMembers')}</Text>
                            </View>
                        )}
                    </View>
                </ScrollView>
            )}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    profileHeader: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    avatarLarge: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.primaryBackground,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 4,
        borderColor: colors.primaryBorder,
    },
    avatarTextLarge: {
        color: colors.primary,
        fontSize: 40,
        fontWeight: '900',
    },
    profileName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
    },
    memberIdBadge: {
        backgroundColor: colors.infoBackground,
        paddingHorizontal: 16,
        paddingVertical: 4,
        borderRadius: 99,
        marginTop: 8,
        borderWidth: 1,
        borderColor: colors.infoBorder,
    },
    memberIdText: {
        color: colors.info,
        fontWeight: '900',
        fontSize: 12,
        letterSpacing: 1.5,
    },
    summaryContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 16,
        marginBottom: 32,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    summaryIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    summaryLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '600',
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.text,
    },
    section: {
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 16,
    },
    transactionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    transactionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    transactionIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    transactionTextContainer: {
        justifyContent: 'center',
    },
    transactionType: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.text,
    },
    transactionDate: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    transactionAmount: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    emptyBox: {
        padding: 40,
        alignItems: 'center',
        backgroundColor: colors.backgroundMuted,
        borderRadius: 20,
    },
    emptyText: {
        color: colors.textSecondary,
    },
    categoryCard: {
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    categoryLabel: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '600',
        marginBottom: 8,
    },
    categoryValue: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
});
