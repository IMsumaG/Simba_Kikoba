import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../services/AuthContext';
import { transactionService } from '../../services/transactionService';

export default function ReportsScreen() {
    const { t, i18n } = useTranslation();
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
            Alert.alert(t('common.error'), t('common.error'));
            return;
        }

        try {
            setGenerating(true);
            const data = await transactionService.getMemberMonthlyReport(user.uid, selectedMonth, selectedYear);
            setReportData(data);
            Alert.alert(t('common.success'), t('reports.memberReportSuccess'));
        } catch (error) {
            console.error('Error generating report:', error);
            Alert.alert(t('common.error'), t('common.error'));
        } finally {
            setGenerating(false);
        }
    };

    const generateGroupReport = async () => {
        try {
            setGenerating(true);
            const data = await transactionService.getGroupMonthlyReport(selectedMonth, selectedYear);
            setGroupReportData(data);
            Alert.alert(t('common.success'), t('reports.groupReportSuccess'));
        } catch (error) {
            console.error('Error generating group report:', error);
            Alert.alert(t('common.error'), t('common.error'));
        } finally {
            setGenerating(false);
        }
    };

    const monthName = i18n.language === 'sw'
        ? (months.find(m => m.num === selectedMonth)?.sw || '')
        : (months.find(m => m.num === selectedMonth)?.name || '');

    const handleViewMemberDetails = (memberData: any) => {
        setSelectedMemberData(memberData);
        setShowMemberModal(true);
    };

    const handleRefresh = () => {
        setReportData(null);
        setGroupReportData(null);
        setExpandedMember(null);
        setShowMemberModal(false);
    };

    const handleExportPersonalReportPDF = async () => {
        if (!reportData) {
            Alert.alert(t('common.error'), t('reports.generate'));
            return;
        }

        try {
            setGenerating(true);

            const htmlContent = `
                <!DOCTYPE html>
                <html>
                    <head>
                        <meta charset="UTF-8">
                        <style>
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            body { font-family: Arial, sans-serif; margin: 20px; background: white; color: #333; }
                            .header { text-align: center; margin-bottom: 30px; }
                            .logo { font-size: 28px; font-weight: bold; color: #F57C00; margin-bottom: 10px; }
                            .title { font-size: 14px; font-weight: bold; margin: 5px 0; }
                            .subtitle { font-size: 11px; color: #666; margin-bottom: 20px; }
                            .section { margin-bottom: 20px; page-break-inside: avoid; }
                            .section-title { font-size: 12px; font-weight: bold; border-bottom: 2px solid #F57C00; padding-bottom: 6px; margin-bottom: 10px; color: #F57C00; }
                            .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #E0E0E0; font-size: 11px; }
                            .label { font-weight: 500; }
                            .value { font-weight: 600; text-align: right; }
                            .highlight { background-color: #F8FAFC; padding: 6px; border-radius: 3px; }
                            .footer { text-align: center; font-size: 9px; color: #999; margin-top: 30px; padding-top: 15px; border-top: 1px solid #E0E0E0; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <div class="logo">Simba Bingwa Kikoba Endelevu</div>
                            <div class="title">${t('reports.monthlyReport')}</div>
                            <div class="subtitle">${t('reports.month')} ${monthName} ${selectedYear}</div>
                        </div>

                        <div class="section">
                            <div class="section-title">${t('reports.memberAccount')}</div>
                            <div class="row">
                                <span class="label">${t('common.fullName')}</span>
                                <span class="value">${memberName}</span>
                            </div>
                        </div>

                        <div class="section">
                            <div class="section-title">${t('dashboard.hisa')}</div>
                            <div class="row">
                                <span class="label">${t('reports.totalHisa')}</span>
                                <span class="value">TSh ${reportData.hisa.totalHisa.toLocaleString('en-US')}</span>
                            </div>
                        </div>

                        <div class="section">
                            <div class="section-title">${t('dashboard.jamii')}</div>
                            <div class="row">
                                <span class="label">${t('reports.totalJamii')}</span>
                                <span class="value">TSh ${reportData.jamii.toLocaleString('en-US')}</span>
                            </div>
                        </div>

                        <div class="section">
                            <div class="section-title">${t('dashboard.standard')}</div>
                            <div class="row">
                                <span class="label">${t('reports.loanAmount')}</span>
                                <span class="value">TSh ${reportData.standardLoan.totalLoaned.toLocaleString('en-US')}</span>
                            </div>
                            <div class="row">
                                <span class="label">+ ${t('reports.interest')} (10%)</span>
                                <span class="value">TSh ${reportData.standardLoan.totalWithInterest.toLocaleString('en-US')}</span>
                            </div>
                            <div class="row">
                                <span class="label">${t('reports.repayment')}</span>
                                <span class="value">TSh ${reportData.standardLoan.totalRepayments.toLocaleString('en-US')}</span>
                            </div>
                            <div class="row highlight">
                                <span class="label">${t('reports.remainingBalance')}</span>
                                <span class="value">TSh ${reportData.standardLoan.remainingBalance.toLocaleString('en-US')}</span>
                            </div>
                        </div>

                        <div class="section">
                            <div class="section-title">${t('dashboard.dharura')}</div>
                            <div class="row">
                                <span class="label">${t('reports.loanAmount')}</span>
                                <span class="value">TSh ${reportData.dharuraLoan.totalLoaned.toLocaleString('en-US')}</span>
                            </div>
                            <div class="row">
                                <span class="label">${t('reports.repayment')}</span>
                                <span class="value">TSh ${reportData.dharuraLoan.totalRepayments.toLocaleString('en-US')}</span>
                            </div>
                            <div class="row highlight">
                                <span class="label">${t('reports.remainingBalance')}</span>
                                <span class="value">TSh ${reportData.dharuraLoan.remainingBalance.toLocaleString('en-US')}</span>
                            </div>
                        </div>

                        <div class="footer">
                            ${t('common.success')}: ${new Date().toLocaleDateString()} | KIKOBA Reports
                        </div>
                    </body>
                </html>
            `;

            const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
            } else {
                Alert.alert(t('common.success'), `${t('common.success')}: ${uri}`);
            }
        } catch (error) {
            console.error('Error exporting PDF:', error);
            Alert.alert(t('common.error'), t('common.error'));
        } finally {
            setGenerating(false);
        }
    };

    const handleExportGroupReportPDF = async () => {
        if (!groupReportData) {
            Alert.alert(t('common.error'), t('reports.generate'));
            return;
        }

        try {
            setGenerating(true);

            const tableRows = groupReportData.members.map((member: any) => `
                <tr>
                    <td>${member.memberName}</td>
                    <td>${member.memberEmail || '-'}</td>
                    <td>TSh ${(member.hisa.totalHisa / 1000).toFixed(0)}k</td>
                    <td>TSh ${(member.jamii / 1000).toFixed(0)}k</td>
                    <td>TSh ${(member.standardLoan.totalLoaned / 1000).toFixed(0)}k</td>
                    <td>TSh ${(member.standardLoan.remainingBalance / 1000).toFixed(0)}k</td>
                    <td>TSh ${(member.dharuraLoan.totalLoaned / 1000).toFixed(0)}k</td>
                    <td>TSh ${(member.dharuraLoan.remainingBalance / 1000).toFixed(0)}k</td>
                </tr>
            `).join('');

            const htmlContent = `
                <!DOCTYPE html>
                <html>
                    <head>
                        <meta charset="UTF-8">
                        <style>
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            body { font-family: Arial, sans-serif; margin: 12px; background: white; color: #333; }
                            .header { text-align: center; margin-bottom: 20px; }
                            .logo { font-size: 24px; font-weight: bold; color: #F57C00; margin-bottom: 6px; }
                            .title { font-size: 13px; font-weight: bold; margin: 3px 0; }
                            .subtitle { font-size: 10px; color: #666; margin: 2px 0; }
                            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
                            th { 
                                background-color: #F57C00; 
                                color: white; 
                                padding: 7px 4px; 
                                text-align: left; 
                                font-size: 9px; 
                                font-weight: bold;
                                border: 1px solid #D85D01;
                            }
                            td { 
                                padding: 5px 4px; 
                                border: 1px solid #E0E0E0; 
                                font-size: 9px;
                            }
                            tr:nth-child(even) { background-color: #F8FAFC; }
                            .footer { text-align: center; font-size: 8px; color: #999; margin-top: 15px; padding-top: 8px; border-top: 1px solid #E0E0E0; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <div class="logo">Simba Bingwa Kikoba Endelevu</div>
                            <div class="title">${t('reports.group')}</div>
                            <div class="subtitle">${t('reports.month')} ${monthName} ${selectedYear}</div>
                            <div class="subtitle">${t('reports.memberAccount')}: ${groupReportData.totalMembers}</div>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th>${t('common.fullName')}</th>
                                    <th>${t('common.email')}</th>
                                    <th>${t('dashboard.hisa')}</th>
                                    <th>${t('dashboard.jamii')}</th>
                                    <th>${t('reports.stdLoan')}</th>
                                    <th>${t('reports.stdBalance')}</th>
                                    <th>${t('reports.dharLoan')}</th>
                                    <th>${t('reports.dharBalance')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRows}
                            </tbody>
                        </table>

                        <div class="footer">
                            ${t('common.success')}: ${new Date().toLocaleDateString()} | KIKOBA Reports
                        </div>
                    </body>
                </html>
            `;

            const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
            } else {
                Alert.alert(t('common.success'), `${t('common.success')}: ${uri}`);
            }
        } catch (error) {
            console.error('Error exporting PDF:', error);
            Alert.alert(t('common.error'), t('common.error'));
        } finally {
            setGenerating(false);
        }
    };

    const MonthYearSelector = () => (
        <View style={styles.card as ViewStyle}>
            <Text style={styles.cardTitle as TextStyle}>{t('reports.selectMonthYear')}</Text>

            <View style={styles.selectorContainer as ViewStyle}>
                <View style={styles.selectorGroup as ViewStyle}>
                    <Text style={styles.label as TextStyle}>{t('reports.month')}</Text>
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
                                    {i18n.language === 'sw' ? month.sw : month.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                <View style={styles.selectorGroup as ViewStyle}>
                    <Text style={styles.label as TextStyle}>{t('reports.year')}</Text>
                    <View style={styles.yearContainer as ViewStyle}>
                        <TouchableOpacity
                            onPress={() => setSelectedYear(selectedYear - 1)}
                            style={styles.yearBtn as ViewStyle}
                        >
                            <Ionicons name="chevron-back" size={20} color={Colors.primary} />
                        </TouchableOpacity>
                        <TextInput
                            value={selectedYear.toString()}
                            onChangeText={(text: string) => {
                                const year = parseInt(text) || new Date().getFullYear();
                                if (year >= 1900 && year <= 2100) {
                                    setSelectedYear(year);
                                }
                            }}
                            keyboardType="number-pad"
                            maxLength={4}
                            style={styles.yearInput as TextStyle}
                        />
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
                        <Text style={styles.generateBtnText as TextStyle}>{t('reports.generate')}</Text>
                    </>
                )}
            </TouchableOpacity>

            {reportData && <PersonalReportDisplay data={reportData} monthName={monthName} memberName={memberName} onExportPDF={handleExportPersonalReportPDF} />}
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
                        <Text style={styles.generateBtnText as TextStyle}>{t('reports.generateGroup')}</Text>
                    </>
                )}
            </TouchableOpacity>

            {groupReportData && <GroupReportDisplay data={groupReportData} monthName={monthName} onMemberPress={handleViewMemberDetails} expandedMember={expandedMember} setExpandedMember={setExpandedMember} onExportPDF={handleExportGroupReportPDF} />}
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
                            <Text style={styles.title as TextStyle}>{t('reports.title')}</Text>
                            <Text style={styles.subtitle as TextStyle}>{t('reports.monthlyReport')}</Text>
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
                            <Text style={[styles.tabText as TextStyle, activeTab === 'personal' && (styles.tabTextActive as TextStyle)]}>{t('reports.personal')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.tab as ViewStyle, activeTab === 'group' && (styles.tabActive as ViewStyle)]}
                            onPress={() => setActiveTab('group')}
                        >
                            <Ionicons name={activeTab === 'group' ? 'people' : 'people-outline'} size={20} color={activeTab === 'group' ? 'white' : Colors.primary} />
                            <Text style={[styles.tabText as TextStyle, activeTab === 'group' && (styles.tabTextActive as TextStyle)]}>{t('reports.group')}</Text>
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
                        {selectedMemberData && <PersonalReportDisplay data={selectedMemberData} monthName={monthName} memberName={selectedMemberData?.memberName} onExportPDF={handleExportPersonalReportPDF} />}
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

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
    yearInput: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        minWidth: 60,
        textAlign: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: Colors.primary,
        borderRadius: 6,
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
    exportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        marginHorizontal: 20,
        marginVertical: 16,
        gap: 8,
    },
    exportButtonText: {
        color: 'white',
        fontWeight: '600',
        fontSize: 14,
    },
});

// Personal Report Display Component
const PersonalReportDisplay = ({ data, monthName, memberName, onExportPDF }: any) => {
    const { t } = useTranslation();
    return (
        <View style={styles.reportContainer as ViewStyle}>
            <Text style={styles.reportLogo as TextStyle}>KIKOBA</Text>
            <Text style={styles.reportTitle as TextStyle}>{t('reports.monthlyReport')}</Text>
            <Text style={styles.reportSubtitle as TextStyle}>{t('reports.month')} {monthName} {data.year}</Text>

            {/* Member Info */}
            <View style={styles.reportSection as ViewStyle}>
                <Text style={styles.reportSectionTitle as TextStyle}>{t('reports.memberAccount')}</Text>
                <View style={styles.reportTable as ViewStyle}>
                    <View style={styles.tableRow as ViewStyle}>
                        <Text style={styles.tableLabel as TextStyle}>{t('common.fullName')}</Text>
                        <Text style={styles.tableValue as TextStyle}>{memberName}</Text>
                    </View>
                </View>
            </View>

            {/* Hisa Section */}
            <View style={styles.reportSection as ViewStyle}>
                <Text style={styles.reportSectionTitle as TextStyle}>{t('dashboard.hisa')}</Text>
                <View style={styles.reportTable as ViewStyle}>
                    <View style={styles.tableRow as ViewStyle}>
                        <Text style={styles.tableLabel as TextStyle}>{t('reports.totalHisa')} ({t('reports.prev')})</Text>
                        <Text style={styles.tableValue as TextStyle}>TSh {data.hisa.previousBalance.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</Text>
                    </View>
                    <View style={styles.tableRow as ViewStyle}>
                        <Text style={styles.tableLabel as TextStyle}>{t('reports.hisaMonth')} {data.month}</Text>
                        <Text style={styles.tableValue as TextStyle}>TSh {data.hisa.currentMonthContribution.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</Text>
                    </View>
                    <View style={[styles.tableRow as ViewStyle, styles.tableRowHighlight as ViewStyle]}>
                        <Text style={styles.tableLabel as TextStyle}>{t('reports.totalHisa')}</Text>
                        <Text style={styles.tableValueBold as TextStyle}>TSh {data.hisa.totalHisa.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</Text>
                    </View>
                </View>
            </View>

            {/* Jamii Section */}
            <View style={styles.reportSection as ViewStyle}>
                <Text style={styles.reportSectionTitle as TextStyle}>{t('dashboard.jamii')}</Text>
                <View style={styles.reportTable as ViewStyle}>
                    <View style={styles.tableRow as ViewStyle}>
                        <Text style={styles.tableLabel as TextStyle}>{t('reports.totalJamii')}</Text>
                        <Text style={styles.tableValue as TextStyle}>TSh {data.jamii.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</Text>
                    </View>
                </View>
            </View>

            {/* Standard Loan Section */}
            <View style={styles.reportSection as ViewStyle}>
                <Text style={styles.reportSectionTitle as TextStyle}>{t('dashboard.standard')}</Text>
                <View style={styles.reportTable as ViewStyle}>
                    <View style={styles.tableRow as ViewStyle}>
                        <Text style={styles.tableLabel as TextStyle}>{t('reports.loanAmount')}</Text>
                        <Text style={styles.tableValue as TextStyle}>TSh {data.standardLoan.totalLoaned.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</Text>
                    </View>
                    <View style={styles.tableRow as ViewStyle}>
                        <Text style={styles.tableLabel as TextStyle}>+ {t('reports.interest')} (10%)</Text>
                        <Text style={styles.tableValue as TextStyle}>TSh {data.standardLoan.totalWithInterest.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</Text>
                    </View>
                    <View style={styles.tableRow as ViewStyle}>
                        <Text style={styles.tableLabel as TextStyle}>{t('reports.repayment')}</Text>
                        <Text style={styles.tableValue as TextStyle}>TSh {data.standardLoan.totalRepayments.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</Text>
                    </View>
                    <View style={styles.tableRow as ViewStyle}>
                        <Text style={styles.tableLabel as TextStyle}>{t('reports.repayment')} {t('reports.month')} {data.month}</Text>
                        <Text style={styles.tableValue as TextStyle}>TSh {data.standardLoan.currentMonthRepayment.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</Text>
                    </View>
                    <View style={[styles.tableRow as ViewStyle, styles.tableRowHighlight as ViewStyle]}>
                        <Text style={styles.tableLabel as TextStyle}>{t('reports.remainingBalance')}</Text>
                        <Text style={styles.tableValueBold as TextStyle}>TSh {data.standardLoan.remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</Text>
                    </View>
                </View>
            </View>

            {/* Dharura Section */}
            <View style={styles.reportSection as ViewStyle}>
                <Text style={styles.reportSectionTitle as TextStyle}>{t('dashboard.dharura')}</Text>
                <View style={styles.reportTable as ViewStyle}>
                    <View style={styles.tableRow as ViewStyle}>
                        <Text style={styles.tableLabel as TextStyle}>{t('reports.loanAmount')}</Text>
                        <Text style={styles.tableValue as TextStyle}>TSh {data.dharuraLoan.totalLoaned.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</Text>
                    </View>
                    <View style={styles.tableRow as ViewStyle}>
                        <Text style={styles.tableLabel as TextStyle}>{t('reports.repayment')}</Text>
                        <Text style={styles.tableValue as TextStyle}>TSh {data.dharuraLoan.totalRepayments.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</Text>
                    </View>
                    <View style={styles.tableRow as ViewStyle}>
                        <Text style={styles.tableLabel as TextStyle}>{t('reports.repayment')} {t('reports.month')} {data.month}</Text>
                        <Text style={styles.tableValue as TextStyle}>TSh {data.dharuraLoan.currentMonthRepayment.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</Text>
                    </View>
                    <View style={[styles.tableRow as ViewStyle, styles.tableRowHighlight as ViewStyle]}>
                        <Text style={styles.tableLabel as TextStyle}>{t('reports.remainingBalance')}</Text>
                        <Text style={styles.tableValueBold as TextStyle}>TSh {data.dharuraLoan.remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</Text>
                    </View>
                </View>
            </View>
            {/* Export Button */}
            <TouchableOpacity
                style={styles.exportButton as ViewStyle}
                onPress={onExportPDF}
            >
                <Ionicons name="download" size={20} color="white" />
                <Text style={styles.exportButtonText as TextStyle}>{t('reports.downloadPDF')}</Text>
            </TouchableOpacity>
        </View>
    );
};

// Group Report Display Component
const GroupReportDisplay = ({ data, monthName, onMemberPress, expandedMember, setExpandedMember, onExportPDF }: any) => {
    const { t } = useTranslation();
    return (
        <View style={styles.reportContainer as ViewStyle}>
            <Text style={styles.reportLogo as TextStyle}>KIKOBA</Text>
            <Text style={styles.reportTitle as TextStyle}>{t('reports.group')}</Text>
            <Text style={styles.reportSubtitle as TextStyle}>{t('reports.month')} {monthName} {data.year}</Text>
            <Text style={styles.totalMembersText as TextStyle}>{t('reports.memberAccount')}: {data.totalMembers}</Text>

            {/* Group Table */}
            <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScroll as ViewStyle}>
                <View>
                    <View style={styles.groupTableHeader as ViewStyle}>
                        <Text style={[styles.groupTableCell as TextStyle, styles.groupTableCellHeader as TextStyle, { width: 150 }]}>{t('common.fullName')}</Text>
                        <Text style={[styles.groupTableCell as TextStyle, styles.groupTableCellHeader as TextStyle, { width: 100 }]}>{t('dashboard.hisa')}</Text>
                        <Text style={[styles.groupTableCell as TextStyle, styles.groupTableCellHeader as TextStyle, { width: 100 }]}>{t('dashboard.jamii')}</Text>
                        <Text style={[styles.groupTableCell as TextStyle, styles.groupTableCellHeader as TextStyle, { width: 120 }]}>{t('reports.stdLoan')}</Text>
                        <Text style={[styles.groupTableCell as TextStyle, styles.groupTableCellHeader as TextStyle, { width: 100 }]}>{t('reports.stdBalance')}</Text>
                        <Text style={[styles.groupTableCell as TextStyle, styles.groupTableCellHeader as TextStyle, { width: 100 }]}>{t('reports.dharLoan')}</Text>
                        <Text style={[styles.groupTableCell as TextStyle, styles.groupTableCellHeader as TextStyle, { width: 100 }]}>{t('reports.dharBalance')}</Text>
                    </View>

                    {data.members.map((member: any) => (
                        <View key={member.memberId}>
                            <TouchableOpacity
                                style={[styles.groupTableRow as ViewStyle, expandedMember === member.memberId && (styles.groupTableRowExpanded as ViewStyle)]}
                                onPress={() => setExpandedMember(expandedMember === member.memberId ? null : member.memberId)}
                            >
                                <Text style={[styles.groupTableCell as TextStyle, { width: 150, fontWeight: '600' }]}>{member.memberName}</Text>
                                <Text style={[styles.groupTableCell as TextStyle, { width: 100 }]}>TSh {Math.round(member.hisa.totalHisa).toLocaleString()}</Text>
                                <Text style={[styles.groupTableCell as TextStyle, { width: 100 }]}>TSh {Math.round(member.jamii).toLocaleString()}</Text>
                                <Text style={[styles.groupTableCell as TextStyle, { width: 120 }]}>TSh {Math.round(member.standardLoan.totalLoaned).toLocaleString()}</Text>
                                <Text style={[styles.groupTableCell as TextStyle, { width: 100 }]}>TSh {Math.round(member.standardLoan.remainingBalance).toLocaleString()}</Text>
                                <Text style={[styles.groupTableCell as TextStyle, { width: 100 }]}>TSh {Math.round(member.dharuraLoan.totalLoaned).toLocaleString()}</Text>
                                <Text style={[styles.groupTableCell as TextStyle, { width: 100 }]}>TSh {Math.round(member.dharuraLoan.remainingBalance).toLocaleString()}</Text>
                            </TouchableOpacity>

                            {/* Expanded Row */}
                            {expandedMember === member.memberId && (
                                <View style={styles.expandedRow as ViewStyle}>
                                    <TouchableOpacity style={styles.expandedBtn as ViewStyle} onPress={() => onMemberPress(member)}>
                                        <Ionicons name="open-outline" size={20} color="white" />
                                        <Text style={styles.expandedBtnText as TextStyle}>{t('reports.viewFullReport')}</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* Export Button */}
            <TouchableOpacity
                style={[styles.exportButton as ViewStyle, { marginTop: 16 }]}
                onPress={onExportPDF}
            >
                <Ionicons name="download" size={20} color="white" />
                <Text style={styles.exportButtonText as TextStyle}>{t('reports.downloadPDF')}</Text>
            </TouchableOpacity>
        </View>
    );
};


