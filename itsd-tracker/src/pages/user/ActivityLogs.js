import React, { useState, useEffect, useCallback } from 'react';
import UserLayout from '../../layouts/UserLayout';
import AdminLayout from '../../layouts/AdminLayout';
import Pagination from '../../components/Pagination';
import { API_BASE_URL } from '../../apiConfig';
import './ActivityLogs.css';

const ActivityLogs = ({ role = 'USER' }) => {
    const [allLogs, setAllLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(15);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [moduleFilter, setModuleFilter] = useState('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const isRouteAdmin = role && role.toUpperCase() === 'ADMIN';
    const Layout = isRouteAdmin ? AdminLayout : UserLayout;

    // Parse actual user role to determine data visibility
    const currentUser = JSON.parse(sessionStorage.getItem('itsd_user') || '{}');
    const actualRole = currentUser.role ? currentUser.role.toLowerCase() : 'user';
    const isSuperAdmin = actualRole === 'admin';

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const token = sessionStorage.getItem('itsd_auth_token');

            if (!token) {
                setAllLogs([]);
                setLoading(false);
                return;
            }

            const params = new URLSearchParams();
            // userId is NO LONGER needed in query; backend gets it from token
            
            if (isSuperAdmin && userSearch) {
                params.append('search', userSearch);
            }

            if (moduleFilter !== 'ALL') params.append('module', moduleFilter);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (searchQuery) params.append('search', searchQuery);
            params.append('limit', '1000');

            const url = `${API_BASE_URL}/api/logs?${params.toString()}`;
            console.log('Fetching logs via JWT-secured endpoint:', url);
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            
            setAllLogs(Array.isArray(data) ? data : []);
            setFilteredLogs(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching logs:', error);
            setAllLogs([]);
        } finally {
            setLoading(false);
        }
    }, [isSuperAdmin, userSearch, moduleFilter, startDate, endDate, searchQuery]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    // Extract unique modules for the filter dropdown
    const logModules = [...new Set(allLogs.map(l => l.module).filter(Boolean))].sort();

    // Pagination Logic
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <Layout
            title={isSuperAdmin ? "SYSTEM ACTIVITY LOGS" : "MY ACTIVITY LOGS"}
            subtitle={isSuperAdmin ? "Comprehensive audit trail of all administrative and user operations." : "Registry of your personal operations and access history."}
            permissionRequired={isRouteAdmin ? "manage_users" : "view_dashboard"}
        >
            <div className="logs-enhanced-wrapper animate-fade-in">

                {/* Refined Filter Section */}
                <div className="logs-filter-dashboard glass-premium">
                    <div className="filter-main-row">
                        <div className="primary-search-container">
                            <div className="search-box-premium">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search by action, description, or details..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            {isSuperAdmin && (
                                <div className="search-box-premium user-search-box">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Admin: User filter..."
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="action-buttons-group">
                            <button className="btn-refresh-logs" onClick={fetchLogs} title="Refresh Archive">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M23 4v6h-6"></path>
                                    <path d="M1 20v-6h6"></path>
                                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                                </svg>
                                <span>SYNC</span>
                            </button>
                        </div>
                    </div>

                    <div className="filter-secondary-row">
                        <div className="secondary-filters-group">
                            <div className="filter-unit">
                                <label>MODULE</label>
                                <select value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
                                    <option value="ALL">All Departments</option>
                                    {['System', 'Authentication', 'Communications', 'Records', 'Analytics'].map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                    {logModules.filter(m => !['System', 'Authentication', 'Communications', 'Records', 'Analytics'].includes(m)).map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-unit date-range-unit">
                                <label>RECORDS FROM</label>
                                <div className="date-inputs-pill">
                                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} title="Start Date" />
                                    <span className="date-separator">to</span>
                                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} title="End Date" />
                                    {(startDate || endDate) && (
                                        <button className="clear-dates-icon" onClick={() => { setStartDate(''); setEndDate(''); }}>✕</button>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="stats-indicator">
                            <span className="stats-label">TOTAL MATCHES:</span>
                            <span className="stats-value">{filteredLogs.length}</span>
                        </div>
                    </div>
                </div>

                {/* Logs Table */}
                <div className="logs-grid-container glass-premium">
                    <div className="logs-table-header">
                        {isSuperAdmin && <div className="col-user">USER NAME</div>}
                        {isSuperAdmin && <div className="col-role">ROLE</div>}
                        <div className="col-type">ACTION</div>
                        <div className="col-module">MODULE</div>
                        <div className="col-time">DATE</div>
                    </div>

                    <div className="logs-scroll-area">
                        {loading ? (
                            <div className="empty-logs-state">
                                <div className="spinner-modern"></div>
                                <p>Syncing log archive...</p>
                            </div>
                        ) : currentItems.length > 0 ? currentItems.map((log) => (
                            <div key={log.id} className="log-row-premium">
                                {isSuperAdmin && (
                                    <div className="col-user">
                                        <div className="user-info-mini">
                                            <div className={`user-avatar-sm ${(log.role || 'user').toLowerCase()}`}>
                                                {log.name ? log.name.charAt(0).toUpperCase() : '?'}
                                            </div>
                                            <span className="user-name">{log.name || 'System'}</span>
                                        </div>
                                    </div>
                                )}
                                {isSuperAdmin && (
                                    <div className="col-role">
                                        <span className={`role-badge-pill ${(log.role || 'user').toLowerCase()}`}>
                                            {log.role || 'USER'}
                                        </span>
                                    </div>
                                )}
                                <div className="col-type">
                                    <div className="action-details-stack">
                                        <span className={`log-tag-vibrant ${(log.action || 'other').toLowerCase().split(' ')[0]}`}>
                                            {log.action || 'Unknown'}
                                        </span>
                                        {log.details && <span className="log-details-subtext">{log.details}</span>}
                                    </div>
                                </div>
                                <div className="col-module">
                                    <span className="module-badge">{log.module || 'System'}</span>
                                </div>
                                <div className="col-time">
                                    <span className="time-display">
                                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : '---'}
                                    </span>
                                </div>
                            </div>
                        )) : (
                            <div className="empty-logs-state">
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                    <polyline points="10 9 9 9 8 9"></polyline>
                                </svg>
                                <h3>No logs found</h3>
                                <p>Try adjusting your filters or click WAIT for records to populate.</p>
                                {isSuperAdmin && (
                                    <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                                        Role Override: {actualRole.toUpperCase()} | Total in State: {allLogs.length}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Pagination Controls */}
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    paginate={paginate}
                />
            </div>
        </Layout>
    );
};

export default ActivityLogs;
