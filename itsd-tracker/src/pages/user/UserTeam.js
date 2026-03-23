import React, { useState, useEffect } from 'react';
import UserLayout from '../../layouts/UserLayout';
import { API_BASE_URL } from '../../apiConfig';
import './UserTeam.css';


const UserTeam = () => {
    const [groupsData, setGroupsData] = useState({ current: [], history: [] });

    useEffect(() => {
        const fetchGroups = async () => {
            try {
                const token = sessionStorage.getItem('itsd_auth_token');
                const response = await fetch(`${API_BASE_URL}/api/groups`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                setGroupsData({ current: data, history: [] });
            } catch (error) {
                console.error('Error fetching groups for team view:', error);
            }
        };
        fetchGroups();
    }, []);

    const [viewingVersion, setViewingVersion] = useState('current');
    const [selectedDept, setSelectedDept] = useState(null);
    const [filterDate, setFilterDate] = useState({ month: '', year: '' });

    // Sync with localStorage in case admin updates version while user is viewing
    useEffect(() => {
        const handleStorageChange = () => {
            const saved = sessionStorage.getItem('itsd_groups_data');
            if (saved) setGroupsData(JSON.parse(saved));
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const getFilteredHistory = () => {
        if (!filterDate.year && !filterDate.month) return groupsData.history;
        return groupsData.history.filter(h => {
            const date = new Date(h.snapshotDate);
            const yMatch = !filterDate.year || date.getFullYear().toString() === filterDate.year;
            const mMatch = !filterDate.month || (date.getMonth() + 1).toString() === filterDate.month;
            return yMatch && mMatch;
        });
    };

    const displayData = viewingVersion === 'current'
        ? groupsData.current
        : (groupsData.history.find(h => h.version === viewingVersion)?.data || []);

    return (
        <UserLayout
            title="ORGANIZATIONS"
            subtitle="View the official department structure and personnel mapping"
        >
            <div className="user-team-container animate-fade-in">
                {!selectedDept ? (
                    <>
                        <div className="team-header-row">
                            <div className="filter-controls-group">
                                <div className="date-filter-inputs">
                                    <select
                                        className="filter-select-glass"
                                        value={filterDate.year}
                                        onChange={(e) => { setFilterDate({ ...filterDate, year: e.target.value }); setViewingVersion('current'); }}
                                    >
                                        <option value="">All Years</option>
                                        {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                    <select
                                        className="filter-select-glass"
                                        value={filterDate.month}
                                        onChange={(e) => { setFilterDate({ ...filterDate, month: e.target.value }); setViewingVersion('current'); }}
                                    >
                                        <option value="">All Months</option>
                                        {Array.from({ length: 12 }, (_, i) => (
                                            <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="version-selector">
                                    <span className="label">RECORDS:</span>
                                    <select
                                        className="team-version-select"
                                        value={viewingVersion}
                                        onChange={(e) => setViewingVersion(e.target.value)}
                                    >
                                        <option value="current">Current (LIVE)</option>
                                        {getFilteredHistory().map(h => (
                                            <option key={h.version} value={h.version}>
                                                {new Date(h.snapshotDate).toLocaleDateString()} - {new Date(h.snapshotDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="team-stats">
                                <div className="stat-pill">
                                    <span className="value">{displayData.length}</span>
                                    <span className="label">Departments</span>
                                </div>
                            </div>
                        </div>

                        {viewingVersion !== 'current' && (
                            <div className="historical-view-banner animate-slide-up">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                <span>You are viewing a historical record from <strong>{new Date(groupsData.history.find(h => h.version === viewingVersion)?.snapshotDate).toLocaleString()}</strong></span>
                                <button className="btn-return-live" onClick={() => setViewingVersion('current')}>Back to LIVE</button>
                            </div>
                        )}

                        <div className="landing-org-chart-container">
                            {/* TOP NODE: MAIN OFFICE */}
                            {displayData.find(d => d.name === 'ITSD - MAIN OFFICE') && (
                                <div className="org-chart-top-section">
                                    {displayData.filter(d => d.name === 'ITSD - MAIN OFFICE').map(dept => (
                                        <div key={dept.id} className="dept-selection-card head-node glass-premium animate-slide-up" onClick={() => setSelectedDept(dept)}>
                                            <div className="dept-icon-box head-logo-bg">
                                                <img src="/itsdlogo.png" alt="ITSD Logo" className="head-logo-img" />
                                            </div>
                                            <div className="dept-info">
                                                <h4>{dept.name}</h4>
                                                <p>Head: <span>{dept.head}</span></p>
                                            </div>
                                            <div className="view-chart-indicator">
                                                <span>View Chart</span>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                    <polyline points="9 18 15 12 9 6"></polyline>
                                                </svg>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="org-chart-line-v"></div>
                                </div>
                            )}

                            {/* MIDDLE CONNECTOR LINE (Horizontal) */}
                            {displayData.filter(d => d.name !== 'ITSD - MAIN OFFICE').length > 0 && (
                                <div className="org-chart-connector-wrapper">
                                    <div className="org-chart-line-h"></div>
                                </div>
                            )}

                            {/* GRID NODES: OTHER SECTIONS */}
                            <div className="department-selection-grid">
                                {displayData.filter(d => d.name !== 'ITSD - MAIN OFFICE').map(dept => (
                                    <div
                                        key={dept.id}
                                        className="dept-selection-card glass-premium animate-slide-up"
                                        onClick={() => setSelectedDept(dept)}
                                    >
                                        <div className="dept-icon-box">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                <circle cx="9" cy="7" r="4"></circle>
                                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                            </svg>
                                        </div>
                                        <div className="dept-info">
                                            <h4>{dept.name}</h4>
                                            <p>Head: <span>{dept.head}</span></p>
                                        </div>
                                        <div className="view-chart-indicator">
                                            <span>View Chart</span>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                <polyline points="9 18 15 12 9 6"></polyline>
                                            </svg>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="org-chart-detail-view animate-fade-in">
                        <div className="chart-actions-header">
                            <button className="back-to-list-btn" onClick={() => setSelectedDept(null)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="15 18 9 12 15 6"></polyline>
                                </svg>
                                <span>Back to Departments</span>
                            </button>
                            <div className="active-dept-label">
                                <h3>{selectedDept.name}</h3>
                                <span>Official Organizational Structure</span>
                            </div>
                        </div>

                        <div className="hierarchical-chart-wrapper glass-premium">
                            <div className="org-vertical-tree">
                                {/* LEVEL 1: HEAD */}
                                <div className="tree-level level-head">
                                    <div className="node-connector parent-only"></div>
                                    <div className="modern-dept-card node-head animate-zoom-in">
                                        <div className="card-top">
                                            <span className="dept-badge">HEAD OF OFFICE</span>
                                        </div>
                                        <div className="head-section">
                                            <div className="avatar-square" style={{ overflow: 'hidden' }}>
                                                {selectedDept.headAvatar
                                                    ? <img src={selectedDept.headAvatar} alt={selectedDept.head} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} />
                                                    : (selectedDept.head || '?').charAt(0)
                                                }
                                            </div>
                                            <div className="head-details">
                                                <span className="position">Official Section Head</span>
                                                <span className="name">{selectedDept.head}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="node-connector child-only"></div>
                                </div>

                                {/* LEVEL 2: BRANCHES */}
                                <div className="tree-branches">
                                    {/* Support Branch */}
                                    {selectedDept.itsdSupport.length > 0 && (
                                        <div className="support-branch animate-slide-right">
                                            <div className="branch-label">ITSD SUPPORT UNIT</div>
                                            <div className="support-nodes">
                                                {selectedDept.itsdSupport.map((p, i) => (
                                                    <div key={i} className="support-node-item">
                                                        <div className="node-dot navy"></div>
                                                        <span>{p}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Main Personnel Branch */}
                                    <div className="personnel-branch">
                                        <div className="branch-label">DEPARTMENT PERSONNEL</div>
                                        <div className="personnel-nodes-grid">
                                            {selectedDept.personnel.map(person => (
                                                <div key={person.id} className="personnel-node-card animate-zoom-in">
                                                    <div className="node-avatar-sm">
                                                        {person.avatar
                                                            ? <img src={person.avatar} alt={person.name} />
                                                            : (person.name || '?').charAt(0)
                                                        }
                                                    </div>
                                                    <div className="node-info">
                                                        <span className="name">{person.name}</span>
                                                        <span className="role">{person.role}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {selectedDept.personnel.length === 0 && (
                                                <div className="empty-branch-state">No personnel recorded.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </UserLayout>
    );
};

export default UserTeam;
