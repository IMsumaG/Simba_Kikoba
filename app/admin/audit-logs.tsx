import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../services/AuthContext';
import { activityLogger } from '../../services/activityLogger';
import { memberService } from '../../services/memberService';
import { ActivityLog } from '../../types/ActivityLog';

/**
 * Audit Log Screen
 * 
 * Admin-only screen to view activity logs and audit trail.
 * Shows all user actions with timestamps and details.
 */
export default function AuditLogScreen() {
    const { user: currentUser, userProfile, role } = useAuth();
    const { colors, theme } = useTheme();
    const router = useRouter();
    const styles = createStyles(colors, theme);
    const isAdmin = role === 'Admin';
    const { t } = useTranslation();

    const [activities, setActivities] = useState<ActivityLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [search, setSearch] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);
    const [memberIdMap, setMemberIdMap] = useState<{ [key: string]: string }>({});

    // Filtering State
    const [statusFilter, setStatusFilter] = useState('All');
    const [typeFilter, setTypeFilter] = useState('All');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Picker State
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerTitle, setPickerTitle] = useState('');
    const [pickerOptions, setPickerOptions] = useState<{ label: string, value: any }[]>([]);
    const [onPickerSelect, setOnPickerSelect] = useState<(value: any) => void>(() => () => { });

    const fetchActivities = useCallback(async () => {
        if (!isAdmin) return;

        setLoading(true);
        try {
            // Fetching a large batch without groupCode filter to get all logs
            const data = await activityLogger.getActivityLogs({ groupCode: 'ALL', limit: 500 });
            setActivities(data);

            // Fetch member IDs from user collection for all affected members
            const memberIds = new Set<string>();
            data.forEach(activity => {
                if (activity.userId) memberIds.add(activity.userId);
            });

            const memberIdMapLocal: { [key: string]: string } = {};
            for (const memberId of Array.from(memberIds)) {
                try {
                    const profile = await memberService.getUserProfile(memberId);
                    if (profile?.memberId) {
                        memberIdMapLocal[memberId] = profile.memberId;
                    }
                } catch (error) {
                    console.warn(`Failed to fetch member ID for ${memberId}:`, error);
                }
            }
            setMemberIdMap(memberIdMapLocal);
        } catch (error) {
            console.error('Error fetching activities:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [isAdmin]);

    useEffect(() => {
        if (isAdmin && userProfile) {
            fetchActivities();
        }
    }, [isAdmin, userProfile, fetchActivities]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchActivities();
    };

    // Filter Logic
    const filteredActivities = activities.filter(activity => {
        const matchesSearch =
            activity.userName?.toLowerCase().includes(search.toLowerCase()) ||
            activity.activityType?.toLowerCase().includes(search.toLowerCase()) ||
            activity.description?.toLowerCase().includes(search.toLowerCase()) ||
            memberIdMap[activity.userId || '']?.toLowerCase().includes(search.toLowerCase());

        const matchesStatus = statusFilter === 'All' || activity.status === statusFilter;
        const matchesType = typeFilter === 'All' || activity.activityType === typeFilter;

        let matchesDate = true;
        const createdAtDate = activity.createdAt?.toDate ? activity.createdAt.toDate() : new Date(activity.createdAtISO || '');

        if (startDate) {
            matchesDate = matchesDate && createdAtDate >= new Date(startDate);
        }
        if (endDate) {
            // End of day logic
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            matchesDate = matchesDate && createdAtDate <= end;
        }

        return matchesSearch && matchesStatus && matchesType && matchesDate;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
    const paginatedActivities = filteredActivities.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const toggleExpand = (id: string) => {
        setExpandedActivityId(expandedActivityId === id ? null : id);
    };

    const formatDate = (activity: ActivityLog) => {
        const date = activity.createdAt?.toDate ? activity.createdAt.toDate() : new Date(activity.createdAtISO || '');
        return date.toLocaleString();
    };

    const openPicker = (title: string, options: { label: string, value: any }[], currentVal: any, onSelect: (val: any) => void) => {
        setPickerTitle(title);
        setPickerOptions(options);
        setOnPickerSelect(() => onSelect);
        setPickerVisible(true);
    };

    if (!isAdmin) {
        return (
            <SafeAreaView style={styles.container as ViewStyle}>
                <View style={styles.restrictedContainer as ViewStyle}>
                    <Ionicons name="lock-closed" size={64} color={colors.danger} />
                    <Text style={styles.restrictedText as TextStyle}>{t('common.accessDenied')}</Text>
                    <Text style={styles.restrictedSubtext as TextStyle}>You do not have permission to view this page.</Text>
                    <TouchableOpacity
                        style={[styles.pageBtn, { width: 'auto', paddingHorizontal: 24, marginTop: 16 }]}
                        onPress={() => router.back()}
                    >
                        <Text style={styles.pageNumText as TextStyle}>{t('common.back')}</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container as ViewStyle}>
            <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
            <Stack.Screen options={{ headerShown: false }} />

            <View style={styles.header as ViewStyle}>
                <View style={styles.headerTop as ViewStyle}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton as ViewStyle}>
                        <Ionicons name="arrow-back" size={22} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.title as TextStyle}>{t('auditLogs.title') || 'Audit Logs'}</Text>
                    <TouchableOpacity
                        style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
                        onPress={() => setShowFilters(!showFilters)}
                    >
                        <Ionicons name={showFilters ? "funnel" : "funnel-outline"} size={19} color={showFilters ? 'white' : colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <View style={styles.searchBarContainer as ViewStyle}>
                    <Ionicons name="search" size={19} color={colors.textSecondary} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput as TextStyle}
                        placeholder={t('auditLogs.searchPlaceholder') || 'Search users, actions, or IDs...'}
                        placeholderTextColor={colors.textSecondary}
                        value={search}
                        onChangeText={(val) => {
                            setSearch(val);
                            setCurrentPage(1);
                        }}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')}>
                            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Filters Panel */}
                {showFilters && (
                    <View style={styles.filtersPanel as ViewStyle}>
                        <View style={styles.filterRow as ViewStyle}>
                            <TouchableOpacity
                                style={styles.filterChip as ViewStyle}
                                onPress={() => openPicker('Filter Action Type', [
                                    { label: 'All Actions', value: 'All' },
                                    { label: 'Member Transaction', value: 'transaction_created' },
                                    { label: 'Member Status', value: 'member_status_changed' },
                                    { label: 'Member Added', value: 'member_added' },
                                    { label: 'Member Deleted', value: 'member_deleted' },
                                    { label: 'Login', value: 'user_login' },
                                    { label: 'Report Generated', value: 'report_generated' },
                                    { label: 'Loan Status', value: 'loan_approved' },
                                ], typeFilter, setTypeFilter)}
                            >
                                <Text style={styles.filterChipLabel as TextStyle}>Type: </Text>
                                <Text style={styles.filterChipValue as TextStyle} numberOfLines={1}>{typeFilter}</Text>
                                <Ionicons name="chevron-down" size={12} color={colors.primary} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.filterChip as ViewStyle}
                                onPress={() => openPicker('Filter Status', [
                                    { label: 'All Statuses', value: 'All' },
                                    { label: 'Success', value: 'success' },
                                    { label: 'Failed', value: 'failed' },
                                    { label: 'Pending', value: 'pending' },
                                ], statusFilter, setStatusFilter)}
                            >
                                <Text style={styles.filterChipLabel as TextStyle}>Status: </Text>
                                <Text style={styles.filterChipValue as TextStyle} numberOfLines={1}>{statusFilter.toUpperCase()}</Text>
                                <Ionicons name="chevron-down" size={12} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            <ScrollView
                style={styles.flex1 as ViewStyle}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
            >
                {loading && activities.length === 0 ? (
                    <View style={{ padding: 24, gap: 16 }}>
                        <SkeletonLoader height={80} count={5} borderRadius={16} />
                    </View>
                ) : paginatedActivities.length > 0 ? (
                    <View style={styles.listContainer as ViewStyle}>
                        {paginatedActivities.map((activity) => (
                            <TouchableOpacity
                                key={activity.id}
                                style={[styles.activityCard, expandedActivityId === activity.id && styles.activityCardExpanded]}
                                onPress={() => toggleExpand(activity.id!)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.activityMain as ViewStyle}>
                                    <View style={[
                                        styles.typeIndicator,
                                        {
                                            backgroundColor:
                                                activity.activityType?.includes('deleted') ? colors.danger :
                                                    activity.activityType?.includes('added') || activity.activityType?.includes('created') ? colors.success :
                                                        activity.activityType?.includes('updated') || activity.activityType?.includes('changed') ? colors.info : colors.primary
                                        }
                                    ]} />

                                    <View style={styles.activityContent as ViewStyle}>
                                        <View style={styles.activityHeader as ViewStyle}>
                                            <Text style={styles.userName as TextStyle} numberOfLines={1}>
                                                {activity.userName || 'System'}
                                            </Text>
                                            <View style={[
                                                styles.statusBadge,
                                                {
                                                    backgroundColor:
                                                        activity.status === 'success' ? colors.successBackground :
                                                            activity.status === 'failed' ? colors.dangerBackground :
                                                                colors.warningBackground
                                                }
                                            ]}>
                                                <Ionicons
                                                    name={activity.status === 'success' ? "checkmark-circle" : activity.status === 'failed' ? "close-circle" : "warning"}
                                                    size={16}
                                                    color={
                                                        activity.status === 'success' ? colors.success :
                                                            activity.status === 'failed' ? colors.danger :
                                                                colors.warning
                                                    }
                                                />
                                            </View>
                                        </View>

                                        <Text style={styles.actionText as TextStyle}>{activity.description}</Text>

                                        <View style={styles.activityMeta as ViewStyle}>
                                            <Text style={styles.memberIdText as TextStyle}>
                                                {memberIdMap[activity.userId || ''] || 'ID: ---'}
                                            </Text>
                                            <Text style={styles.dot as TextStyle}>•</Text>
                                            <Text style={styles.activityTimestamp as TextStyle}>{formatDate(activity)}</Text>
                                        </View>

                                        {/* Expanded Details */}
                                        {expandedActivityId === activity.id && (
                                            <View style={styles.expandedContent as ViewStyle}>
                                                <View style={styles.expandedDivider as ViewStyle} />

                                                <View style={styles.expandedSection as ViewStyle}>
                                                    <Text style={styles.expandedLabel as TextStyle}>Details</Text>
                                                    <Text style={styles.expandedValue as TextStyle}>{activity.description}</Text>
                                                </View>

                                                <View style={styles.expandedSection as ViewStyle}>
                                                    <Text style={styles.expandedLabel as TextStyle}>Metadata</Text>
                                                    <Text style={[styles.expandedValue as TextStyle, { fontSize: 11, color: colors.textSecondary }]}>
                                                        IP: {activity.metadata?.ipAddress || 'N/A'} {'\n'}
                                                        U-Agent: {activity.metadata?.userAgent || 'N/A'} {'\n'}
                                                        Type: {activity.activityType || 'N/A'}
                                                    </Text>
                                                </View>

                                                {activity.status === 'failed' && activity.failureReason && (
                                                    <View style={[styles.expandedSection, { backgroundColor: colors.dangerBackground, padding: 8, borderRadius: 8 }]}>
                                                        <Text style={[styles.expandedLabel, { color: colors.danger }]}>Error Message</Text>
                                                        <Text style={[styles.expandedValue, { color: colors.danger }]}>{activity.failureReason}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                    </View>

                                    <Ionicons
                                        name={expandedActivityId === activity.id ? "chevron-up" : "chevron-down"}
                                        size={20}
                                        color={colors.textSecondary}
                                        style={{ alignSelf: 'flex-start', marginTop: 4 }}
                                    />
                                </View>
                            </TouchableOpacity>
                        ))}

                        {/* Pagination Footer */}
                        <View style={styles.paginationContainer as ViewStyle}>
                            <View style={styles.pageInfo as ViewStyle}>
                                <Text style={styles.pageInfoText as TextStyle}>
                                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredActivities.length)} of {filteredActivities.length} logs
                                </Text>
                                <TouchableOpacity
                                    style={styles.limitPicker as ViewStyle}
                                    onPress={() => openPicker('Rows Per Page', [
                                        { label: '5 Rows', value: 5 },
                                        { label: '10 Rows', value: 10 },
                                        { label: '25 Rows', value: 25 },
                                        { label: '50 Rows', value: 50 },
                                    ], itemsPerPage, (val) => {
                                        setItemsPerPage(val);
                                        setCurrentPage(1);
                                    })}
                                >
                                    <Text style={styles.limitText as TextStyle}>{itemsPerPage} rows</Text>
                                    <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.pageBtns as ViewStyle}>
                                <TouchableOpacity
                                    style={[styles.pageBtn as ViewStyle, currentPage === 1 && styles.pageBtnDisabled]}
                                    onPress={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? colors.border : colors.text} />
                                </TouchableOpacity>

                                <View style={styles.pageNum as ViewStyle}>
                                    <Text style={styles.pageNumText as TextStyle}>Page {currentPage} of {Math.max(1, totalPages)}</Text>
                                </View>

                                <TouchableOpacity
                                    style={[styles.pageBtn as ViewStyle, currentPage === totalPages && styles.pageBtnDisabled]}
                                    onPress={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                >
                                    <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages || totalPages === 0 ? colors.border : colors.text} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={styles.emptyContainer as ViewStyle}>
                        <Ionicons name="document-text-outline" size={64} color={colors.border} />
                        <Text style={styles.emptyText as TextStyle}>No activities found matching filters</Text>
                    </View>
                )}
            </ScrollView>

            {/* Selection Modal (Picker) */}
            <Modal
                transparent
                visible={pickerVisible}
                animationType="fade"
                onRequestClose={() => setPickerVisible(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay as ViewStyle}
                    activeOpacity={1}
                    onPress={() => setPickerVisible(false)}
                >
                    <View style={{ flex: 1 }} />
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                        <View style={styles.modalContent as ViewStyle}>
                            <View style={styles.modalHeader as ViewStyle}>
                                <Text style={styles.modalTitle as TextStyle}>{pickerTitle}</Text>
                                <TouchableOpacity onPress={() => setPickerVisible(false)}>
                                    <Ionicons name="close" size={24} color={colors.text} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={{ maxHeight: 400 }}>
                                {pickerOptions.map((opt, i) => (
                                    <TouchableOpacity
                                        key={opt.label || i}
                                        style={styles.pickerItem as ViewStyle}
                                        onPress={() => {
                                            onPickerSelect(opt.value);
                                            setPickerVisible(false);
                                            setCurrentPage(1);
                                        }}
                                    >
                                        <Text style={styles.pickerItemText as TextStyle}>{opt.label}</Text>
                                        <Ionicons name="chevron-forward" size={16} color={colors.border} />
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </TouchableOpacity>
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
    header: {
        backgroundColor: colors.card,
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 12,
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.backgroundMuted,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    title: {
        fontSize: 19,
        fontWeight: '900',
        color: colors.text,
        letterSpacing: -0.5,
    },
    filterToggle: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: colors.backgroundMuted,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    filterToggleActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundMuted,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 44,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: colors.text,
    },
    filtersPanel: {
        paddingTop: 4,
    },
    filterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 6,
    },
    filterChipLabel: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    filterChipValue: {
        fontSize: 11,
        fontWeight: 'bold',
        color: colors.primary,
    },
    listContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    activityCard: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
        elevation: 2,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    activityCardExpanded: {
        borderColor: colors.primary,
        elevation: 4,
    },
    activityMain: {
        flexDirection: 'row',
        gap: 12,
    },
    typeIndicator: {
        width: 4,
        borderRadius: 2,
        height: '100%',
    },
    activityContent: {
        flex: 1,
    },
    activityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    userName: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
        flex: 1,
    },
    actionText: {
        fontSize: 13,
        color: colors.text,
        marginBottom: 8,
        fontWeight: '500',
    },
    activityMeta: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    memberIdText: {
        fontSize: 11,
        color: colors.primary,
        fontWeight: '700',
    },
    dot: {
        fontSize: 11,
        color: colors.border,
        marginHorizontal: 6,
    },
    activityTimestamp: {
        fontSize: 11,
        color: colors.textSecondary,
    },
    statusBadge: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    restrictedContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingTop: 100,
        gap: 16,
    },
    restrictedText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    restrictedSubtext: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    paginationContainer: {
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    pageInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    pageInfoText: {
        fontSize: 12,
        color: colors.textSecondary,
    },
    limitPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundMuted,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    limitText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: colors.textSecondary,
    },
    pageBtns: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    pageBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pageBtnDisabled: {
        backgroundColor: colors.backgroundMuted,
        borderColor: colors.border,
        opacity: 0.5,
    },
    pageNum: {
        paddingHorizontal: 12,
    },
    pageNumText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: colors.text,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: colors.text,
    },
    pickerItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    pickerItemText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    expandedContent: {
        paddingTop: 16,
        marginTop: 12,
    },
    expandedDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginBottom: 12,
    },
    expandedSection: {
        marginBottom: 12,
    },
    expandedLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    expandedValue: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
    },
    emptyContainer: {
        padding: 60,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    emptyText: {
        color: colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
    },
});
