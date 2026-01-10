import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SkeletonLoader } from '../../components/SkeletonLoader';
import { Colors } from '../../constants/Colors';
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
    const isAdmin = role === 'Admin';

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

    const groupCode = userProfile?.groupCode || 'DEFAULT';

    useEffect(() => {
        if (isAdmin && userProfile) {
            fetchActivities();
        }
    }, [isAdmin, userProfile]);

    const fetchActivities = async () => {
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
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchActivities();
    };

    // Robust Filtering Logic
    const filteredActivities = activities.filter(activity => {
        const searchLower = search.toLowerCase();
        const matchesSearch = search === '' ||
            activity.description.toLowerCase().includes(searchLower) ||
            activity.userName.toLowerCase().includes(searchLower) ||
            activity.userId.toLowerCase().includes(searchLower);

        const matchesStatus = statusFilter === 'All' || 
            getStatusFromLog(activity).toLowerCase() === statusFilter.toLowerCase();
            
        const matchesType = typeFilter === 'All' || 
            activity.activityType === typeFilter;

        let matchesStartDate = true;
        let matchesEndDate = true;
        
        const activityDate = activity.createdAtISO ? new Date(activity.createdAtISO) : new Date();

        if (startDate) {
            const date = new Date(startDate);
            if (!isNaN(date.getTime())) {
                matchesStartDate = activityDate >= date;
            }
        }
        if (endDate) {
            const date = new Date(endDate);
            if (!isNaN(date.getTime())) {
                const end = new Date(date);
                end.setHours(23, 59, 59, 999);
                matchesEndDate = activityDate <= end;
            }
        }

        return matchesSearch && matchesStatus && matchesType && matchesStartDate && matchesEndDate;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredActivities.length / itemsPerPage);
    const paginatedActivities = filteredActivities.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, statusFilter, typeFilter, startDate, endDate, itemsPerPage]);

    const openPicker = (title: string, options: { label: string, value: any }[], onSelect: (value: any) => void) => {
        setPickerTitle(title);
        setPickerOptions(options);
        setOnPickerSelect(() => onSelect);
        setPickerVisible(true);
    };

    const getActivityIcon = (activityType: string): any => {
        switch (activityType) {
            case 'transaction_created':
                return 'add-circle-outline';
            case 'transaction_updated':
                return 'create-outline';
            case 'transaction_deleted':
                return 'trash-outline';
            case 'member_added':
                return 'person-add-outline';
            case 'member_deleted':
                return 'person-remove-outline';
            case 'member_status_changed':
                return 'person-outline';
            case 'user_login':
                return 'log-in-outline';
            case 'user_logout':
                return 'log-out-outline';
            case 'loan_approved':
                return 'checkmark-done-circle-outline';
            case 'loan_rejected':
                return 'close-circle-outline';
            case 'bulk_upload':
                return 'cloud-upload-outline';
            default:
                return 'information-circle-outline';
        }
    };

    const getActivityColor = (activityType: string): string => {
        if (activityType.includes('deleted') || activityType.includes('rejected')) return '#EF4444';
        if (activityType.includes('created') || activityType.includes('approved')) return '#10B981';
        if (activityType.includes('updated')) return '#F59E0B';
        if (activityType.includes('upload')) return '#3B82F6';
        return Colors.primary;
    };

    const getStatusColor = (status: string): string => {
        switch (status.toLowerCase()) {
            case 'success':
                return '#10B981';
            case 'failed':
                return '#EF4444';
            case 'approved':
                return '#10B981';
            case 'rejected':
                return '#EF4444';
            case 'pending':
                return '#F59E0B';
            default:
                return '#94A3B8';
        }
    };

    const getStatusFromLog = (activity: ActivityLog): string => {
        // Try to get status from changes.after first
        if (activity.changes?.after?.status) {
            return activity.changes.after.status;
        }
        // Fall back to direct status field
        return activity.status || 'pending';
    };

    const formatDate = (dateString: string): string => {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    if (!isAdmin) {
        return (
            <SafeAreaView style={styles.container}>
                <Stack.Screen options={{ title: 'Audit Logs', headerShown: true }} />
                <View style={styles.restrictedContainer}>
                    <Ionicons name="lock-closed" size={48} color={Colors.primary} />
                    <Text style={styles.restrictedText}>Admin Access Required</Text>
                    <Text style={styles.restrictedSubtext}>
                        Only administrators can view the audit log
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ title: 'Audit Logs', headerShown: true }} />
            <StatusBar barStyle="dark-content" />
            
            {/* Header Content */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Audit Log</Text>
                    <Text style={styles.subtitle}>Track all system activities</Text>
                </View>
                <TouchableOpacity
                    style={[styles.filterToggle, showFilters && styles.filterToggleActive]}
                    onPress={() => setShowFilters(!showFilters)}
                >
                    <Ionicons name="filter" size={20} color={showFilters ? 'white' : '#64748B'} />
                </TouchableOpacity>
            </View>

            {/* Enhanced Filtering Section */}
            {showFilters && (
                <View style={styles.filterBar}>
                    <View style={styles.filterRow}>
                        <View style={[styles.inputWrapper, { flex: 1 }]}>
                            <Ionicons name="search" size={16} color="#94A3B8" style={styles.inputIcon} />
                            <TextInput
                                style={styles.filterInput}
                                placeholder="Search Admin/ID/Action"
                                value={search}
                                onChangeText={setSearch}
                            />
                        </View>
                    </View>
                    
                    <View style={styles.filterRow}>
                        <TouchableOpacity
                            style={[styles.inputWrapper, { flex: 1 }]}
                            onPress={() => {
                                openPicker("Select Status", [
                                    { label: "All Statuses", value: "All" },
                                    { label: "Success", value: "success" },
                                    { label: "Failed", value: "failed" },
                                    { label: "Pending", value: "pending" },
                                ], (val) => setStatusFilter(val));
                            }}
                        >
                            <Ionicons name="shield-checkmark-outline" size={16} color="#94A3B8" style={styles.inputIcon} />
                            <Text style={[styles.filterInput, statusFilter === 'All' ? { color: '#94A3B8' } : {}]}>
                                {statusFilter === 'All' ? 'Status' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.inputWrapper, { flex: 1 }]}
                            onPress={() => {
                                openPicker("Select Action Type", [
                                    { label: "All Actions", value: "All" },
                                    { label: "Transaction Created", value: "transaction_created" },
                                    { label: "Loan Approved", value: "loan_approved" },
                                    { label: "Loan Rejected", value: "loan_rejected" },
                                    { label: "Bulk Upload", value: "bulk_upload" },
                                    { label: "Member Added", value: "member_added" },
                                ], (val) => setTypeFilter(val));
                            }}
                        >
                            <Ionicons name="list-outline" size={16} color="#94A3B8" style={styles.inputIcon} />
                            <Text style={[styles.filterInput, typeFilter === 'All' ? { color: '#94A3B8' } : {}]} numberOfLines={1}>
                                {typeFilter === 'All' ? 'Action Type' : typeFilter.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.filterRow}>
                        <View style={[styles.inputWrapper, { flex: 1 }]}>
                            <Ionicons name="calendar-outline" size={16} color="#94A3B8" style={styles.inputIcon} />
                            <TextInput
                                style={styles.filterInput}
                                placeholder="From: YYYY-MM-DD"
                                value={startDate}
                                onChangeText={setStartDate}
                            />
                        </View>
                        <View style={[styles.inputWrapper, { flex: 1 }]}>
                            <Ionicons name="calendar-outline" size={16} color="#94A3B8" style={styles.inputIcon} />
                            <TextInput
                                style={styles.filterInput}
                                placeholder="To: YYYY-MM-DD"
                                value={endDate}
                                onChangeText={setEndDate}
                            />
                        </View>
                    </View>
                </View>
            )}

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex:1}}>
            <ScrollView 
                showsVerticalScrollIndicator={false} 
                style={styles.scrollView}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Activity List */}
                {loading && !refreshing ? (
                    <View style={styles.loadingContainer}>
                        <SkeletonLoader height={100} count={5} marginVertical={12} borderRadius={20} />
                    </View>
                ) : filteredActivities.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="document-text-outline" size={64} color="#CBD5E1" />
                        <Text style={styles.emptyText}>No activities found matching filters</Text>
                    </View>
                ) : (
                    <View style={styles.activitiesList}>
                        {paginatedActivities.map((activity) => {
                            const isExpanded = expandedActivityId === activity.id;
                            return (
                                <TouchableOpacity 
                                    key={activity.id} 
                                    style={styles.activityCard}
                                    onPress={() => setExpandedActivityId(isExpanded ? null : activity.id)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.activityCardContent}>
                                        {/* Collapsed View - Icon and Quick Info */}
                                        <View style={styles.activityHeader}>
                                            <View
                                                style={[
                                                    styles.activityIcon,
                                                    { backgroundColor: getActivityColor(activity.activityType) + '15' },
                                                ]}
                                            >
                                                <Ionicons
                                                    name={getActivityIcon(activity.activityType)}
                                                    size={24}
                                                    color={getActivityColor(activity.activityType)}
                                                />
                                            </View>

                                            <View style={styles.activityInfo}>
                                                <Text style={styles.activityDescription} numberOfLines={1}>
                                                    {activity.description}
                                                </Text>
                                                <View style={styles.adminRow}>
                                                    <Ionicons name="person-outline" size={10} color="#94A3B8" />
                                                    <Text style={styles.adminText} numberOfLines={1}>{activity.userName}</Text>
                                                    <Text style={styles.dot}>•</Text>
                                                    <Text style={styles.activityTimestamp}>
                                                        {formatDate(activity.createdAtISO)}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View
                                                style={[
                                                    styles.statusBadge,
                                                    { backgroundColor: getStatusColor(getStatusFromLog(activity)) + '15' },
                                                ]}
                                            >
                                                <Ionicons
                                                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                                    size={16}
                                                    color={getStatusColor(getStatusFromLog(activity))}
                                                />
                                            </View>
                                        </View>

                                        {/* Expanded View - Detailed Information */}
                                        {isExpanded && (
                                            <View style={styles.expandedContent}>
                                                <View style={styles.expandedDivider} />
                                                
                                                <View style={styles.expandedSection}>
                                                    <Text style={styles.expandedLabel}>Affected Member</Text>
                                                    <Text style={styles.expandedValue}>{activity.entityName || 'N/A'}</Text>
                                                </View>

                                                {activity.affectedMemberId ? (
                                                    <View style={styles.expandedSection}>
                                                        <Text style={styles.expandedLabel}>Member ID</Text>
                                                        <Text style={styles.expandedValue}>{activity.affectedMemberId}</Text>
                                                    </View>
                                                ) : memberIdMap[activity.userId] ? (
                                                    <View style={styles.expandedSection}>
                                                        <Text style={styles.expandedLabel}>Admin Member ID</Text>
                                                        <Text style={styles.expandedValue}>{memberIdMap[activity.userId]}</Text>
                                                    </View>
                                                ) : null}

                                                {activity.metadata?.transactionType && (
                                                    <View style={styles.expandedSection}>
                                                        <Text style={styles.expandedLabel}>Transaction Type</Text>
                                                        <Text style={styles.expandedValue}>{activity.metadata.transactionType}</Text>
                                                    </View>
                                                )}

                                                {activity.metadata?.loanType && (
                                                    <View style={styles.expandedSection}>
                                                        <Text style={styles.expandedLabel}>Loan Type</Text>
                                                        <Text style={styles.expandedValue}>{activity.metadata?.loanType}</Text>
                                                    </View>
                                                )}

                                                {activity.metadata?.transactionAmount && (
                                                    <View style={styles.expandedSection}>
                                                        <Text style={styles.expandedLabel}>Amount</Text>
                                                        <Text style={styles.expandedValue}>TSH {activity.metadata.transactionAmount.toLocaleString()}</Text>
                                                    </View>
                                                )}

                                                {activity.reason && (
                                                    <View style={styles.expandedSection}>
                                                        <Text style={styles.expandedLabel}>Reason/Notes</Text>
                                                        <Text style={styles.expandedValue}>{activity.reason}</Text>
                                                    </View>
                                                )}

                                                <View style={styles.expandedSection}>
                                                    <Text style={styles.expandedLabel}>Status</Text>
                                                    <View style={[
                                                        styles.expandedStatusBadge,
                                                        { backgroundColor: getStatusColor(getStatusFromLog(activity)) + '20' }
                                                    ]}>
                                                        <Text style={[
                                                            styles.expandedStatusText,
                                                            { color: getStatusColor(getStatusFromLog(activity)) }
                                                        ]}>
                                                            {getStatusFromLog(activity).toUpperCase()}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}

                        {/* Pagination Controls - Consistent with Loans */}
                        <View style={styles.paginationContainer}>
                            <View style={styles.pageInfo}>
                                <Text style={styles.pageInfoText}>
                                    Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredActivities.length)} of {filteredActivities.length}
                                </Text>
                                <TouchableOpacity
                                    style={styles.limitPicker}
                                    onPress={() => {
                                        openPicker("Items Per Page", [
                                            { label: "10 per page", value: 10 },
                                            { label: "50 per page", value: 50 },
                                            { label: "100 per page", value: 100 },
                                        ], (val) => setItemsPerPage(val));
                                    }}
                                >
                                    <Text style={styles.limitText}>{itemsPerPage} / page</Text>
                                    <Ionicons name="chevron-down" size={12} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.pageBtns}>
                                <TouchableOpacity
                                    style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                                    disabled={currentPage === 1}
                                    onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                >
                                    <Ionicons name="chevron-back" size={20} color={currentPage === 1 ? "#CBD5E1" : "#0F172A"} />
                                </TouchableOpacity>

                                <View style={styles.pageNum}>
                                    <Text style={styles.pageNumText}>Page {currentPage} of {totalPages}</Text>
                                </View>

                                <TouchableOpacity
                                    style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                                    disabled={currentPage === totalPages}
                                    onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                >
                                    <Ionicons name="chevron-forward" size={20} color={currentPage === totalPages ? "#CBD5E1" : "#0F172A"} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
            </ScrollView>
            </KeyboardAvoidingView>

            {/* Custom Picker Modal */}
            <Modal visible={pickerVisible} animationType="fade" transparent={true}>
                <View style={[styles.modalOverlay, { justifyContent: 'center', padding: 30 }]}>
                    <View style={[styles.modalContent, { height: 'auto', borderRadius: 24 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{pickerTitle}</Text>
                            <TouchableOpacity onPress={() => setPickerVisible(false)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        <View style={{ paddingBottom: 10 }}>
                            {pickerOptions.map((opt, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={styles.pickerItem}
                                    onPress={() => {
                                        onPickerSelect(opt.value);
                                        setPickerVisible(false);
                                    }}
                                >
                                    <Text style={styles.pickerItemText}>{opt.label}</Text>
                                    <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    scrollView: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 10,
        paddingBottom: 16,
        backgroundColor: 'white',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        color: '#0F172A',
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 2,
    },
    subtitle: {
        color: '#64748B',
        fontSize: 12,
    },
    filterToggle: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterToggleActive: {
        backgroundColor: Colors.primary,
    },
    filterBar: {
        backgroundColor: 'white',
        paddingHorizontal: 24,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    filterRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        height: 44,
        paddingHorizontal: 12,
    },
    inputIcon: {
        marginRight: 8,
    },
    filterInput: {
        flex: 1,
        fontSize: 13,
        color: '#0F172A',
    },
    loadingContainer: {
        padding: 24,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyText: {
        fontSize: 14,
        color: '#94A3B8',
        marginTop: 16,
        fontWeight: '500',
    },
    activitiesList: {
        padding: 20,
        paddingBottom: 40,
    },
    activityCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
    },
    activityCardContent: {
        padding: 16,
    },
    activityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    activityIcon: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    activityInfo: {
        flex: 1,
    },
    activityDescription: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#0F172A',
        marginBottom: 4,
    },
    adminRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    adminText: {
        fontSize: 11,
        color: '#64748B',
        marginLeft: 4,
        fontWeight: '600',
    },
    dot: {
        fontSize: 11,
        color: '#CBD5E1',
        marginHorizontal: 6,
    },
    activityTimestamp: {
        fontSize: 11,
        color: '#94A3B8',
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
        color: '#0F172A',
    },
    restrictedSubtext: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
    },
    // Pagination Styles
    paginationContainer: {
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    pageInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    pageInfoText: {
        fontSize: 12,
        color: '#64748B',
    },
    limitPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        gap: 4,
    },
    limitText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#64748B',
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
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    pageBtnDisabled: {
        backgroundColor: '#F8FAFC',
        borderColor: '#F1F5F9',
    },
    pageNum: {
        paddingHorizontal: 12,
    },
    pageNumText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    // Picker Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
    },
    modalContent: {
        backgroundColor: 'white',
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
        color: '#0F172A',
    },
    pickerItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F8FAFC',
    },
    pickerItemText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#334155',
    },
    // Expanded Content Styles
    expandedContent: {
        paddingTop: 16,
        marginTop: 12,
    },
    expandedDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginBottom: 12,
    },
    expandedSection: {
        marginBottom: 12,
    },
    expandedLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    expandedValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0F172A',
    },
    expandedStatusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    expandedStatusText: {
        fontSize: 11,
        fontWeight: '700',
    },
});

