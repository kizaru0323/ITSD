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
    const [loading, setLoading] = useState(true);

    const fetchMasterData = useCallback(async () => {
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const headers = { 'Authorization': `Bearer ${token}` };

            const [ovRes, perfRes, bnRes, secRes, logRes, growthRes, trendRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/analytics/overview`, { headers }),
                fetch(`${API_BASE_URL}/api/analytics/performance`, { headers }),
                fetch(`${API_BASE_URL}/api/analytics/bottlenecks`, { headers }),
                fetch(`${API_BASE_URL}/api/analytics/section-performance`, { headers }),
                fetch(`${API_BASE_URL}/api/logs`, { headers }),
                fetch(`${API_BASE_URL}/api/analytics/user-growth`, { headers }),
                fetch(`${API_BASE_URL}/api/analytics/activity-trend`, { headers })
            ]);

            const [overview, perf, bn, sec, logs, growth, trend] = await Promise.all([
                ovRes.json(), perfRes.json(), bnRes.json(), secRes.json(), logRes.json(), growthRes.json(), trendRes.json()
            ]);

            setStats(overview);
            setPerformance(perf);
            setBottlenecks(Array.isArray(bn) ? bn : []);
            setSectionPerf(Array.isArray(sec) ? sec.sort((a,b) => b.total - a.total) : []);
            setUserGrowth(Array.isArray(growth) ? growth : []);
            setActivityTrend(Array.isArray(trend) ? trend : []);

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
                
                {/* 🚀 Layer 1: KPI Pulse */}
                <div className="kpi-row">
                    <PremiumKPICard 
                        title="Pending" 
                        value={(Array.isArray(stats.statusDistribution) ? stats.statusDistribution : []).find(s => s.status.includes('PENDING'))?.count || 0}
                        subtitle="Active Records"
                        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>}
                        trend={{ value: 'In Queue' }}
                        colorClass="blue"
                    />
                    <PremiumKPICard 
                        title="High Priority" 
                        value={(Array.isArray(stats.priorityDistribution) ? stats.priorityDistribution : []).find(p => p.priority === 'HIGH')?.count || 0}
                        subtitle="Urgent Attention"
                        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path></svg>}
                        trend={{ value: 'Urgent' }}
                        colorClass="red"
                    />
                    <PremiumKPICard 
                        title="Follow-up Required" 
                        value={stats.totalFollowUps || 0}
                        subtitle="Needs Action"
                        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>}
                        trend={{ value: 'Follow Ups' }}
                        colorClass="amber"
                    />
                    <PremiumKPICard 
                        title="Total Communications" 
                        value={stats.totalComms}
                        subtitle="System Volume"
                        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>}
                        trend={{ value: 'Total' }}
                        colorClass="purple"
                    />
                </div>

                {/* 🚀 Layer 2: Distribution Row */}
                <div className="charts-row">
                    <div className="an-card">
                        <PremiumPieChart 
                            title="Status Distribution" 
                            subtitle="Current logistical flow analysis" 
                            data={statusData} 
                        />
                    </div>
                    <div className="an-card">
                        <PremiumPieChart 
                            title="Priority Distribution" 
                            subtitle="Critical versus standard operations" 
                            data={priorityData} 
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
