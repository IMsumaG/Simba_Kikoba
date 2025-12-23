import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../services/AuthContext';
import { memberService, UserProfile } from '../../services/memberService';
import { transactionService } from '../../services/transactionService';

export default function TransactionsScreen() {
    const { t } = useTranslation();
    const { user: currentUser, role } = useAuth();
    const isAdmin = role === 'Admin';

    const [amount, setAmount] = useState('');
    const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
    const [type, setType] = useState<'Contribution' | 'Loan' | 'Loan Repayment'>('Contribution');
    const [loading, setLoading] = useState(false);
    const [memberLoanBalance, setMemberLoanBalance] = useState(0);

    // Member Selection State
    const [members, setMembers] = useState<UserProfile[]>([]);
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (isAdmin) {
            fetchMembers();
        }
    }, [isAdmin]);

    const fetchMembers = async () => {
        try {
            const data = await memberService.getAllUsers();
            setMembers(data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSave = async () => {
        if (!amount || isNaN(Number(amount))) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }

        if (isAdmin && !selectedMember) {
            Alert.alert('Error', 'Please select a member');
            return;
        }

        setLoading(true);
        try {
            await transactionService.addTransaction({
                type,
                amount: Number(amount),
                memberId: isAdmin ? selectedMember!.uid : currentUser!.uid,
                memberName: isAdmin ? selectedMember!.displayName : (currentUser?.displayName || 'Self'),
                date: new Date().toISOString(),
                createdBy: currentUser!.uid,
                status: 'Completed'
            });

            Alert.alert('Success', `${type} added successfully`);
            setAmount('');
            setSelectedMember(null);
        } catch (error) {
            console.error(error);
            Alert.alert('Error', `Failed to add ${type}`);
        } finally {
            setLoading(false);
        }
    };

    const filteredMembers = members.filter(m =>
        m.displayName?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <SafeAreaView style={styles.container as ViewStyle}>
            <StatusBar barStyle="dark-content" />
            <ScrollView
                style={styles.flex1 as ViewStyle}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent as ViewStyle}
            >
                <Text style={styles.title as TextStyle}>Initiate Transaction</Text>

                <View style={styles.form as ViewStyle}>
                    {/* Member Selection (Admin Only) */}
                    <View style={styles.inputGroup as ViewStyle}>
                        <Text style={styles.label as TextStyle}>
                            {t('transactions.member')}
                        </Text>
                        <TouchableOpacity
                            style={styles.selectMemberBtn as ViewStyle}
                            onPress={() => isAdmin ? setShowMemberModal(true) : null}
                            disabled={!isAdmin}
                        >
                            <View style={styles.iconContainer as ViewStyle}>
                                <Ionicons name="person-outline" size={20} color={Colors.primary} />
                            </View>
                            <Text style={styles.memberText as TextStyle}>
                                {isAdmin
                                    ? (selectedMember?.displayName || 'Select Member/Admin')
                                    : (currentUser?.displayName || 'Self')
                                }
                            </Text>
                            {isAdmin && <Ionicons name="chevron-down" size={20} color="#94A3B8" />}
                        </TouchableOpacity>
                    </View>

                    {/* Transaction Type */}
                    <View style={styles.inputGroup as ViewStyle}>
                        <Text style={styles.label as TextStyle}>
                            Transaction Type
                        </Text>
                        <View style={styles.typeGrid as ViewStyle}>
                            {(['Contribution', 'Loan', 'Loan Repayment'] as const).map((row) => {
                                const isRepay = row === 'Loan Repayment';
                                const isDisabled = isRepay && memberLoanBalance <= 0;

                                return (
                                    <TouchableOpacity
                                        key={row}
                                        onPress={() => !isDisabled && setType(row)}
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
                                            {isRepay ? 'Repay' : row}
                                        </Text>
                                        {isDisabled && (
                                            <Text style={{ fontSize: 8, color: '#94A3B8', marginTop: 2 }}>No Loan</Text>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
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
                                placeholderTextColor="#CBD5E1"
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={setAmount}
                            />
                        </View>
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
                                <Text style={styles.saveBtnText as TextStyle}>Submit Transaction</Text>
                                <Ionicons name="checkmark-circle" size={24} color="white" />
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Member Selection Modal */}
            <Modal visible={showMemberModal} animationType="slide">
                <SafeAreaView style={{ flex: 1 }}>
                    <View style={styles.modalHeader as ViewStyle}>
                        <TouchableOpacity onPress={() => setShowMemberModal(false)}>
                            <Ionicons name="close" size={28} color="#0F172A" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle as TextStyle}>Select Recipient</Text>
                        <View style={{ width: 28 }} />
                    </View>

                    <View style={styles.searchBar as ViewStyle}>
                        <Ionicons name="search" size={20} color="#94A3B8" />
                        <TextInput
                            placeholder="Search names..."
                            style={styles.modalSearchInput as TextStyle}
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>

                    <FlatList
                        data={filteredMembers}
                        keyExtractor={item => item.uid}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.memberListItem as ViewStyle}
                                onPress={async () => {
                                    setSelectedMember(item);
                                    setShowMemberModal(false);
                                    // Fetch their loan balance
                                    const stats = await transactionService.getMemberStats(item.uid);
                                    setMemberLoanBalance(stats.currentLoan);
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
                                    <Text style={styles.memberRole as TextStyle}>{item.role}</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                        ItemSeparatorComponent={() => <View style={styles.separator as ViewStyle} />}
                        contentContainerStyle={{ padding: 24 }}
                    />
                </SafeAreaView>
            </Modal>
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
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 40,
    },
    title: {
        color: '#0F172A',
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
        color: '#64748B',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 12,
        marginLeft: 4,
    },
    selectMemberBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: '#F8FAFC',
    },
    memberText: {
        flex: 1,
        color: '#0F172A',
        fontSize: 16,
        fontWeight: '600',
    },
    typeGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    typeCard: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 20,
        borderWidth: 1,
        alignItems: 'center',
    },
    typeCardActive: {
        backgroundColor: '#EA580C',
        borderColor: '#EA580C',
        elevation: 8,
        shadowColor: '#EA580C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    typeCardInactive: {
        backgroundColor: 'white',
        borderColor: '#E2E8F0',
    },
    typeText: {
        fontWeight: '900',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    typeTextActive: {
        color: 'white',
    },
    typeTextInactive: {
        color: '#94A3B8',
    },
    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    amountIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#EA580C',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    amountInput: {
        flex: 1,
        fontSize: 24,
        fontWeight: '900',
        color: '#0F172A',
    },
    saveBtn: {
        backgroundColor: '#EA580C',
        borderRadius: 24,
        paddingVertical: 24,
        marginTop: 24,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        elevation: 12,
        shadowColor: '#EA580C',
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
        borderBottomColor: '#F1F5F9',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '900',
        color: '#0F172A',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        margin: 24,
        padding: 16,
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        gap: 12,
    },
    modalSearchInput: {
        flex: 1,
        fontSize: 16,
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
        backgroundColor: '#FFE7D9',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    avatarTextMini: {
        color: '#EA580C',
        fontWeight: 'bold',
    },
    memberNameMain: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
    },
    memberRole: {
        fontSize: 12,
        color: '#94A3B8',
    },
    separator: {
        height: 1,
        backgroundColor: '#F8FAFC',
    }
});
