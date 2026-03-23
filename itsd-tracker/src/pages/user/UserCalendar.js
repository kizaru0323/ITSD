import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import UserLayout from '../../layouts/UserLayout';
import AdminLayout from '../../layouts/AdminLayout';
import { API_BASE_URL } from '../../apiConfig';
import './UserCalendar.css';

// Data will be fetched from localStorage: 'itsd_communications'

const UserCalendar = ({ role = 'USER' }) => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const [allCommunications, setAllCommunications] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [processedCommunications, setProcessedCommunications] = useState([]);
    const [monthSummary, setMonthSummary] = useState({ total: 0, processed: 0, efficiency: 0 });
    const [viewedComm, setViewedComm] = useState(null); // For Full Detail Modal
    const [currentPage, setCurrentPage] = useState(1);
    const RECORDS_PER_PAGE = 3;

    React.useEffect(() => {
        const fetchComms = async () => {
            try {
                const token = sessionStorage.getItem('itsd_auth_token');
                const response = await fetch(`${API_BASE_URL}/api/communications`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                setAllCommunications(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Error fetching communications for calendar:', error);
            }
        };
        fetchComms();
    }, []);

    React.useEffect(() => {
        if (!Array.isArray(allCommunications)) return;
        // Filter communications for the selected date
        const filtered = allCommunications.filter(comm => {
            const commDate = new Date(comm.date);
            return commDate.getDate() === selectedDate.getDate() &&
                commDate.getMonth() === selectedDate.getMonth() &&
                commDate.getFullYear() === selectedDate.getFullYear();
        });
        setProcessedCommunications(filtered);
        setCurrentPage(1); // Reset to first page on date change
    }, [selectedDate, allCommunications]);

    const totalPages = Math.ceil(processedCommunications.length / RECORDS_PER_PAGE);
    const paginatedCommunications = processedCommunications.slice(
        (currentPage - 1) * RECORDS_PER_PAGE,
        currentPage * RECORDS_PER_PAGE
    );

    React.useEffect(() => {
        if (!Array.isArray(allCommunications)) return;
        // Calculate Month Summary
        const monthComms = allCommunications.filter(comm => {
            const commDate = new Date(comm.date);
            return commDate.getMonth() === currentDate.getMonth() &&
                commDate.getFullYear() === currentDate.getFullYear();
        });

        const total = monthComms.length;
        const processed = monthComms.filter(c => c.status === 'COMPLETED' || c.status === 'APPROVED').length;
        const efficiency = total > 0 ? Math.round((processed / total) * 100) : 0;

        setMonthSummary({ total, processed, efficiency });
    }, [currentDate, allCommunications]);

    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const renderHeader = () => {
        return (
            <div className="calendar-header-modern">
                <div className="current-month">
                    <h2>{months[currentDate.getMonth()]} <span>{currentDate.getFullYear()}</span></h2>
                </div>
                <div className="nav-buttons">
                    <button className="year-nav" onClick={() => setCurrentDate(new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1))} title="Prev Year">
                        «
                    </button>
                    <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                    <button onClick={() => setCurrentDate(new Date())} className="today-btn">Today</button>
                    <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                    <button className="year-nav" onClick={() => setCurrentDate(new Date(currentDate.getFullYear() + 1, currentDate.getMonth(), 1))} title="Next Year">
                        »
                    </button>
                </div>
            </div>
        );
    };

    const renderDays = () => {
        const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
        return (
            <div className="calendar-days-modern">
                {days.map(day => <div key={day} className="day-name">{day}</div>)}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = firstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
        const monthDays = daysInMonth(currentDate.getFullYear(), currentDate.getMonth());
        const cells = [];

        // Empty cells before first day
        for (let i = 0; i < monthStart; i++) {
            cells.push(<div key={`empty-${i}`} className="calendar-cell empty"></div>);
        }

        // Days of current month
        for (let day = 1; day <= monthDays; day++) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const isToday = date.toDateString() === new Date().toDateString();

            // Check if there are communications on this date
            const dayComms = Array.isArray(allCommunications) ? allCommunications.filter(comm => {
                const commDate = new Date(comm.date);
                return commDate.getDate() === day &&
                    commDate.getMonth() === currentDate.getMonth() &&
                    commDate.getFullYear() === currentDate.getFullYear();
            }) : [];

            const hasComm = dayComms.length > 0;

            cells.push(
                <div
                    key={day}
                    className={`calendar-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${hasComm ? 'has-comm' : ''}`}
                    onClick={() => setSelectedDate(date)}
                >
                    <span className="day-number">{day}</span>
                    {hasComm && (
                        <div className="comm-indicator">
                            <span className="comm-count">{dayComms.length}</span>
                        </div>
                    )}
                </div>
            );
        }

        return <div className="calendar-grid-modern">{cells}</div>;
    };

    const isAdmin = role && role.toUpperCase() === 'ADMIN';
    const Layout = isAdmin ? AdminLayout : UserLayout;

    return (
        <Layout
            title="Communication Calendar"
            subtitle="Track and filter your communication history by date and month"
        >
            <div className="user-calendar-wrapper animate-fade-in">
                <div className="premium-glow-system">
                    <div className="glow-sphere sphere-1"></div>
                    <div className="glow-sphere sphere-2"></div>
                </div>

                <div className="calendar-layout-modern">
                    {/* Top Section: Calendar + List */}
                    <div className="calendar-top-section">
                        <div className="calendar-main-card glass-morph">
                            {renderHeader()}
                            {renderDays()}
                            {renderCells()}
                        </div>

                        <aside className="calendar-side-panel glass-morph">
                            <div className="panel-header">
                                <div className="icon-wrap">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                </div>
                                <div className="date-text">
                                    <h3>{selectedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</h3>
                                    <p>{processedCommunications.length} Processed Record(s)</p>
                                </div>
                            </div>

                            <div className="comm-results-list">
                                {paginatedCommunications.length > 0 ? (
                                    <>
                                        {paginatedCommunications.map(comm => (
                                            <div
                                                key={comm.id}
                                                className="comm-result-item-compact animate-slide-in"
                                                onClick={() => setViewedComm(comm)}
                                            >
                                                <div className="comm-bar"></div>
                                                <div className="comm-content-mini">
                                                    <div className="comm-info-top">
                                                        <span className="comm-id">{comm.trackingId}</span>
                                                        <span className={`comm-status-pill ${comm.status.toLowerCase().replace(' ', '-')}`}>{comm.status}</span>
                                                    </div>
                                                    <h4 className="comm-subject">{comm.subject}</h4>
                                                </div>
                                                <div className="view-chevron">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                                </div>
                                            </div>
                                        ))}

                                        {totalPages > 1 && (
                                            <div className="calendar-pagination">
                                                <button
                                                    className="pagination-btn prev"
                                                    disabled={currentPage === 1}
                                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                >
                                                    Previous
                                                </button>
                                                <span className="page-info">
                                                    Page {currentPage} of {totalPages}
                                                </span>
                                                <button
                                                    className="pagination-btn next"
                                                    disabled={currentPage === totalPages}
                                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="empty-results">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                        <p>No records for this date.</p>
                                    </div>
                                )}
                            </div>
                        </aside>
                    </div>

                    {/* Bottom Section: Summary */}
                    <div className="calendar-bottom-section">
                        <div className="calendar-stats-row glass-morph animate-fade-in-up">
                            <div className="summary-title">
                                <h3>{months[currentDate.getMonth()]} {currentDate.getFullYear()} Processing Summary</h3>
                                <p>Overall system performance for the current timeframe</p>
                            </div>
                            <div className="stats-grid-bottom">
                                <div className="stat-item">
                                    <label>Total Submissions</label>
                                    <span className="value">{monthSummary.total < 10 ? `0${monthSummary.total}` : monthSummary.total}</span>
                                </div>
                                <div className="stat-item highlight-processed">
                                    <label>Successfully Processed</label>
                                    <span className="value">{monthSummary.processed < 10 ? `0${monthSummary.processed}` : monthSummary.processed}</span>
                                </div>
                                <div className="stat-item highlight-efficiency">
                                    <label>System Efficiency</label>
                                    <span className="value">{monthSummary.efficiency}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {viewedComm && createPortal(
                    <div className="modern-overlay animate-fade-in" onClick={() => setViewedComm(null)}>
                        <div className="modern-modal animate-zoom-in" onClick={e => e.stopPropagation()} style={{ width: '650px' }}>
                            <div className="modern-modal-header">
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span className={`comm-status-pill ${viewedComm.status.toLowerCase().replace(' ', '-')}`} style={{ margin: 0 }}>{viewedComm.status}</span>
                                    {viewedComm.subject}
                                </h3>
                                <button className="close-btn-modern" onClick={() => setViewedComm(null)}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="20" height="20">
                                        <line x1="18" y1="6" x2="6" y2="18"></line>
                                        <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            </div>

                            <div className="modern-modal-body">
                                <div style={{ marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <p className="modal-tracking-id" style={{ margin: 0, fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>Tracking ID: <span style={{ color: 'var(--primary-gold)' }}>{viewedComm.trackingId}</span></p>
                                </div>

                                <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
                                    <div className="detail-group">
                                        <label style={{ fontSize: '10px', letterSpacing: '0.05em', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>DEPARTMENT / OFFICE</label>
                                        <p style={{ margin: 0, fontWeight: 600 }}>{viewedComm.office || viewedComm.dept || 'Information Technology'}</p>
                                    </div>
                                    <div className="detail-group">
                                        <label style={{ fontSize: '10px', letterSpacing: '0.05em', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>DATE SUBMITTED</label>
                                        <p style={{ margin: 0, fontWeight: 600 }}>{viewedComm.date}</p>
                                    </div>
                                    <div className="detail-group">
                                        <label style={{ fontSize: '10px', letterSpacing: '0.05em', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>PRIORITY LEVEL</label>
                                        <p className={`priority-${viewedComm.priority?.toLowerCase()}`} style={{ margin: 0, fontWeight: 600 }}>{viewedComm.priority || 'NORMAL'}</p>
                                    </div>
                                    <div className="detail-group">
                                        <label style={{ fontSize: '10px', letterSpacing: '0.05em', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>ASSIGNED TO</label>
                                        <p style={{ margin: 0, fontWeight: 600 }}>{viewedComm.assignedTo || 'ITSD Personnel'}</p>
                                    </div>
                                    <div className="detail-group">
                                        <label style={{ fontSize: '10px', letterSpacing: '0.05em', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>SECTION HEADS</label>
                                        <p style={{ margin: 0, fontWeight: 600 }}>{viewedComm.handledBy || viewedComm.sectionHead || 'System Administrator'}</p>
                                    </div>
                                    <div className="detail-group">
                                        <label style={{ fontSize: '10px', letterSpacing: '0.05em', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '4px', display: 'block' }}>DATE APPROVED</label>
                                        <p style={{ margin: 0, fontWeight: 600 }}>{viewedComm.dateApproved || viewedComm.date || 'Pending Action'}</p>
                                    </div>
                                </div>

                                <div className="modal-description" style={{ marginTop: '24px', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', borderLeft: '3px solid var(--primary-navy)' }}>
                                    <label style={{ fontSize: '10px', letterSpacing: '0.05em', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>SYSTEM REMARKS</label>
                                    <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.6', color: '#cbd5e1' }}>Communication record for {viewedComm.subject}. This submission has been verified and processed by the system according to standard protocols.</p>
                                </div>
                            </div>

                            <div className="modern-modal-footer">
                                <button className="v2-btn-secondary" onClick={() => setViewedComm(null)}>Close Details</button>
                                <button className="pu-btn primary" style={{ borderRadius: '12px' }}>Print Transcript</button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </Layout>
    );
};

export default UserCalendar;
