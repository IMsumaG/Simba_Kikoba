import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Modal, ScrollView, StatusBar, StyleSheet, Text, TextInput, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../services/AuthContext';
import { transactionService } from '../../services/transactionService';

export default function ReportsScreen() {
    const { t, i18n } = useTranslation();
    const { colors, theme } = useTheme();
    const styles = createStyles(colors, theme);
    const { user, role } = useAuth();
    const isAdmin = role === 'Admin';

    const [generating, setGenerating] = useState(false);
    const [reportData, setReportData] = useState<any>(null);
    const [groupReportData, setGroupReportData] = useState<any>(null);
    const [memberName, setMemberName] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [activeTab, setActiveTab] = useState<'personal' | 'group'>('personal');
    const [reportType, setReportType] = useState<'monthly' | 'statement'>('monthly');
    const [startMonth, setStartMonth] = useState(new Date().getMonth() + 1);
    const [startYear, setStartYear] = useState(new Date().getFullYear());
    const [endMonth, setEndMonth] = useState(new Date().getMonth() + 1);
    const [endYear, setEndYear] = useState(new Date().getFullYear());
    const [expandedMember, setExpandedMember] = useState<string | null>(null);
    const [selectedMemberData, setSelectedMemberData] = useState<any>(null);
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [pickerTarget, setPickerTarget] = useState<'selected' | 'start' | 'end'>('selected');

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
            let data;
            if (reportType === 'monthly') {
                data = await transactionService.getMemberMonthlyReport(user.uid, selectedMonth, selectedYear);
            } else {
                // For statements, getMemberStatement returns an array of monthly reports
                data = await transactionService.getMemberStatement(user.uid, startMonth, startYear, endMonth, endYear);
            }
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

    const getMonthName = (monthNum: number) => {
        return i18n.language === 'sw'
            ? (months.find(m => m.num === monthNum)?.sw || '')
            : (months.find(m => m.num === monthNum)?.name || '');
    };

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

            const renderMonthHTML = (data: any, title?: string) => {
                const reportMonthName = getMonthName(data.month);
                return `
                    <div class="month-page">
                        <div class="header">
                            <div class="logo">Simba Bingwa Kikoba Endelevu</div>
                            <div class="title">${title || t('reports.monthlyReport')}</div>
                            <div class="subtitle">${reportMonthName} ${data.year}</div>
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
                                <span class="label">${t('reports.totalHisa')} (${t('reports.prev')})</span>
                                <span class="value">TSh ${data.hisa.previousBalance.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                            </div>
                            <div class="row">
                                <span class="label">${t('reports.hisaMonth')} ${data.month}</span>
                                <span class="value">TSh ${data.hisa.currentMonthContribution.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                            </div>
                            <div class="row highlight">
                                <span class="label">${t('reports.totalHisa')}</span>
                                <span class="value">TSh ${data.hisa.totalHisa.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                            </div>
                        </div>

                        <div class="section">
                            <div class="section-title">${t('dashboard.jamii')}</div>
                            <div class="row highlight">
                                <span class="label">${t('reports.totalJamii')}</span>
                                <span class="value">TSh ${data.jamii.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                            </div>
                        </div>

                        <div class="section">
                            <div class="section-title">${t('dashboard.standard')}</div>
                            <div class="row">
                                <span class="label">${t('reports.loanAmount')}</span>
                                <span class="value">TSh ${data.standardLoan.totalLoaned.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                            </div>
                            <div class="row">
                                <span class="label">+ ${t('reports.interest')} (10%)</span>
                                <span class="value">TSh ${data.standardLoan.totalWithInterest.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                            </div>
                            <div class="row">
                                <span class="label">${t('reports.repayment')} (Jumla)</span>
                                <span class="value">TSh ${data.standardLoan.totalRepayments.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                            </div>
                            <div class="row">
                                <span class="label">${t('reports.repayment')} ${t('reports.month')} ${data.month}</span>
                                <span class="value">TSh ${data.standardLoan.currentMonthRepayment.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                            </div>
                            <div class="row highlight">
                                <span class="label">${t('reports.remainingBalance')}</span>
                                <span class="value">TSh ${data.standardLoan.remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                            </div>
                        </div>

                        <div class="section">
                            <div class="section-title">${t('dashboard.dharura')}</div>
                            <div class="row">
                                <span class="label">${t('reports.loanAmount')}</span>
                                <span class="value">TSh ${data.dharuraLoan.totalLoaned.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                            </div>
                            <div class="row">
                                <span class="label">${t('reports.repayment')} (Jumla)</span>
                                <span class="value">TSh ${data.dharuraLoan.totalRepayments.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                            </div>
                            <div class="row">
                                <span class="label">${t('reports.repayment')} ${t('reports.month')} ${data.month}</span>
                                <span class="value">TSh ${data.dharuraLoan.currentMonthRepayment.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                            </div>
                            <div class="row highlight">
                                <span class="label">${t('reports.remainingBalance')}</span>
                                <span class="value">TSh ${data.dharuraLoan.remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                            </div>
                        </div>
                    </div>
                `;
            };

            let monthsHTML = '';
            if (Array.isArray(reportData)) {
                monthsHTML = reportData.map(d => renderMonthHTML(d, t('reports.statement'))).join('<div style="page-break-after: always;"></div>');
            } else {
                monthsHTML = renderMonthHTML(reportData);
            }

            const htmlContent = `
                <!DOCTYPE html>
                <html>
                    <head>
                        <meta charset="UTF-8">
                        <style>
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            body { font-family: 'Helvetica', Arial, sans-serif; background: white; color: #1F2937; }
                            .month-page { padding: 40px; }
                            .header { text-align: center; margin-bottom: 40px; }
                            .logo { font-size: 32px; font-weight: 900; color: #F57C00; margin-bottom: 15px; letter-spacing: -1px; }
                            .title { font-size: 18px; font-weight: 700; margin: 8px 0; color: #374151; text-transform: uppercase; }
                            .subtitle { font-size: 14px; color: #6B7280; font-weight: 500; }
                            .section { margin-bottom: 30px; }
                            .section-title { 
                                font-size: 14px; 
                                font-weight: 800; 
                                color: white; 
                                background-color: #F57C00; 
                                padding: 10px 15px; 
                                border-radius: 6px;
                                margin-bottom: 15px;
                                text-transform: uppercase;
                                letter-spacing: 0.5px;
                            }
                            .row { display: flex; justify-content: space-between; padding: 12px 15px; border-bottom: 1px solid #F3F4F6; font-size: 12px; }
                            .label { color: #4B5563; font-weight: 500; }
                            .value { color: #111827; font-weight: 700; text-align: right; }
                            .highlight { background-color: rgba(245, 124, 0, 0.05); border-bottom: 2px solid #F57C00; }
                            .footer { text-align: center; font-size: 10px; color: #9CA3AF; margin-top: 50px; padding-top: 20px; border-top: 1px solid #E5E7EB; }
                        </style>
                    </head>
                    <body>
                        ${monthsHTML}
                        <div class="footer">
                            ${t('common.success')}: ${new Date().toLocaleDateString()} | © Simba Bingwa Kikoba Endelevu
                        </div>
                    </body>
                </html>
            `;

            const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });

            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
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
                    <td style="font-weight: 700;">${member.memberName}</td>
                    <td>TSh ${Math.round(member.hisa.totalHisa).toLocaleString()}</td>
                    <td>TSh ${Math.round(member.jamii).toLocaleString()}</td>
                    <td>TSh ${Math.round(member.standardLoan.totalLoaned).toLocaleString()}</td>
                    <td style="color: ${member.standardLoan.remainingBalance > 0 ? '#EF4444' : '#10B981'}; font-weight: 700;">TSh ${Math.round(member.standardLoan.remainingBalance).toLocaleString()}</td>
                    <td>TSh ${Math.round(member.dharuraLoan.totalLoaned).toLocaleString()}</td>
                    <td style="color: ${member.dharuraLoan.remainingBalance > 0 ? '#EF4444' : '#10B981'}; font-weight: 700;">TSh ${Math.round(member.dharuraLoan.remainingBalance).toLocaleString()}</td>
                </tr>
            `).join('');

            const htmlContent = `
                <!DOCTYPE html>
                <html>
                    <head>
                        <meta charset="UTF-8">
                        <style>
                            * { margin: 0; padding: 0; box-sizing: border-box; }
                            body { font-family: 'Helvetica', Arial, sans-serif; background: white; color: #1F2937; padding: 30px; }
                            .header { text-align: center; margin-bottom: 30px; }
                            .logo { font-size: 28px; font-weight: 900; color: #F57C00; margin-bottom: 10px; }
                            .title { font-size: 16px; font-weight: 700; color: #374151; text-transform: uppercase; margin-bottom: 5px; }
                            .subtitle { font-size: 12px; color: #6B7280; margin-bottom: 2px; }
                            table { width: 100%; border-collapse: collapse; margin-top: 25px; font-size: 10px; }
                            th { 
                                background-color: #F57C00; 
                                color: white; 
                                padding: 12px 8px; 
                                text-align: left; 
                                border: 1px solid #D85D01;
                                text-transform: uppercase;
                                letter-spacing: 0.5px;
                            }
                            td { 
                                padding: 10px 8px; 
                                border: 1px solid #E5E7EB; 
                                color: #374151;
                            }
                            tr:nth-child(even) { background-color: #F9FAFB; }
                            .footer { text-align: center; font-size: 9px; color: #9CA3AF; margin-top: 40px; padding-top: 15px; border-top: 1px solid #E5E7EB; }
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
                            ${t('common.success')}: ${new Date().toLocaleDateString()} | © Simba Bingwa Kikoba Endelevu
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

    const CustomDropdown = ({ label, value, onPress }: { label: string, value: string, onPress: () => void }) => (
        <View style={styles.selectorGroup as ViewStyle}>
            <Text style={styles.label as TextStyle}>{label}</Text>
            <TouchableOpacity
                onPress={onPress}
                style={{
                    backgroundColor: colors.background,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >
                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>{value}</Text>
                <Ionicons name="chevron-down" size={20} color={colors.primary} />
            </TouchableOpacity>
        </View>
    );

    const MonthYearSelector = () => (
        <View style={styles.card as ViewStyle}>
            <Text style={styles.cardTitle as TextStyle}>{t('reports.selectMonthYear')}</Text>

            <View style={styles.selectorContainer as ViewStyle}>
                <CustomDropdown
                    label={t('reports.month')}
                    value={getMonthName(selectedMonth)}
                    onPress={() => {
                        setPickerTarget('selected');
                        setShowMonthPicker(true);
                    }}
                />

                <View style={styles.selectorGroup as ViewStyle}>
                    <Text style={styles.label as TextStyle}>{t('reports.year')}</Text>
                    <View style={styles.yearContainer as ViewStyle}>
                        <TouchableOpacity
                            onPress={() => setSelectedYear(selectedYear - 1)}
                            style={styles.yearBtn as ViewStyle}
                        >
                            <Ionicons name="chevron-back" size={20} color={colors.primary} />
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
                            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );

    const DateRangeSelector = () => (
        <View style={styles.card as ViewStyle}>
            <Text style={styles.cardTitle as TextStyle}>{t('reports.selectDateRange')}</Text>

            <View style={styles.selectorContainer as ViewStyle}>
                <View style={{ gap: 16 }}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ flex: 2 }}>
                            <CustomDropdown
                                label={t('reports.startDate')}
                                value={getMonthName(startMonth)}
                                onPress={() => {
                                    setPickerTarget('start');
                                    setShowMonthPicker(true);
                                }}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label as TextStyle}>{t('reports.year')}</Text>
                            <TextInput
                                value={startYear.toString()}
                                onChangeText={(text) => {
                                    const year = parseInt(text) || new Date().getFullYear();
                                    if (year >= 1900 && year <= 2100) setStartYear(year);
                                }}
                                keyboardType="number-pad"
                                maxLength={4}
                                style={[styles.yearInput as TextStyle, { backgroundColor: colors.background, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginTop: 0 }]}
                            />
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <View style={{ flex: 2 }}>
                            <CustomDropdown
                                label={t('reports.endDate')}
                                value={getMonthName(endMonth)}
                                onPress={() => {
                                    setPickerTarget('end');
                                    setShowMonthPicker(true);
                                }}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label as TextStyle}>{t('reports.year')}</Text>
                            <TextInput
                                value={endYear.toString()}
                                onChangeText={(text) => {
                                    const year = parseInt(text) || new Date().getFullYear();
                                    if (year >= 1900 && year <= 2100) setEndYear(year);
                                }}
                                keyboardType="number-pad"
                                maxLength={4}
                                style={[styles.yearInput as TextStyle, { backgroundColor: colors.background, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, marginTop: 0 }]}
                            />
                        </View>
                    </View>
                </View>
            </View>
        </View>
    );

    const PersonalReportContent = () => (
        <>
            <View style={styles.tabContainer as ViewStyle}>
                <TouchableOpacity
                    style={[styles.tab as ViewStyle, reportType === 'monthly' && (styles.tabActive as ViewStyle)]}
                    onPress={() => setReportType('monthly')}
                >
                    <Text style={[styles.tabText as TextStyle, reportType === 'monthly' && (styles.tabTextActive as TextStyle)]}>{t('reports.monthlyReport')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tab as ViewStyle, reportType === 'statement' && (styles.tabActive as ViewStyle)]}
                    onPress={() => setReportType('statement')}
                >
                    <Text style={[styles.tabText as TextStyle, reportType === 'statement' && (styles.tabTextActive as TextStyle)]}>{t('reports.statement')}</Text>
                </TouchableOpacity>
            </View>

            {reportType === 'monthly' ? <MonthYearSelector /> : <DateRangeSelector />}

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


            {reportData && (
                reportType === 'statement' && Array.isArray(reportData) ? (
                    // Display multiple monthly reports for statement
                    <>
                        {reportData.map((monthReport: any, index: number) => {
                            const reportMonthName = getMonthName(monthReport.month);
                            return (
                                <View key={`${monthReport.year}-${monthReport.month}`} style={{ marginBottom: index < reportData.length - 1 ? 24 : 0 }}>
                                    <PersonalReportDisplay
                                        data={monthReport}
                                        monthName={reportMonthName}
                                        memberName={memberName}
                                        onExportPDF={handleExportPersonalReportPDF}
                                        styles={styles}
                                        colors={colors}
                                        title={`${reportMonthName} ${monthReport.year}`}
                                        hideExportButton={index < reportData.length - 1}
                                    />
                                </View>
                            );
                        })}
                    </>
                ) : (
                    // Display single monthly report  
                    <PersonalReportDisplay
                        data={reportData}
                        monthName={reportType === 'monthly' ? monthName : `${getMonthName(startMonth)} ${startYear} - ${getMonthName(endMonth)} ${endYear}`}
                        memberName={memberName}
                        onExportPDF={handleExportPersonalReportPDF}
                        styles={styles}
                        colors={colors}
                        title={reportType === 'statement' ? "Member Statement" : undefined}
                    />
                )
            )}
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

            {groupReportData && <GroupReportDisplay data={groupReportData} monthName={monthName} onMemberPress={handleViewMemberDetails} expandedMember={expandedMember} setExpandedMember={setExpandedMember} onExportPDF={handleExportGroupReportPDF} styles={styles} colors={colors} />}
        </>
    );

    return (
        <SafeAreaView style={styles.container as ViewStyle}>
            <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
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
                            <Ionicons name="refresh" size={22} color={colors.primary} />
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
                            <Ionicons name={activeTab === 'personal' ? 'person' : 'person-outline'} size={20} color={activeTab === 'personal' ? 'white' : colors.primary} />
                            <Text style={[styles.tabText as TextStyle, activeTab === 'personal' && (styles.tabTextActive as TextStyle)]}>{t('reports.personal')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.tab as ViewStyle, activeTab === 'group' && (styles.tabActive as ViewStyle)]}
                            onPress={() => setActiveTab('group')}
                        >
                            <Ionicons name={activeTab === 'group' ? 'people' : 'people-outline'} size={20} color={activeTab === 'group' ? 'white' : colors.primary} />
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
                            <Ionicons name="arrow-back" size={24} color={colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle as TextStyle}>{selectedMemberData?.memberName}</Text>
                        <View style={{ width: 24 }} />
                    </View>
                    <ScrollView contentContainerStyle={styles.scrollContent as ViewStyle}>
                        {selectedMemberData && <PersonalReportDisplay data={selectedMemberData} monthName={monthName} memberName={selectedMemberData?.memberName} onExportPDF={handleExportPersonalReportPDF} styles={styles} colors={colors} />}
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* Month Picker Modal */}
            <Modal visible={showMonthPicker} animationType="fade" transparent={true}>
                <TouchableOpacity
                    style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
                    onPress={() => setShowMonthPicker(false)}
                    activeOpacity={1}
                >
                    <View style={{ backgroundColor: colors.card, width: '80%', borderRadius: 16, padding: 20, maxHeight: '70%', borderWidth: 1, borderColor: colors.border }}>
                        <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 15, textAlign: 'center' }}>{t('reports.month')}</Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {months.map(month => (
                                <TouchableOpacity
                                    key={month.num}
                                    onPress={() => {
                                        if (pickerTarget === 'selected') setSelectedMonth(month.num);
                                        else if (pickerTarget === 'start') setStartMonth(month.num);
                                        else if (pickerTarget === 'end') setEndMonth(month.num);
                                        setShowMonthPicker(false);
                                    }}
                                    style={{
                                        paddingVertical: 12,
                                        borderBottomWidth: 1,
                                        borderBottomColor: colors.border,
                                        alignItems: 'center'
                                    }}
                                >
                                    <Text style={{
                                        fontSize: 16,
                                        fontWeight: '600',
                                        color: (pickerTarget === 'selected' ? selectedMonth : pickerTarget === 'start' ? startMonth : endMonth) === month.num ? colors.primary : colors.text
                                    }}>
                                        {i18n.language === 'sw' ? month.sw : month.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            onPress={() => setShowMonthPicker(false)}
                            style={{ marginTop: 15, padding: 12, backgroundColor: colors.background, borderRadius: 12, alignItems: 'center' }}
                        >
                            <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('common.cancel')}</Text>
                        </TouchableOpacity>
                    </View>
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
        color: colors.text,
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    refreshBtn: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.primary,
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
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    tabActive: {
        backgroundColor: colors.primary,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
    },
    tabTextActive: {
        color: 'white',
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
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
        color: colors.textSecondary,
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
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        marginHorizontal: 5,
    },
    monthBtnActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    monthBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    monthBtnTextActive: {
        color: 'white',
    },
    yearContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: colors.background,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    yearBtn: {
        padding: 8,
    },
    yearText: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        minWidth: 50,
        textAlign: 'center',
    },
    yearInput: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        minWidth: 60,
        textAlign: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: colors.primary,
        borderRadius: 6,
    },
    generateBtn: {
        backgroundColor: colors.primary,
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
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    reportLogo: {
        fontSize: 28,
        fontWeight: '900',
        color: colors.primary,
        textAlign: 'center',
        marginBottom: 8,
    },
    reportTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 4,
    },
    reportSubtitle: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 8,
    },
    totalMembersText: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
    },
    reportSection: {
        marginBottom: 20,
    },
    reportSectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 12,
        paddingBottom: 8,
        borderBottomWidth: 2,
        borderBottomColor: colors.primary,
    },
    reportTable: {
        gap: 0,
    },
    tableRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    tableRowHighlight: {
        backgroundColor: theme === 'dark' ? colors.backgroundMuted : '#FFF7ED',
        paddingHorizontal: 12,
        marginHorizontal: -12,
        paddingVertical: 12,
    },
    tableLabel: {
        fontSize: 13,
        color: colors.text,
        fontWeight: '500',
    },
    tableValue: {
        fontSize: 13,
        color: colors.text,
        fontWeight: '500',
        textAlign: 'right',
    },
    tableValueBold: {
        fontSize: 13,
        color: colors.text,
        fontWeight: '700',
        textAlign: 'right',
    },
    tableScroll: {
        marginHorizontal: -20,
        paddingHorizontal: 20,
    },
    groupTableHeader: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
    },
    groupTableRow: {
        flexDirection: 'row',
        backgroundColor: colors.background,
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    groupTableRowExpanded: {
        backgroundColor: theme === 'dark' ? colors.backgroundMuted : '#F0F5FF',
    },
    groupTableCell: {
        fontSize: 12,
        color: colors.text,
        fontWeight: '400',
        paddingHorizontal: 4,
    },
    groupTableCellHeader: {
        color: 'white',
        fontWeight: '600',
        fontSize: 11,
    },
    expandedRow: {
        backgroundColor: theme === 'dark' ? colors.backgroundMuted : '#F0F5FF',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    expandedBtn: {
        backgroundColor: colors.primary,
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
        borderBottomColor: colors.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    exportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
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
const PersonalReportDisplay = ({ data, monthName, memberName, onExportPDF, styles, colors, title, hideExportButton }: any) => {
    const { t } = useTranslation();
    return (
        <View style={styles.reportContainer as ViewStyle}>
            <Text style={styles.reportLogo as TextStyle}>Simba Bingwa Kikoba Endelevu</Text>
            <Text style={styles.reportTitle as TextStyle}>{title || t('reports.monthlyReport')}</Text>
            <Text style={styles.reportSubtitle as TextStyle}>{title ? '' : t('reports.month')} {monthName} {data.year || ''}</Text>

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
            {!hideExportButton && (
                <TouchableOpacity
                    style={styles.exportButton as ViewStyle}
                    onPress={onExportPDF}
                >
                    <Ionicons name="download" size={20} color="white" />
                    <Text style={styles.exportButtonText as TextStyle}>{t('reports.downloadPDF')}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

// Group Report Display Component
const GroupReportDisplay = ({ data, monthName, onMemberPress, expandedMember, setExpandedMember, onExportPDF, styles, colors }: any) => {
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
