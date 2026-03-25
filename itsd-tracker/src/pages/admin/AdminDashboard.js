import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { API_BASE_URL } from '../../apiConfig';
import Pagination from '../../components/Pagination';
import { PremiumLineChart, PremiumPieChart, PremiumBarChart, PremiumKPICard } from '../../components/PremiumChart';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const [allActivities, setAllActivities] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(5);

    const [stats, setStats] = useState(null);
    const [performance, setPerformance] = useState(null);
    const [bottlenecks, setBottlenecks] = useState([]);
    const [sectionPerf, setSectionPerf] = useState([]);
    const [userGrowth, setUserGrowth] = useState([]);
    const [activityTrend, setActivityTrend] = useState([]);
    const [directionTrend, setDirectionTrend] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchMasterData = useCallback(async () => {
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [ovRes, perfRes, bnRes, secRes, logRes, growthRes, trendRes, dirTrendRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/analytics/overview`, { headers }),
                fetch(`${API_BASE_URL}/api/analytics/performance`, { headers }),
                fetch(`${API_BASE_URL}/api/analytics/bottlenecks`, { headers }),
                fetch(`${API_BASE_URL}/api/analytics/section-performance`, { headers }),
                fetch(`${API_BASE_URL}/api/logs`, { headers }),
                fetch(`${API_BASE_URL}/api/analytics/user-growth`, { headers }),
                fetch(`${API_BASE_URL}/api/analytics/activity-trend`, { headers }),
                fetch(`${API_BASE_URL}/api/analytics/communication-direction`, { headers })
            ]);

            const [overview, perf, bn, sec, logs, growth, trend, dirTrend] = await Promise.all([
                ovRes.json(), perfRes.json(), bnRes.json(), secRes.json(), logRes.json(), growthRes.json(), trendRes.json(), dirTrendRes.json()
            ]);

            setStats(overview);
            setPerformance(perf);
            setBottlenecks(Array.isArray(bn) ? bn : []);
            setSectionPerf(Array.isArray(sec) ? sec.sort((a,b) => b.total - a.total) : []);
            setUserGrowth(Array.isArray(growth) ? growth : []);
            setActivityTrend(Array.isArray(trend) ? trend : []);
            setDirectionTrend(Array.isArray(dirTrend) ? dirTrend : []);

            const activities = (Array.isArray(logs) ? logs : []).map(l => ({
                id: l.id,
                from: l.user || 'System',
                subject: l.details || 'System activity',
                time: new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                timestamp: new Date(l.timestamp)
            }));
            setAllActivities(activities);
            setLoading(false);
        } catch (error) {
            console.error('Master data fetch error:', error);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMasterData();
        const interval = setInterval(fetchMasterData, 60000);
        return () => clearInterval(interval);
    }, [fetchMasterData]);

    if (loading || !stats || !performance) {
        return (
            <AdminLayout title="COMMAND CENTER" subtitle="Initializing Neural Link...">
                <div style={{ padding: '100px', textAlign: 'center' }}>
                    <div className="v3-loading-spinner">SYNCING EXECUTIVE MATRIX...</div>
                </div>
            </AdminLayout>
        );
    }

    const currentItems = allActivities.slice((currentPage-1)*itemsPerPage, currentPage*itemsPerPage);
    const totalPages = Math.ceil(allActivities.length / itemsPerPage);

    // Prepare chart data with professional palette
    const statusData = (Array.isArray(stats.statusDistribution) ? stats.statusDistribution : []).map((s, i) => ({
        label: s.status.replace(/_/g, ' '),
        value: parseInt(s.count),
        color: ['#6366f1', '#14b8a6', '#f59e0b', '#f43f5e', '#3b82f6', '#94a3b8'][i % 6]
    }));

    const priorityData = (Array.isArray(stats.priorityDistribution) ? stats.priorityDistribution : []).map((p, i) => ({
        label: p.priority,
        value: parseInt(p.count),
        color: p.priority === 'HIGH' ? '#f43f5e' : p.priority === 'MEDIUM' ? '#f59e0b' : '#6366f1'
    }));

    return (
        <AdminLayout 
            title="EXECUTIVE COMMAND CENTER" 
            subtitle="Neural Network System Oversight & Performance Analytics"
        >
            <div className="admin-dashboard-container v3 redesign animate-fade-in">
                
                {/* 🚀 Layer 0: Global System Metrics (New) */}
                <div className="kpi-row" style={{ marginBottom: '24px' }}>
                    <PremiumKPICard 
                        title="Total Users" 
                        value={stats.totalUsers}
                        subtitle="Account Records"
                        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>}
                        trend={{ value: 'Full Base' }}
                        colorClass="blue"
                    />
                    <PremiumKPICard 
                        title="Active Today" 
                        value={stats.activeToday}
                        subtitle="Live Sessions"
                        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>}
                        trend={{ value: 'Real-time' }}
                        colorClass="teal"
                    />
                    <PremiumKPICard 
                        title="New This Month" 
                        value={`+${stats.newThisMonth}`}
                        subtitle="Monthly Growth"
                        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="16" y1="11" x2="22" y2="11"></line></svg>}
                        trend={{ value: 'Expansion' }}
                        colorClass="purple"
                    />
                    <PremiumKPICard 
                        title="Avg Session" 
                        value={stats.avgSessionTime}
                        subtitle="User Engagement"
                        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>}
                        trend={{ value: 'Calculated' }}
                        colorClass="amber"
                    />
                </div>

                {/* 🚀 Layer 1: KPI Pulse */}
                <div className="kpi-row">
                    <PremiumKPICard 
                        title="Pending" 
                        value={(Array.isArray(stats.statusDistribution) ? stats.statusDistribution : []).find(s => s.status.includes('PENDING'))?.count || 0}
                        subtitle="Active Records"
                        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>}
                        trend={{ value: 'In Queue' }}
                        colorClass="blue"
                    />
                    <PremiumKPICard 
                        title="High Priority" 
                        value={(Array.isArray(stats.priorityDistribution) ? stats.priorityDistribution : []).find(p => p.priority === 'HIGH')?.count || 0}
                        subtitle="Urgent Attention"
                        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>}
                        trend={{ value: 'Urgent' }}
                        colorClass="red"
                    />
                    <PremiumKPICard 
                        title="Follow-up Required" 
                        value={stats.totalFollowUps || 0}
                        subtitle="Needs Action"
                        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>}
                        trend={{ value: 'Follow Ups' }}
                        colorClass="amber"
                    />
                    <PremiumKPICard 
                        title="Total Communications" 
                        value={stats.totalComms}
                        subtitle="System Volume"
                        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>}
                        trend={{ value: 'Total' }}
                        colorClass="purple"
                    />
                </div>

                {/* 🚀 Layer 2: Distribution & Direction Row */}
                <div className="charts-row">
                    <div className="an-card">
                        <PremiumPieChart 
                            title="Status Distribution" 
                            subtitle="Current logistical flow analysis" 
                            data={statusData} 
                        />
                    </div>
                    <div className="an-card" style={{ flex: 1.5 }}>
                        <PremiumLineChart 
                            title="Communication Flow Analysis" 
                            subtitle="7-day volume by direction (Incoming vs Outgoing vs Internal)" 
                            labels={directionTrend.map(t => t.day)}
                            datasets={[
                                { label: 'INCOMING', data: directionTrend.map(t => t.incoming), color: '#6366f1' },
                                { label: 'OUTGOING', data: directionTrend.map(t => t.outgoing), color: '#14b8a6' },
                                { label: 'ITSD ONLY', data: directionTrend.map(t => t.itsd), color: '#f59e0b' }
                            ]}
                        />
                    </div>
                </div>

                {/* 🚀 Layer 3 & 4: Unified Strategic Grid (2-Column Refactor) */}
                <div className="dashboard-grid-v2">
                    {/* Left Column: Personnel & Timeline */}
                    <div className="dashboard-col">
                        <div className="an-card">
                            <PremiumBarChart 
                                title="Personnel Expansion" 
                                subtitle="Monthly cumulative active accounts" 
                                labels={userGrowth.map(g => g.month)}
                                datasets={[
                                    { label: 'Active Users', data: userGrowth.map(g => g.total), color: '#6366f1' }
                                ]}
                            />
                        </div>
                        <div className="an-card">
                            <div className="an-card-header">
                                <h3>Live System Timeline</h3>
                            </div>
                            <div className="activity-timeline">
                                {currentItems.map(item => (
                                    <div key={item.id} className="timeline-node">
                                        <div className="timeline-marker">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <circle cx="12" cy="12" r="10"></circle>
                                            </svg>
                                        </div>
                                        <div className="timeline-content">
                                            <div className="timeline-meta">
                                                <span className="timeline-user">{item.from}</span>
                                                <span className="timeline-time">{item.time}</span>
                                            </div>
                                            <div className="timeline-msg">{item.subject}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: '20px' }}>
                                <Pagination currentPage={currentPage} totalPages={totalPages} paginate={setCurrentPage} />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Operational Velocity & Unit Performance */}
                    <div className="dashboard-col">
                        <div className="an-card">
                            <PremiumLineChart 
                                title="Operational Velocity" 
                                subtitle="Weekly interaction & creation analytics" 
                                labels={activityTrend.map(t => t.day)}
                                datasets={[
                                    { label: 'Auth Logins', data: activityTrend.map(t => t.logins), color: '#14b8a6' },
                                    { label: 'Dispatches', data: activityTrend.map(t => t.creations), color: '#8b5cf6' }
                                ]}
                            />
                        </div>
                        <div className="an-card">
                            <div className="an-card-header">
                                <h3>Unit Performance</h3>
                            </div>
                            <div className="efficiency-grid">
                                {sectionPerf.length > 0 ? sectionPerf.slice(0, 6).map((s, idx) => (
                                    <div key={idx} className="efficiency-item">
                                        <div className="eff-label">{s.section}</div>
                                        <div className="eff-bar-bg">
                                            <div className="eff-bar-fill" style={{ width: `${s.efficiency}%` }}></div>
                                        </div>
                                        <div className="eff-value">{s.efficiency}%</div>
                                    </div>
                                )) : (
                                    <div className="empty-perf-state">
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.2, marginBottom: '12px' }}>
                                            <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
                                            <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
                                        </svg>
                                        <p>No throughput data available yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </AdminLayout>
    );
};

export default AdminDashboard;
