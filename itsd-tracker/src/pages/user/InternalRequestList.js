import React, { useState, useEffect, useCallback } from 'react';
import UserLayout from '../../layouts/UserLayout';
import { API_BASE_URL } from '../../apiConfig';
import { getCurrentUser } from '../../utils/auth';
import InternalRequestDetailModal from '../../components/InternalRequestDetailModal';
import './InternalRequestList.css';

const InternalRequestList = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(getCurrentUser());
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [isSectionHead, setIsSectionHead] = useState(false);
    const [isDivHead, setIsDivHead] = useState(false);

    const fetchRequests = useCallback(async () => {
        try {
            setLoading(true);
            const token = sessionStorage.getItem('itsd_auth_token');
            const res = await fetch(`${API_BASE_URL}/api/internal-requests`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setRequests(data);
            }
        } catch (err) {
            console.error('Error fetching internal requests:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const userRole = user?.role?.toLowerCase() || '';
        setIsSectionHead(userRole === 'section head' || user?.roleId === 6);
        setIsDivHead(userRole === 'division head' || user?.roleId === 7);
        fetchRequests();
    }, [user, fetchRequests]);

    const getStatusClass = (status) => {
        switch (status) {
            case 'APPROVED': return 'status-approved';
            case 'DECLINED': return 'status-declined';
            case 'RETURNED': return 'status-returned';
            case 'PENDING_DIV_APPROVAL': return 'status-pending';
            case 'DELEGATED': return 'status-delegated';
            default: return '';
        }
    };

    return (
        <UserLayout title="Internal Request List" subtitle="Manage and track all internal ITSD requests.">
            <div className="internal-list-container animate-fade-in">
                <div className="list-controls-premium">
                    <div className="search-box-premium">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input type="text" placeholder="Search requests..." />
                    </div>
                </div>

                {loading ? (
                    <div className="loading-state-premium">
                        <div className="loader-v2"></div>
                        <p>Loading internal requests...</p>
                    </div>
                ) : requests.length === 0 ? (
                    <div className="empty-state-premium">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <p>No internal requests found.</p>
                    </div>
                ) : (
                    <div className="table-wrapper-premium">
                        <table className="premium-table-v2">
                            <thead>
                                <tr>
                                    <th>TRACKING ID</th>
                                    <th>SUBJECT</th>
                                    <th>TYPE</th>
                                    {isDivHead && <th>SENDER</th>}
                                    {!isDivHead && <th>TO</th>}
                                    <th>DATE</th>
                                    <th>PRIORITY</th>
                                    <th>STATUS</th>
                                    <th>ACTION</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(req => (
                                    <tr key={req.id}>
                                        <td className="tracking-id-cell">{req.trackingId}</td>
                                        <td className="subject-cell"><strong>{req.subject}</strong></td>
                                        <td><span className="type-badge">{req.type}</span></td>
                                        {isDivHead && <td>{req.Sender?.name}</td>}
                                        {!isDivHead && <td>{req.Recipient?.name}</td>}
                                        <td>{new Date(req.date).toLocaleDateString()}</td>
                                        <td><span className={`priority-pill-mini ${req.priority}`}>{req.priority}</span></td>
                                        <td><span className={`status-pill-v2 ${getStatusClass(req.status)}`}>
                                            {req.status === 'PENDING_DIV_APPROVAL' ? 'PENDING' : req.status.replace(/_/g, ' ')}
                                        </span></td>
                                        <td>
                                            <button className="btn-table-action" onClick={() => setSelectedRequest(req)}>
                                                {isDivHead && req.status === 'PENDING_DIV_APPROVAL' ? 'REVIEW' : 'VIEW'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            
            {selectedRequest && (
                <InternalRequestDetailModal 
                    request={selectedRequest}
                    user={user}
                    onClose={() => setSelectedRequest(null)}
                    onUpdate={fetchRequests}
                />
            )}
        </UserLayout>
    );
};

export default InternalRequestList;
