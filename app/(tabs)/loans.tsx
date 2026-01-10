
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
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
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../services/AuthContext';
import { loanRequestService } from '../../services/loanRequestService';
import { LoanRequest } from '../../types';

export default function LoansScreen() {
    const { user, role } = useAuth();
    const isAdmin = role === 'Admin';

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
    }, [isAdmin, user]);

    const loadRequests = async () => {
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
    };

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
        if (!description || description.trim() === '') {
            Alert.alert("Error", "Please provide the purpose of the loan");
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
                onPress={() => setExpandedLoanId(isExpanded ? null : request.id)}
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
                {!user ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
                ) : loading && !refreshing ? (
                    <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
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

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 24,
        backgroundColor: 'white',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: '#0F172A',
    },
    addBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 20,
    },
    card: {
        backgroundColor: 'white',
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
        color: '#0F172A',
    },
    requestDate: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '900',
    },
    cardBody: {
        gap: 12,
    },
    collapsedCardBody: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 8,
    },
    compactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    compactLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    label: {
        fontSize: 14,
        color: '#64748B',
    },
    value: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A',
    },
    amountText: {
        fontSize: 16,
        fontWeight: '900',
        color: Colors.primary,
    },
    descriptionBox: {
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 12,
    },
    descriptionLabel: {
        fontSize: 11,
        color: '#94A3B8',
        marginBottom: 4,
    },
    descriptionText: {
        fontSize: 13,
        color: '#334155',
        fontStyle: 'italic',
    },
    approvalTracker: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    trackerTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
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
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    adminName: {
        fontSize: 11,
        fontWeight: '500',
        color: '#475569',
    },
    actionRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    approveBtn: {
        backgroundColor: '#10B981',
    },
    rejectBtn: {
        backgroundColor: '#EF4444',
    },
    actionBtnText: {
        color: 'white',
        fontWeight: 'bold',
    },
    votedNotice: {
        marginTop: 16,
        padding: 10,
        backgroundColor: '#F0FDFA',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#CCFBF1',
    },
    votedText: {
        fontSize: 12,
        color: '#0D9488',
        textAlign: 'center',
        fontStyle: 'italic',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 80,
    },
    emptyText: {
        fontSize: 16,
        color: '#94A3B8',
        marginTop: 16,
        marginBottom: 24,
    },
    emptyBtn: {
        backgroundColor: Colors.primary,
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
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
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
        color: '#0F172A',
    },
    modalBody: {},
    inputLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#475569',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#0F172A',
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
        borderColor: '#E2E8F0',
        alignItems: 'center',
    },
    typeBtnActive: {
        borderColor: Colors.primary,
        backgroundColor: '#FFF7ED',
    },
    typeBtnText: {
        fontWeight: '700',
        color: '#64748B',
    },
    typeBtnTextActive: {
        color: Colors.primary,
    },
    interestNote: {
        fontSize: 10,
        color: '#F97316',
        marginTop: 4,
    },
    submitBtn: {
        backgroundColor: Colors.primary,
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
        backgroundColor: '#FEF2F2',
        padding: 12,
        borderRadius: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#EF4444',
    },
    rejectionText: {
        fontSize: 12,
        color: '#B91C1C',
        fontWeight: '500',
    },
    filterBar: {
        backgroundColor: 'white',
        paddingHorizontal: 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        gap: 10,
    },
    filterRow: {
        flexDirection: 'row',
        gap: 10,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 40,
    },
    inputIcon: {
        marginRight: 6,
    },
    filterInput: {
        flex: 1,
        fontSize: 13,
        color: '#0F172A',
        padding: 0,
    },
    paginationContainer: {
        marginTop: 10,
        marginBottom: 30,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    pageInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    pageInfoText: {
        fontSize: 12,
        color: '#64748B',
    },
    limitPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'white',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    limitText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#0F172A',
    },
    pageBtns: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 15,
    },
    pageBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
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
        color: '#0F172A',
    },
    pickerItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    pickerItemText: {
        fontSize: 16,
        color: '#0F172A',
        fontWeight: '500',
    }
});
