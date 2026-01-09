"use client";

import { collection, getDocs, orderBy, query } from "firebase/firestore";
import jsPDF from "jspdf";
import { BarChart3, Download, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import AppLayout from "../../components/AppLayout";
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
    const [activeTab, setActiveTab] = useState<"personal" | "group">("personal");
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMemberId, setSelectedMemberId] = useState("");
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
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            const snapshot = await getDocs(collection(db, "users"));
            const data = snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            }));
            setMembers(data);
            if (data.length > 0) {
                setSelectedMemberId(data[0].uid);
            }
        } catch (error) {
            console.error("Error fetching members:", error);
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
            const data = await getMemberMonthlyReport(selectedMemberId, selectedMonth, selectedYear);
            setReportData(data);
        } catch (error) {
            console.error("Error generating report:", error);
            alert("Failed to generate report");
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
            alert("Failed to generate group report");
        } finally {
            setLoading(false);
        }
    };

    const handleExportPersonalReportPDF = () => {
        if (!reportData) return;

        const selectedMember = members.find(m => m.uid === selectedMemberId);
        const memberName = selectedMember?.displayName || "Member";
        const monthName = months.find(m => m.num === selectedMonth)?.name || "";

        const doc = new jsPDF();
        let yPosition = 20;

        // Header
        doc.setFontSize(24);
        doc.setTextColor(245, 124, 0);
        doc.text("Simba Bingwa Kikoba Endelevu", 20, yPosition);

        yPosition += 15;
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Taarifa za Mwanachama", 20, yPosition);

        yPosition += 10;
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text(`${monthName} ${selectedYear}`, 20, yPosition);

        yPosition += 15;

        // Member Info
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text("Taarifa za Mwanachama", 20, yPosition);
        yPosition += 8;
        doc.setFontSize(10);
        doc.text(`Jina: ${memberName}`, 20, yPosition);
        yPosition += 10;

        // Sections
        const sections = [
            {
                title: "Hisa (Shares)",
                data: [
                    { label: "Jumla ya Hisa", value: `TSh ${reportData.hisa.totalHisa.toLocaleString()}` }
                ]
            },
            {
                title: "Jamii",
                data: [
                    { label: "Jumla ya Jamii", value: `TSh ${reportData.jamii.toLocaleString()}` }
                ]
            },
            {
                title: "Mkopo - Standard (10% Interest)",
                data: [
                    { label: "Kiasi cha Mkopo", value: `TSh ${reportData.standardLoan.totalLoaned.toLocaleString()}` },
                    { label: "Na Riba", value: `TSh ${reportData.standardLoan.totalWithInterest.toLocaleString()}` },
                    { label: "Kilicholipwa", value: `TSh ${reportData.standardLoan.totalRepayments.toLocaleString()}` },
                    { label: "Mkopo Uliobaki", value: `TSh ${reportData.standardLoan.remainingBalance.toLocaleString()}`, bold: true }
                ]
            },
            {
                title: "Dharura (Emergency)",
                data: [
                    { label: "Mkopo wa Dharura", value: `TSh ${reportData.dharuraLoan.totalLoaned.toLocaleString()}` },
                    { label: "Kilicholipwa", value: `TSh ${reportData.dharuraLoan.totalRepayments.toLocaleString()}` },
                    { label: "Mkopo Uliobaki", value: `TSh ${reportData.dharuraLoan.remainingBalance.toLocaleString()}`, bold: true }
                ]
            }
        ];

        sections.forEach(section => {
            if (yPosition > 250) {
                doc.addPage();
                yPosition = 20;
            }

            doc.setFontSize(12);
            doc.setTextColor(245, 124, 0);
            doc.text(section.title, 20, yPosition);
            yPosition += 8;

            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);

            section.data.forEach(item => {
                if (yPosition > 270) {
                    doc.addPage();
                    yPosition = 20;
                }

                if (item.bold) {
                    doc.setFont("helvetica", "bold");
                } else {
                    doc.setFont("helvetica", "normal");
                }

                doc.text(item.label, 25, yPosition);
                doc.text(item.value, 150, yPosition, { align: "right" });
                yPosition += 7;
            });

            yPosition += 5;
        });

        // Footer
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-US')}`, 20, doc.internal.pageSize.getHeight() - 10);

        doc.save(`KIKOBA_Report_${memberName}_${monthName}_${selectedYear}.pdf`);
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

    return (
        <AppLayout>
            <div style={{ marginBottom: "2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <h1 style={{ fontSize: "2rem", fontWeight: "900", letterSpacing: "-0.5px" }}>Reports & Analytics</h1>
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
            <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", borderBottom: "1px solid var(--border)", paddingBottom: "1rem" }}>
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
            </div>

            {activeTab === "personal" ? (
                <>
                    {/* Month & Year Selection */}
                    <div className="card" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
                        <h2 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "1.5rem" }}>Select Period & Member</h2>
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
                                        fontWeight: "500"
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
                                            backgroundColor: "white",
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
                                            fontWeight: "600"
                                        }}
                                    />
                                    <button
                                        onClick={() => setSelectedYear(selectedYear + 1)}
                                        style={{
                                            padding: "0.75rem 1rem",
                                            borderRadius: "0.75rem",
                                            border: "1px solid var(--border)",
                                            backgroundColor: "white",
                                            cursor: "pointer",
                                            fontWeight: "600"
                                        }}
                                    >
                                        Next →
                                    </button>
                                </div>
                            </div>

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
                                        fontWeight: "500"
                                    }}
                                >
                                    {members.map(m => (
                                        <option key={m.uid} value={m.uid}>{m.displayName}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

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
                        <div className="card" style={{ padding: "2rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                                <div>
                                    <h2 style={{ fontSize: "1.5rem", fontWeight: "900", marginBottom: "0.5rem" }}>Simba Bingwa Kikoba Endelevu</h2>
                                    <p style={{ color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                                        Taarifa za Mwanachama - {monthName} {selectedYear}
                                    </p>
                                </div>
                                <button
                                    onClick={handleExportPersonalReportPDF}
                                    style={{
                                        padding: "0.75rem 1.5rem",
                                        borderRadius: "0.75rem",
                                        backgroundColor: "#10B981",
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
                                    Export PDF
                                </button>
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
                                {/* Hisa Card */}
                                <div style={{ backgroundColor: "#F0F9FF", borderRadius: "0.75rem", padding: "1.5rem", border: "2px solid #0EA5E9" }}>
                                    <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "1rem", color: "#0EA5E9" }}>Hisa (Shares)</h3>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", fontSize: "0.875rem", borderBottom: "1px solid #BAE6FD", paddingBottom: "0.75rem" }}>
                                        <span>Total Hisa:</span>
                                        <span style={{ fontWeight: "700" }}>TSh {reportData.hisa.totalHisa.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Jamii Card */}
                                <div style={{ backgroundColor: "#FDF2F8", borderRadius: "0.75rem", padding: "1.5rem", border: "2px solid #EC4899" }}>
                                    <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "1rem", color: "#EC4899" }}>Jamii</h3>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", fontSize: "0.875rem", borderBottom: "1px solid #F9A8D4", paddingBottom: "0.75rem" }}>
                                        <span>Total Jamii:</span>
                                        <span style={{ fontWeight: "700" }}>TSh {reportData.jamii.toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Standard Loan Card */}
                                <div style={{ backgroundColor: "#FEF3C7", borderRadius: "0.75rem", padding: "1.5rem", border: "2px solid #F59E0B" }}>
                                    <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "1rem", color: "#F59E0B" }}>Standard Loan (10% Interest)</h3>
                                    <div style={{ fontSize: "0.875rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #FCD34D", paddingBottom: "0.5rem" }}>
                                            <span>Amount Loaned:</span>
                                            <span style={{ fontWeight: "700" }}>TSh {reportData.standardLoan.totalLoaned.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #FCD34D", paddingBottom: "0.5rem" }}>
                                            <span>With Interest:</span>
                                            <span style={{ fontWeight: "700" }}>TSh {reportData.standardLoan.totalWithInterest.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #FCD34D", paddingBottom: "0.5rem" }}>
                                            <span>Repaid:</span>
                                            <span style={{ fontWeight: "700" }}>TSh {reportData.standardLoan.totalRepayments.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", backgroundColor: "white", padding: "0.5rem", borderRadius: "0.5rem" }}>
                                            <span style={{ fontWeight: "700" }}>Remaining:</span>
                                            <span style={{ fontWeight: "900" }}>TSh {reportData.standardLoan.remainingBalance.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Dharura Card */}
                                <div style={{ backgroundColor: "#F3E8FF", borderRadius: "0.75rem", padding: "1.5rem", border: "2px solid #A855F7" }}>
                                    <h3 style={{ fontSize: "1rem", fontWeight: "700", marginBottom: "1rem", color: "#A855F7" }}>Dharura (Emergency)</h3>
                                    <div style={{ fontSize: "0.875rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #E9D5FF", paddingBottom: "0.5rem" }}>
                                            <span>Amount Loaned:</span>
                                            <span style={{ fontWeight: "700" }}>TSh {reportData.dharuraLoan.totalLoaned.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #E9D5FF", paddingBottom: "0.5rem" }}>
                                            <span>Repaid:</span>
                                            <span style={{ fontWeight: "700" }}>TSh {reportData.dharuraLoan.totalRepayments.toLocaleString()}</span>
                                        </div>
                                        <div style={{ display: "flex", justifyContent: "space-between", backgroundColor: "white", padding: "0.5rem", borderRadius: "0.5rem" }}>
                                            <span style={{ fontWeight: "700" }}>Remaining:</span>
                                            <span style={{ fontWeight: "900" }}>TSh {reportData.dharuraLoan.remainingBalance.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <>
                    {/* Group Report Selection */}
                    <div className="card" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
                        <h2 style={{ fontSize: "1.125rem", fontWeight: "700", marginBottom: "1.5rem" }}>Select Period</h2>
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
                                        fontWeight: "500"
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
                                            backgroundColor: "white",
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
                                            fontWeight: "600"
                                        }}
                                    />
                                    <button
                                        onClick={() => setSelectedYear(selectedYear + 1)}
                                        style={{
                                            padding: "0.75rem 1rem",
                                            borderRadius: "0.75rem",
                                            border: "1px solid var(--border)",
                                            backgroundColor: "white",
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
                    </div>

                    {/* Group Report Table */}
                    {groupReportData && (
                        <div className="card" style={{ padding: "2rem", overflow: "auto" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                                <div>
                                    <h2 style={{ fontSize: "1.5rem", fontWeight: "900", marginBottom: "0.5rem" }}>Simba Bingwa Kikoba Endelevu</h2>
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
                                                backgroundColor: index % 2 === 0 ? "#F8FAFC" : "white",
                                                borderBottom: "1px solid var(--border)"
                                            }}
                                        >
                                            <td style={{ padding: "1rem", fontWeight: "700" }}>{member.memberName}</td>
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
            )}
        </AppLayout>
    );
}
