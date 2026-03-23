import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import UserLayout from '../../layouts/UserLayout';
import { logActivity } from '../../utils/activityLogger';
import { API_BASE_URL } from '../../apiConfig';
import { getCurrentUser, hasPermission } from '../../utils/auth';
import './NewCommunicationStyled.css';

const DIRECTIONS = ['INCOMING', 'OUTGOING', 'ITSD ONLY'];

const KIND_OPTIONS = [
    'Executive Order',
    'Memorandum Order',
    'Notice',
    'Transmittals',
    'Letter Requests',
    'Letter of Intent',
    'Response Letter'
];

const FILE_TYPES = [
    'IMAGE (JPG/PNG)',
    'PDF DOCUMENT',
    'EXCEL SPREADSHEET',
    'WORD DOCUMENT',
    'OTHERS'
];

const OFFICES = [
    'CMO', 'BAC', 'HRMO', 'CNCO', 'CEO', 'CADO', 'CASSCO', 'CHO', 'CBO', 'CDRRMO',
    'GSO', 'CENRO', 'CEEO', 'CLO', 'BPLD', 'CPDC', 'CCRO', 'CSWD', 'TOURISM OFFICE',
    'CTO', 'CVO', 'PROSECUTOR\'S OFFICE', 'DILG VALENCIA', 'DBM', 'BFP', 'COA', 'ITSD', 'PNP'
];

const TAG_OPTIONS = [
    'Urgent', 'Confidential', 'Procurement', 'IT Equipment', 'Software',
    'Network', 'Security', 'Maintenance', 'Training', 'Budget',
    'Report', 'Meeting', 'Project', 'Infrastructure', 'Support'
];

const initialFormState = {
    direction: '',
    kinds: [],
    otherKind: '',
    type: '',
    date: new Date().toISOString().split('T')[0],
    office: '',
    subject: '',
    details: '',
    assignedToId: '',
    assignedTo: '',
    sectionHeadId: '',
    sectionHead: '',
    divisionHeadId: '',
    divisionHead: '',
    assignedToIds: [],
    isDirectPost: false,
    tags: [],
    followUp: '',
    priority: '',
    trackingId: ''
};

const NewCommunication = () => {
    const [formData, setFormData] = useState(initialFormState);
    const [userRole, setUserRole] = useState('');
    const [userRoleId, setUserRoleId] = useState(null);
    const [sectionHeads, setSectionHeads] = useState([]);
    const [divisionHeads, setDivisionHeads] = useState([]);
    const [personnelList, setPersonnelList] = useState([]);
    const [groups, setGroups] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [tagInput, setTagInput] = useState('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [idCopied, setIdCopied] = useState(false);
    const [submittedId, setSubmittedId] = useState('');
    const [assignedPersonnelList, setAssignedPersonnelList] = useState([]);
    const [showTagSuggestions, setShowTagSuggestions] = useState(false);
    const tagsContainerRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const user = getCurrentUser();
        if (user) {
            setUserRole(user.role || '');
            setUserRoleId(user.roleId);
        }
    }, []);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const token = sessionStorage.getItem('itsd_auth_token');
                const headers = { 'Authorization': `Bearer ${token}` };

                // Fetch Groups
                const groupsRes = await fetch(`${API_BASE_URL}/api/groups`, { headers });
                const groupsData = await groupsRes.json();
                setGroups(Array.isArray(groupsData) ? groupsData : []);

                // Fetch Active Users for Heads
                const usersRes = await fetch(`${API_BASE_URL}/api/users?status=active`, { headers });
                const usersData = await usersRes.json();
                
                if (Array.isArray(usersData)) {
                    // Filter Section Heads (Role is Section Head OR explicit Head status)
                    const sHeads = usersData.filter(u => 
                        (u.roleId === 6 || (u.role && u.role.toLowerCase() === 'section head') || u.isHead || u.HeadedGroup) && 
                        u.roleId !== 7 &&
                        u.role !== 'Division Head' && 
                        u.name !== 'Erlinda B. Sandig'
                    );
                    setSectionHeads(sHeads);

                    // Filter Division Heads
                    const dHeads = usersData.filter(u => u.role === 'Division Head' || u.roleId === 7);
                    setDivisionHeads(dHeads);

                    // Auto-select if current user is a Division Head
                    const currentUser = JSON.parse(sessionStorage.getItem('itsd_user') || '{}');
                    const isDivHead = dHeads.find(h => String(h.id) === String(currentUser.id));
                    
                    if (isDivHead) {
                        setFormData(prev => {
                            if (!prev.divisionHeadId) {
                                return {
                                    ...prev,
                                    divisionHeadId: isDivHead.id,
                                    divisionHead: isDivHead.name
                                };
                            }
                            return prev;
                        });
                    }

                    setPersonnelList(usersData);
                }
            } catch (err) {
                console.error('Error fetching initial data:', err);
            }
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (formData.sectionHeadId) {
            // Find the selected head to get their group
            const head = sectionHeads.find(h => String(h.id) === String(formData.sectionHeadId));
            const gid = head?.groupId || head?.Section?.id;

            if (gid) {
                // Filter all personnel who belong to the same group, excluding the head
                const groupPersonnel = personnelList.filter(p => 
                    String(p.groupId) === String(gid) && String(p.id) !== String(formData.sectionHeadId)
                );
                setAssignedPersonnelList(groupPersonnel);
            } else {
                // Fallback to legacy headId mapping
                const group = groups.find(g => String(g.headId) === String(formData.sectionHeadId));
                if (group && Array.isArray(group.personnel)) {
                    setAssignedPersonnelList(group.personnel.filter(p => String(p.id) !== String(formData.sectionHeadId)));
                } else {
                    setAssignedPersonnelList([]);
                }
            }
        } else {
            setAssignedPersonnelList([]);
        }
    }, [formData.sectionHeadId, groups, sectionHeads, personnelList]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (tagsContainerRef.current && !tagsContainerRef.current.contains(event.target)) {
                setShowTagSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleKindToggle = (kind) => {
        setFormData(prev => {
            const newKinds = prev.kinds.includes(kind)
                ? prev.kinds.filter(k => k !== kind)
                : [...prev.kinds, kind];
            return { ...prev, kinds: newKinds };
        });
    };

    const handleAddTag = (e) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!formData.tags.includes(tagInput.trim())) {
                setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
            }
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove) => {
        setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tagToRemove) }));
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files);
            setSelectedFiles(prev => [...prev, ...newFiles]);
        }
    };

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const isAdmin = userRole === 'admin' || userRoleId === 1;
    const isDivHead = userRole === 'division head' || userRoleId === 7;
    const isSectionHead = hasPermission('section_head_assignment');
    const isAdminSection = userRole?.toLowerCase() === 'admin section' || userRole?.toLowerCase() === 'administrative' || userRoleId === 3;

    const handleSubmit = (e) => {
        e.preventDefault();
        const isKindSelected = formData.kinds.length > 0 || formData.otherKind.trim() !== '';
        
        if (!formData.direction || !formData.date || !formData.subject || !formData.type || !formData.details || !isKindSelected) {
            alert('Please fill in all required fields (Direction, Category, Document Class, Subject, and Brief Description).');
            return;
        }

        if (!formData.divisionHeadId) {
            alert('Please select a Division Head.');
            return;
        }
        const randomId = Math.floor(100000 + Math.random() * 900000);
        const newTrackingId = `ITSD-2026-${randomId}`;
        setFormData(prev => ({ ...prev, trackingId: newTrackingId }));
        setShowConfirmModal(true);
    };

    const handleConfirmSubmit = async () => {
        setShowConfirmModal(false);
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const formDataToSend = new FormData();

            const submissionData = {
                ...formData,
                kinds: Array.isArray(formData.kinds) ? formData.kinds.join(', ') : formData.kinds,
                tags: Array.isArray(formData.tags) ? formData.tags.join(', ') : formData.tags,
                assignedToIds: JSON.stringify(formData.assignedToIds)
            };

            Object.keys(submissionData).forEach(key => {
                if (key !== 'assignedToIds') {
                    formDataToSend.append(key, submissionData[key]);
                }
            });
            formDataToSend.append('assignedToIds', JSON.stringify(formData.assignedToIds));

            if (selectedFiles.length > 0) {
                selectedFiles.forEach(file => {
                    formDataToSend.append('attachment', file);
                });
            }

            const response = await fetch(`${API_BASE_URL}/api/communications`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formDataToSend
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to submit communication');
            }

            const result = await response.json();
            
            // Update both states to be safe
            if (result && result.trackingId) {
                setSubmittedId(result.trackingId);
                setFormData(prev => ({ ...prev, trackingId: result.trackingId }));
            }

            logActivity(1, 'Submission', `New ticket submitted: ${formData.subject} (Tracking ID: ${result.trackingId || formData.trackingId})`, 'USER');
            setShowSuccessModal(true);
        } catch (error) {
            console.error('Submission error:', error);
            alert('Error: ' + error.message);
        }
    };

    const handleDiscard = () => {
        setFormData(initialFormState);
        setSelectedFiles([]);
        setTagInput('');
    };

    return (
        <UserLayout
            title="Create New Ticket"
            subtitle="Fill out the fields below to register a new ticket entry in the system."
            permissionRequired="create_record"
        >
            <div className="manage-comm-container animate-fade-in">
                <form className="manage-form-card" onSubmit={handleSubmit}>

                    {isSectionHead && (
                        <div className="role-options-group animate-slide-down">
                            <div className="role-options-banner">
                                <label className={`status-toggle ${formData.isDirectPost ? 'active' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={formData.isDirectPost}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setFormData({ 
                                                ...formData, 
                                                isDirectPost: checked,
                                                direction: checked ? 'ITSD ONLY' : formData.direction 
                                            });
                                        }}
                                    />
                                    <div className="toggle-slider"></div>
                                    <div className="toggle-label">
                                        <strong>POST DIRECTLY TO SECTION</strong>
                                        <span>Bypass Division Head Review</span>
                                    </div>
                                </label>

                                <label className={`status-toggle ${formData.direction === 'ITSD ONLY' && !formData.isDirectPost ? 'active' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={formData.direction === 'ITSD ONLY' && !formData.isDirectPost}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            if (checked) {
                                                setFormData({ 
                                                    ...formData, 
                                                    direction: 'ITSD ONLY',
                                                    isDirectPost: false 
                                                });
                                            }
                                        }}
                                    />
                                    <div className="toggle-slider"></div>
                                    <div className="toggle-label">
                                        <strong>INTERNAL REQUEST TO DIV HEAD</strong>
                                        <span>ITSD ONLY Request to Division Head</span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    )}

                    <div className="form-grid-layout">
                        <div className="form-column">
                            <div className="field-group">
                                <label>COMMUNICATION DIRECTION <span className="required">*</span></label>
                                <select 
                                    className="modern-input"
                                    value={formData.direction}
                                    onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                                    required
                                >
                                    <option value="" disabled hidden>Select Direction...</option>
                                    {DIRECTIONS
                                        .filter(d => userRole === 'Admin Section' ? d !== 'ITSD ONLY' : true)
                                        .map(d => <option key={d} value={d}>{d}</option>)
                                    }
                                </select>
                            </div>

                            <div className="field-group">
                                <label>KIND OF COMMUNICATION <span className="required">*</span></label>
                                <div className="kind-multi-container">
                                    <div className="kind-button-grid">
                                        {KIND_OPTIONS.map(kind => (
                                            <button
                                                key={kind}
                                                type="button"
                                                className={`kind-btn ${formData.kinds.includes(kind) ? 'active' : ''}`}
                                                onClick={() => handleKindToggle(kind)}
                                            >
                                                {kind}
                                            </button>
                                        ))}
                                        <input
                                            type="text"
                                            className="others-textarea-grid"
                                            placeholder="Others (Specify)..."
                                            value={formData.otherKind}
                                            onChange={(e) => setFormData({ ...formData, otherKind: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="field-row">
                                <div className="field-group">
                                    <label>DATE <span className="required">*</span></label>
                                    <input
                                        type="date"
                                        className="modern-input"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="field-group">
                                    <label>TYPE OF COMMUNICATION <span className="required">*</span></label>
                                    <select
                                        className="modern-select"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        required
                                    >
                                        <option value="" disabled hidden>Select File Type...</option>
                                        {FILE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="field-group">
                                <label>INTERNAL OFFICE / EXTERNAL ORG <span className="required">*</span></label>
                                <select
                                    className="modern-select"
                                    value={formData.office}
                                    onChange={(e) => setFormData({ ...formData, office: e.target.value })}
                                    required
                                >
                                    <option value="" disabled hidden>Select Office/Department...</option>
                                    {OFFICES.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                            <div className="field-row">
                                <div className="field-group animate-slide-down">
                                    <label>DIVISION HEAD <span className="required">*</span></label>
                                    <select
                                        className="modern-select"
                                        value={formData.divisionHeadId}
                                        onChange={(e) => {
                                            const head = divisionHeads.find(h => String(h.id) === String(e.target.value));
                                            setFormData({
                                                ...formData,
                                                divisionHeadId: e.target.value,
                                                divisionHead: head ? head.name : ''
                                            });
                                        }}
                                        required
                                    >
                                        <option value="" disabled hidden>Select Division Head...</option>
                                        {divisionHeads.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                    </select>
                                </div>

                                <div className="field-group">
                                    <label>
                                        SECTION HEAD
                                        {!(isAdminSection || isAdmin || isDivHead) && <span className="required">*</span>}
                                    </label>
                                    <select
                                        className="modern-select"
                                        value={formData.sectionHeadId}
                                        onChange={(e) => {
                                            const head = sectionHeads.find(h => String(h.id) === String(e.target.value));
                                            setFormData({
                                                ...formData,
                                                sectionHeadId: e.target.value,
                                                sectionHead: head ? head.name : '',
                                                assignedToIds: []
                                            });
                                        }}
                                        required={!(isAdminSection || isAdmin || isDivHead)}
                                    >
                                        <option value="" disabled={!(isAdminSection || isAdmin || isDivHead)} hidden={!(isAdminSection || isAdmin || isDivHead)}>
                                            {isAdminSection || isAdmin || isDivHead ? 'None / Assign Later' : 'Select Section Head...'}
                                        </option>
                                        {sectionHeads.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="field-group">
                                <label>ASSIGNED TO (PERSONNEL)</label>
                                <select
                                    className="modern-select"
                                    value={formData.assignedToIds[0] || ""}
                                    onChange={(e) => {
                                        const id = e.target.value;
                                        setFormData(prev => ({
                                            ...prev,
                                            assignedToIds: id ? [parseInt(id)] : []
                                        }));
                                    }}
                                    disabled={!formData.sectionHeadId}
                                >
                                    <option value="" disabled hidden>
                                        {!formData.sectionHeadId ? (isAdminSection || isAdmin || isDivHead ? 'Select section head for personnel assignment...' : 'Select section head first...') : 'Select Personnel...'}
                                    </option>
                                    {assignedPersonnelList.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-column">
                            <div className="field-group">
                                <label>SUBJECT OF COMMUNICATIONS <span className="required">*</span></label>
                                <input
                                    type="text"
                                    className="modern-input"
                                    placeholder="Enter communication subject..."
                                    value={formData.subject}
                                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="field-group">
                                <label>COMMUNICATION DETAILS <span className="required">*</span></label>
                                <textarea
                                    className="modern-textarea"
                                    placeholder="Provide detailed description..."
                                    rows="4"
                                    value={formData.details}
                                    onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                                    required
                                ></textarea>
                            </div>

                            <div className="field-group">
                                <label>TAGS</label>
                                <div className="tags-system-modern" ref={tagsContainerRef}>
                                    <div className="tags-input-container" onClick={() => setShowTagSuggestions(true)}>
                                        <div className="tags-list">
                                            {formData.tags.map(tag => (
                                                <span key={tag} className="tag-pill">
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                                                    {tag}
                                                    <button type="button" onClick={(e) => { e.stopPropagation(); removeTag(tag); }}>✕</button>
                                                </span>
                                            ))}
                                            <input
                                                type="text"
                                                placeholder="Add custom tag..."
                                                value={tagInput}
                                                onChange={(e) => setTagInput(e.target.value)}
                                                onKeyDown={handleAddTag}
                                                onFocus={() => setShowTagSuggestions(true)}
                                            />
                                        </div>
                                    </div>
                                    {showTagSuggestions && (
                                        <div className="suggested-tags-scroll animate-fade-in">
                                            {TAG_OPTIONS.map(tag => (
                                                <div
                                                    key={tag}
                                                    className={`suggested-tag-item ${formData.tags.includes(tag) ? 'selected' : ''}`}
                                                    onClick={() => {
                                                        if (formData.tags.includes(tag)) {
                                                            removeTag(tag);
                                                        } else {
                                                            setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
                                                        }
                                                    }}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                                                    <span>{tag}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="form-footer-options">
                        <div className="option-section">
                            <label>FOLLOW-UP STATUS</label>
                            <div className="radio-group-premium">
                                <label className={`radio-pill ${formData.followUp === 'FOLLOW-UP REQUIRED' ? 'active' : ''}`}>
                                    <input type="radio" value="FOLLOW-UP REQUIRED" checked={formData.followUp === 'FOLLOW-UP REQUIRED'} onChange={(e) => setFormData({ ...formData, followUp: e.target.value })} required />
                                    <span>FOLLOW-UP REQUIRED</span>
                                </label>
                                <label className={`radio-pill ${formData.followUp === 'NO FOLLOW-UP NEEDED' ? 'active' : ''}`}>
                                    <input type="radio" value="NO FOLLOW-UP NEEDED" checked={formData.followUp === 'NO FOLLOW-UP NEEDED'} onChange={(e) => setFormData({ ...formData, followUp: e.target.value })} required />
                                    <span>NO FOLLOW-UP NEEDED</span>
                                </label>
                            </div>
                        </div>

                        <div className="option-section">
                            <label>PRIORITY LEVEL</label>
                            <div className="radio-group-premium">
                                {['HIGH', 'MEDIUM', 'LOW'].map(lvl => (
                                    <label key={lvl} className={`radio-pill priority-${lvl.toLowerCase()} ${formData.priority === lvl ? 'active' : ''}`}>
                                        <input type="radio" value={lvl} checked={formData.priority === lvl} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} required />
                                        <span>{lvl}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="attachment-upload-premium">
                        <input
                            type="file"
                            id="file-upload"
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                            multiple
                        />
                        <label htmlFor="file-upload" className="upload-box-modern">
                            <div className="upload-icon-circle">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                            </div>
                            <div className="upload-text-centered">
                                <p>Drag and drop files here, or <span className="browse-link">browse</span></p>
                                <span>Supports: PDF, Word, Excel, Images, etc.</span>
                            </div>
                        </label>

                        {selectedFiles.length > 0 && (
                            <div className="selected-files-list animate-fade-in">
                                {selectedFiles.map((file, idx) => (
                                    <div key={`${file.name}-${idx}`} className="file-item-pill">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                                        <span className="file-name">{file.name}</span>
                                        <button type="button" className="remove-file-btn" onClick={() => removeFile(idx)}>✕</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="form-submit-actions">
                        <button type="button" className="btn-cancel-modern" onClick={handleDiscard}>DISCARD CHANGES</button>
                        <button type="submit" className="btn-submit-modern">SUBMIT COMMUNICATION</button>
                    </div>

                </form>

                {showConfirmModal && (
                    <div className="modal-overlay-premium animate-fade-in">
                        <div className="confirm-modal-v2 glass-premium animate-zoom-in">
                            <div className="v2-modal-header">
                                <div className="success-icon-glow">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                                <h3>Validate Submission</h3>
                                <p>Ensure all information is correct before archiving.</p>
                            </div>
                            <div className="v2-modal-body">
                                <div className="confirm-grid">
                                    <div className="confirm-data-item full-width highlight-item">
                                        <span className="label">GENERATED TRACKING ID</span>
                                        <span className="value monospace-small">{formData.trackingId}</span>
                                    </div>
                                    <div className="confirm-data-item">
                                        <span className="label">DIRECTION</span>
                                        <span className="value">{formData.direction}</span>
                                    </div>
                                    <div className="confirm-data-item">
                                        <span className="label">DATE</span>
                                        <span className="value">{formData.date}</span>
                                    </div>
                                    <div className="confirm-data-item">
                                        <span className="label">OFFICE</span>
                                        <span className="value">{formData.office}</span>
                                    </div>
                                    <div className="confirm-data-item">
                                        <span className="label">FILE TYPE</span>
                                        <span className="value">{formData.type}</span>
                                    </div>
                                </div>

                                <div className="confirm-data-item full-width">
                                    <span className="label">SUBJECT</span>
                                    <span className="value">{formData.subject}</span>
                                </div>

                                <div className="confirm-data-item full-width">
                                    <span className="label">COMMUNICATION DETAILS</span>
                                    <span className="value" style={{ whiteSpace: 'pre-wrap' }}>{formData.details}</span>
                                </div>

                                <div className="confirm-grid">
                                    <div className="confirm-data-item">
                                        <span className="label">COMMUNICATION KINDS</span>
                                        <span className="value">{Array.isArray(formData.kinds) ? formData.kinds.join(', ') : formData.kinds}</span>
                                    </div>
                                    <div className="confirm-data-item">
                                        <span className="label">TAGS</span>
                                        <div className="confirm-tags">
                                            {formData.tags.map(tag => (
                                                <span key={tag} className="mini-tag">{tag}</span>
                                            ))}
                                            {formData.tags.length === 0 && <span className="value">---</span>}
                                        </div>
                                    </div>
                                    <div className="confirm-data-item">
                                        <span className="label">DIVISION HEAD</span>
                                        <span className="value">{formData.divisionHead || '---'}</span>
                                    </div>
                                    <div className="confirm-data-item">
                                        <span className="label">SECTION HEAD</span>
                                        <span className="value">{formData.sectionHead || '---'}</span>
                                    </div>
                                    <div className="confirm-data-item">
                                        <span className="label">ASSIGNED PERSONNEL</span>
                                        <span className="value">
                                            {(formData.assignedToIds || []).map(id => {
                                                const p = personnelList.find(u => u.id === id);
                                                return p ? p.name : null;
                                            }).filter(Boolean).join(', ') || '---'}
                                        </span>
                                    </div>
                                    <div className="confirm-data-item">
                                        <span className="label">PRIORITY</span>
                                        <span className={`value priority-tag ${formData.priority.toLowerCase()}`}>{formData.priority}</span>
                                    </div>
                                    <div className="confirm-data-item">
                                        <span className="label">FOLLOW-UP</span>
                                        <span className="value">{formData.followUp}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="v2-modal-footer">
                                <button className="v2-btn-secondary" onClick={() => setShowConfirmModal(false)}>Review</button>
                                <button className="v2-btn-primary" onClick={handleConfirmSubmit}>Confirm & Send</button>
                            </div>
                        </div>
                    </div>
                )}

                {showSuccessModal && (
                    <div className="modal-overlay-premium animate-fade-in">
                        <div className="success-modal-v3 glass-premium animate-zoom-in">
                            <div className="v3-success-icon">
                                <div className="icon-ripple"></div>
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>

                            <div className="v3-modal-header">
                                <h3>Submission Successful</h3>
                                <p>Your communication record has been archived and secured.</p>
                            </div>
                             <div className="v3-tracking-card premium-ticket">
                                 <div className="card-glare"></div>
                                 <span>TRACKING IDENTIFIER</span>
                                 <h4 className="monospace-id" style={{ color: '#0f172a', opacity: 1, fontSize: '1.2rem' }}>
                                     ID: {submittedId || formData.trackingId || 'PLEASE REFRESH'}
                                 </h4>
                                 <div className={`copy-hint-v4 ${idCopied ? 'copied' : ''}`} onClick={() => {
                                     navigator.clipboard.writeText(submittedId || formData.trackingId);
                                     setIdCopied(true);
                                     setTimeout(() => setIdCopied(false), 2000);
                                 }}>
                                     {idCopied ? (
                                         <>
                                             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                 <polyline points="20 6 9 17 4 12"></polyline>
                                             </svg>
                                             Copied to clipboard!
                                         </>
                                     ) : (
                                         <>
                                             <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                 <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                 <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                             </svg>
                                             Click to copy ID
                                         </>
                                     )}
                                 </div>
                             </div>

                            <div className="v3-modal-actions">
                                <button
                                    className="v3-btn-finish primary"
                                    onClick={() => navigate('/user/communications')}
                                >
                                    GO TO LISTS
                                </button>
                                <button
                                    className="v3-btn-finish secondary"
                                    onClick={() => {
                                        setShowSuccessModal(false);
                                        setFormData(initialFormState);
                                        setSelectedFiles([]);
                                    }}
                                >
                                    CLOSE
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </UserLayout>
    );
};

export default NewCommunication;
