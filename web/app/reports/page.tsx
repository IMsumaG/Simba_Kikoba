"use client";

import { collection, getDocs, orderBy, query } from "firebase/firestore";
import jsPDF from "jspdf";
import { BarChart3, Download, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import AppLayout from "../../components/AppLayout";
import { useAuth } from "../../context/AuthContext";
import { errorHandler } from "../../lib/errorHandler";
import { db } from "../../lib/firebase";


interface ReportData {
    hisa: { previousBalance: number; currentMonthContribution: number; totalHisa: number };
    jamii: number;
    standardLoan: {
        totalLoaned: number;
        totalWithInterest: number;
        totalRepayments: number;
        currentMonthRepayment: number;
        remainingBalance: number;
    };
    dharuraLoan: {
        totalLoaned: number;
        totalRepayments: number;
        currentMonthRepayment: number;
        remainingBalance: number;
    };
}

interface MemberReport extends ReportData {
    memberId: string;
    memberName: string;
    memberEmail: string;
}

interface GroupReportData {
    month: number;
    year: number;
    members: MemberReport[];
    totalMembers: number;
}

export default function ReportsPage() {
    const { user, role, loading: authLoading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<"personal" | "group">("personal");
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMemberId, setSelectedMemberId] = useState("");
    const [reportType, setReportType] = useState<"monthly" | "statement">("monthly");
    const [startMonth, setStartMonth] = useState(new Date().getMonth() + 1);
    const [startYear, setStartYear] = useState(new Date().getFullYear());
    const [endMonth, setEndMonth] = useState(new Date().getMonth() + 1);
    const [endYear, setEndYear] = useState(new Date().getFullYear());
    const [members, setMembers] = useState<any[]>([]);
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [groupReportData, setGroupReportData] = useState<GroupReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [expandedMember, setExpandedMember] = useState<string | null>(null);

    const months = [
        { num: 1, name: "Januari" },
        { num: 2, name: "Februari" },
        { num: 3, name: "Machi" },
        { num: 4, name: "Aprili" },
        { num: 5, name: "Mei" },
        { num: 6, name: "Juni" },
        { num: 7, name: "Julai" },
        { num: 8, name: "Agosti" },
        { num: 9, name: "Septemba" },
        { num: 10, name: "Oktoba" },
        { num: 11, name: "Novemba" },
        { num: 12, name: "Desemba" },
    ];

    useEffect(() => {
        if (!authLoading && !user) {
            router.replace('/');
        }
    }, [user, authLoading, router]);

    useEffect(() => {
        if (role === 'Admin') {
            fetchMembers();
        } else if (user) {
            setSelectedMemberId(user.uid);
        }
    }, [role, user]);

    useEffect(() => {
        setReportData(null);
    }, [reportType, activeTab]);

    const fetchMembers = async () => {
        try {
            const snapshot = await getDocs(collection(db, "users"));
            const data = snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            }));
            setMembers(data);
            if (data.length > 0 && !selectedMemberId) {
                setSelectedMemberId(data[0].uid);
            }
        } catch (error) {
            const { userMessage } = errorHandler.handle(error);
            console.error("Error fetching members:", error);
            alert(userMessage);
        }
    };

    const getMemberMonthlyReport = async (memberId: string, month: number, year: number): Promise<ReportData> => {
        const transQuery = query(collection(db, "transactions"), orderBy("date", "asc"));
        const snapshot = await getDocs(transQuery);

        const memberTransactions = snapshot.docs
            .map(doc => doc.data())
            .filter(t => t.memberId === memberId);

        // Initialize report structure
        let hisaTotal = 0;
        let jamiiTotal = 0;
        let standardLoanTotal = 0;
        let standardRepaymentTotal = 0;
        let dharuraLoanTotal = 0;
        let dharuraRepaymentTotal = 0;
        let currentMonthStandardRepayment = 0;
        let currentMonthDhauraRepayment = 0;

        memberTransactions.forEach(t => {
            const transDate = new Date(t.date);
            const transMonth = transDate.getMonth() + 1;
            const transYear = transDate.getFullYear();

            if (t.type === "Contribution") {
                if (t.category === "Hisa") {
                    hisaTotal += t.amount;
                } else if (t.category === "Jamii") {
                    jamiiTotal += t.amount;
                }
            } else if (t.type === "Loan") {
                if (t.category === "Standard") {
                    // Use originalAmount (principal) if available
                    standardLoanTotal += (t.originalAmount || t.amount);
                } else if (t.category === "Dharura") {
                    dharuraLoanTotal += t.amount;
                }
            } else if (t.type === "Loan Repayment") {
                if (t.category === "Standard") {
                    standardRepaymentTotal += t.amount;
                    if (transMonth === month && transYear === year) {
                        currentMonthStandardRepayment += t.amount;
                    }
                } else if (t.category === "Dharura") {
                    dharuraRepaymentTotal += t.amount;
                    if (transMonth === month && transYear === year) {
                        currentMonthDhauraRepayment += t.amount;
                    }
                }
            }
        });

        const standardWithInterest = standardLoanTotal * 1.1; // Re-enabled
        const standardRemaining = standardWithInterest - standardRepaymentTotal;

        return {
            hisa: {
                previousBalance: hisaTotal,
                currentMonthContribution: hisaTotal,
                totalHisa: hisaTotal
            },
            jamii: jamiiTotal,
            standardLoan: {
                totalLoaned: standardLoanTotal,
                totalWithInterest: standardWithInterest,
                totalRepayments: standardRepaymentTotal,
                currentMonthRepayment: currentMonthStandardRepayment,
                remainingBalance: Math.max(0, standardRemaining)
            },
            dharuraLoan: {
                totalLoaned: dharuraLoanTotal,
                totalRepayments: dharuraRepaymentTotal,
                currentMonthRepayment: currentMonthDhauraRepayment,
                remainingBalance: Math.max(0, dharuraLoanTotal - dharuraRepaymentTotal)
            }
        };
    };

    const getMemberStatement = async (memberId: string, startMonth: number, startYear: number, endMonth: number, endYear: number): Promise<any> => {
        // Generate array of months in the range
        const monthlyReports = [];

        let currentMonth = startMonth;
        let currentYear = startYear;

        while (currentYear < endYear || (currentYear === endYear && currentMonth <= endMonth)) {
            const report = await getMemberMonthlyReport(memberId, currentMonth, currentYear);
            monthlyReports.push({
                ...report,
                month: currentMonth,
                year: currentYear
            });

            // Move to next month
            currentMonth++;
            if (currentMonth > 12) {
                currentMonth = 1;
                currentYear++;
            }
        }

        return monthlyReports;
    };



    const getGroupMonthlyReport = async (month: number, year: number): Promise<GroupReportData> => {
        const allReports = await Promise.all(
            members.map(async (member) => {
                const report = await getMemberMonthlyReport(member.uid, month, year);
                return {
                    memberId: member.uid,
                    memberName: member.displayName || "Unknown",
                    memberEmail: member.email || "",
                    ...report
                };
            })
        );

        return {
            month,
            year,
            members: allReports,
            totalMembers: members.length
        };
    };

    const handleGeneratePersonalReport = async () => {
        if (!selectedMemberId) return;
        try {
            setLoading(true);
            let data;
            if (reportType === 'monthly') {
                data = await getMemberMonthlyReport(selectedMemberId, selectedMonth, selectedYear);
            } else {
                data = await getMemberStatement(selectedMemberId, startMonth, startYear, endMonth, endYear);
            }
            setReportData(data);
        } catch (error) {
            console.error("Error generating report:", error);
            const { userMessage } = errorHandler.handle(error);
            alert(userMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateGroupReport = async () => {
        try {
            setLoading(true);
            const data = await getGroupMonthlyReport(selectedMonth, selectedYear);
            setGroupReportData(data);
        } catch (error) {
            console.error("Error generating group report:", error);
            const { userMessage } = errorHandler.handle(error);
            alert(userMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleExportPersonalReportPDF = () => {
        if (!reportData) return;

        const selectedMember = members.find(m => m.uid === selectedMemberId);
        const memberName = selectedMember?.displayName || "Member";
        const startMonthName = months.find(m => m.num === startMonth)?.name || "";
        const endMonthName = months.find(m => m.num === endMonth)?.name || "";
        const currentMonthName = months.find(m => m.num === selectedMonth)?.name || "";

        const doc = new jsPDF();
        let yPosition = 20;

        // Header
        doc.setFontSize(24);
        doc.setTextColor(245, 124, 0);
        doc.text("Simba Bingwa Kikoba Endelevu", 20, yPosition);

        yPosition += 15;
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(reportType === 'statement' ? "Member Statement" : "Taarifa za Mwanachama", 20, yPosition);

        yPosition += 10;
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        const subtitle = reportType === 'statement'
            ? `${startMonthName} ${startYear} - ${endMonthName} ${endYear}`
            : `${currentMonthName} ${selectedYear}`;
        doc.text(subtitle, 20, yPosition);

        yPosition += 15;

        // Member Info
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text("Taarifa za Mwanachama", 20, yPosition);
        yPosition += 8;
        doc.setFontSize(10);
        doc.text(`Jina: ${memberName}`, 20, yPosition);
        yPosition += 15;

        // Function to render a single month's data
        const renderMonthData = (data: any, monthTitle?: string) => {
            if (monthTitle) {
                if (yPosition > 230) {
                    doc.addPage();
                    yPosition = 20;
                }

                // Month Header with background
                doc.setFillColor(245, 124, 0);
                doc.rect(20, yPosition, 170, 10, 'F');
                doc.setFontSize(12);
                doc.setTextColor(255, 255, 255);
                doc.setFont("helvetica", "bold");
                doc.text(monthTitle.toUpperCase(), 25, yPosition + 7);
                yPosition += 15;
            }

            const sections = [
                {
                    title: "HISA (SHARES)",
                    data: [
                        { label: "Jumla ya Hisa (Awali)", value: `TSh ${data.hisa.previousBalance.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}` },
                        { label: "Mchango wa Kipindi", value: `TSh ${data.hisa.currentMonthContribution.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}` },
                        { label: "Jumla ya Hisa", value: `TSh ${data.hisa.totalHisa.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`, bold: true }
                    ]
                },
                {
                    title: "JAMII",
                    data: [
                        { label: "Jumla ya Jamii", value: `TSh ${data.jamii.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`, bold: true }
                    ]
                },
                {
                    title: "MKOPO - STANDARD (10% INTEREST)",
                    data: [
                        { label: "Kiasi cha Mkopo", value: `TSh ${data.standardLoan.totalLoaned.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}` },
                        { label: "Na Riba", value: `TSh ${data.standardLoan.totalWithInterest.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}` },
                        { label: "Kilicholipwa (Jumla)", value: `TSh ${data.standardLoan.totalRepayments.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}` },
                        { label: "Malipo ya Kipindi", value: `TSh ${data.standardLoan.currentMonthRepayment.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}` },
                        { label: "Mkopo Uliobaki", value: `TSh ${data.standardLoan.remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`, bold: true }
                    ]
                },
                {
                    title: "DHARURA (EMERGENCY)",
                    data: [
                        { label: "Mkopo wa Dharura", value: `TSh ${data.dharuraLoan.totalLoaned.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}` },
                        { label: "Kilicholipwa (Jumla)", value: `TSh ${data.dharuraLoan.totalRepayments.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}` },
                        { label: "Malipo ya Kipindi", value: `TSh ${data.dharuraLoan.currentMonthRepayment.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}` },
                        { label: "Mkopo Uliobaki", value: `TSh ${data.dharuraLoan.remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`, bold: true }
                    ]
                }
            ];

            sections.forEach(section => {
                if (yPosition > 240) {
                    doc.addPage();
                    yPosition = 20;
                }

                // Section Header
                doc.setFontSize(10);
                doc.setTextColor(245, 124, 0);
                doc.setFont("helvetica", "bold");
                doc.text(section.title, 20, yPosition);
                yPosition += 4;
                doc.setDrawColor(245, 124, 0);
                doc.setLineWidth(0.5);
                doc.line(20, yPosition, 190, yPosition);
                yPosition += 8;

                doc.setFontSize(9);
                doc.setTextColor(50, 50, 50);

                section.data.forEach((item, idx) => {
                    if (yPosition > 275) {
                        doc.addPage();
                        yPosition = 20;
                    }

                    // Background for alternate rows
                    if (idx % 2 === 0) {
                        doc.setFillColor(250, 250, 250);
                        doc.rect(20, yPosition - 5, 170, 7, 'F');
                    }

                    if (item.bold) {
                        doc.setFont("helvetica", "bold");
                        doc.setTextColor(0, 0, 0);
                    } else {
                        doc.setFont("helvetica", "normal");
                        doc.setTextColor(50, 50, 50);
                    }

                    doc.text(item.label, 25, yPosition);
                    doc.text(item.value, 185, yPosition, { align: "right" });

                    // Thin separator line
                    doc.setDrawColor(240, 240, 240);
                    doc.setLineWidth(0.1);
                    doc.line(20, yPosition + 2, 190, yPosition + 2);

                    yPosition += 7;
                });

                yPosition += 8;
            });
        };

        if (Array.isArray(reportData)) {
            reportData.forEach((monthData: any, index: number) => {
                const monthName = months.find(m => m.num === monthData.month)?.name || "";
                renderMonthData(monthData, `${monthName} ${monthData.year}`);
                if (index < reportData.length - 1) {
                    yPosition += 10;
                }
            });
        } else {
            renderMonthData(reportData);
        }

        // Footer
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-US')}`, 20, doc.internal.pageSize.getHeight() - 10);

        const fileName = reportType === 'statement'
            ? `Statement_${memberName}_${startYear}_${endYear}.pdf`
            : `Report_${memberName}_${currentMonthName}_${selectedYear}.pdf`;

        doc.save(fileName);
    };

    const handleExportGroupReportExcel = () => {
        if (!groupReportData) return;

        const monthName = months.find(m => m.num === selectedMonth)?.name || "";
        const workbook = XLSX.utils.book_new();

        // Prepare data
        const reportData = groupReportData.members.map(member => ({
            "Member Name": member.memberName,
            "Email": member.memberEmail,
            "Hisa (TSh)": member.hisa.totalHisa,
            "Jamii (TSh)": member.jamii,
            "Standard Loan (TSh)": member.standardLoan.totalLoaned,
            "Standard Interest (TSh)": member.standardLoan.totalWithInterest - member.standardLoan.totalLoaned,
            "Standard Repaid (TSh)": member.standardLoan.totalRepayments,
            "Standard Remaining (TSh)": member.standardLoan.remainingBalance,
            "Dharura Loan (TSh)": member.dharuraLoan.totalLoaned,
            "Dharura Repaid (TSh)": member.dharuraLoan.totalRepayments,
            "Dharura Remaining (TSh)": member.dharuraLoan.remainingBalance
        }));

        // Add summary row
        const summary = {
            "Member Name": "TOTAL",
            "Email": "",
            "Hisa (TSh)": reportData.reduce((sum, m) => sum + m["Hisa (TSh)"], 0),
            "Jamii (TSh)": reportData.reduce((sum, m) => sum + m["Jamii (TSh)"], 0),
            "Standard Loan (TSh)": reportData.reduce((sum, m) => sum + m["Standard Loan (TSh)"], 0),
            "Standard Interest (TSh)": reportData.reduce((sum, m) => sum + m["Standard Interest (TSh)"], 0),
            "Standard Repaid (TSh)": reportData.reduce((sum, m) => sum + m["Standard Repaid (TSh)"], 0),
            "Standard Remaining (TSh)": reportData.reduce((sum, m) => sum + m["Standard Remaining (TSh)"], 0),
            "Dharura Loan (TSh)": reportData.reduce((sum, m) => sum + m["Dharura Loan (TSh)"], 0),
            "Dharura Repaid (TSh)": reportData.reduce((sum, m) => sum + m["Dharura Repaid (TSh)"], 0),
            "Dharura Remaining (TSh)": reportData.reduce((sum, m) => sum + m["Dharura Remaining (TSh)"], 0)
        };

        const worksheetData = [...reportData, summary];
        const worksheet = XLSX.utils.json_to_sheet(worksheetData);

        // Style the worksheet
        worksheet["!cols"] = [
            { wch: 20 },
            { wch: 25 },
            { wch: 15 },
            { wch: 15 },
            { wch: 18 },
            { wch: 18 },
            { wch: 16 },
            { wch: 18 },
            { wch: 16 },
            { wch: 16 },
            { wch: 18 }
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, `${monthName} ${selectedYear}`);
        XLSX.writeFile(workbook, `KIKOBA_Group_Report_${monthName}_${selectedYear}.xlsx`);
    };

    const handleRefresh = () => {
        setReportData(null);
        setGroupReportData(null);
        setExpandedMember(null);
    };

    const monthName = months.find(m => m.num === selectedMonth)?.name || "";
    const startMonthName = months.find(m => m.num === startMonth)?.name || "";
    const endMonthName = months.find(m => m.num === endMonth)?.name || "";

    return (
        <AppLayout>
            <div style={{ marginBottom: "2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                    <h1 style={{ fontSize: "2rem", fontWeight: "900", letterSpacing: "-0.5px", color: "var(--text-primary)" }}>Reports & Analytics</h1>
                    <p style={{ color: "var(--text-secondary)" }}>Monthly member and group financial reports</p>
                </div>
                <button
                    onClick={handleRefresh}
                    style={{
                        padding: "0.75rem 1.5rem",
                        borderRadius: "0.75rem",
                        backgroundColor: "var(--primary)",
                        color: "white",
                        border: "none",
                        fontWeight: "700",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem"
                    }}
                >
                    <RefreshCw size={16} />
                    Refresh
                </button>
            </div>

            {/* Tab Selector */}
            <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", borderBottom: "1px solid var(--border)", paddingBottom: "1rem", flexWrap: "wrap" }}>
                <button
                    onClick={() => setActiveTab("personal")}
                    style={{
                        padding: "0.75rem 1.5rem",
                        backgroundColor: activeTab === "personal" ? "var(--primary)" : "transparent",
                        color: activeTab === "personal" ? "white" : "var(--text-secondary)",
                        border: "none",
                        borderRadius: "0.75rem",
                        fontWeight: "700",
                        cursor: "pointer",
                        transition: "all 0.2s"
                    }}
                >
                    Personal Report
                </button>
                {role === 'Admin' && (
                    <button
                        onClick={() => setActiveTab("group")}
                        style={{
                            padding: "0.75rem 1.5rem",
                            backgroundColor: activeTab === "group" ? "var(--primary)" : "transparent",
                            color: activeTab === "group" ? "white" : "var(--text-secondary)",
                            border: "none",
                            borderRadius: "0.75rem",
                            fontWeight: "700",
                            cursor: "pointer",
                            transition: "all 0.2s"
                        }}
                    >
                        Group Report
                    </button>
                )}
            </div>

            {activeTab === "personal" ? (
                <>
                    {/* Report Type Selector */}
                    <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: 'wrap' }}>
                        <button
                            onClick={() => setReportType("monthly")}
                            style={{
                                padding: "0.5rem 1rem",
                                borderRadius: "0.5rem",
                                border: reportType === "monthly" ? "2px solid var(--primary)" : "1px solid var(--border)",
                                backgroundColor: reportType === "monthly" ? "rgba(16, 185, 129, 0.1)" : "var(--card-bg)",
                                color: reportType === "monthly" ? "var(--primary)" : "var(--text-secondary)",
                                fontWeight: "600",
                                cursor: "pointer"
                            }}
                        >
                            Monthly Report
                        </button>
                        <button
                            onClick={() => setReportType("statement")}
                            style={{
                                padding: "0.5rem 1rem",
                                borderRadius: "0.5rem",
                                border: reportType === "statement" ? "2px solid var(--primary)" : "1px solid var(--border)",
                                backgroundColor: reportType === "statement" ? "rgba(16, 185, 129, 0.1)" : "var(--card-bg)",
                                color: reportType === "statement" ? "var(--primary)" : "var(--text-secondary)",
                                fontWeight: "600",
                                cursor: "pointer"
                            }}
                        >
                            Statement
                        </button>
                    </div>

                    {/* Month & Year Selection */}
                    <div className="card" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
                        <h2 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "1.5rem", color: "var(--text-primary)" }}>
                            {reportType === 'monthly' ? "Select Period & Member" : "Select Date Range & Member"}
                        </h2>

                        {reportType === 'monthly' ? (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.5rem", textTransform: "uppercase" }}>
                                        Month
                                    </label>
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                        style={{
                                            width: "100%",
                                            padding: "0.75rem 1rem",
                                            borderRadius: "0.75rem",
                                            border: "1px solid var(--border)",
                                            outline: "none",
                                            fontSize: "0.875rem",
                                            fontWeight: "500",
                                            backgroundColor: "var(--card-bg)",
                                            color: "var(--text-primary)"
                                        }}
                                    >
                                        {months.map(m => (
                                            <option key={m.num} value={m.num}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.5rem", textTransform: "uppercase" }}>
                                        Year
                                    </label>
                                    <div style={{ display: "flex", gap: "0.5rem" }}>
                                        <button
                                            onClick={() => setSelectedYear(selectedYear - 1)}
                                            style={{
                                                padding: "0.75rem 1rem",
                                                borderRadius: "0.75rem",
                                                border: "1px solid var(--border)",
                                                backgroundColor: "var(--background-muted)",
                                                color: "var(--text-primary)",
                                                cursor: "pointer",
                                                fontWeight: "600"
                                            }}
                                        >
                                            ← Prev
                                        </button>
                                        <input
                                            type="number"
                                            value={selectedYear}
                                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                            style={{
                                                flex: 1,
                                                padding: "0.75rem 1rem",
                                                borderRadius: "0.75rem",
                                                border: "1px solid var(--border)",
                                                textAlign: "center",
                                                fontWeight: "600",
                                                backgroundColor: "var(--background-muted)",
                                                color: "var(--text-primary)"
                                            }}
                                        />
                                        <button
                                            onClick={() => setSelectedYear(selectedYear + 1)}
                                            style={{
                                                padding: "0.75rem 1rem",
                                                borderRadius: "0.75rem",
                                                border: "1px solid var(--border)",
                                                backgroundColor: "var(--background-muted)",
                                                color: "var(--text-primary)",
                                                cursor: "pointer",
                                                fontWeight: "600"
                                            }}
                                        >
                                            Next →
                                        </button>
                                    </div>
                                </div>

                                {role === 'Admin' && (
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.5rem", textTransform: "uppercase" }}>
                                            Member
                                        </label>
                                        <select
                                            value={selectedMemberId}
                                            onChange={(e) => setSelectedMemberId(e.target.value)}
                                            style={{
                                                width: "100%",
                                                padding: "0.75rem 1rem",
                                                borderRadius: "0.75rem",
                                                border: "1px solid var(--border)",
                                                outline: "none",
                                                fontSize: "0.875rem",
                                                fontWeight: "500",
                                                backgroundColor: "var(--card-bg)",
                                                color: "var(--text-primary)"
                                            }}
                                        >
                                            {members.map(m => (
                                                <option key={m.uid} value={m.uid}>{m.displayName}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        ) : (
                            // Statement Date Range Selectors
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
                                {/* Start Date */}
                                <div>
                                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.5rem", textTransform: "uppercase" }}>
                                        Start Month
                                    </label>
                                    <div style={{ display: "flex", gap: "0.5rem" }}>
                                        <select
                                            value={startMonth}
                                            onChange={(e) => setStartMonth(parseInt(e.target.value))}
                                            style={{
                                                flex: 2,
                                                padding: "0.75rem 1rem",
                                                borderRadius: "0.75rem",
                                                border: "1px solid var(--border)",
                                                outline: "none",
                                                fontSize: "0.875rem",
                                                fontWeight: "500",
                                                backgroundColor: "var(--card-bg)",
                                                color: "var(--text-primary)"
                                            }}
                                        >
                                            {months.map(m => (
                                                <option key={m.num} value={m.num}>{m.name}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            value={startYear}
                                            onChange={(e) => setStartYear(parseInt(e.target.value))}
                                            style={{
                                                flex: 1,
                                                padding: "0.75rem 1rem",
                                                borderRadius: "0.75rem",
                                                border: "1px solid var(--border)",
                                                textAlign: "center",
                                                fontWeight: "600",
                                                backgroundColor: "var(--background-muted)",
                                                color: "var(--text-primary)",
                                                minWidth: "80px"
                                            }}
                                        />
                                    </div>
                                </div>

                                {/* End Date */}
                                <div>
                                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.5rem", textTransform: "uppercase" }}>
                                        End Month
                                    </label>
                                    <div style={{ display: "flex", gap: "0.5rem" }}>
                                        <select
                                            value={endMonth}
                                            onChange={(e) => setEndMonth(parseInt(e.target.value))}
                                            style={{
                                                flex: 2,
                                                padding: "0.75rem 1rem",
                                                borderRadius: "0.75rem",
                                                border: "1px solid var(--border)",
                                                outline: "none",
                                                fontSize: "0.875rem",
                                                fontWeight: "500",
                                                backgroundColor: "var(--card-bg)",
                                                color: "var(--text-primary)"
                                            }}
                                        >
                                            {months.map(m => (
                                                <option key={m.num} value={m.num}>{m.name}</option>
                                            ))}
                                        </select>
                                        <input
                                            type="number"
                                            value={endYear}
                                            onChange={(e) => setEndYear(parseInt(e.target.value))}
                                            style={{
                                                flex: 1,
                                                padding: "0.75rem 1rem",
                                                borderRadius: "0.75rem",
                                                border: "1px solid var(--border)",
                                                textAlign: "center",
                                                fontWeight: "600",
                                                backgroundColor: "var(--background-muted)",
                                                color: "var(--text-primary)",
                                                minWidth: "80px"
                                            }}
                                        />
                                    </div>
                                </div>

                                {role === 'Admin' && (
                                    <div>
                                        <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.5rem", textTransform: "uppercase" }}>
                                            Member
                                        </label>
                                        <select
                                            value={selectedMemberId}
                                            onChange={(e) => setSelectedMemberId(e.target.value)}
                                            style={{
                                                width: "100%",
                                                padding: "0.75rem 1rem",
                                                borderRadius: "0.75rem",
                                                border: "1px solid var(--border)",
                                                outline: "none",
                                                fontSize: "0.875rem",
                                                fontWeight: "500",
                                                backgroundColor: "var(--card-bg)",
                                                color: "var(--text-primary)"
                                            }}
                                        >
                                            {members.map(m => (
                                                <option key={m.uid} value={m.uid}>{m.displayName}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            onClick={handleGeneratePersonalReport}
                            disabled={loading}
                            style={{
                                marginTop: "1.5rem",
                                padding: "0.75rem 2rem",
                                borderRadius: "0.75rem",
                                backgroundColor: "var(--primary)",
                                color: "white",
                                border: "none",
                                fontWeight: "700",
                                cursor: loading ? "not-allowed" : "pointer",
                                opacity: loading ? 0.7 : 1,
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem"
                            }}
                        >
                            <BarChart3 size={16} />
                            {loading ? "Generating..." : "Generate Report"}
                        </button>
                    </div>

                    {/* Personal Report Display */}
                    {reportData && (
                        reportType === 'statement' && Array.isArray(reportData) ? (
                            // Display multiple monthly reports for statement
                            <>
                                {reportData.map((monthReport: any, index: number) => {
                                    const reportMonthName = months.find(m => m.num === monthReport.month)?.name || '';
                                    return (
                                        <div key={`${monthReport.year}-${monthReport.month}`} className="card" style={{ padding: "2rem", marginBottom: index < reportData.length - 1 ? "2rem" : "0" }}>
                                            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                                                <h2 style={{ fontSize: "1.75rem", fontWeight: "900", color: "var(--primary)", marginBottom: "0.5rem" }}>Simba Bingwa Kikoba Endelevu</h2>
                                                <p style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                                                    {reportMonthName} {monthReport.year}
                                                </p>
                                            </div>

                                            {/* Member Info Section */}
                                            <div style={{ marginBottom: "2rem" }}>
                                                <h3 style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "2px solid var(--primary)" }}>Taarifa za Mwanachama</h3>
                                                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                                                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500" }}>Jina Kamili:</span>
                                                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500", textAlign: "right" }}>{members.find(m => m.uid === selectedMemberId)?.displayName || 'Member'}</span>
                                                </div>
                                            </div>

                                            {/* Hisa Section */}
                                            <div style={{ marginBottom: "2rem" }}>
                                                <h3 style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "2px solid var(--primary)" }}>Hisa (Shares)</h3>
                                                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                                                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500" }}>Jumla ya Hisa (Awali):</span>
                                                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500", textAlign: "right" }}>TSh {monthReport.hisa.previousBalance.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                                                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500" }}>Mchango Mwezi {reportMonthName}:</span>
                                                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500", textAlign: "right" }}>TSh {monthReport.hisa.currentMonthContribution.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem", backgroundColor: "rgba(245, 124, 0, 0.1)", borderRadius: "0.5rem" }}>
                                                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "700" }}>Jumla ya Hisa:</span>
                                                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "700", textAlign: "right" }}>TSh {monthReport.hisa.totalHisa.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                                </div>
                                            </div>

                                            {/* Jamii Section */}
                                            <div style={{ marginBottom: "2rem" }}>
                                                <h3 style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "2px solid var(--primary)" }}>Jamii</h3>
                                                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                                                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500" }}>Jumla ya Jamii:</span>
                                                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500", textAlign: "right" }}>TSh {monthReport.jamii.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                                </div>
                                            </div>

                                            {/* Standard Loan Section */}
                                            <div style={{ marginBottom: "2rem" }}>
                                                <h3 style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "2px solid var(--primary)" }}>Mkopo - Standard</h3>
                                                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                                                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500" }}>Kiasi cha Mkopo:</span>
                                                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500", textAlign: "right" }}>TSh {monthReport.standardLoan.totalLoaned.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                                                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500" }}>+ Riba (10%):</span>
                                                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500", textAlign: "right" }}>TSh {monthReport.standardLoan.totalWithInterest.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                                                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500" }}>Kilicholipwa (Jumla):</span>
                                                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500", textAlign: "right" }}>TSh {monthReport.standardLoan.totalRepayments.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                                                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500" }}>Malipo Mwezi {reportMonthName}:</span>
                                                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500", textAlign: "right" }}>TSh {monthReport.standardLoan.currentMonthRepayment.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem", backgroundColor: "rgba(245, 124, 0, 0.1)", borderRadius: "0.5rem" }}>
                                                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "700" }}>Mkopo Uliobaki:</span>
                                                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "700", textAlign: "right" }}>TSh {monthReport.standardLoan.remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                                </div>
                                            </div>

                                            {/* Dharura Section */}
                                            <div style={{ marginBottom: "2rem" }}>
                                                <h3 style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "2px solid var(--primary)" }}>Dharura (Emergency)</h3>
                                                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                                                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500" }}>Mkopo wa Dharura:</span>
                                                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500", textAlign: "right" }}>TSh {monthReport.dharuraLoan.totalLoaned.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                                                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500" }}>Kilicholipwa (Jumla):</span>
                                                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500", textAlign: "right" }}>TSh {monthReport.dharuraLoan.totalRepayments.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                                                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500" }}>Malipo Mwezi {reportMonthName}:</span>
                                                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500", textAlign: "right" }}>TSh {monthReport.dharuraLoan.currentMonthRepayment.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                                </div>
                                                <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem", backgroundColor: "rgba(245, 124, 0, 0.1)", borderRadius: "0.5rem" }}>
                                                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "700" }}>Mkopo Uliobaki:</span>
                                                    <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "700", textAlign: "right" }}>TSh {monthReport.dharuraLoan.remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                                </div>
                                            </div>

                                            {/* Export Button - only for last report */}
                                            {index === reportData.length - 1 && (
                                                <button
                                                    onClick={handleExportPersonalReportPDF}
                                                    style={{
                                                        width: "100%",
                                                        padding: "1rem 1.5rem",
                                                        borderRadius: "0.75rem",
                                                        backgroundColor: "var(--primary)",
                                                        color: "white",
                                                        border: "none",
                                                        fontWeight: "700",
                                                        cursor: "pointer",
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "center",
                                                        gap: "0.5rem",
                                                        fontSize: "1rem"
                                                    }}
                                                >
                                                    <Download size={20} />
                                                    Download PDF
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                            </>
                        ) : (
                            // Single monthly report display
                            !Array.isArray(reportData) && reportData && (
                                <div className="card" style={{ padding: "2rem" }}>
                                    <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                                        <h2 style={{ fontSize: "1.75rem", fontWeight: "900", color: "var(--primary)", marginBottom: "0.5rem" }}>Simba Bingwa Kikoba Endelevu</h2>
                                        <p style={{ fontSize: "1rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "0.25rem" }}>
                                            {reportType === 'statement' ? 'Member Statement' : 'Taarifa za Mwanachama'}
                                        </p>
                                        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                                            {reportType === 'statement'
                                                ? `${startMonthName} ${startYear} - ${endMonthName} ${endYear}`
                                                : `${monthName} ${selectedYear}`
                                            }
                                        </p>
                                    </div>

                                    {/* Member Info Section */}
                                    <div style={{ marginBottom: "2rem" }}>
                                        <h3 style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "2px solid var(--primary)" }}>Taarifa za Mwanachama</h3>
                                        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500" }}>Jina Kamili:</span>
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500", textAlign: "right" }}>{members.find(m => m.uid === selectedMemberId)?.displayName || 'Member'}</span>
                                        </div>
                                    </div>

                                    {/* Hisa Section */}
                                    <div style={{ marginBottom: "2rem" }}>
                                        <h3 style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "2px solid var(--primary)" }}>Hisa (Shares)</h3>
                                        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500" }}>Jumla ya Hisa (Awali):</span>
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500", textAlign: "right" }}>TSh {reportData.hisa.previousBalance.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500" }}>
                                                {reportType === 'statement' ? 'Mchango wa Kipindi' : `Mchango Mwezi ${reportType === 'monthly' ? monthName : ''}`}:
                                            </span>
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500", textAlign: "right" }}>TSh {reportData.hisa.currentMonthContribution.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem", backgroundColor: "rgba(245, 124, 0, 0.1)", borderRadius: "0.5rem" }}>
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "700" }}>Jumla ya Hisa:</span>
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "700", textAlign: "right" }}>TSh {reportData.hisa.totalHisa.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                        </div>
                                    </div>

                                    {/* Jamii Section */}
                                    <div style={{ marginBottom: "2rem" }}>
                                        <h3 style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "2px solid var(--primary)" }}>Jamii</h3>
                                        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500" }}>Jumla ya Jamii:</span>
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500", textAlign: "right" }}>TSh {reportData.jamii.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                        </div>
                                    </div>

                                    {/* Standard Loan Section */}
                                    <div style={{ marginBottom: "2rem" }}>
                                        <h3 style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "2px solid var(--primary)" }}>Mkopo - Standard</h3>
                                        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500" }}>Kiasi cha Mkopo:</span>
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500", textAlign: "right" }}>TSh {reportData.standardLoan.totalLoaned.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500" }}>+ Riba (10%):</span>
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500", textAlign: "right" }}>TSh {reportData.standardLoan.totalWithInterest.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500" }}>Kilicholipwa (Jumla):</span>
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500", textAlign: "right" }}>TSh {reportData.standardLoan.totalRepayments.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500" }}>
                                                {reportType === 'statement' ? 'Malipo ya Kipindi' : `Malipo Mwezi ${reportType === 'monthly' ? monthName : ''}`}:
                                            </span>
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500", textAlign: "right" }}>TSh {reportData.standardLoan.currentMonthRepayment.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem", backgroundColor: "rgba(245, 124, 0, 0.1)", borderRadius: "0.5rem" }}>
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "700" }}>Mkopo Uliobaki:</span>
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "700", textAlign: "right" }}>TSh {reportData.standardLoan.remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                        </div>
                                    </div>

                                    {/* Dharura Section */}
                                    <div style={{ marginBottom: "2rem" }}>
                                        <h3 style={{ fontSize: "0.9rem", fontWeight: "700", color: "var(--text-primary)", marginBottom: "1rem", paddingBottom: "0.5rem", borderBottom: "2px solid var(--primary)" }}>Dharura (Emergency)</h3>
                                        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500" }}>Mkopo wa Dharura:</span>
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500", textAlign: "right" }}>TSh {reportData.dharuraLoan.totalLoaned.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500" }}>Kilicholipwa (Jumla):</span>
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500", textAlign: "right" }}>TSh {reportData.dharuraLoan.totalRepayments.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 0", borderBottom: "1px solid var(--border)" }}>
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500" }}>
                                                {reportType === 'statement' ? 'Malipo ya Kipindi' : `Malipo Mwezi ${reportType === 'monthly' ? monthName : ''}`}:
                                            </span>
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "500", textAlign: "right" }}>TSh {reportData.dharuraLoan.currentMonthRepayment.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem", backgroundColor: "rgba(245, 124, 0, 0.1)", borderRadius: "0.5rem" }}>
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "700" }}>Mkopo Uliobaki:</span>
                                            <span style={{ fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: "700", textAlign: "right" }}>TSh {reportData.dharuraLoan.remainingBalance.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
                                        </div>
                                    </div>

                                    {/* Export Button */}
                                    <button
                                        onClick={handleExportPersonalReportPDF}
                                        style={{
                                            width: "100%",
                                            padding: "1rem 1.5rem",
                                            borderRadius: "0.75rem",
                                            backgroundColor: "var(--primary)",
                                            color: "white",
                                            border: "none",
                                            fontWeight: "700",
                                            cursor: loading ? "not-allowed" : "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: "0.5rem",
                                            fontSize: "1rem"
                                        }}
                                    >
                                        <Download size={20} />
                                        Download PDF
                                    </button>
                                </div>
                            )
                        )
                    )}
                </>

            ) : role === 'Admin' ? (
                <>
                    {/* Group Report Selection */}
                    <div className="card" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
                        <h2 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "1.5rem", color: "var(--text-primary)" }}>Select Period</h2>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem" }}>
                            <div>
                                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.5rem", textTransform: "uppercase" }}>
                                    Month
                                </label>
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                    style={{
                                        width: "100%",
                                        padding: "0.75rem 1rem",
                                        borderRadius: "0.75rem",
                                        border: "1px solid var(--border)",
                                        outline: "none",
                                        fontSize: "0.875rem",
                                        fontWeight: "500",
                                        backgroundColor: "var(--card-bg)",
                                        color: "var(--text-primary)"
                                    }}
                                >
                                    {months.map(m => (
                                        <option key={m.num} value={m.num}>{m.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "var(--text-secondary)", marginBottom: "0.5rem", textTransform: "uppercase" }}>
                                    Year
                                </label>
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                    <button
                                        onClick={() => setSelectedYear(selectedYear - 1)}
                                        style={{
                                            padding: "0.75rem 1rem",
                                            borderRadius: "0.75rem",
                                            border: "1px solid var(--border)",
                                            backgroundColor: "var(--background-muted)",
                                            color: "var(--text-primary)",
                                            cursor: "pointer",
                                            fontWeight: "600"
                                        }}
                                    >
                                        ← Prev
                                    </button>
                                    <input
                                        type="number"
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                        style={{
                                            flex: 1,
                                            padding: "0.75rem 1rem",
                                            borderRadius: "0.75rem",
                                            border: "1px solid var(--border)",
                                            textAlign: "center",
                                            fontWeight: "600",
                                            backgroundColor: "var(--background-muted)",
                                            color: "var(--text-primary)"
                                        }}
                                    />
                                    <button
                                        onClick={() => setSelectedYear(selectedYear + 1)}
                                        style={{
                                            padding: "0.75rem 1rem",
                                            borderRadius: "0.75rem",
                                            border: "1px solid var(--border)",
                                            backgroundColor: "var(--background-muted)",
                                            color: "var(--text-primary)",
                                            cursor: "pointer",
                                            fontWeight: "600"
                                        }}
                                    >
                                        Next →
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleGenerateGroupReport}
                            disabled={loading}
                            style={{
                                marginTop: "1.5rem",
                                padding: "0.75rem 2rem",
                                borderRadius: "0.75rem",
                                backgroundColor: "var(--primary)",
                                color: "white",
                                border: "none",
                                fontWeight: "700",
                                cursor: loading ? "not-allowed" : "pointer",
                                opacity: loading ? 0.7 : 1,
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem"
                            }}
                        >
                            <BarChart3 size={16} />
                            {loading ? "Generating..." : "Generate Group Report"}
                        </button>
                    </div >

                    {/* Group Report Table */}
                    {
                        groupReportData && (
                            <div className="card" style={{ padding: "1.5rem", overflowX: "auto" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: 'wrap', gap: '1rem' }}>
                                    <div>
                                        <h2 style={{ fontSize: "1.5rem", fontWeight: "900", marginBottom: "0.5rem", color: "var(--text-primary)" }}>Simba Bingwa Kikoba Endelevu</h2>
                                        <p style={{ color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                                            Taarifa za Kikoba - {monthName} {selectedYear}
                                        </p>
                                        <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                                            Wanachama Wenye Akaunti: {groupReportData.totalMembers}
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleExportGroupReportExcel}
                                        style={{
                                            padding: "0.75rem 1.5rem",
                                            borderRadius: "0.75rem",
                                            backgroundColor: "#F59E0B",
                                            color: "white",
                                            border: "none",
                                            fontWeight: "700",
                                            cursor: "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.5rem"
                                        }}
                                    >
                                        <Download size={16} />
                                        Export Excel
                                    </button>
                                </div>

                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr style={{ backgroundColor: "var(--primary)", color: "white" }}>
                                            <th style={{ padding: "1rem", textAlign: "left", fontWeight: "700" }}>Member Name</th>
                                            <th style={{ padding: "1rem", textAlign: "right", fontWeight: "700", minWidth: "100px" }}>Hisa</th>
                                            <th style={{ padding: "1rem", textAlign: "right", fontWeight: "700", minWidth: "100px" }}>Jamii</th>
                                            <th style={{ padding: "1rem", textAlign: "right", fontWeight: "700", minWidth: "120px" }}>Std Loan</th>
                                            <th style={{ padding: "1rem", textAlign: "right", fontWeight: "700", minWidth: "100px" }}>Std Remaining</th>
                                            <th style={{ padding: "1rem", textAlign: "right", fontWeight: "700", minWidth: "120px" }}>Dhar Loan</th>
                                            <th style={{ padding: "1rem", textAlign: "right", fontWeight: "700", minWidth: "100px" }}>Dhar Remaining</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {groupReportData.members.map((member, index) => (
                                            <tr
                                                key={member.memberId}
                                                style={{
                                                    backgroundColor: index % 2 === 0 ? "var(--background-muted)" : "var(--card-bg)",
                                                    borderBottom: "1px solid var(--border)",
                                                    color: "var(--text-primary)"
                                                }}
                                            >
                                                <td style={{ padding: "1rem", fontWeight: "700", color: "var(--text-primary)" }}>{member.memberName}</td>
                                                <td style={{ padding: "1rem", textAlign: "right" }}>TSh {Math.round(member.hisa.totalHisa).toLocaleString()}</td>
                                                <td style={{ padding: "1rem", textAlign: "right" }}>TSh {Math.round(member.jamii).toLocaleString()}</td>
                                                <td style={{ padding: "1rem", textAlign: "right" }}>TSh {Math.round(member.standardLoan.totalLoaned).toLocaleString()}</td>
                                                <td style={{ padding: "1rem", textAlign: "right", color: member.standardLoan.remainingBalance > 0 ? "#EF4444" : "#10B981", fontWeight: "700" }}>
                                                    TSh {Math.round(member.standardLoan.remainingBalance).toLocaleString()}
                                                </td>
                                                <td style={{ padding: "1rem", textAlign: "right" }}>TSh {Math.round(member.dharuraLoan.totalLoaned).toLocaleString()}</td>
                                                <td style={{ padding: "1rem", textAlign: "right", color: member.dharuraLoan.remainingBalance > 0 ? "#EF4444" : "#10B981", fontWeight: "700" }}>
                                                    TSh {Math.round(member.dharuraLoan.remainingBalance).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                </>
            ) : (
                <div style={{ padding: "4rem", textAlign: "center", color: "var(--text-secondary)" }}>
                    <p style={{ fontSize: "1.25rem", fontWeight: "600" }}>Access Restricted</p>
                    <p>Only administrators can access the Group Report.</p>
                </div>
            )}
        </AppLayout>
    );
}
