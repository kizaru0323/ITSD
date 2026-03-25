import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import UserLayout from '../../layouts/UserLayout';
import { API_BASE_URL } from '../../apiConfig';
import { getCurrentUser } from '../../utils/auth';
import { logActivity } from '../../utils/activityLogger';
import './InternalCommunicationStyled.css';

const REQUEST_TYPES = [
    'General Request',
    'Official Letter',
    'Budget Proposal',
    'Personnel Request',
    'Technical Report',
    'Policy Amendment',
    'Service Request',
    'Maintenance Work / Request',
    'Other Internal'
];

const InternalCommunication = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [divisionHeads, setDivisionHeads] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [existingAttachments, setExistingAttachments] = useState([]); // For edit mode
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [trackingId, setTrackingId] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);
    const [editRequestId, setEditRequestId] = useState(null);

    const [formData, setFormData] = useState({
        type: 'General Request',
        subject: '',
        details: '',
        date: new Date().toISOString().split('T')[0],
        divisionHeadId: '',
        divisionHead: '',
        direction: 'ITSD ONLY',
        office: 'ITSD',
        priority: 'MEDIUM',
        kind: 'Internal Record'
    });

    useEffect(() => {
        const currentUser = getCurrentUser();
        if (currentUser) {
            setUser(currentUser);
        }

        const fetchData = async () => {
            try {
                const token = sessionStorage.getItem('itsd_auth_token');
                const res = await fetch(`${API_BASE_URL}/api/users?status=active`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                if (Array.isArray(data)) {
                    const dHeads = data.filter(u => u.role === 'Division Head');
                    setDivisionHeads(dHeads);

                    // Auto-select first Division Head if available
                    if (dHeads.length > 0) {
                        setFormData(prev => ({
                            ...prev,
                            divisionHeadId: dHeads[0].id,
                            divisionHead: dHeads[0].name
                        }));
                    }
                }
            } catch (err) {
                console.error('Error fetching data:', err);
            }
        };
        fetchData();

        // Check for edit mode from navigation state
        if (location.state && location.state.request) {
            const req = location.state.request;
            setIsEditMode(true);
            setEditRequestId(req.id);
            setFormData({
                type: req.type,
                subject: req.subject,
                details: req.details,
                date: req.date ? req.date.split('T')[0] : new Date().toISOString().split('T')[0],
                divisionHeadId: req.divisionHeadId,
                divisionHead: req.Recipient?.name || req.divisionHead || '',
                direction: 'ITSD ONLY',
                office: 'ITSD',
                priority: req.priority,
                kind: 'Internal Record'
            });
            if (req.attachments) {
                setExistingAttachments(Array.isArray(req.attachments) ? req.attachments : []);
            }
        }
    }, [location]);

    const handleFileChange = (e) => {
        if (e.target.files) {
            setSelectedFiles(prev => [...prev, ...Array.from(e.target.files)]);
        }
    };

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingAttachment = (file) => {
        const identifier = typeof file === 'string' ? file : file.id;
        setExistingAttachments(prev => prev.filter(f => {
            const currentId = typeof f === 'string' ? f : f.id;
            return currentId !== identifier;
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.subject || !formData.details || !formData.divisionHeadId) {
            alert('Please fill in all mandatory fields.');
            return;
        }

        setSubmitting(true);
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const dataToSend = new FormData();

            // Generate temporary tracking ID for UI
            const generatedId = `ITSD-INT-${Math.floor(100000 + Math.random() * 900000)}`;
            dataToSend.append('trackingId', generatedId);

            Object.keys(formData).forEach(key => {
                dataToSend.append(key, formData[key]);
            });

            selectedFiles.forEach(file => {
                dataToSend.append('attachment', file);
            });

            if (isEditMode) {
                dataToSend.append('existingAttachments', JSON.stringify(existingAttachments));
            }

            const url = isEditMode
                ? `${API_BASE_URL}/api/internal-requests/${editRequestId}`
                : `${API_BASE_URL}/api/internal-requests`;

            const response = await fetch(url, {
                method: isEditMode ? 'PUT' : 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: dataToSend
            });

            if (response.ok) {
                const result = await response.json();
                setTrackingId(result.trackingId || generatedId);
                setShowSuccessModal(true);
                await logActivity(user.id, `Sent Internal ${formData.type}`, 'Internal Communication', null, `Subject: ${formData.subject}`);
            } else {
                const errorData = await response.json();
                setErrorMessage(errorData.error || 'The server rejected the request.');
                setShowErrorModal(true);
            }
        } catch (err) {
            console.error('Submission error:', err);
            setErrorMessage('Network error or server crash. Please try again.');
            setShowErrorModal(true);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDone = () => {
        setShowSuccessModal(false);
        navigate('/user/internal-list');
    };

    const handleMakeAnother = () => {
        setShowSuccessModal(false);
        setIsEditMode(false);
        setEditRequestId(null);
        setFormData({
            type: 'General Request',
            subject: '',
            details: '',
            date: new Date().toISOString().split('T')[0],
            divisionHeadId: divisionHeads.length > 0 ? divisionHeads[0].id : '',
            divisionHead: divisionHeads.length > 0 ? divisionHeads[0].name : '',
            direction: 'ITSD ONLY',
            office: 'ITSD',
            priority: 'MEDIUM',
            kind: 'Internal Record'
        });
        setSelectedFiles([]);
        setExistingAttachments([]);
    };

    return (
        <UserLayout
            title="Internal Communication"
            subtitle="Send formal requests, letters, or reports directly to the Division Head."
            permissionRequired="direct_memos"
        >
            <div className="internal-comm-container animate-fade-in">
                <form className="internal-form-card shadow-premium" onSubmit={handleSubmit}>
                    <div className="internal-form-header">
                        <div className="internal-badge">ITSD INTERNAL ONLY</div>
                        <h2>{isEditMode ? 'Edit Internal Request' : 'Create Internal Request'}</h2>
                        <p>{isEditMode ? 'Correct your request details and resubmit for approval.' : 'This communication will be routed directly to the Division Head for review.'}</p>
                    </div>

                    <div className="internal-routing-strip">
                        <div className="routing-item">
                            <span className="route-label">FROM</span>
                            <span className="route-value">{user?.Section?.name || user?.Group?.name || 'Section'} Head</span>
                        </div>
                        <div className="routing-arrow">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                        </div>
                        <div className="routing-item">
                            <span className="route-label">TO</span>
                            <span className="route-value">Division Head</span>
                        </div>
                    </div>

                    {isEditMode && location.state?.request?.remarks && (
                        <div className="internal-remarks-banner animate-fade-in">
                            <div className="banner-icon">ℹ️</div>
                            <div className="banner-content">
                                <strong>RETURN REMARKS:</strong>
                                <p>{location.state.request.remarks}</p>
                            </div>
                        </div>
                    )}

                    <div className="internal-form-grid">
                        <div className="form-group-premium">
                            <label>COMMUNICATION TYPE</label>
                            <select
                                value={formData.type}
                                onChange={e => setFormData({ ...formData, type: e.target.value })}
                                className="premium-input-v2"
                            >
                                {REQUEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div className="form-group-premium">
                            <label>SUBJECT / TITLE</label>
                            <input
                                type="text"
                                value={formData.subject}
                                onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                placeholder="Enter a clear, concise subject..."
                                className="premium-input-v2"
                                required
                            />
                        </div>

                        <div className="form-group-premium full-width">
                            <label>DETAILED CONTENT</label>
                            <textarea
                                value={formData.details}
                                onChange={e => setFormData({ ...formData, details: e.target.value })}
                                placeholder="State your request or letter content here..."
                                className="premium-textarea-v2"
                                rows="8"
                                required
                            />
                        </div>

                        <div className="form-group-premium half-width">
                            <label>TARGET DIVISION HEAD</label>
                            <select
                                value={formData.divisionHeadId}
                                onChange={e => {
                                    const selected = divisionHeads.find(d => String(d.id) === String(e.target.value));
                                    setFormData({ ...formData, divisionHeadId: e.target.value, divisionHead: selected?.name || '' });
                                }}
                                className="premium-input-v2"
                                required
                            >
                                {divisionHeads.map(dh => <option key={dh.id} value={dh.id}>{dh.name}</option>)}
                            </select>
                        </div>

                        <div className="form-group-premium half-width">
                            <label>PRIORITY LEVEL</label>
                            <div className="priority-pills">
                                {['LOW', 'MEDIUM', 'HIGH'].map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        className={`priority-pill ${p} ${formData.priority === p ? 'active' : ''}`}
                                        onClick={() => setFormData({ ...formData, priority: p })}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group-premium full-width">
                            <label>ATTACHMENTS (Letters, Reports, Supporting Docs)</label>
                            <div className="internal-upload-zone" onClick={() => document.getElementById('file-upload').click()}>
                                <input
                                    type="file"
                                    id="file-upload"
                                    multiple
                                    hidden
                                    onChange={handleFileChange}
                                />
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                <span>Click to upload supporting files</span>
                            </div>

                            {existingAttachments.length > 0 && (
                                <div className="internal-selected-files existing-files">
                                    <p className="sub-label">Existing Files:</p>
                                    {existingAttachments.map((file, i) => (
                                        <div key={i} className="internal-file-pill existing">
                                            <span>{typeof file === 'string' ? file : file.name}</span>
                                            <button type="button" onClick={() => removeExistingAttachment(file)}>✕</button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedFiles.length > 0 && (
                                <div className="internal-selected-files">
                                    <p className="sub-label">New Files:</p>
                                    {selectedFiles.map((file, i) => (
                                        <div key={i} className="internal-file-pill">
                                            <span>{file.name}</span>
                                            <button type="button" onClick={() => removeFile(i)}>✕</button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="internal-form-footer">
                        <button type="button" className="btn-secondary-v2" onClick={() => navigate(-1)}>CANCEL</button>
                        <button type="submit" className="btn-primary-v2" disabled={submitting}>
                            {submitting ? 'SENDING...' : isEditMode ? 'SUBMIT CORRECTION' : 'SEND INTERNAL COMMUNICATION'}
                        </button>
                    </div>
                </form>

                {showSuccessModal && (
                    <div className="internal-modal-overlay animate-fade-in">
                        <div className="internal-success-card animate-zoom-in">
                            <div className="success-icon-container">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="20 6 9 17 4 12" /></svg>
                            </div>
                            <h3>Request Sent Successfully!</h3>
                            <p>Your internal communication has been sent to the Division Head.</p>
                            <div className="success-tracking">
                                <span className="label">TRACKING ID</span>
                                <span className="id">{trackingId}</span>
                            </div>
                            <div className="success-actions-premium">
                                <button className="btn-primary-v2" onClick={handleDone}>DONE</button>
                                <button className="btn-secondary-v2" onClick={handleMakeAnother}>MAKE ANOTHER REQUEST</button>
                            </div>
                        </div>
                    </div>
                )}

                {showErrorModal && (
                    <div className="internal-modal-overlay animate-fade-in">
                        <div className="internal-error-card animate-zoom-in">
                            <div className="error-icon-container">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            </div>
                            <h3>Submission Failed</h3>
                            <p>{errorMessage}</p>
                            <button className="btn-secondary-v2" style={{ width: '100%' }} onClick={() => setShowErrorModal(false)}>TRY AGAIN</button>
                        </div>
                    </div>
                )}
            </div>
        </UserLayout>
    );
};

export default InternalCommunication;
