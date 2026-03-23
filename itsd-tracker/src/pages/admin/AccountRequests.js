import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import AdminLayout from '../../layouts/AdminLayout';
import { API_BASE_URL } from '../../apiConfig';
import './AccountRequests.css';

const AccountRequests = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notification, setNotification] = useState(null); // { message, type }
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmData, setConfirmData] = useState({ id: null, status: null, name: '' });

    const fetchRequests = async () => {
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const response = await fetch(`${API_BASE_URL}/api/account-requests`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setRequests(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleStatusUpdate = async (id, status, name = '') => {
        setConfirmData({ id, status, name });
        setShowConfirm(true);
    };

    const processStatusUpdate = async () => {
        const { id, status } = confirmData;
        setShowConfirm(false);
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const response = await fetch(`${API_BASE_URL}/api/account-requests/${id}`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ status })
            });
            if (response.ok) {
                const data = await response.json();
                if (data.message) {
                    setNotification({ message: data.message, type: status });
                }
                fetchRequests();
            }
        } catch (error) {
            console.error('Error updating request:', error);
        }
    };

    return (
        <AdminLayout 
            title="Account Access Management" 
            subtitle="Review and process requests for account re-activation from inactive personnel."
        >
            <div className="pu-container animate-fade-in">
                {notification && (
                    <div className={`request-notification-banner ${notification.type}`}>
                        <div className="banner-content">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                            <span className="banner-text">{notification.message}</span>
                        </div>
                        <button className="banner-close" onClick={() => setNotification(null)}>✕</button>
                    </div>
                )}
                <div className="pu-table-card">
                    {loading ? (
                        <div className="pu-empty">
                            <div className="spinner-navy"></div>
                            <p>Loading requests...</p>
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="pu-empty">
                            <div className="empty-icon-circle-navy">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                            </div>
                            <p>No pending re-activation requests.</p>
                        </div>
                    ) : (
                        <table className="pu-table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(req => (
                                    <tr key={req.id} className={req.status !== 'pending' ? 'row-inactive' : ''}>
                                        <td>
                                            <span className={`request-type-badge ${req.type || 'reactivation'}`}>
                                                {req.type === 'password_reset' ? 'Password Reset' : 'Re-activation'}
                                            </span>
                                        </td>
                                        <td><span className="pu-name" style={{ fontWeight: 800 }}>{req.name}</span></td>
                                        <td><span className="pu-email" style={{ color: '#64748b' }}>{req.email}</span></td>
                                        <td style={{ maxWidth: '300px' }}>
                                            <div style={{ fontSize: '0.85rem', color: '#444', lineHeight: 1.4, padding: '10px 0' }}>{req.reason}</div>
                                        </td>
                                        <td>
                                            <span className={`pu-status-badge ${req.status}`}>
                                                <span className="pu-status-dot"></span>
                                                {req.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            {req.status === 'pending' && (
                                                <div className="pu-row-actions">
                                                    <button className="pu-btn primary" onClick={() => handleStatusUpdate(req.id, 'approved', req.name)}>Approve</button>
                                                    <button className="pu-btn secondary" onClick={() => handleStatusUpdate(req.id, 'declined', req.name)}>Decline</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Custom Confirmation Modal */}
            {showConfirm && createPortal(
                <div className="modern-overlay animate-fade-in" onClick={() => setShowConfirm(false)}>
                    <div className="modern-modal animate-zoom-in" style={{ width: '400px' }} onClick={e => e.stopPropagation()}>
                        <div className="modern-modal-header" style={{ borderBottom: 'none', paddingBottom: '10px' }}>
                            <div className={`modal-icon-circle ${confirmData.status}`}>
                                {confirmData.status === 'approved' ? (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                ) : (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="15" y1="9" x2="9" y2="15"></line>
                                        <line x1="9" y1="9" x2="15" y2="15"></line>
                                    </svg>
                                )}
                            </div>
                            <button className="close-btn-modern" onClick={() => setShowConfirm(false)}>✕</button>
                        </div>
                        <div className="modern-modal-body" style={{ textAlign: 'center', paddingTop: '0' }}>
                            <h3 style={{ margin: '0 0 10px', fontSize: '1.25rem', color: '#1e293b' }}>
                                {confirmData.status === 'approved' ? 'Approve Request?' : 'Decline Request?'}
                            </h3>
                            <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5', margin: '0 0 25px' }}>
                                {confirmData.status === 'approved' ? (
                                    <>Are you sure you want to approve <strong>{confirmData.name}</strong>'s request? This will automatically <strong>ACTIVATE</strong> their account.</>
                                ) : (
                                    <>Are you sure you want to decline the request from <strong>{confirmData.name}</strong>?</>
                                )}
                            </p>
                            <div className="modal-actions-modern">
                                <button className="modal-btn-modern secondary" onClick={() => setShowConfirm(false)}>Cancel</button>
                                <button 
                                    className={`modal-btn-modern ${confirmData.status === 'approved' ? 'primary' : 'danger'}`}
                                    onClick={processStatusUpdate}
                                >
                                    {confirmData.status === 'approved' ? 'Confirm Approval' : 'Confirm Decline'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </AdminLayout>
    );
};

export default AccountRequests;
