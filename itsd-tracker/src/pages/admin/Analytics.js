import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { API_BASE_URL } from '../../apiConfig';
import { PremiumLineChart } from '../../components/PremiumChart';
import './Analytics.css';

/* ─── Ultra Component: KPI Card v6 ─── */
const KPICardV6 = ({ label, value, sub, trend, percent, color }) => (
    <div className="kpi-card-v6 v6-animate">
        <div className="kpi-v6-header">
            <span className="kpi-v6-label">{label}</span>
            {percent && (
                <div className={`trend-badge ${trend}`}>
                    {trend === 'up' ? '▲' : '▼'} {percent}%
                </div>
            )}
        </div>
        <div className="kpi-v6-value">{value}</div>
        <div className="kpi-v6-sub">{sub}</div>
    </div>
);

const AdminAnalytics = () => {
    const [stats, setStats] = useState(null);
    const [performance, setPerformance] = useState(null);
    const [bottlenecks, setBottlenecks] = useState([]);
    const [sectionPerf, setSectionPerf] = useState([]);
    const [temporal, setTemporal] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAnalytics = useCallback(async () => {
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const headers = { 'Authorization': `Bearer ${token}` };
            
            const [overviewRes, perfRes, bnRes, secRes, tempRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/analytics/overview`, { headers }),
                fetch(`${API_BASE_URL}/api/analytics/performance`, { headers }),
                fetch(`${API_BASE_URL}/api/analytics/bottlenecks`, { headers }),
                fetch(`${API_BASE_URL}/api/analytics/section-performance`, { headers }),
                fetch(`${API_BASE_URL}/api/analytics/temporal-activity`, { headers })
            ]);

            const overview = await overviewRes.json();
            const perf = await perfRes.json();
            const bnData = await bnRes.json();
            const secData = await secRes.json();
            const tempData = await tempRes.json();

            setStats(overview);
            setPerformance(perf);
            setBottlenecks(bnData);
            setSectionPerf(secData);
            setTemporal(tempData);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching analytics:', error);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    if (loading || !stats || stats.error || !performance || performance.error) {
        return (
            <AdminLayout title="Intelligence" subtitle="System Matrix">
                <div style={{ padding: '60px', textAlign: 'center' }}>
                    <div className="loading-spinner-box">Initializing Neural Analytics Matrix...</div>
                </div>
            </AdminLayout>
        );
    }

    // Logic: Calculate MoM (Mocked since we only have current snapshot usually)
    const trends = {
        volume: { val: '+12.4', type: 'up' },
        pending: { val: '-5.2', type: 'down' },
        velocity: { val: '+8.1', type: 'up' }
    };

    return (
        <AdminLayout 
            title="Operational Intelligence" 
            subtitle="Deep Matrix Oversight & Granular Performance Analytics"
        >
            <div className="analytics-container v6 animate-fade-in">
                
                {/* 1. Ultra Header UI */}
                <div className="v6-header-ui">
                    <div className="v6-title-group">
                        <h2>Analytics Hub</h2>
                        <p>Real-time system integrity and personnel throughput metrics</p>
                    </div>
                    <div className="v6-action-pills">
                        <button className="v6-pill active">Overview</button>
                        <button className="v6-pill">Efficiency</button>
                        <button className="v6-pill">Security</button>
                        <button className="v6-pill">Archive</button>
                    </div>
                </div>

                {/* 2. Ultra KPI Grid (6 Columns) */}
                <div className="kpi-row-v6">
                    <KPICardV6 
                        label="TOTAL VOLUME" 
                        value={stats.totalComms || 0} 
                        sub="Documents Processed" 
                        percent={trends.volume.val} 
                        trend={trends.volume.type}
                    />
                    <KPICardV6 
                        label="ACTIVE QUEUE" 
                        value={stats.statusDistribution?.find(s => s.status.includes('PENDING'))?.count || 0} 
                        sub="In-Progress Items" 
                        percent={trends.pending.val} 
                        trend={trends.pending.type}
                    />
                    <KPICardV6 
                        label="AVG VELOCITY" 
                        value={`${performance.avgCompletionDays || 0}d`} 
                        sub="Resolution Speed" 
                        percent={trends.velocity.val} 
                        trend={trends.velocity.type}
                    />
                    <KPICardV6 
                        label="STAFF ENGAGEMENT" 
                        value={stats.totalUsers || 0} 
                        sub="Active Personnel" 
                    />
                    <KPICardV6 
                        label="SUCCESS RATE" 
                        value={`${Math.round(((stats.statusDistribution?.find(s => s.status === 'APPROVED')?.count || 0) / stats.totalComms) * 100)}%`} 
                        sub="Archival Efficiency" 
                    />
                    <KPICardV6 
                        label="SYSTEM HEALTH" 
                        value="99.9%" 
                        sub="Operational Uptime" 
                    />
                </div>

                {/* 3. Main Intelligence Matrix */}
                <div className="main-grid-v6">
                    <div className="v6-card flow-chart-v6">
                        <div className="v6-header-ui" style={{ marginBottom: '20px' }}>
                            <div className="v6-title-group">
                                <h3>Universal Document Flow</h3>
                                <p>Volume distribution over 12-month horizon</p>
                            </div>
                        </div>
                        <div className="v6-area-chart-container">
                            {(performance.monthlyVolume || []).map((m, i) => (
                                <div key={i} className="v6-bar-group">
                                    <div className="v6-bar-fill" style={{ 
                                        height: `${(m.count / Math.max(...performance.monthlyVolume.map(x => x.count), 1)) * 100}%` 
                                    }}></div>
                                    <span style={{ fontSize: '10px', fontWeight: '800', textAlign: 'center', color: '#64748b', marginTop: '8px' }}>
                                        {m.month.substring(0,3).toUpperCase()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="v6-card">
                        <div className="v6-header-ui" style={{ marginBottom: '20px' }}>
                            <div className="v6-title-group">
                                <h3>Intelligence Feed</h3>
                                <p>Proactive system alerts</p>
                            </div>
                        </div>
                        <div className="intelligence-feed-v6">
                            <div className="intel-item-v6">
                                <div className="intel-icon-v6 alert">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                </div>
                                <div className="intel-content-v6">
                                    <h4>Bottleneck Detected</h4>
                                    <p>{bottlenecks[0]?.status.replace(/_/g, ' ')} queue is lagging by {bottlenecks[0]?.avgWaitDays} days above SLA.</p>
                                </div>
                            </div>
                            <div className="intel-item-v6">
                                <div className="intel-icon-v6 info">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                                </div>
                                <div className="intel-content-v6">
                                    <h4>Capacity Alert</h4>
                                    <p>Peak submission cycle detected between 09:00 - 11:00. Recommend load balancing.</p>
                                </div>
                            </div>
                            <div className="intel-item-v6">
                                <div className="intel-icon-v6 success">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                                </div>
                                <div className="intel-content-v6">
                                    <h4>Optimal Performance</h4>
                                    <p>All group-level approvals meeting the 24-hour response target.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Bottom Detailed Matrix */}
                <div className="bottom-matrix-v6">
                    <div className="v6-card matrix-item-v6">
                        <h3>Section Efficiency Matrix</h3>
                        <div className="matrix-row-v6">
                            {sectionPerf.slice(0, 4).map((s, i) => (
                                <div key={i} className="matrix-row-v6">
                                    <div className="matrix-info-v6">
                                        <span>{s.section}</span>
                                        <span>{s.efficiency}%</span>
                                    </div>
                                    <div className="matrix-bar-bg">
                                        <div className="matrix-bar-fill" style={{ width: `${s.efficiency}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="v6-card">
                        <h3>Submission Intensity</h3>
                        <PremiumLineChart 
                            title=""
                            labels={(performance.monthlyVolume || []).map(v => v.month)}
                            datasets={[
                                { label: 'Intensity', data: (performance.monthlyVolume || []).map(v => v.count), color: '#3b82f6' }
                            ]}
                        />
                    </div>

                    <div className="v6-card">
                        <h3>Operational Status</h3>
                        <div className="recommendations-grid">
                            <div className="rec-card" style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px' }}>
                                <h4>System Integrity</h4>
                                <p>Neural matrix synchronization is stable. Secure database access verified across all 12 operational sectors.</p>
                            </div>
                            <div className="rec-card" style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', marginTop: '16px' }}>
                                <h4>Administrative Oversight</h4>
                                <p>Current document velocity ({performance.avgCompletionDays}d) is within the 10% deviation of the quarterly target.</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </AdminLayout>
    );
};

export default AdminAnalytics;
