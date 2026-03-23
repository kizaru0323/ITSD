import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import AdminLayout from '../../layouts/AdminLayout';
import { logActivity } from '../../utils/activityLogger';
import { hasPermission } from '../../utils/auth';
import { API_BASE_URL } from '../../apiConfig';
import './Groups.css';

// Mock data removed in favor of dynamic fetching.

const Groups = () => {
    const [groupsData, setGroupsData] = useState({ current: [], history: [] });

    const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
    const [isPersonModalOpen, setIsPersonModalOpen] = useState(false);
    const [selectedDept, setSelectedDept] = useState(null); // The one being viewed in Org Chart
    const [viewingVersion, setViewingVersion] = useState('current');
    const [filterDate, setFilterDate] = useState({ month: '', year: '' });

    // Form & Edit States
    const [newDept, setNewDept] = useState({ name: '', head: '', itsdSupport: [] });
    const [newPerson, setNewPerson] = useState({ name: '', role: '', avatar: '' });
    const [personAvatarPreview, setPersonAvatarPreview] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    // Head Edit States
    const [isHeadModalOpen, setIsHeadModalOpen] = useState(false);
    const [headEdit, setHeadEdit] = useState({ name: '', avatar: '' });
    const [headAvatarPreview, setHeadAvatarPreview] = useState(null);

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const response = await fetch(`${API_BASE_URL}/api/groups`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setGroupsData({ current: Array.isArray(data) ? data : [], history: [] });
        } catch (error) {
            console.error('Error fetching groups:', error);
        }
    };

    const handleAddDept = async (e) => {
        e.preventDefault();
        const dept = {
            ...newDept,
            personnel: isEditing ? undefined : [] // Don't overwrite personnel on edit
        };
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            if (isEditing) {
                await fetch(`${API_BASE_URL}/api/groups/${editId}`, {
                    method: 'PATCH',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(newDept)
                });
                logActivity('Admin Group', `Organization updated: ${dept.name}`, 'ADMIN');
            } else {
                await fetch(`${API_BASE_URL}/api/groups`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(dept)
                });
                logActivity('Admin Group', `New organization added: ${dept.name}`, 'ADMIN');
            }
            setIsDeptModalOpen(false);
            setIsEditing(false);
            setEditId(null);
            setNewDept({ name: '', head: '', itsdSupport: [] });
            fetchGroups();
        } catch (error) {
            console.error('Error saving dept:', error);
        }
    };

    const handleEditDept = (dept) => {
        setNewDept({
            name: dept.name,
            head: dept.head,
            itsdSupport: Array.isArray(dept.itsdSupport) ? dept.itsdSupport : []
        });
        setEditId(dept.id);
        setIsEditing(true);
        setIsDeptModalOpen(true);
    };

    const handleDrillDown = (personName) => {
        const targetDept = groupsData.current.find(g => g.head === personName && g.name !== selectedDept?.name);
        if (targetDept) {
            setSelectedDept(targetDept);
            logActivity('Admin Flow', `Drilled down into ${targetDept.name} from ${selectedDept.name}`, 'ADMIN');
        }
    };

    const handleDeleteDept = async (id, name) => {
        if (window.confirm(`Are you sure you want to delete "${name}"? This will remove all personnel data.`)) {
            try {
                const token = sessionStorage.getItem('itsd_auth_token');
                await fetch(`${API_BASE_URL}/api/groups/${id}`, { 
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                logActivity('Admin Group', `Organization deleted: ${name}`, 'ADMIN');
                if (selectedDept?.id === id) setSelectedDept(null);
                fetchGroups();
            } catch (error) {
                console.error('Error deleting dept:', error);
            }
        }
    };

    const handleAddPerson = async (e) => {
        e.preventDefault();
        const currentPersonnel = Array.isArray(selectedDept?.personnel) ? selectedDept.personnel : [];
        let updatedPersonnel;

        if (isEditing) {
            updatedPersonnel = currentPersonnel.map(p =>
                p.id === editId ? { ...p, ...newPerson } : p
            );
        } else {
            const person = {
                id: `p_${Date.now()}`,
                ...newPerson
            };
            updatedPersonnel = [...currentPersonnel, person];
        }

        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            await fetch(`${API_BASE_URL}/api/groups/${selectedDept.id}`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ personnel: updatedPersonnel })
            });

            if (isEditing) {
                logActivity('Admin Personnel', `Updated "${newPerson.name}" in ${selectedDept.name}`, 'ADMIN');
            } else {
                logActivity('Admin Personnel', `Added "${newPerson.name}" to ${selectedDept.name}`, 'ADMIN');
            }

            setIsPersonModalOpen(false);
            setIsEditing(false);
            setEditId(null);
            setNewPerson({ name: '', role: '', avatar: '' });
            setPersonAvatarPreview(null);

            const updatedDept = { ...selectedDept, personnel: updatedPersonnel };
            setSelectedDept(updatedDept);
            fetchGroups();
        } catch (error) {
            console.error('Error saving person:', error);
        }
    };

    const handleEditPerson = (person) => {
        setNewPerson({
            name: person.name,
            role: person.role,
            avatar: person.avatar || ''
        });
        setPersonAvatarPreview(person.avatar || null);
        setEditId(person.id);
        setIsEditing(true);
        setIsPersonModalOpen(true);
    };

    const handleDeletePerson = async (personId, personName) => {
        if (window.confirm(`Remove ${personName} from this organization?`)) {
            const currentPersonnel = Array.isArray(selectedDept?.personnel) ? selectedDept.personnel : [];
            const updatedPersonnel = currentPersonnel.filter(p => p.id !== personId);
            try {
                const token = sessionStorage.getItem('itsd_auth_token');
                await fetch(`${API_BASE_URL}/api/groups/${selectedDept.id}`, {
                    method: 'PATCH',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ personnel: updatedPersonnel })
                });
                logActivity('Admin Personnel', `Removed "${personName}" from ${selectedDept.name}`, 'ADMIN');

                const updatedDept = { ...selectedDept, personnel: updatedPersonnel };
                setSelectedDept(updatedDept);
                fetchGroups();
            } catch (error) {
                console.error('Error deleting person:', error);
            }
        }
    };

    const handleSaveHead = async (e) => {
        e.preventDefault();
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            await fetch(`${API_BASE_URL}/api/groups/${selectedDept.id}`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ head: headEdit.name, headAvatar: headEdit.avatar })
            });
            const updatedDept = { ...selectedDept, head: headEdit.name, headAvatar: headEdit.avatar };
            setSelectedDept(updatedDept);
            setIsHeadModalOpen(false);
            setHeadAvatarPreview(null);
            logActivity('Admin Group', `Updated head of ${selectedDept.name} to ${headEdit.name}`, 'ADMIN');
            fetchGroups();
        } catch (error) {
            console.error('Error saving head:', error);
        }
    };


    const displayData = viewingVersion === 'current'
        ? groupsData.current
        : (groupsData.history.find(h => h.version === viewingVersion)?.data || []);

    return (
        <AdminLayout
            title="Groups & Organizations"
            subtitle="Manage internal departments and external organizational mapping"
            permissionRequired="manage_users"
        >
            <div className="admin-groups-wrapper animate-fade-in">
                {!selectedDept ? (
                    <>
                        {/* LANDING VIEW: List of Orgs */}
                        <div className="groups-header-row">
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


                            </div>

                            <div className="group-header-actions">
                                {hasPermission('manage_users') && (
                                    <button className="add-role-btn" onClick={() => {
                                        setNewDept({ name: '', head: '', itsdSupport: [] });
                                        setIsEditing(false);
                                        setIsDeptModalOpen(true);
                                    }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                        <span>Add Department</span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {viewingVersion !== 'current' && (
                            <div className="historical-view-banner animate-slide-up">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                <span>You are viewing a historical record from <strong>{new Date(groupsData.history.find(h => h.version === viewingVersion)?.snapshotDate).toLocaleString()}</strong></span>
                                <button className="btn-return-live" onClick={() => setViewingVersion('current')}>Back to LIVE</button>
                            </div>
                        )}

                        <div className="landing-org-chart-container">
                            {/* TOP NODE: MAIN OFFICE */}
                            {displayData.find(d => d.name === 'ITSD - MAIN OFFICE') && (
                                <div className="org-chart-top-section">
                                    {displayData.filter(d => d.name === 'ITSD - MAIN OFFICE').map(dept => (
                                        <div key={dept.id} className="org-card-v2 head-node animate-slide-up" onClick={() => setSelectedDept(dept)}>
                                            <div className="org-card-icon head-logo-bg">
                                                <img src="/itsdlogo.png" alt="ITSD Logo" className="head-logo-img" />
                                            </div>
                                            <div className="org-card-details">
                                                <h4>{dept.name}</h4>
                                                <p>Head: <strong>{dept.head}</strong></p>
                                            </div>
                                            {viewingVersion === 'current' && hasPermission('manage_users') && (
                                                <div className="org-card-actions" onClick={e => e.stopPropagation()}>
                                                    <button className="card-action-dot" onClick={() => handleEditDept(dept)} title="Edit">✎</button>
                                                    <button className="card-action-dot delete" onClick={() => handleDeleteDept(dept.id, dept.name)} title="Delete">✕</button>
                                                </div>
                                            )}
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
                            <div className="orgs-list-grid">
                                {displayData.filter(d => d.name !== 'ITSD - MAIN OFFICE').map(dept => (
                                    <div key={dept.id} className="org-card-v2 animate-slide-up" onClick={() => setSelectedDept(dept)}>
                                        <div className="org-card-icon">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                        </div>
                                        <div className="org-card-details">
                                            <h4>{dept.name}</h4>
                                            <p>Head: <strong>{dept.head}</strong></p>
                                        </div>
                                        {viewingVersion === 'current' && hasPermission('manage_users') && (
                                            <div className="org-card-actions" onClick={e => e.stopPropagation()}>
                                                <button className="card-action-dot" onClick={() => handleEditDept(dept)} title="Edit">✎</button>
                                                <button className="card-action-dot delete" onClick={() => handleDeleteDept(dept.id, dept.name)} title="Delete">✕</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {displayData.length === 0 && (
                                <div className="empty-state-full glass-premium">
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                                    <p>No organizations found for the selected period.</p>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    /* DRILL DOWN: Org Chart Detailed View */
                    <div className="admin-org-chart-view animate-fade-in">
                        <div className="chart-view-header">
                            <button className="back-btn-glass" onClick={() => setSelectedDept(null)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <polyline points="15 18 9 12 15 6"></polyline>
                                </svg>
                                <span>Back to Departments</span>
                            </button>
                            <div className="viewing-org-title">
                                <h3>{selectedDept.name}</h3>
                                <div className="org-meta-pill">
                                    {viewingVersion === 'current' ? 'Official Organizational Structure' : `Historical Record: ${new Date(groupsData.history.find(h => h.version === viewingVersion)?.snapshotDate).toLocaleDateString()}`}
                                </div>
                            </div>
                            {viewingVersion === 'current' && hasPermission('manage_users') && (
                                <button className="add-role-btn sm" onClick={() => {
                                    setNewPerson({ name: '', role: '', avatar: '' });
                                    setPersonAvatarPreview(null);
                                    setIsEditing(false);
                                    setIsPersonModalOpen(true);
                                }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                    <span>Add Personnel</span>
                                </button>
                            )}
                        </div>

                        <div className="hierarchical-viewport glass-premium shadow-lg">
                            <div className="org-vertical-tree">
                                {/* LEVEL 1: HEAD */}
                                <div className="tree-level level-head">
                                    <div className="node-connector parent-only"></div>
                                    <div className="modern-dept-card node-head animate-zoom-in">
                                        <div className="card-top">
                                            <span className="dept-badge">HEAD OF OFFICE</span>
                                            {viewingVersion === 'current' && hasPermission('manage_users') && (
                                                <button
                                                    style={{
                                                        marginLeft: 'auto', background: 'none', border: '1px solid #e2e8f0',
                                                        borderRadius: '8px', padding: '3px 10px', fontSize: '0.7rem',
                                                        fontWeight: 800, color: '#112d42', cursor: 'pointer'
                                                    }}
                                                    onClick={() => {
                                                        setHeadEdit({ name: selectedDept.head, avatar: selectedDept.headAvatar || '' });
                                                        setHeadAvatarPreview(selectedDept.headAvatar || null);
                                                        setIsHeadModalOpen(true);
                                                    }}
                                                >✎ Edit</button>
                                            )}
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
                                    {/* Main Personnel Branch (Editable) */}
                                    <div className="personnel-branch">
                                        <div className="branch-label">SECTION PERSONNEL</div>
                                        <div className="personnel-nodes-grid">
                                            {Array.isArray(selectedDept?.personnel) && selectedDept.personnel.map(person => (
                                                <div
                                                    key={person.id}
                                                    className={`personnel-node-card animate-zoom-in ${groupsData.current.some(g => g.head === person.name && g.name !== selectedDept.name) ? 'clickable-section' : ''}`}
                                                    onClick={() => handleDrillDown(person.name)}
                                                >
                                                    <div className="node-avatar-sm">
                                                        {person.avatar
                                                            ? <img src={person.avatar} alt={person.name} />
                                                            : (person.name || '?').charAt(0)
                                                        }
                                                    </div>
                                                    <div className="node-info">
                                                        <span className="name">{person.name}</span>
                                                        <div className="role-flex">
                                                            <span className="role">{person.role}</span>
                                                            {groupsData.current.some(g => g.head === person.name && g.name !== selectedDept.name) && (
                                                                <span className="view-sub-badge">View Section ➔</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {viewingVersion === 'current' && hasPermission('manage_users') && (
                                                        <div className="node-actions-corner">
                                                            <button
                                                                className="node-action-btn edit"
                                                                onClick={(e) => { e.stopPropagation(); handleEditPerson(person); }}
                                                                title="Edit Personnel"
                                                            >
                                                                ✎
                                                            </button>
                                                            <button
                                                                className="node-action-btn delete"
                                                                onClick={(e) => { e.stopPropagation(); handleDeletePerson(person.id, person.name); }}
                                                                title="Remove Personnel"
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                            {viewingVersion === 'current' && hasPermission('manage_users') && (
                                                <div
                                                    className="personnel-add-placeholder animate-pulse"
                                                    onClick={() => {
                                                        setNewPerson({ name: '', role: '', avatar: '' });
                                                        setPersonAvatarPreview(null);
                                                        setIsEditing(false);
                                                        setIsPersonModalOpen(true);
                                                    }}
                                                >
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#112d42" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                                    <span>Add New</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {isDeptModalOpen && createPortal(
                <div className="modern-overlay animate-fade-in" onClick={() => { setIsDeptModalOpen(false); setIsEditing(false); }}>
                    <div className="modern-modal animate-zoom-in" onClick={e => e.stopPropagation()} style={{ width: '500px' }}>
                        <div className="modern-modal-header">
                            <h3>{isEditing ? 'Edit Department' : 'Add New Department'}</h3>
                            <button className="close-btn-modern" onClick={() => { setIsDeptModalOpen(false); setIsEditing(false); }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div className="modern-modal-body">
                            <form id="dept-form" onSubmit={handleAddDept}>
                                <div className="form-group">
                                    <label>Department Name</label>
                                    <input
                                        className="form-control"
                                        placeholder="e.g. Finance Department"
                                        value={newDept.name}
                                        onChange={e => setNewDept({ ...newDept, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Head of Office</label>
                                    <input
                                        className="form-control"
                                        placeholder="Full Name (e.g. Maria Clara)"
                                        value={newDept.head}
                                        onChange={e => setNewDept({ ...newDept, head: e.target.value })}
                                        required
                                    />
                                </div>
                            </form>
                        </div>
                        <div className="modern-modal-footer">
                            <button type="button" className="v2-btn-secondary" onClick={() => { setIsDeptModalOpen(false); setIsEditing(false); }}>Cancel</button>
                            <button type="submit" form="dept-form" className="pu-btn primary" style={{ borderRadius: '12px' }}>{isEditing ? 'Save Changes' : 'Create Organization'}</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {isPersonModalOpen && createPortal(
                <div className="modern-overlay animate-fade-in" onClick={() => { setIsPersonModalOpen(false); setIsEditing(false); setPersonAvatarPreview(null); }}>
                    <div className="modern-modal animate-zoom-in" onClick={e => e.stopPropagation()} style={{ width: '480px' }}>
                        <div className="modern-modal-header">
                            <h3>{isEditing ? 'Edit Personnel' : 'Add Personnel'}</h3>
                            <button className="close-btn-modern" onClick={() => { setIsPersonModalOpen(false); setIsEditing(false); setPersonAvatarPreview(null); }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div className="modern-modal-body">
                            <form id="person-form" onSubmit={handleAddPerson}>
                                {/* Avatar Upload */}
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                    <div style={{
                                        width: '100px', height: '100px', borderRadius: '24px',
                                        background: personAvatarPreview ? 'transparent' : 'var(--primary-navy)',
                                        border: '2px dashed #e2e8f0',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        overflow: 'hidden', cursor: 'pointer', position: 'relative',
                                        transition: 'all 0.3s ease'
                                    }} onClick={() => document.getElementById('person-avatar-input').click()}>
                                        {personAvatarPreview
                                            ? <img src={personAvatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            : <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                        }
                                        <div style={{
                                            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            opacity: personAvatarPreview ? 0 : 1, transition: '0.3s'
                                        }}>
                                            <span style={{ color: 'white', fontSize: '10px', fontWeight: 900 }}>UPLOAD</span>
                                        </div>
                                    </div>
                                    <input
                                        id="person-avatar-input"
                                        type="file"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;
                                            const reader = new FileReader();
                                            reader.onload = (ev) => {
                                                setPersonAvatarPreview(ev.target.result);
                                                setNewPerson(prev => ({ ...prev, avatar: ev.target.result }));
                                            };
                                            reader.readAsDataURL(file);
                                        }}
                                    />
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Recommended: Square Photo</span>
                                </div>

                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input
                                        className="form-control"
                                        placeholder="Enter personnel name..."
                                        value={newPerson.name}
                                        onChange={e => setNewPerson({ ...newPerson, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Designation / Role</label>
                                    <input
                                        className="form-control"
                                        placeholder="e.g. Staff Personnel"
                                        value={newPerson.role}
                                        onChange={e => setNewPerson({ ...newPerson, role: e.target.value })}
                                        required
                                    />
                                </div>
                            </form>
                        </div>
                        <div className="modern-modal-footer">
                            <button type="button" className="v2-btn-secondary" onClick={() => { setIsPersonModalOpen(false); setIsEditing(false); setPersonAvatarPreview(null); }}>Cancel</button>
                            <button type="submit" form="person-form" className="pu-btn primary" style={{ borderRadius: '12px' }}>{isEditing ? 'Save Changes' : `Add Personnel`}</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {isHeadModalOpen && createPortal(
                <div className="modern-overlay animate-fade-in" onClick={() => { setIsHeadModalOpen(false); setHeadAvatarPreview(null); }}>
                    <div className="modern-modal animate-zoom-in" onClick={e => e.stopPropagation()} style={{ width: '480px' }}>
                        <div className="modern-modal-header">
                            <h3>Edit Section Head</h3>
                            <button className="close-btn-modern" onClick={() => { setIsHeadModalOpen(false); setHeadAvatarPreview(null); }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div className="modern-modal-body">
                            <form id="head-form" onSubmit={handleSaveHead}>
                                {/* Avatar Upload */}
                                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                    <div style={{
                                        width: '100px', height: '100px', borderRadius: '24px',
                                        background: headAvatarPreview ? 'transparent' : 'var(--primary-navy)',
                                        border: '2px dashed #e2e8f0',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        overflow: 'hidden', cursor: 'pointer', position: 'relative'
                                    }} onClick={() => document.getElementById('head-avatar-input').click()}>
                                        {headAvatarPreview
                                            ? <img src={headAvatarPreview} alt="head avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            : <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"><circle cx="12" cy="8" r="4"></circle><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"></path></svg>
                                        }
                                        <div style={{
                                            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            opacity: headAvatarPreview ? 0 : 1, transition: '0.3s'
                                        }}>
                                            <span style={{ color: 'white', fontSize: '10px', fontWeight: 900 }}>UPLOAD</span>
                                        </div>
                                    </div>
                                    <input
                                        id="head-avatar-input"
                                        type="file"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={(e) => {
                                            const file = e.target.files[0];
                                            if (!file) return;
                                            const reader = new FileReader();
                                            reader.onload = (ev) => {
                                                setHeadAvatarPreview(ev.target.result);
                                                setHeadEdit(prev => ({ ...prev, avatar: ev.target.result }));
                                            };
                                            reader.readAsDataURL(file);
                                        }}
                                    />
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Click to change photo</span>
                                </div>
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input
                                        className="form-control"
                                        placeholder="Enter head's full name..."
                                        value={headEdit.name}
                                        onChange={e => setHeadEdit({ ...headEdit, name: e.target.value })}
                                        required
                                    />
                                </div>
                            </form>
                        </div>
                        <div className="modern-modal-footer">
                            <button type="button" className="v2-btn-secondary" onClick={() => { setIsHeadModalOpen(false); setHeadAvatarPreview(null); }}>Cancel</button>
                            <button type="submit" form="head-form" className="pu-btn primary" style={{ borderRadius: '12px' }}>Save Changes</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </AdminLayout>
    );
};

export default Groups;
