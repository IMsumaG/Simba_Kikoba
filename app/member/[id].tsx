import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, ScrollView, StatusBar, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { Transaction, transactionService } from '../../services/transactionService';

export default function MemberDetailScreen() {
    const { t } = useTranslation();
    const { id, name } = useLocalSearchParams();
    const router = useRouter();
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

    const TransactionItem = ({ id: transId, type, amount, date }: any) => (
        <View style={styles.transactionItem as ViewStyle}>
            <View style={styles.transactionLeft as ViewStyle}>
                <View
                    style={[styles.transactionIcon as ViewStyle, { backgroundColor: type === 'Contribution' ? '#DCFCE7' : (type === 'Loan' ? '#FEE2E2' : '#FEF3C7') }]}
                >
                    <Ionicons
                        name={type === 'Contribution' ? 'arrow-down-outline' : (type === 'Loan' ? 'arrow-up-outline' : 'refresh-outline')}
                        size={20}
                        color={type === 'Contribution' ? '#166534' : (type === 'Loan' ? '#991B1B' : '#92400E')}
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
                <Text style={[styles.transactionAmount as TextStyle, { color: type === 'Contribution' ? '#059669' : (type === 'Loan' ? '#DC2626' : '#D97706'), marginRight: 12 }]}>
                    {type === 'Contribution' ? '+' : '-'} TSh {(amount || 0).toLocaleString()}
                </Text>
                <TouchableOpacity onPress={() => handleDeleteTransaction(transId)}>
                    <Ionicons name="trash-outline" size={18} color="#94A3B8" />
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container as ViewStyle}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header as ViewStyle}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton as ViewStyle}>
                    <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle as TextStyle}>{t('members.memberProfile')}</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.centered as ViewStyle}>
                    <ActivityIndicator size="large" color={Colors.primary} />
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
                    </View>

                    {/* Financial Summary Cards */}
                    <View style={styles.summaryContainer as ViewStyle}>
                        <View style={styles.summaryCard as ViewStyle}>
                            <View style={[styles.summaryIcon as ViewStyle, { backgroundColor: '#DCFCE7' }]}>
                                <Ionicons name="wallet-outline" size={20} color="#166534" />
                            </View>
                            <Text style={styles.summaryLabel as TextStyle}>{t('members.totalContribution')}</Text>
                            <Text style={styles.summaryValue as TextStyle}>TSh {stats.totalContributions.toLocaleString()}</Text>
                        </View>

                        <View style={styles.summaryCard as ViewStyle}>
                            <View style={[styles.summaryIcon as ViewStyle, { backgroundColor: '#FEE2E2' }]}>
                                <Ionicons name="cash-outline" size={20} color="#991B1B" />
                            </View>
                            <Text style={styles.summaryLabel as TextStyle}>{t('members.currentLoan')}</Text>
                            <Text style={styles.summaryValue as TextStyle}>TSh {stats.currentLoan.toLocaleString()}</Text>
                        </View>
                    </View>

                    {/* Contributions by Category */}
                    <View style={styles.section as ViewStyle}>
                        <Text style={styles.sectionTitle as TextStyle}>{t('members.contributionsByCategory')}</Text>
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                            <View style={[styles.categoryCard as ViewStyle, { flex: 1 }]}>
                                <Text style={styles.categoryLabel as TextStyle}>{t('dashboard.hisa')} ({t('reports.memberAccount')})</Text>
                                <Text style={styles.categoryValue as TextStyle}>TSh {contributionsByCategory.Hisa.toLocaleString()}</Text>
                            </View>
                            <View style={[styles.categoryCard as ViewStyle, { flex: 1 }]}>
                                <Text style={styles.categoryLabel as TextStyle}>{t('dashboard.jamii')}</Text>
                                <Text style={styles.categoryValue as TextStyle}>TSh {contributionsByCategory.Jamii.toLocaleString()}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Loans by Category */}
                    <View style={styles.section as ViewStyle}>
                        <Text style={styles.sectionTitle as TextStyle}>{t('members.loansByCategory')}</Text>
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                            <View style={[styles.categoryCard as ViewStyle, { flex: 1, borderLeftColor: '#DC2626', borderLeftWidth: 4 }]}>
                                <Text style={styles.categoryLabel as TextStyle}>{t('dashboard.standard')}</Text>
                                <Text style={styles.categoryValue as TextStyle}>TSh {loansByCategory.Standard.toLocaleString()}</Text>
                            </View>
                            <View style={[styles.categoryCard as ViewStyle, { flex: 1, borderLeftColor: '#F59E0B', borderLeftWidth: 4 }]}>
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
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
        borderBottomColor: '#F1F5F9',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0F172A',
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
        backgroundColor: 'rgba(234, 88, 12, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 4,
        borderColor: '#FFF7ED',
    },
    avatarTextLarge: {
        color: '#EA580C',
        fontSize: 40,
        fontWeight: '900',
    },
    profileName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    profileId: {
        fontSize: 14,
        color: '#94A3B8',
        marginTop: 4,
    },
    summaryContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 16,
        marginBottom: 32,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
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
        color: '#64748B',
        fontWeight: '600',
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    section: {
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0F172A',
        marginBottom: 16,
    },
    transactionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
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
        color: '#0F172A',
    },
    transactionDate: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    transactionAmount: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    emptyBox: {
        padding: 40,
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
    },
    emptyText: {
        color: '#94A3B8',
    },
    categoryCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    categoryLabel: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
        marginBottom: 8,
    },
    categoryValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
    },
});
