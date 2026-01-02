import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../services/AuthContext';
import { memberService, UserProfile } from '../../services/memberService';

export default function MembersScreen() {
    const t = useTranslation().t;
    const router = useRouter();
    const { role: currentUserRole, user } = useAuth();
    const isAdmin = currentUserRole === 'Admin';
    const [search, setSearch] = useState('');
    const [members, setMembers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedMember, setSelectedMember] = useState<UserProfile | null>(null);
    const [statusModalVisible, setStatusModalVisible] = useState(false);

    const fetchMembers = async () => {
        if (!user) return;
        try {
            const data = await memberService.getAllUsers();
            setMembers(data);
        } catch (error) {
            console.error('Error fetching members:', error);
            Alert.alert('Error', 'Failed to load members');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    const handleDeleteMember = (member: UserProfile) => {
        Alert.alert(
            t('members.deleteMember'),
            t('members.deleteConfirm', { name: member.displayName }),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.save'), // Or 'Futa' but let's use a generic 'Save' or similar if no 'Delete' in common
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await memberService.deleteMember(member.uid);
                            setMembers(prev => prev.filter(m => m.uid !== member.uid));
                            Alert.alert(t('common.success'), t('members.deleteSuccess'));
                        } catch (error) {
                            console.error(error);
                            Alert.alert(t('common.error'), t('common.error'));
                        }
                    }
                }
            ]
        );
    };

    const handleUpdateStatus = async (status: string) => {
        if (!selectedMember) return;
        try {
            await memberService.updateMemberStatus(selectedMember.uid, status);
            setMembers(prev => prev.map(m =>
                m.uid === selectedMember.uid ? { ...m, status: status as any } : m
            ));
            setStatusModalVisible(false);
            Alert.alert(t('common.success'), t('members.statusUpdated'));
        } catch (error) {
            console.error(error);
            Alert.alert(t('common.error'), t('common.error'));
        }
    };

    const filteredMembers = members.filter(m =>
        m.displayName?.toLowerCase().includes(search.toLowerCase()) ||
        m.email?.toLowerCase().includes(search.toLowerCase())
    );

    const renderMember = ({ item }: { item: UserProfile }) => (
        <TouchableOpacity
            style={styles.memberItem as ViewStyle}
            onPress={() => router.push({
                pathname: '/member/[id]',
                params: { id: item.uid, name: item.displayName || 'Member' }
            })}
        >
            <View style={styles.avatar as ViewStyle}>
                <Text style={styles.avatarText as TextStyle}>{item.displayName?.[0] || 'U'}</Text>
            </View>
            <View style={styles.memberInfo as ViewStyle}>
                <Text style={styles.memberName as TextStyle}>{item.displayName}</Text>
                <Text style={styles.memberEmail as TextStyle}>{item.email}</Text>
                <View style={[styles.statusBadge as ViewStyle, { backgroundColor: item.status === 'Inactive' ? '#FEE2E2' : '#DCFCE7' }]}>
                    <Text style={[styles.statusText as TextStyle, { color: item.status === 'Inactive' ? '#991B1B' : '#166534' }]}>
                        {item.status === 'Inactive' ? t('members.inactive') : t('members.active')}
                    </Text>
                </View>
            </View>

            {isAdmin && (
                <View style={styles.actionButtons as ViewStyle}>
                    <TouchableOpacity
                        onPress={() => {
                            setSelectedMember(item);
                            setStatusModalVisible(true);
                        }}
                        style={styles.actionIconBtn as ViewStyle}
                    >
                        <Ionicons name="create-outline" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => handleDeleteMember(item)}
                        style={[styles.actionIconBtn as ViewStyle, { marginLeft: 8 }]}
                    >
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container as ViewStyle}>
            <View style={styles.header as ViewStyle}>
                <Text style={styles.title as TextStyle}>{t('members.list')}</Text>

                <View style={styles.searchContainer as ViewStyle}>
                    <Ionicons name="search-outline" size={20} color="#94A3B8" />
                    <TextInput
                        style={styles.searchInput as TextStyle}
                        placeholder={t('members.search')}
                        placeholderTextColor="#94A3B8"
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
            </View>

            {loading ? (
                <View style={{ paddingHorizontal: 24, paddingTop: 24, gap: 12 }}>
                    <SkeletonLoader height={64} count={6} marginVertical={12} borderRadius={16} />
                </View>
            ) : (
                <FlatList
                    data={filteredMembers}
                    contentContainerStyle={styles.listContent as ViewStyle}
                    keyExtractor={item => item.uid}
                    renderItem={renderMember}
                    refreshing={refreshing}
                    onRefresh={() => {
                        setRefreshing(true);
                        fetchMembers();
                    }}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer as ViewStyle}>
                            <Text style={styles.emptyText as TextStyle}>{t('members.noMembers')}</Text>
                        </View>
                    }
                />
            )}

            {/* Status Selection Modal */}
            <Modal
                transparent
                visible={statusModalVisible}
                animationType="fade"
                onRequestClose={() => setStatusModalVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay as ViewStyle}
                    activeOpacity={1}
                    onPress={() => setStatusModalVisible(false)}
                >
                    <View style={styles.modalContent as ViewStyle}>
                        <Text style={styles.modalTitle as TextStyle}>{t('members.updateStatus')}</Text>
                        <Text style={styles.modalSubtitle as TextStyle}>{t('members.selectStatus', { name: selectedMember?.displayName })}</Text>

                        <TouchableOpacity style={styles.statusOption as ViewStyle} onPress={() => handleUpdateStatus('Active')}>
                            <Ionicons name="checkmark-circle-outline" size={24} color="#166534" />
                            <Text style={styles.statusOptionText as TextStyle}>{t('members.active')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.statusOption as ViewStyle} onPress={() => handleUpdateStatus('Inactive')}>
                            <Ionicons name="close-circle-outline" size={24} color="#991B1B" />
                            <Text style={styles.statusOptionText as TextStyle}>{t('members.inactive')}</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 16,
    },
    title: {
        color: '#0F172A',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: '#0F172A',
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(245, 124, 0, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    avatarText: {
        color: '#F57C00',
        fontWeight: 'bold',
        fontSize: 18,
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        color: '#0F172A',
        fontWeight: '600',
        fontSize: 16,
    },
    memberEmail: {
        color: '#94A3B8',
        fontSize: 12,
        marginTop: 2,
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        marginTop: 4,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    actionButtons: {
        flexDirection: 'row',
    },
    actionIconBtn: {
        padding: 8,
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    emptyContainer: {
        marginTop: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#94A3B8',
        fontSize: 16,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        gap: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 8,
    },
    statusOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        gap: 12,
    },
    statusOptionText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0F172A',
    }
});
