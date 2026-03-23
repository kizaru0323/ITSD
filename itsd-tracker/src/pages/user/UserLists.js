import React, { useState } from 'react';
import UserLayout from '../../layouts/UserLayout';
import AdminLayout from '../../layouts/AdminLayout';
import Pagination from '../../components/Pagination';
import { API_BASE_URL } from '../../apiConfig';
import './UserLists.css';

const UserLists = ({ role = 'USER' }) => {
    const Layout = role === 'ADMIN' ? AdminLayout : UserLayout;
    const [expandedRow, setExpandedRow] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const [approvedRecords, setApprovedRecords] = useState([]);
    const [loading, setLoading] = useState(true);

    React.useEffect(() => {
        const fetchApproved = async () => {
            try {
                const token = sessionStorage.getItem('itsd_auth_token');
                const response = await fetch(`${API_BASE_URL}/api/communications`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();
                // Filter for completed/approved status
                const approved = Array.isArray(data) ? data.filter(c => c.status === 'COMPLETED' || c.status === 'APPROVED') : [];
                setApprovedRecords(approved);
            } catch (error) {
                console.error('Error fetching approved records:', error);
                setApprovedRecords([]);
            } finally {
                setLoading(false);
            }
        };
        fetchApproved();
    }, []);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = approvedRecords.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(approvedRecords.length / itemsPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const toggleRow = (id) => {
        setExpandedRow(expandedRow === id ? null : id);
    };

    return (
        <Layout
            title={role === 'ADMIN' ? "Centralized Approve List" : "Approved Communications"}
            subtitle={role === 'ADMIN' ? "Overview of all processed and approved records across the system" : "View all processed and completed communication records"}
            permissionRequired="view_dashboard"
        >
            <div className="user-lists-container">
                <div className="lists-header-summary stats-header-grid">
                    <div className="modern-stat-card green">
                        <div className="stat-icon-circle">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                        </div>
                        <div className="stat-info">
                            <span className="stat-label">TOTAL APPROVED</span>
                            <span className="stat-value">{approvedRecords.length < 10 ? `0${approvedRecords.length}` : approvedRecords.length}</span>
                        </div>
                    </div>
                </div>

                <div className="lists-viewport">
                    <div className="custom-table-modern">
                        <div className="table-header">
                            <div className="col id">ID</div>
                            <div className="col tracking">TRACKING ID</div>
                            <div className="col subject">SUBJECT</div>
                            <div className="col status">STATUS</div>
                            <div className="col action">ACTION</div>
                        </div>

                        <div className="table-body">
                            {currentItems.map(record => (
                                <div key={record.id} className={`table-row-group ${expandedRow === record.id ? 'expanded' : ''}`}>
                                    <div className="main-row" onClick={() => toggleRow(record.id)}>
                                        <div className="col id">{record.id}</div>
                                        <div className="col tracking">{record.trackingId}</div>
                                        <div className="col subject">{record.subject}</div>
                                        <div className="col status">
                                            <span className="approved-badge">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                                APPROVED
                                            </span>
                                        </div>
                                        <div className="col action">
                                            <button className="view-detail-btn">
                                                {expandedRow === record.id ? 'Close' : 'Details'}
                                            </button>
                                        </div>
                                    </div>

                                    {expandedRow === record.id && (
                                        <div className="detail-panel">
                                            <div className="detail-grid">
                                                <div className="detail-info-item full">
                                                    <label>Full Description</label>
                                                    <p>{record.description}</p>
                                                </div>
                                                <div className="detail-info-item">
                                                    <label>Completion Date</label>
                                                    <p>{record.date}</p>
                                                </div>
                                                <div className="detail-info-item">
                                                    <label>Office / Department</label>
                                                    <p>{record.department}</p>
                                                </div>
                                                <div className="detail-info-item">
                                                    <label>Kind</label>
                                                    <p>{record.kind}</p>
                                                </div>
                                                <div className="detail-info-item">
                                                    <label>Assigned To</label>
                                                    <p>{record.assignedTo}</p>
                                                </div>
                                                <div className="detail-info-item">
                                                    <label>Watcher(s)</label>
                                                    <p>{record.watchers}</p>
                                                </div>
                                                <div className="detail-info-item">
                                                    <label>Section Head</label>
                                                    <p><strong>{record.sectionHead || record.processedBy}</strong></p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
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

export default UserLists;
