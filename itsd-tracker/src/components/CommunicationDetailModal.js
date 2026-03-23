import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { API_BASE_URL } from '../apiConfig';
import AttachmentPreviewModal from './AttachmentPreviewModal';
import './CommunicationDetailModal.css';

const CommunicationDetailModal = ({ communicationId, onClose }) => {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [previewFile, setPreviewFile] = useState(null);

    useEffect(() => {
        const fetchDetails = async () => {
            try {
                setLoading(true);
                const token = sessionStorage.getItem('itsd_auth_token');
                const res = await fetch(`${API_BASE_URL}/api/communications/${communicationId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                setDetails(data);
            } catch (error) {
                console.error('Error fetching communication details:', error);
            } finally {
                setLoading(false);
            }
        };

        if (communicationId) {
            fetchDetails();
        }
    }, [communicationId]);

    if (!communicationId) return null;

    return createPortal(
        <div className="modern-overlay animate-fade-in" onClick={onClose}>
            <div className="modern-modal animate-zoom-in" onClick={e => e.stopPropagation()} style={{ width: '850px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modern-modal-header">
                    <div className="header-content">
                        <h3>Communication Details</h3>
                        {details && <span className="tracking-id-badge">{details.trackingId}</span>}
                    </div>
                    <button className="close-btn-modern" onClick={onClose}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>

                {details && (
                    <div className="progress-tracker-container">
                        <ProgressTracker status={details.status} />
                    </div>
                )}

                <div className="modern-modal-body" style={{ overflowY: 'auto' }}>
                    {loading ? (
                        <div className="loading-spinner-container">
                            <div className="modern-loader"></div>
                        </div>
                    ) : details ? (
                        <div className="comm-details-content">
                            <div className="detail-hero-section">
                                <div className="direction-indicator">
                                    <span className={`direction-badge ${details.direction?.toLowerCase().replace(/\s+/g, '-')}`}>
                                        {details.direction === 'ITSD ONLY' ? 'INTERNAL' : details.direction}
                                    </span>
                                    <span className="comm-date">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                                        {details.date}
                                    </span>
                                </div>
                                <h1 className="comm-subject">{details.subject}</h1>
                                <div className="comm-meta-pills">
                                    <span className="meta-pill kind">{details.kind}</span>
                                    <span className="meta-pill type">{details.type}</span>
                                    <span className={`meta-pill status ${details.status?.toLowerCase()}`}>{details.status?.replace(/_/g, ' ')}</span>
                                    <span className={`meta-pill priority ${details.priority?.toLowerCase()}`}>{details.priority} PRIORITY</span>
                                </div>
                            </div>

                            <div className="detail-sections-grid">
                                <div className="detail-main-info">
                                    <div className="info-group">
                                        <label>ORIGINATING OFFICE / ORGANIZATION</label>
                                        <div className="info-value office-value">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18"></path><path d="M3 7v1a3 3 0 0 0 6 0V7m6 0v1a3 3 0 0 0 6 0V7m-6 0V4a2 2 0 0 0-2-2H9a2 2 0 0 0-2 2v3m4 0h2"></path><path d="M19 21V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v14"></path><path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4"></path></svg>
                                            {details.office || details.officeLabel}
                                        </div>
                                    </div>

                                    <div className="info-group">
                                        <label>COMMUNICATION DETAILS</label>
                                        <div className="info-value details-text">
                                            {details.details}
                                        </div>
                                    </div>

                                    {details.publicRemarks && (
                                        <div className="info-group remarks-group">
                                            <label>REMARKS / FEEDBACK</label>
                                            <div className="info-value remarks-text">
                                                {details.publicRemarks}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="detail-sidebar-info">
                                    <div className="info-group">
                                        <label>CHANNELS & COORDINATION</label>
                                        <div className="coordination-stack">
                                            <div className="coord-item">
                                                <div className="coord-icon dh">DH</div>
                                                <div className="coord-text">
                                                    <span className="coord-label">Division Head</span>
                                                    <span className="coord-name">{details.divisionHead || details.divisionHeadLabel || '---'}</span>
                                                </div>
                                            </div>
                                            <div className="coord-item">
                                                <div className="coord-icon sh">SH</div>
                                                <div className="coord-text">
                                                    <span className="coord-label">Section Head</span>
                                                    <span className="coord-name">{details.sectionHead || details.sectionHeadLabel || '---'}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {details.AssignedSections && details.AssignedSections.length > 0 && (
                                        <div className="info-group">
                                            <label>ASSIGNED SECTIONS</label>
                                            <div className="sections-list-compact">
                                                {details.AssignedSections.map(s => (
                                                    <div key={s.id} className="section-head-pill">
                                                        <div className="sh-avatar">
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                                                <circle cx="12" cy="7" r="4"></circle>
                                                            </svg>
                                                        </div>
                                                        <div className="sh-info">
                                                            <span className="sh-name">{s.SectionHead?.name || 'No Head'}</span>
                                                            <span className="sh-section">{s.name}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="info-group">
                                        <label>ASSIGNED PERSONNEL</label>
                                        <div className="assignees-list-compact">
                                            {details.Assignees && details.Assignees.length > 0 ? (
                                                details.Assignees.map(user => (
                                                    <div key={user.id} className="assignee-pill-v2">
                                                        <div className="user-avatar-mini">{user.name.charAt(0)}</div>
                                                        <span>{user.name}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="no-assignees-note">No personnel assigned yet</div>
                                            )}
                                        </div>
                                    </div>

                                    {details.tags && (
                                        <div className="info-group">
                                            <label>TAGS</label>
                                            <div className="detail-tags-cloud">
                                                {details.tags.split(',').map(tag => (
                                                    <span key={tag.trim()} className="detail-tag-pill">#{tag.trim()}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {details.attachments && details.attachments.length > 0 && (
                                <div className="detail-section full-width">
                                    <h4>ATTACHED DOCUMENTS ({details.attachments.length})</h4>
                                    <div className="documents-grid-v2">
                                         {details.attachments.map((file, idx) => {
                                            const fileUrl = `${API_BASE_URL}/uploads/${file}`;
                                            const fileName = file.split('-').slice(1).join('-');
                                            
                                            // Determine if file is previewable
                                            const isPreviewable = /\.(jpg|jpeg|png|gif|webp|pdf)$/i.test(file);

                                            return (
                                                <div 
                                                    key={idx} 
                                                    className="doc-card-v2"
                                                    onClick={(e) => {
                                                        if (isPreviewable) {
                                                            e.preventDefault();
                                                            setPreviewFile({ url: fileUrl, name: fileName });
                                                        }
                                                    }}
                                                    style={{ cursor: 'pointer' }}
                                                >
                                                    <div className="doc-icon">
                                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                                    </div>
                                                    <div className="doc-info">
                                                        <span className="doc-name">{fileName}</span>
                                                        <span className="doc-action">
                                                            {isPreviewable ? 'Click to preview' : 'Click to download'}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="error-container-modern">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            <p>Failed to load communication details. It might have been deleted or moved.</p>
                        </div>
                    )}
                </div>

                <div className="modern-modal-footer">
                    <div className="footer-left">
                        <span className="follow-up-status">
                            <strong>Follow-up:</strong> {details?.followUp || 'N/A'}
                        </span>
                    </div>
                    <div className="footer-right">
                        <button className="v3-btn-secondary" onClick={onClose}>Close</button>
                        {details && (
                            <button className="v3-btn-primary" onClick={() => {
                                // Dynamic routing based on status
                                const status = details.status?.toUpperCase();
                                if (status.includes('COMPLETED') || status.includes('READY FOR ARCHIVING')) {
                                    window.location.href = '/user/processed';
                                } else {
                                    window.location.href = '/user/communications';
                                }
                            }}>View Full Record</button>
                        )}
                    </div>
                </div>
            </div>
            {previewFile && (
                <AttachmentPreviewModal 
                    fileUrl={previewFile.url} 
                    fileName={previewFile.name} 
                    onClose={() => setPreviewFile(null)} 
                />
            )}
        </div>,
        document.body
    );
};

function ProgressTracker({ status }) {
    const s = (status || 'PENDING').toUpperCase();
    
    // Define stages and their associated internal statuses
    const stages = [
        { label: 'Submitted', key: 'SUBMITTED', match: ['PENDING', 'PENDING_DIV_HEAD', 'PENDING_DIV_APPROVAL'] },
        { label: 'Review', key: 'REVIEW', match: ['DIV_ACCEPTED', 'DIV_DECLINED', 'DIV_RETURNED', 'RETURNED'] },
        { label: 'Assigned', key: 'ASSIGNED', match: ['PENDING_SECTION_HEAD'] },
        { label: 'Ongoing', key: 'ONGOING', match: ['APPROVED'] },
        { label: 'Completed', key: 'COMPLETED', match: ['COMPLETED', 'READY FOR ARCHIVING'] }
    ];

    // Find current stage index
    let currentIdx = stages.findIndex(stage => stage.match.includes(s));
    
    // Special handling for edge cases (if status not found in standard stages, default to first or specific logic)
    if (currentIdx === -1) {
        if (s.includes('DIV')) currentIdx = 1;
        else if (s.includes('SECTION')) currentIdx = 2;
        else if (s === 'APPROVED') currentIdx = 3;
        else if (s === 'COMPLETED') currentIdx = 4;
        else currentIdx = 0;
    }

    const isDeclined = s.includes('DECLINED') || s.includes('RETURNED');

    return (
        <div className="progress-stepper">
            {stages.map((stage, index) => {
                const isStepCompleted = index < currentIdx || (index === currentIdx && (s === 'COMPLETED' || s === 'READY FOR ARCHIVING'));
                let stateClass = '';
                if (isStepCompleted) stateClass = 'completed';
                else if (index === currentIdx) stateClass = isDeclined ? 'declined' : 'active';

                return (
                    <div key={stage.key} className={`step-item ${stateClass}`}>
                        <div className="step-dot">
                            {isStepCompleted ? (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            ) : (
                                index + 1
                            )}
                        </div>
                        <span className="step-label">{stage.label}</span>
                    </div>
                );
            })}
        </div>
    );
}

export default CommunicationDetailModal;
