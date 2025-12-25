import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Modal, ScrollView, StatusBar, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../services/AuthContext';
import { transactionService } from '../../services/transactionService';

export default function ReportsScreen() {
    const { t } = useTranslation();
    const { user, role } = useAuth();
    const isAdmin = role === 'Admin';

    const [generating, setGenerating] = useState(false);
    const [reportData, setReportData] = useState<any>(null);
    const [groupReportData, setGroupReportData] = useState<any>(null);
    const [memberName, setMemberName] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [activeTab, setActiveTab] = useState<'personal' | 'group'>('personal');
    const [expandedMember, setExpandedMember] = useState<string | null>(null);
    const [selectedMemberData, setSelectedMemberData] = useState<any>(null);
    const [showMemberModal, setShowMemberModal] = useState(false);

    const months = [
        { num: 1, name: 'January', sw: 'Januari' },
        { num: 2, name: 'February', sw: 'Februari' },
        { num: 3, name: 'March', sw: 'Machi' },
        { num: 4, name: 'April', sw: 'Aprili' },
        { num: 5, name: 'May', sw: 'Mei' },
        { num: 6, name: 'June', sw: 'Juni' },
        { num: 7, name: 'July', sw: 'Julai' },
        { num: 8, name: 'August', sw: 'Agosti' },
        { num: 9, name: 'September', sw: 'Septemba' },
        { num: 10, name: 'October', sw: 'Oktoba' },
        { num: 11, name: 'November', sw: 'Novemba' },
        { num: 12, name: 'December', sw: 'Desemba' },
    ];

    useEffect(() => {
        if (user) {
            setMemberName(user.displayName || 'Member');
        }
    }, [user]);

    const generatePersonalReport = async () => {
        if (!user) {
            Alert.alert('Error', 'User not found');
            return;
        }

        try {
            setGenerating(true);
            const data = await transactionService.getMemberMonthlyReport(user.uid, selectedMonth, selectedYear);
            setReportData(data);
            Alert.alert('Success', 'Report generated successfully');
        } catch (error) {
            console.error('Error generating report:', error);
            Alert.alert('Error', 'Failed to generate report');
        } finally {
            setGenerating(false);
        }
    };

    const generateGroupReport = async () => {
        try {
            setGenerating(true);
            const data = await transactionService.getGroupMonthlyReport(selectedMonth, selectedYear);
            setGroupReportData(data);
            Alert.alert('Success', 'Group report generated successfully');
        } catch (error) {
            console.error('Error generating group report:', error);
            Alert.alert('Error', 'Failed to generate group report');
        } finally {
            setGenerating(false);
        }
    };

    const monthName = months.find(m => m.num === selectedMonth)?.sw || '';

    const handleViewMemberDetails = (memberData: any) => {
        setSelectedMemberData(memberData);
        setShowMemberModal(true);
    };

    const handleRefresh = () => {
        setReportData(null);
        setGroupReportData(null);
        setExpandedMember(null);
        setShowMemberModal(false);
        Alert.alert('Refreshed', 'Report page has been cleared');
    };

    const MonthYearSelector = () => (
        <View style={styles.card as ViewStyle}>
            <Text style={styles.cardTitle as TextStyle}>Select Month & Year</Text>

            <View style={styles.selectorContainer as ViewStyle}>
                <View style={styles.selectorGroup as ViewStyle}>
                    <Text style={styles.label as TextStyle}>Month</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthScroll as ViewStyle}>
                        {months.map(month => (
                            <TouchableOpacity
                                key={month.num}
                                onPress={() => setSelectedMonth(month.num)}
                                style={[
                                    styles.monthBtn as ViewStyle,
                                    selectedMonth === month.num && (styles.monthBtnActive as ViewStyle)
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.monthBtnText as TextStyle,
                                        selectedMonth === month.num && (styles.monthBtnTextActive as TextStyle)
                                    ]}
                                >
                                    {month.sw}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.selectorGroup as ViewStyle}>
                    <Text style={styles.label as TextStyle}>Year</Text>
                    <View style={styles.yearContainer as ViewStyle}>
                        <TouchableOpacity
                            onPress={() => setSelectedYear(selectedYear - 1)}
                            style={styles.yearBtn as ViewStyle}
                        >
                            <Ionicons name="chevron-back" size={20} color={Colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.yearText as TextStyle}>{selectedYear}</Text>
                        <TouchableOpacity
                            onPress={() => setSelectedYear(selectedYear + 1)}
                            style={styles.yearBtn as ViewStyle}
                        >
                            <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );

    const PersonalReportContent = () => (
        <>
            <MonthYearSelector />

            <TouchableOpacity
                style={styles.generateBtn as ViewStyle}
                onPress={generatePersonalReport}
                disabled={generating}
            >
                {generating ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <>
                        <Ionicons name="document-outline" size={20} color="white" />
                        <Text style={styles.generateBtnText as TextStyle}>Generate Report</Text>
                    </>
                )}
            </TouchableOpacity>

            {reportData && <PersonalReportDisplay data={reportData} monthName={monthName} memberName={memberName} />}
        </>
    );

    const GroupReportContent = () => (
        <>
            <MonthYearSelector />

            <TouchableOpacity
                style={styles.generateBtn as ViewStyle}
                onPress={generateGroupReport}
                disabled={generating}
            >
                {generating ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <>
                        <Ionicons name="people-outline" size={20} color="white" />
                        <Text style={styles.generateBtnText as TextStyle}>Generate Group Report</Text>
                    </>
                )}
            </TouchableOpacity>

            {groupReportData && <GroupReportDisplay data={groupReportData} monthName={monthName} onMemberPress={handleViewMemberDetails} expandedMember={expandedMember} setExpandedMember={setExpandedMember} />}
        </>
    );

    return (
        <SafeAreaView style={styles.container as ViewStyle}>
            <StatusBar barStyle="dark-content" />
            <ScrollView
                style={styles.flex1 as ViewStyle}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent as ViewStyle}
            >
                {/* Header */}
                <View style={styles.header as ViewStyle}>
                    <View style={styles.headerTitleContainer as ViewStyle}>
                        <View>
                            <Text style={styles.title as TextStyle}>Taarifa za Mwanachama</Text>
                            <Text style={styles.subtitle as TextStyle}>Monthly Report</Text>
                        </View>
                        <TouchableOpacity 
                            onPress={handleRefresh}
                            style={styles.refreshBtn as ViewStyle}
                        >
                            <Ionicons name="refresh" size={22} color={Colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Tab Selector for Admin */}
                {isAdmin && (
                    <View style={styles.tabContainer as ViewStyle}>
                        <TouchableOpacity
                            style={[styles.tab as ViewStyle, activeTab === 'personal' && (styles.tabActive as ViewStyle)]}
                            onPress={() => setActiveTab('personal')}
                        >
                            <Ionicons name={activeTab === 'personal' ? 'person' : 'person-outline'} size={20} color={activeTab === 'personal' ? 'white' : Colors.primary} />
                            <Text style={[styles.tabText as TextStyle, activeTab === 'personal' && (styles.tabTextActive as TextStyle)]}>Personal</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.tab as ViewStyle, activeTab === 'group' && (styles.tabActive as ViewStyle)]}
                            onPress={() => setActiveTab('group')}
                        >
                            <Ionicons name={activeTab === 'group' ? 'people' : 'people-outline'} size={20} color={activeTab === 'group' ? 'white' : Colors.primary} />
                            <Text style={[styles.tabText as TextStyle, activeTab === 'group' && (styles.tabTextActive as TextStyle)]}>Group</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Content */}
                {!isAdmin || activeTab === 'personal' ? <PersonalReportContent /> : <GroupReportContent />}
            </ScrollView>

            {/* Member Details Modal */}
            <Modal visible={showMemberModal} animationType="slide" transparent={false}>
                <SafeAreaView style={styles.container as ViewStyle}>
                    <View style={styles.modalHeader as ViewStyle}>
                        <TouchableOpacity onPress={() => setShowMemberModal(false)}>
                            <Ionicons name="arrow-back" size={24} color={Colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle as TextStyle}>{selectedMemberData?.memberName}</Text>
                        <View style={{ width: 24 }} />
                    </View>
                    <ScrollView contentContainerStyle={styles.scrollContent as ViewStyle}>
                        {selectedMemberData && <PersonalReportDisplay data={selectedMemberData} monthName={monthName} memberName={selectedMemberData?.memberName} />}
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

// Personal Report Display Component
const PersonalReportDisplay = ({ data, monthName, memberName }: any) => (
    <View style={styles.reportContainer as ViewStyle}>
        <Text style={styles.reportLogo as TextStyle}>KIKOBA</Text>
        <Text style={styles.reportTitle as TextStyle}>Taarifa za Mwanachama</Text>
        <Text style={styles.reportSubtitle as TextStyle}>Mwezi wa {monthName} {data.year}</Text>

        {/* Member Info */}
        <View style={styles.reportSection as ViewStyle}>
            <Text style={styles.reportSectionTitle as TextStyle}>Taarifa za Mwanachama</Text>
            <View style={styles.reportTable as ViewStyle}>
                <View style={styles.tableRow as ViewStyle}>
                    <Text style={styles.tableLabel as TextStyle}>Jina Kamili</Text>
                    <Text style={styles.tableValue as TextStyle}>{memberName}</Text>
                </View>
            </View>
        </View>

        {/* Hisa Section */}
        <View style={styles.reportSection as ViewStyle}>
            <Text style={styles.reportSectionTitle as TextStyle}>Hisa (Shares)</Text>
            <View style={styles.reportTable as ViewStyle}>
                <View style={styles.tableRow as ViewStyle}>
                    <Text style={styles.tableLabel as TextStyle}>Jumla ya Hisa Za Nyuma</Text>
                    <Text style={styles.tableValue as TextStyle}>TSh {data.hisa.previousBalance.toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})}</Text>
                </View>
                <View style={styles.tableRow as ViewStyle}>
                    <Text style={styles.tableLabel as TextStyle}>Hisa ya Mwezi wa {data.month}</Text>
                    <Text style={styles.tableValue as TextStyle}>TSh {data.hisa.currentMonthContribution.toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})}</Text>
                </View>
                <View style={[styles.tableRow as ViewStyle, styles.tableRowHighlight as ViewStyle]}>
                    <Text style={styles.tableLabel as TextStyle}>Jumla ya Hisa Zote</Text>
                    <Text style={styles.tableValueBold as TextStyle}>TSh {data.hisa.totalHisa.toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})}</Text>
                </View>
            </View>
        </View>

        {/* Jamii Section */}
        <View style={styles.reportSection as ViewStyle}>
            <Text style={styles.reportSectionTitle as TextStyle}>Jamii</Text>
            <View style={styles.reportTable as ViewStyle}>
                <View style={styles.tableRow as ViewStyle}>
                    <Text style={styles.tableLabel as TextStyle}>Jumla ya Jamii</Text>
                    <Text style={styles.tableValue as TextStyle}>TSh {data.jamii.toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})}</Text>
                </View>
            </View>
        </View>

        {/* Standard Loan Section */}
        <View style={styles.reportSection as ViewStyle}>
            <Text style={styles.reportSectionTitle as TextStyle}>Mikopo - Standard</Text>
            <View style={styles.reportTable as ViewStyle}>
                <View style={styles.tableRow as ViewStyle}>
                    <Text style={styles.tableLabel as TextStyle}>Kiasi cha Mkopo</Text>
                    <Text style={styles.tableValue as TextStyle}>TSh {data.standardLoan.totalLoaned.toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})}</Text>
                </View>
                <View style={styles.tableRow as ViewStyle}>
                    <Text style={styles.tableLabel as TextStyle}>+ Riba (10%)</Text>
                    <Text style={styles.tableValue as TextStyle}>TSh {data.standardLoan.totalWithInterest.toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})}</Text>
                </View>
                <View style={styles.tableRow as ViewStyle}>
                    <Text style={styles.tableLabel as TextStyle}>Kiasi Kilicholipwa</Text>
                    <Text style={styles.tableValue as TextStyle}>TSh {data.standardLoan.totalRepayments.toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})}</Text>
                </View>
                <View style={styles.tableRow as ViewStyle}>
                    <Text style={styles.tableLabel as TextStyle}>Marejesho Mwezi {data.month}</Text>
                    <Text style={styles.tableValue as TextStyle}>TSh {data.standardLoan.currentMonthRepayment.toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})}</Text>
                </View>
                <View style={[styles.tableRow as ViewStyle, styles.tableRowHighlight as ViewStyle]}>
                    <Text style={styles.tableLabel as TextStyle}>Mkopo Uliobaki</Text>
                    <Text style={styles.tableValueBold as TextStyle}>TSh {data.standardLoan.remainingBalance.toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})}</Text>
                </View>
            </View>
        </View>

        {/* Dharura Section */}
        <View style={styles.reportSection as ViewStyle}>
            <Text style={styles.reportSectionTitle as TextStyle}>Dharura</Text>
            <View style={styles.reportTable as ViewStyle}>
                <View style={styles.tableRow as ViewStyle}>
                    <Text style={styles.tableLabel as TextStyle}>Mkopo wa Dharura</Text>
                    <Text style={styles.tableValue as TextStyle}>TSh {data.dharuraLoan.totalLoaned.toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})}</Text>
                </View>
                <View style={styles.tableRow as ViewStyle}>
                    <Text style={styles.tableLabel as TextStyle}>Kiasi Kilicholipwa</Text>
                    <Text style={styles.tableValue as TextStyle}>TSh {data.dharuraLoan.totalRepayments.toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})}</Text>
                </View>
                <View style={styles.tableRow as ViewStyle}>
                    <Text style={styles.tableLabel as TextStyle}>Marejesho Mwezi {data.month}</Text>
                    <Text style={styles.tableValue as TextStyle}>TSh {data.dharuraLoan.currentMonthRepayment.toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})}</Text>
                </View>
                <View style={[styles.tableRow as ViewStyle, styles.tableRowHighlight as ViewStyle]}>
                    <Text style={styles.tableLabel as TextStyle}>Mkopo Uliobaki</Text>
                    <Text style={styles.tableValueBold as TextStyle}>TSh {data.dharuraLoan.remainingBalance.toLocaleString('en-US', {minimumFractionDigits: 1, maximumFractionDigits: 1})}</Text>
                </View>
            </View>
        </View>
    </View>
);

// Group Report Display Component
const GroupReportDisplay = ({ data, monthName, onMemberPress, expandedMember, setExpandedMember }: any) => (
    <View style={styles.reportContainer as ViewStyle}>
        <Text style={styles.reportLogo as TextStyle}>KIKOBA</Text>
        <Text style={styles.reportTitle as TextStyle}>Taarifa za Kikoba</Text>
        <Text style={styles.reportSubtitle as TextStyle}>Mwezi wa {monthName} {data.year}</Text>
        <Text style={styles.totalMembersText as TextStyle}>Wanachama Wenye Akaunti: {data.totalMembers}</Text>

        {/* Group Table */}
        <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll as ViewStyle}>
            <View>
                <View style={styles.groupTableHeader as ViewStyle}>
                    <Text style={[styles.groupTableCell as TextStyle, styles.groupTableCellHeader as TextStyle, { width: 150 }]}>Jina</Text>
                    <Text style={[styles.groupTableCell as TextStyle, styles.groupTableCellHeader as TextStyle, { width: 100 }]}>Hisa</Text>
                    <Text style={[styles.groupTableCell as TextStyle, styles.groupTableCellHeader as TextStyle, { width: 100 }]}>Jamii</Text>
                    <Text style={[styles.groupTableCell as TextStyle, styles.groupTableCellHeader as TextStyle, { width: 120 }]}>Std Mkopo</Text>
                    <Text style={[styles.groupTableCell as TextStyle, styles.groupTableCellHeader as TextStyle, { width: 100 }]}>Std Baki</Text>
                    <Text style={[styles.groupTableCell as TextStyle, styles.groupTableCellHeader as TextStyle, { width: 100 }]}>Dhar Mkopo</Text>
                    <Text style={[styles.groupTableCell as TextStyle, styles.groupTableCellHeader as TextStyle, { width: 100 }]}>Dhar Baki</Text>
                </View>

                {data.members.map((member: any, index: number) => (
                    <View key={member.memberId}>
                        <TouchableOpacity
                            style={[styles.groupTableRow as ViewStyle, expandedMember === member.memberId && (styles.groupTableRowExpanded as ViewStyle)]}
                            onPress={() => setExpandedMember(expandedMember === member.memberId ? null : member.memberId)}
                        >
                            <Text style={[styles.groupTableCell as TextStyle, { width: 150, fontWeight: '600' }]}>{member.memberName}</Text>
                            <Text style={[styles.groupTableCell as TextStyle, { width: 100 }]}>TSh {(member.hisa.totalHisa / 1000).toFixed(0)}k</Text>
                            <Text style={[styles.groupTableCell as TextStyle, { width: 100 }]}>TSh {(member.jamii / 1000).toFixed(0)}k</Text>
                            <Text style={[styles.groupTableCell as TextStyle, { width: 120 }]}>TSh {(member.standardLoan.totalLoaned / 1000).toFixed(0)}k</Text>
                            <Text style={[styles.groupTableCell as TextStyle, { width: 100 }]}>TSh {(member.standardLoan.remainingBalance / 1000).toFixed(0)}k</Text>
                            <Text style={[styles.groupTableCell as TextStyle, { width: 100 }]}>TSh {(member.dharuraLoan.totalLoaned / 1000).toFixed(0)}k</Text>
                            <Text style={[styles.groupTableCell as TextStyle, { width: 100 }]}>TSh {(member.dharuraLoan.remainingBalance / 1000).toFixed(0)}k</Text>
                        </TouchableOpacity>

                        {/* Expanded Row */}
                        {expandedMember === member.memberId && (
                            <View style={styles.expandedRow as ViewStyle}>
                                <TouchableOpacity style={styles.expandedBtn as ViewStyle} onPress={() => onMemberPress(member)}>
                                    <Ionicons name="open-outline" size={20} color="white" />
                                    <Text style={styles.expandedBtnText as TextStyle}>View Full Report</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                ))}
            </View>
        </ScrollView>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    flex1: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 24,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: '#0F172A',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
    },
    refreshBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    tabContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: Colors.primary,
    },
    tabActive: {
        backgroundColor: Colors.primary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary,
    },
    tabTextActive: {
        color: 'white',
    },
    card: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 16,
    },
    selectorContainer: {
        gap: 16,
        marginBottom: 20,
    },
    selectorGroup: {
        gap: 8,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    monthScroll: {
        marginHorizontal: -5,
    },
    monthBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginHorizontal: 5,
    },
    monthBtnActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    monthBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
    },
    monthBtnTextActive: {
        color: 'white',
    },
    yearContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    yearBtn: {
        padding: 8,
    },
    yearText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        minWidth: 50,
        textAlign: 'center',
    },
    generateBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 12,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginBottom: 24,
    },
    generateBtnText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',
    },
    reportContainer: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    reportLogo: {
        fontSize: 28,
        fontWeight: '900',
        color: Colors.primary,
        textAlign: 'center',
        marginBottom: 8,
    },
    reportTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        textAlign: 'center',
        marginBottom: 4,
    },
    reportSubtitle: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 8,
    },
    totalMembersText: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
        marginBottom: 20,
    },
    reportSection: {
        marginBottom: 20,
    },
    reportSectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 2,
        borderBottomColor: Colors.primary,
    },
    reportTable: {
        gap: 0,
    },
    tableRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    tableRowHighlight: {
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 12,
        marginHorizontal: -12,
        paddingVertical: 12,
    },
    tableLabel: {
        fontSize: 13,
        color: '#0F172A',
        fontWeight: '500',
    },
    tableValue: {
        fontSize: 13,
        color: '#0F172A',
        fontWeight: '500',
        textAlign: 'right',
    },
    tableValueBold: {
        fontSize: 13,
        color: '#0F172A',
        fontWeight: '700',
        textAlign: 'right',
    },
    tableScroll: {
        marginHorizontal: -20,
        paddingHorizontal: 20,
    },
    groupTableHeader: {
        flexDirection: 'row',
        backgroundColor: Colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
    },
    groupTableRow: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    groupTableRowExpanded: {
        backgroundColor: '#F0F5FF',
    },
    groupTableCell: {
        fontSize: 12,
        color: '#0F172A',
        fontWeight: '400',
        paddingHorizontal: 4,
    },
    groupTableCellHeader: {
        color: 'white',
        fontWeight: '600',
        fontSize: 11,
    },
    expandedRow: {
        backgroundColor: '#F0F5FF',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    expandedBtn: {
        backgroundColor: Colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 8,
    },
    expandedBtnText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 12,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
    },
});
