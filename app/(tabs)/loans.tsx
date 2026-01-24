
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../services/AuthContext';
import { loanRequestService } from '../../services/loanRequestService';
import { LoanRequest } from '../../types';

export default function LoansScreen() {
    const { user, role } = useAuth();
    const { colors, theme } = useTheme();
    const isAdmin = role === 'Admin';
    const styles = createStyles(colors, theme);

    const [requests, setRequests] = useState<LoanRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Request Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [amount, setAmount] = useState('');
    const [loanType, setLoanType] = useState<'Standard' | 'Dharura'>('Standard');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Vote Modal State
    const [voteModalVisible, setVoteModalVisible] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<LoanRequest | null>(null);
    const [reason, setReason] = useState('');
    const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);

    // Filtering & Pagination State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [showFilters, setShowFilters] = useState(false);

    // Picker Modal State
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerTitle, setPickerTitle] = useState('');
    const [pickerOptions, setPickerOptions] = useState<{ label: string, value: any }[]>([]);
    const [onPickerSelect, setOnPickerSelect] = useState<(value: any) => void>(() => { });

    const loadRequests = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            const data = isAdmin
                ? await loanRequestService.getAllRequests()
                : await loanRequestService.getMyRequests(user.uid);
            setRequests(data);
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    }, [isAdmin, user]);

    useEffect(() => {
        if (!user) return;

        loadRequests();
        const unsubscribe = loanRequestService.subscribeToRequests((data) => {
            if (isAdmin) {
                setRequests(data);
            } else {
                setRequests(data.filter(r => r.memberId === user.uid));
            }
        });
        return () => unsubscribe();
    }, [isAdmin, user, loadRequests]);

    const onRefresh = async () => {
        setRefreshing(true);
        await loadRequests();
        setRefreshing(false);
    };

    const handleSubmitRequest = async () => {
        if (!user) return;
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            Alert.alert("Error", "Please enter a valid amount");
            return;
        }
        if (!description || description.trim().length < 5) {
            Alert.alert("Error", "Please provide a more detailed purpose for this loan (at least 5 characters)");
            return;
        }

        try {
            setSubmitting(true);
            await loanRequestService.submitLoanRequest(
                user.uid,
                user.displayName || 'Member',
                Number(amount),
                loanType,
                description
            );
            Alert.alert("Success", "Loan request submitted and pending admin approval.");
            setModalVisible(false);
            setAmount('');
            setDescription('');
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleVote = async (requestId: string, decision: 'approved' | 'rejected') => {
        if (!user) return;
        try {
            setLoading(true);
            const status = await loanRequestService.castVote(requestId, user.uid, decision, reason);
            Alert.alert("Vote Recorded", `Request is now ${status.toLowerCase()}`);
            setVoteModalVisible(false);
            setSelectedRequest(null);
            setReason('');
        } catch (error: any) {
            Alert.alert("Error", error.message);
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic
    const filteredRequests = requests.filter(request => {
        const lowerSearch = searchTerm.toLowerCase();
        const matchesSearch = searchTerm === '' ||
            request.memberName.toLowerCase().includes(lowerSearch) ||
            (request.requesterMemberId || '').toLowerCase().includes(lowerSearch) ||
            request.memberId.toLowerCase().includes(lowerSearch);

        const matchesStatus = statusFilter === 'All' ||
            request.status.toLowerCase() === statusFilter.toLowerCase();

        let matchesStartDate = true;
        let matchesEndDate = true;

        if (startDate) {
            const date = new Date(startDate);
            if (!isNaN(date.getTime())) {
                matchesStartDate = new Date(request.requestedDate) >= date;
            }
        }
        if (endDate) {
            const date = new Date(endDate);
            if (!isNaN(date.getTime())) {
                const end = new Date(date);
                end.setHours(23, 59, 59, 999);
                matchesEndDate = new Date(request.requestedDate) <= end;
            }
        }

        return matchesSearch && matchesStatus && matchesStartDate && matchesEndDate;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
    const paginatedRequests = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, startDate, endDate, itemsPerPage]);

    const openPicker = (title: string, options: { label: string, value: any }[], onSelect: (value: any) => void) => {
        setPickerTitle(title);
        setPickerOptions(options);
        setOnPickerSelect(() => onSelect);
        setPickerVisible(true);
    };

    const renderApprovalBadge = (status: string) => {
        const color = status === 'Approved' ? '#10B981' : status === 'Rejected' ? '#EF4444' : '#F59E0B';
        const bgColor = status === 'Approved' ? '#D1FAE5' : status === 'Rejected' ? '#FEE2E2' : '#FEF3C7';

        return (
            <View style={[styles.badge, { backgroundColor: bgColor }]}>
                <Text style={[styles.badgeText, { color }]}>{status.toUpperCase()}</Text>
            </View>
        );
    };

    const renderRequestCard = (request: LoanRequest) => {
        if (!user) return null;
        const myDecision = request.approvals[user.uid] || 'pending';
        const approvedCount = Object.keys(request.approvals).filter(uid => request.approvals[uid] === 'approved').length;
        const totalAdmins = Object.keys(request.approvals).length;
        const isExpanded = expandedLoanId === request.id;

        return (
            <TouchableOpacity
                key={request.id}
                style={styles.card}
                onPress={() => setExpandedLoanId(isExpanded ? null : (request.id ?? null))}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.memberName} numberOfLines={1}>{request.memberName}</Text>
                        <Text style={styles.requestDate}>{new Date(request.requestedDate).toLocaleDateString()}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {renderApprovalBadge(request.status)}
                        <Ionicons
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            size={18}
                            color="#64748B"
                        />
                    </View>
                </View>

                {/* Collapsed View - Brief Info */}
                {!isExpanded && (
                    <View style={styles.collapsedCardBody}>
                        <View style={styles.compactRow}>
                            <Text style={styles.compactLabel}>{request.type} Loan</Text>
                            <Text style={styles.amountText}>{request.amount.toLocaleString()} TZS</Text>
                        </View>
                    </View>
                )}

                {/* Expanded View - Full Details */}
                {isExpanded && (
                    <View style={styles.cardBody}>
                        <View style={styles.row}>
                            <Text style={styles.label}>Type:</Text>
                            <Text style={styles.value}>{request.type} Loan</Text>
                        </View>
                        <View style={styles.row}>
                            <Text style={styles.label}>Amount:</Text>
                            <Text style={styles.amountText}>{request.amount.toLocaleString()} TZS</Text>
                        </View>
                        {request.description ? (
                            <View style={styles.descriptionBox}>
                                <Text style={styles.descriptionLabel}>Purpose:</Text>
                                <Text style={styles.descriptionText}>{request.description}</Text>
                            </View>
                        ) : null}

                        {request.status === 'Rejected' && request.rejectionReason && (
                            <View style={styles.rejectionBox}>
                                <Text style={styles.rejectionText}>Reason: {request.rejectionReason}</Text>
                            </View>
                        )}

                        <View style={styles.approvalTracker}>
                            <Text style={styles.trackerTitle}>Admin Approvals ({approvedCount}/{totalAdmins})</Text>
                            <View style={styles.adminList}>
                                {Object.keys(request.approvals).map(adminId => (
                                    <View key={adminId} style={styles.adminStatusRow}>
                                        <Ionicons
                                            name={request.approvals[adminId] === 'approved' ? 'checkbox' : request.approvals[adminId] === 'rejected' ? 'close-circle' : 'time'}
                                            size={16}
                                            color={request.approvals[adminId] === 'approved' ? '#10B981' : request.approvals[adminId] === 'rejected' ? '#EF4444' : '#94A3B8'}
                                        />
                                        <Text style={[styles.adminName, request.approvals[adminId] === 'pending' && { color: '#94A3B8' }]}>
                                            {request.adminNames[adminId]}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {isAdmin && request.status === 'Pending' && myDecision === 'pending' && (
                            <View style={styles.actionRow}>
                                <TouchableOpacity
                                    style={[styles.actionBtn, styles.approveBtn]}
                                    onPress={() => handleVote(request.id!, 'approved')}
                                >
                                    <Ionicons name="checkmark" size={18} color="white" />
                                    <Text style={styles.actionBtnText}>Approve</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.actionBtn, styles.rejectBtn]}
                                    onPress={() => {
                                        setSelectedRequest(request);
                                        setVoteModalVisible(true);
                                    }}
                                >
                                    <Ionicons name="close" size={18} color="white" />
                                    <Text style={styles.actionBtnText}>Reject</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {isAdmin && myDecision !== 'pending' && request.status === 'Pending' && (
                            <View style={styles.votedNotice}>
                                <Text style={styles.votedText}>You have {myDecision} this request. Waiting for other admins.</Text>
                            </View>
                        )}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Loan Requests</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity
                        style={[styles.addBtn, { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' }]}
                        onPress={() => setShowFilters(!showFilters)}
                    >
                        <Ionicons name="filter" size={20} color="#64748B" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={() => setModalVisible(true)}
                    >
                        <Ionicons name="add" size={24} color="white" />
                    </TouchableOpacity>
                </View>
            </View>

            {showFilters && (
                <View style={styles.filterBar}>
                    <View style={styles.filterRow}>
                        <View style={[styles.inputWrapper, { flex: 1 }]}>
                            <Ionicons name="search" size={16} color="#94A3B8" style={styles.inputIcon} />
                            <TextInput
                                style={styles.filterInput}
                                placeholder="Search Name/ID"
                                value={searchTerm}
                                onChangeText={setSearchTerm}
                            />
                        </View>
                        <TouchableOpacity
                            style={[styles.inputWrapper, { width: 120 }]}
                            onPress={() => {
                                openPicker("Select Status", [
                                    { label: "All", value: "All" },
                                    { label: "Pending", value: "Pending" },
                                    { label: "Approved", value: "Approved" },
                                    { label: "Rejected", value: "Rejected" },
                                ], (val) => setStatusFilter(val));
                            }}
                        >
                            <Ionicons name="options" size={16} color="#94A3B8" style={styles.inputIcon} />
                            <Text style={[styles.filterInput, !statusFilter || statusFilter === 'All' ? { color: '#94A3B8' } : {}]}>
                                {statusFilter === 'All' ? 'Status' : statusFilter}
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

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Header Stats */}
                {!loading && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.statsScroll}
                        style={{ marginBottom: 10 }}
                    >
                        <View style={styles.statCard}>
                            <View style={[styles.statIconContainer, { backgroundColor: '#F59E0B15' }]}>
                                <Ionicons name="time" size={24} color="#F59E0B" />
                            </View>
                            <Text style={styles.statTitle}>Pending</Text>
                            <Text style={styles.statValue}>{requests.filter(r => r.status === 'Pending').length}</Text>
                        </View>

                        <View style={styles.statCard}>
                            <View style={[styles.statIconContainer, { backgroundColor: '#10B98115' }]}>
                                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                            </View>
                            <Text style={styles.statTitle}>Approved</Text>
                            <Text style={styles.statValue}>{requests.filter(r => r.status === 'Approved').length}</Text>
                        </View>

                        <View style={styles.statCard}>
                            <View style={[styles.statIconContainer, { backgroundColor: '#EF444415' }]}>
                                <Ionicons name="close-circle" size={24} color="#EF4444" />
                            </View>
                            <Text style={styles.statTitle}>Rejected</Text>
                            <Text style={styles.statValue}>{requests.filter(r => r.status === 'Rejected').length}</Text>
                        </View>
                    </ScrollView>
                )}

                {!user ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
                ) : loading && !refreshing ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
                ) : filteredRequests.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="search-outline" size={64} color="#CBD5E1" />
                        <Text style={styles.emptyText}>No requests match your filters</Text>
                    </View>
                ) : (
                    <>
                        {paginatedRequests.map(renderRequestCard)}

                        {/* Pagination Controls */}
                        <View style={styles.paginationContainer}>
                            <View style={styles.pageInfo}>
                                <Text style={styles.pageInfoText}>
                                    Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredRequests.length)} of {filteredRequests.length}
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
                    </>
                )}
            </ScrollView>

            {/* New Request Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Request Loan</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={{ flex: 1 }}
                        >
                            <ScrollView style={styles.modalBody}>
                                <Text style={styles.inputLabel}>Loan Type</Text>
                                <View style={styles.typeSelector}>
                                    <TouchableOpacity
                                        style={[styles.typeBtn, loanType === 'Standard' && styles.typeBtnActive]}
                                        onPress={() => setLoanType('Standard')}
                                    >
                                        <Text style={[styles.typeBtnText, loanType === 'Standard' && styles.typeBtnTextActive]}>Standard</Text>
                                        {loanType === 'Standard' && <Text style={styles.interestNote}>10% Interest</Text>}
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.typeBtn, loanType === 'Dharura' && styles.typeBtnActive]}
                                        onPress={() => setLoanType('Dharura')}
                                    >
                                        <Text style={[styles.typeBtnText, loanType === 'Dharura' && styles.typeBtnTextActive]}>Dharura</Text>
                                        {loanType === 'Dharura' && <Text style={styles.interestNote}>No Interest</Text>}
                                    </TouchableOpacity>
                                </View>

                                <Text style={styles.inputLabel}>Amount (TZS)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter amount"
                                    keyboardType="numeric"
                                    value={amount}
                                    onChangeText={setAmount}
                                />

                                <Text style={styles.inputLabel}>Purpose/Description <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Why do you need this loan? (Required)"
                                    multiline
                                    numberOfLines={3}
                                    value={description}
                                    onChangeText={setDescription}
                                />

                                <TouchableOpacity
                                    style={styles.submitBtn}
                                    onPress={handleSubmitRequest}
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <Text style={styles.submitBtnText}>Submit Request</Text>
                                    )}
                                </TouchableOpacity>
                            </ScrollView>
                        </KeyboardAvoidingView>
                    </View>
                </View>
            </Modal>

            {/* Rejection/Vote Reason Modal */}
            <Modal visible={voteModalVisible} animationType="fade" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { height: 'auto' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Reject Request</Text>
                            <TouchableOpacity onPress={() => setVoteModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        >
                            <View style={styles.modalBody}>
                                <Text style={styles.inputLabel}>Reason for Rejection</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Enter reason..."
                                    multiline
                                    value={reason}
                                    onChangeText={setReason}
                                />
                                <TouchableOpacity
                                    style={[styles.submitBtn, { backgroundColor: '#EF4444' }]}
                                    onPress={() => selectedRequest && handleVote(selectedRequest.id!, 'rejected')}
                                >
                                    <Text style={styles.submitBtnText}>Confirm Rejection</Text>
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </View>
            </Modal>

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
        </View>
    );
}

const createStyles = (colors: any, theme: string) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 24,
        backgroundColor: colors.card,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: colors.text,
    },
    addBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 20,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    memberName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.text,
    },
    requestDate: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
    },
    collapsedCardBody: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 12,
    },
    compactRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    compactLabel: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    cardBody: {
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 16,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    value: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    amountText: {
        fontSize: 16,
        fontWeight: '900',
        color: colors.primary,
    },
    descriptionBox: {
        backgroundColor: colors.backgroundMuted,
        padding: 12,
        borderRadius: 12,
    },
    descriptionLabel: {
        fontSize: 11,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    descriptionText: {
        fontSize: 14,
        lineHeight: 20,
        color: colors.text,
        fontStyle: 'italic',
    },
    approvalTracker: {
        marginTop: 16,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    trackerTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: 8,
    },
    adminList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    adminStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.backgroundMuted,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    adminName: {
        fontSize: 11,
        fontWeight: '500',
        color: colors.text,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 24,
    },
    actionBtn: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    approveBtn: {
        backgroundColor: colors.success,
    },
    rejectBtn: {
        backgroundColor: colors.danger,
    },
    actionBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    votedNotice: {
        marginTop: 16,
        padding: 10,
        backgroundColor: colors.backgroundMuted,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    votedText: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    paginationContainer: {
        marginTop: 20,
        paddingBottom: 40,
    },
    pageInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    pageInfoText: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    limitPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.backgroundMuted,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    limitText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    pageBtns: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    pageBtn: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: colors.card,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    pageBtnDisabled: {
        opacity: 0.5,
    },
    pageNum: {
        minWidth: 100,
        alignItems: 'center',
    },
    pageNumText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 80,
    },
    emptyText: {
        fontSize: 16,
        color: colors.textSecondary,
        marginTop: 16,
        marginBottom: 24,
    },
    emptyBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    emptyBtnText: {
        color: 'white',
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: '80%',
        padding: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: colors.text,
    },
    modalBody: {},
    inputLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textSecondary,
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: colors.backgroundMuted,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: colors.text,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    typeSelector: {
        flexDirection: 'row',
        gap: 12,
    },
    typeBtn: {
        flex: 1,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        backgroundColor: colors.card,
    },
    typeBtnActive: {
        borderColor: colors.primary,
        backgroundColor: theme === 'dark' ? 'rgba(245, 124, 0, 0.1)' : '#FFF7ED',
    },
    typeBtnText: {
        fontWeight: '700',
        color: colors.textSecondary,
    },
    typeBtnTextActive: {
        color: colors.primary,
    },
    interestNote: {
        fontSize: 10,
        color: colors.warning,
        marginTop: 4,
    },
    submitBtn: {
        backgroundColor: colors.primary,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 32,
        marginBottom: 50,
    },
    submitBtnText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    rejectionBox: {
        backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : '#FEF2F2',
        padding: 12,
        borderRadius: 10,
        borderLeftWidth: 4,
        borderLeftColor: colors.danger,
    },
    rejectionText: {
        fontSize: 12,
        color: colors.danger,
        fontWeight: '500',
    },
    filterBar: {
        backgroundColor: colors.card,
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        gap: 10,
    },
    filterRow: {
        flexDirection: 'row',
        gap: 10,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundMuted,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 44,
    },
    inputIcon: {
        marginRight: 8,
    },
    filterInput: {
        flex: 1,
        fontSize: 14,
        color: colors.text,
        height: '100%',
    },
    pickerItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    pickerItemText: {
        fontSize: 16,
        color: colors.text,
        fontWeight: '500',
    },
    statsScroll: {
        paddingVertical: 10,
        paddingHorizontal: 5,
    },
    statCard: {
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 20,
        marginRight: 16,
        width: 170,
        borderWidth: 1,
        borderColor: colors.border,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    statIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    statTitle: {
        color: colors.textSecondary,
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    statValue: {
        color: colors.text,
        fontSize: 20,
        fontWeight: 'bold',
    },
    statSubtitle: {
        color: colors.textSecondary,
        fontSize: 10,
        marginTop: 4,
    },
});
