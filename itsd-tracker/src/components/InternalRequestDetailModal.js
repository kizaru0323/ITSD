import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, getAttachmentUrl } from '../apiConfig';
import AttachmentViewer from './AttachmentViewer';
import './InternalRequestDetailModal.css';

const InternalRequestDetailModal = ({ request, user, onClose, onUpdate }) => {
    const navigate = useNavigate();
    const [remarks, setRemarks] = useState(request.remarks || '');
    const [submitting, setSubmitting] = useState(false);
    const [personnel, setPersonnel] = useState([]);
    const [selectedAssignees, setSelectedAssignees] = useState([]);
    const [modalConfig, setModalConfig] = useState({ show: false, title: '', message: '', type: 'success' });
    
    const [selectedFile, setSelectedFile] = useState(null);
    const [showAttachment, setShowAttachment] = useState(false);
    
    const userRole = user?.role?.toLowerCase() || '';
    const isDivHead = userRole === 'division head' || user?.roleId === 7;
    const isOwner = request.userId === user?.id;

    useEffect(() => {
        if (isOwner && request.status === 'APPROVED') {
            fetchMyPersonnel();
        }
    }, [request, isOwner]);

    const fetchMyPersonnel = async () => {
        if (!user.groupId) {
            console.warn('Cannot fetch personnel: User has no groupId assigned.');
            return;
        }
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const res = await fetch(`${API_BASE_URL}/api/users?groupId=${user.groupId}&status=active`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) {
                setPersonnel(data.filter(u => u.id !== user.id));
            }
        } catch (err) {
            console.error('Error fetching personnel:', err);
        }
    };

    const handleReview = async (status) => {
        if (status === 'RETURNED' && !remarks) {
            setModalConfig({
                show: true,
                title: 'Review Required',
                message: 'Please provide remarks/reasons for returning this request.',
                type: 'warning'
            });
            return;
        }

        setSubmitting(true);
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const res = await fetch(`${API_BASE_URL}/api/internal-requests/${request.id}/review`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status, remarks })
            });

            if (res.ok) {
                onUpdate();
                onClose();
            } else {
                const err = await res.json();
                setModalConfig({
                    show: true,
                    title: 'Review Failed',
                    message: err.error || 'Failed to update request.',
                    type: 'error'
                });
            }
        } catch (err) {
            console.error('Review error:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelegate = async () => {
        if (selectedAssignees.length === 0) {
            setModalConfig({
                show: true,
                title: 'No Selection',
                message: 'Please select at least one personnel to delegate this task to.',
                type: 'warning'
            });
            return;
        }

        setSubmitting(true);
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const res = await fetch(`${API_BASE_URL}/api/internal-requests/${request.id}/delegate`, {
                method: 'PATCH',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ assigneeIds: selectedAssignees })
            });

            if (res.ok) {
                onUpdate();
                onClose();
            } else {
                const err = await res.json();
                setModalConfig({
                    show: true,
                    title: 'Delegation Failed',
                    message: err.error || 'Failed to delegate personnel.',
                    type: 'error'
                });
            }
        } catch (err) {
            console.error('Delegation error:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const toggleAssignee = (id) => {
        setSelectedAssignees(prev => 
            prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
        );
    };

    return (
        <div className="internal-detail-overlay animate-fade-in">
            <div className="internal-detail-card animate-zoom-in shadow-premium">
                <div className="modal-premium-header">
                    <div className="header-badge-group">
                        <span className="internal-label">INTERNAL REQUEST</span>
                        <span className="tracking-id">{request.trackingId}</span>
                    </div>
                    <button className="close-btn-v2" onClick={onClose}>✕</button>
                </div>

                <div className="modal-premium-body">
                    <div className="detail-section">
                        <label>SUBJECT</label>
                        <h3>{request.subject}</h3>
                    </div>

                    <div className="detail-row">
                        <div className="detail-item">
                            <label>SENDER</label>
                            <p>{request.Sender?.name}</p>
                        </div>
                        <div className="detail-item">
                            <label>DATE</label>
                            <p>{new Date(request.date).toLocaleDateString()}</p>
                        </div>
                        <div className="detail-item">
                            <label>PRIORITY</label>
                            <p><span className={`priority-pill-mini ${request.priority}`}>{request.priority}</span></p>
                        </div>
                    </div>

                    <div className="detail-section">
                        <label>DETAILS / CONTENT</label>
                        <div className="content-box-premium">
                            {request.details}
                        </div>
                    </div>

                    {request.attachments && request.attachments.length > 0 && (
                        <div className="detail-section">
                            <label>ATTACHMENTS</label>
                            <div className="attachments-list-v2">
                                {request.attachments.map((file, idx) => (
                                    <div 
                                        key={idx} 
                                        className="attachment-pill-v2"
                                        onClick={() => {
                                            setSelectedFile(file);
                                            setShowAttachment(true);
                                        }}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                        <span>{typeof file === 'string' ? file : file.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {request.remarks && (
                        <div className="detail-section remarks-section">
                            <label>DIVISION HEAD REMARKS</label>
                            <div className="remarks-box">
                                {request.remarks}
                            </div>
                        </div>
                    )}

                    {/* DIVISION HEAD REVIEW SECTION */}
                    {isDivHead && request.status === 'PENDING_DIV_APPROVAL' && (
                        <div className="action-section review-actions">
                            <label>REVIEW ACTIONS</label>
                            <textarea 
                                placeholder="Add remarks or reasons here..."
                                value={remarks}
                                onChange={e => setRemarks(e.target.value)}
                                className="premium-textarea-v2"
                            />
                            <div className="button-group-premium">
                                <button className="btn-success-premium" onClick={() => handleReview('APPROVED')} disabled={submitting}>APPROVE</button>
                                <button className="btn-warning-premium" onClick={() => handleReview('RETURNED')} disabled={submitting}>RETURN</button>
                                <button className="btn-danger-premium" onClick={() => handleReview('DECLINED')} disabled={submitting}>DECLINE</button>
                            </div>
                        </div>
                    )}

                    {/* SECTION HEAD EDIT ACTION (IF RETURNED) */}
                    {isOwner && request.status === 'RETURNED' && (
                        <div className="action-section edit-actions">
                            <label>CORRECTION REQUIRED</label>
                            <p className="helper-text">This request was returned for correction. Click the button below to edit and resubmit.</p>
                            <button 
                                className="btn-primary-v2 full-width" 
                                style={{ background: '#f59e0b', marginBottom: '10px' }}
                                onClick={() => navigate('/user/internal-request', { state: { request } })}
                            >
                                EDIT & RESUBMIT
                            </button>
                        </div>
                    )}

                    {/* SECTION HEAD DELEGATION SECTION */}
                    {isOwner && request.status === 'APPROVED' && (
                        <div className="action-section delegation-actions">
                            <label>DELEGATE TO YOUR PERSONNEL</label>
                            <p className="helper-text">Select personnel from your section to execute this task.</p>
                            <div className="personnel-grid">
                                {personnel.map(p => (
                                    <div 
                                        key={p.id} 
                                        className={`personnel-card ${selectedAssignees.includes(p.id) ? 'selected' : ''}`}
                                        onClick={() => toggleAssignee(p.id)}
                                    >
                                        <div className="check-indicator">{selectedAssignees.includes(p.id) ? '✓' : ''}</div>
                                        <div className="p-info">
                                            <span className="p-name">{p.name}</span>
                                            <span className="p-role">{p.position || 'Staff'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button className="btn-primary-v2 full-width" onClick={handleDelegate} disabled={submitting || personnel.length === 0}>
                                {submitting ? 'DELEGATING...' : 'CONFIRM DELEGATION'}
                            </button>
                        </div>
                    )}

                    {/* SHOW SUCCESS MESSAGE IF ALREADY DELEGATED */}
                    {isOwner && request.status === 'DELEGATED' && (
                        <div className="action-section delegation-complete animate-fade-in">
                            <div className="success-banner-premium">
                                <div className="banner-icon-v2">✅</div>
                                <div className="banner-text">
                                    <strong>DELEGATION CONFIRMED</strong>
                                    <p>This task has been assigned to your personnel and is now being processed.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Premium Feedback Modal */}
            {modalConfig.show && (
                <div className="internal-modal-overlay feedback-modal animate-fade-in" style={{ zIndex: 10001 }}>
                    <div className={`internal-success-card animate-zoom-in feedback-${modalConfig.type}`}>
                        <div className="success-icon-container">
                            {modalConfig.type === 'error' ? (
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            ) : modalConfig.type === 'warning' ? (
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            ) : (
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                            )}
                        </div>
                        <h3>{modalConfig.title}</h3>
                        <p>{modalConfig.message}</p>
                        <button className="btn-primary-v2 full-width" onClick={() => setModalConfig({ ...modalConfig, show: false })}>OK</button>
                    </div>
                </div>
            )}

            {showAttachment && (
                <AttachmentViewer 
                    fileName={typeof selectedFile === 'string' ? selectedFile : selectedFile?.name}
                    fileUrl={getAttachmentUrl(selectedFile)}
                    onClose={() => setShowAttachment(false)}
                />
            )}
        </div>
    );
};

export default InternalRequestDetailModal;
