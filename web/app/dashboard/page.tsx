"use client";

import { onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import {
    ArrowUpCircle,
    Banknote,
    TrendingUp,
    Users
} from "lucide-react";
import { useEffect, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";
import AppLayout from "../../components/AppLayout";
import { useAuth } from "../../context/AuthContext";
import { auth, db } from "../../lib/firebase";
import { penaltyService } from "../../lib/penaltyService";

export default function DashboardPage() {
    const { user: authUser, role, timeRemaining } = useAuth();
    const [user, setUser] = useState<any>(null);
    const [stats, setStats] = useState({
        vaultBalance: 0,
        loanPool: 0,
        activeLoans: 0,
        totalMembers: 0,
        // Personal stats for members
        personalContribution: 0,
        personalLoan: 0
    });
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const formatTime = (seconds?: number) => {
        if (seconds === undefined) return "--:--";
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
        });
        return () => unsubscribe();
    }, []);




    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Check for penalties logic
            if (user?.uid) {
                await penaltyService.checkAndApplyPenalties(user.uid);
            }

            // Fetch Users
            const usersSnapshot = await getDocs(collection(db, "users"));
            const membersCount = usersSnapshot.size;

            // Fetch Transactions
            const transactionsQuery = query(collection(db, "transactions"), orderBy("date", "asc"));
            const transSnapshot = await getDocs(transactionsQuery);

            let totalContrib = 0;
            let totalLoansIssued = 0;
            let repaymentTotal = 0;

            // Track loans by member and category to determine active loans
            const loansByMemberCategory: { [key: string]: number } = {};

            // Group by month for chart
            const monthlyStats: { [key: string]: { contribution: number, loans: number } } = {};

            let personalContrib = 0;
            let personalLoan = 0;

            transSnapshot.forEach((doc) => {
                const data = doc.data();
                const amount = data.amount || 0;
                const date = new Date(data.date);
                const monthYear = date.toLocaleString('default', { month: 'short', year: '2-digit' });

                if (!monthlyStats[monthYear]) {
                    monthlyStats[monthYear] = { contribution: 0, loans: 0 };
                }

                if (data.type === "Contribution") {
                    totalContrib += amount;
                    monthlyStats[monthYear].contribution += amount;
                    if (data.memberId === user.uid) {
                        personalContrib += amount;
                    }
                } else if (data.type === "Loan") {
                    totalLoansIssued += amount;
                    monthlyStats[monthYear].loans += amount;

                    // Track loan balance by member+category
                    const key = `${data.memberId}_${data.category || 'Unknown'}`;
                    if (!loansByMemberCategory[key]) {
                        loansByMemberCategory[key] = 0;
                    }
                    loansByMemberCategory[key] += amount;

                    if (data.memberId === user.uid) {
                        personalLoan += amount;
                    }
                } else if (data.type === "Loan Repayment") {
                    repaymentTotal += amount;
                    monthlyStats[monthYear].contribution += amount; // Also count repayments as inflow in the chart

                    // Subtract repayments from the member+category balance
                    const key = `${data.memberId}_${data.category || 'Unknown'}`;
                    if (!loansByMemberCategory[key]) {
                        loansByMemberCategory[key] = 0;
                    }
                    loansByMemberCategory[key] -= amount;

                    if (data.memberId === user.uid) {
                        personalLoan -= amount;
                    }
                }
            });

            // Count active loans (those with remaining balance > 0)
            let activeLoansCount = 0;
            Object.values(loansByMemberCategory).forEach(balance => {
                if (balance > 0) {
                    activeLoansCount++;
                }
            });

            setStats({
                vaultBalance: totalContrib + repaymentTotal - totalLoansIssued,
                loanPool: activeLoansCount > 0 ? Object.values(loansByMemberCategory).reduce((sum, bal) => sum + Math.max(0, bal), 0) : 0,
                activeLoans: activeLoansCount,
                totalMembers: membersCount,
                personalContribution: personalContrib,
                personalLoan: personalLoan
            });

            // Format chart data - Inflow includes both Contributions and Repayments (calculated during transaction loop)
            const formattedChartData = Object.keys(monthlyStats).map(month => ({
                name: month,
                contribution: monthlyStats[month].contribution,
                loans: monthlyStats[month].loans
            }));

            setChartData(formattedChartData);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ title, value, icon: Icon, color }: any) => (
        <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{
                backgroundColor: `${color}15`,
                color: color,
                padding: '0.875rem',
                borderRadius: '1rem'
            }}>
                <Icon size={24} />
            </div>
            <div>
                <p style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</p>
                <p style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', marginTop: '0.25rem' }}>{value}</p>
            </div>
        </div>
    );

    return (
        <AppLayout>
            <div style={{ marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '1.875rem', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    Welcome Back, {user?.displayName?.split(' ')[0] || 'User'}
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Here's an overview of your organization's financial performance</p>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2.5rem'
            }}>
                {role === 'Admin' ? (
                    <>
                        <StatCard
                            title="Vault Balance"
                            value={`TSh ${stats.vaultBalance.toLocaleString()}`}
                            icon={Banknote}
                            color="#10B981"
                        />
                        <StatCard
                            title="Loan Pool (Owed)"
                            value={`TSh ${stats.loanPool.toLocaleString()}`}
                            icon={TrendingUp}
                            color="#F57C00"
                        />
                        <StatCard
                            title="Active Loans"
                            value={stats.activeLoans}
                            icon={ArrowUpCircle}
                            color="#3B82F6"
                        />
                        <StatCard
                            title="Total Members"
                            value={stats.totalMembers}
                            icon={Users}
                            color="#8B5CF6"
                        />
                    </>
                ) : (
                    <>
                        <StatCard
                            title="My Total Savings"
                            value={`TSh ${stats.personalContribution.toLocaleString()}`}
                            icon={Banknote}
                            color="#10B981"
                        />
                        <StatCard
                            title="My Current Debt"
                            value={`TSh ${stats.personalLoan.toLocaleString()}`}
                            icon={TrendingUp}
                            color="#F57C00"
                        />
                        <StatCard
                            title="Total Members"
                            value={stats.totalMembers}
                            icon={Users}
                            color="#8B5CF6"
                        />
                    </>
                )}
            </div>

            {role === 'Admin' && (
                <div className="card" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
                    <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>Inflow vs Outflow</h2>
                            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Comparing Monthly Contributions and Loans issued</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: '700' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: '#F57C00' }}></div>
                                <span style={{ color: 'var(--text-primary)' }}>Contributions</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: '700' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '4px', backgroundColor: 'var(--text-disabled)' }}></div>
                                <span style={{ color: 'var(--text-primary)' }}>Loans</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ width: '100%', height: 400 }}>
                        <ResponsiveContainer>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                                    tickFormatter={(value) => `TSh ${value / 1000}k`}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(245, 124, 0, 0.05)' }}
                                    contentStyle={{
                                        borderRadius: '12px',
                                        backgroundColor: 'var(--card-bg)',
                                        border: '1px solid var(--border)',
                                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                                        padding: '12px',
                                        color: 'var(--text-primary)'
                                    }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                    formatter={(value: any, name: any) => [`TSh ${value.toLocaleString()}`, name === 'contribution' ? 'Total Contribution' : 'Loans Issued']}
                                />
                                <Bar
                                    dataKey="contribution"
                                    name="contribution"
                                    fill="#F57C00"
                                    radius={[6, 6, 0, 0]}
                                    barSize={30}
                                />
                                <Bar
                                    dataKey="loans"
                                    name="loans"
                                    fill="var(--text-disabled)"
                                    radius={[6, 6, 0, 0]}
                                    barSize={30}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
