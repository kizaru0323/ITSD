import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import AdminLayout from '../../layouts/AdminLayout';
import Pagination from '../../components/Pagination';
import { API_BASE_URL } from '../../apiConfig';
import './Users.css';

const YEARS = ['All', '2025', '2026'];
const MONTH_NAMES = ['All', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];


const blankForm = {
    name: '',
    username: '',
    email: '',
    roleId: '',
    department: '',
    groupId: '', // Linked section
    password: '',
    phone: '',
    position: '',
    bio: ''
};

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [search, setSearch] = useState('');
    const [filterYear, setFilterYear] = useState('All');
    const [filterMonth, setFilterMonth] = useState('All');
    const [filterStatus, setFilterStatus] = useState('active');
    const [groups, setGroups] = useState([]);
    const [activeSessions, setActiveSessions] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showConfirmArchive, setShowConfirmArchive] = useState(false);
    const [showConfirmUnarchive, setShowConfirmUnarchive] = useState(false);
    const [showConfirmDeactivate, setShowConfirmDeactivate] = useState(false);
    const [userToArchive, setUserToArchive] = useState(null);
    const [userToUnarchive, setUserToUnarchive] = useState(null);
    const [userToDeactivate, setUserToDeactivate] = useState(null);
    const [form, setForm] = useState(blankForm);
    const [formError, setFormError] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const ITEMS_PER_PAGE = 8;

    useEffect(() => {
        fetchUsers();
        fetchRoles();
        fetchGroups();
        fetchActiveSessions();
        // Poll for active sessions every 30 seconds
        const timer = setInterval(fetchActiveSessions, 30000);
        return () => clearInterval(timer);
    }, []);

    const fetchGroups = async () => {
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const response = await fetch(`${API_BASE_URL}/api/groups`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setGroups(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching groups:', error);
        }
    };

    const fetchRoles = async () => {
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const response = await fetch(`${API_BASE_URL}/api/roles`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setRoles(data);
        } catch (error) {
            console.error('Error fetching roles:', error);
        }
    };

    const fetchUsers = async () => {
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setUsers(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchActiveSessions = async () => {
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const response = await fetch(`${API_BASE_URL}/api/sessions/active`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setActiveSessions(data);
            }
        } catch (error) {
            console.error('Error fetching active sessions:', error);
        }
    };

    // Filter
    const filtered = users.filter(u => {
        const matchSearch = 
            u.name?.toLowerCase().includes(search.toLowerCase()) || 
            u.email?.toLowerCase().includes(search.toLowerCase()) ||
            u.username?.toLowerCase().includes(search.toLowerCase());
        const d = new Date(u.dateJoined || u.createdAt);
        const matchYear = filterYear === 'All' || d.getFullYear().toString() === filterYear;
        const matchMonth = filterMonth === 'All' || (d.getMonth() + 1) === MONTH_NAMES.indexOf(filterMonth);
        const matchStatus = filterStatus === 'All' || u.status === filterStatus;
        return matchSearch && matchYear && matchMonth && matchStatus;
    });

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paged = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const toggleStatus = async (userId) => {
        const user = users.find(u => u.id === userId);
        if (!user || user.status === 'archived') return;

        const newStatus = user.status === 'active' ? 'inactive' : 'active';

        // Add confirmation for deactivation
        if (newStatus === 'inactive') {
            setUserToDeactivate(user);
            setShowConfirmDeactivate(true);
            return;
        }

        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            if (!response.ok) throw new Error('Failed to toggle status');
            fetchUsers();
        } catch (error) {
            console.error('Error toggling status:', error);
        }
    };

    const executeDeactivate = async () => {
        if (!userToDeactivate) return;
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const response = await fetch(`${API_BASE_URL}/api/users/${userToDeactivate.id}`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'inactive' })
            });
            if (!response.ok) throw new Error('Failed to deactivate user');
            setShowConfirmDeactivate(false);
            setUserToDeactivate(null);
            fetchUsers();
        } catch (error) {
            console.error('Error deactivating user:', error);
            alert('Error: ' + error.message);
        }
    };

    const handleArchiveUser = (user) => {
        setUserToArchive(user);
        setShowConfirmArchive(true);
    };

    const executeArchive = async () => {
        if (!userToArchive) return;
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const response = await fetch(`${API_BASE_URL}/api/users/${userToArchive.id}`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'archived' })
            });
            if (!response.ok) throw new Error('Failed to archive user');
            setShowConfirmArchive(false);
            setUserToArchive(null);
            fetchUsers();
        } catch (error) {
            console.error('Error archiving user:', error);
            alert('Error: ' + error.message);
        }
    };

    const handleUnarchiveUser = (user) => {
        setUserToUnarchive(user);
        setShowConfirmUnarchive(true);
    };

    const executeUnarchive = async () => {
        if (!userToUnarchive) return;
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const response = await fetch(`${API_BASE_URL}/api/users/${userToUnarchive.id}`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: 'inactive' }) // Return to inactive for safety
            });
            if (!response.ok) throw new Error('Failed to unarchive user');
            setShowConfirmUnarchive(false);
            setUserToUnarchive(null);
            fetchUsers();
        } catch (error) {
            console.error('Error unarchiving user:', error);
            alert('Error: ' + error.message);
        }
    };

    const handleAddUser = async () => {
        if (!form.name || !form.email || !form.username) { 
            setFormError('Name, Email, and Username are required.'); 
            return; 
        }
        if (!form.password) { setFormError('Password is required.'); return; }
        if (users.find(u => u.email === form.email)) { setFormError('Email already exists.'); return; }
        if (users.find(u => u.username === form.username)) { setFormError('Username already exists.'); return; }

        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(form)
            });
            if (!response.ok) throw new Error('Failed to add user');
            setShowModal(false);
            setForm(blankForm);
            setFormError('');
            fetchUsers();
        } catch (error) {
            setFormError(error.message);
        }
    };

    const handleUpdateUser = async (id) => {
        if (!form.name || !form.email || !form.username) { 
            setFormError('Name, Email, and Username are required.'); 
            return; 
        }

        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const updateData = { ...form };
            if (!updateData.password) delete updateData.password; // Don't send empty password

            const response = await fetch(`${API_BASE_URL}/api/users/${id}`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updateData)
            });

            if (!response.ok) throw new Error('Failed to update user');

            setShowModal(false);
            setForm(blankForm);
            setFormError('');
            fetchUsers();
        } catch (error) {
            setFormError(error.message);
        }
    };

    // Export CSV (works as Excel)
    const exportCSV = () => {
        const headers = ['Name', 'Email', 'Role', 'Department', 'Status', 'Joined'];
        const rows = filtered.map(u => [u.name, u.email, u.role, u.department, u.status, u.dateJoined || u.createdAt?.split('T')[0]]);
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `users_${Date.now()}.csv`; a.click();
        URL.revokeObjectURL(url);
    };


    const activeCount = users.filter(u => u.status === 'active').length;
    const inactiveCount = users.filter(u => u.status === 'inactive').length;
    const archivedCount = users.filter(u => u.status === 'archived').length;

    return (
        <AdminLayout
            title="PERSONNEL"
            subtitle="Manage user accounts and system access"
            permissionRequired="manage_users"
        >
            <div className="pu-container animate-fade-in">

                {/* Summary Chips */}
                <div className="pu-summary-row">
                    <div
                        className={`pu-chip total ${filterStatus === 'All' ? 'active-tab' : ''}`}
                        onClick={() => { setFilterStatus('All'); setCurrentPage(1); }}
                    >
                        <span>{users.length}</span>Total Users
                    </div>
                    <div
                        className={`pu-chip active ${filterStatus === 'active' ? 'active-tab' : ''}`}
                        onClick={() => { setFilterStatus('active'); setCurrentPage(1); }}
                    >
                        <span>{activeCount}</span>Active
                    </div>
                    <div
                        className={`pu-chip inactive ${filterStatus === 'inactive' ? 'active-tab' : ''}`}
                        onClick={() => { setFilterStatus('inactive'); setCurrentPage(1); }}
                    >
                        <span>{inactiveCount}</span>Inactive
                    </div>
                    <div
                        className={`pu-chip archived ${filterStatus === 'archived' ? 'active-tab' : ''}`}
                        onClick={() => { setFilterStatus('archived'); setCurrentPage(1); }}
                    >
                        <span>{archivedCount}</span>Archived
                    </div>
                </div>

                {/* Top Bar */}
                <div className="pu-topbar">
                    <div className="pu-search">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search name or email…"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                            autoComplete="off"
                        />
                    </div>

                    <div className="pu-actions">
                        {/* Filter toggle */}
                        <button className={`pu-btn secondary ${showFilterPanel ? 'active' : ''}`} onClick={() => setShowFilterPanel(v => !v)}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                            </svg>
                            Filter
                        </button>

                        {/* Export */}
                        <button className="pu-btn secondary" onClick={exportCSV}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            Export
                        </button>

                        {/* Add User */}
                        <button className="pu-btn primary" onClick={() => { setShowModal(true); setForm(blankForm); setFormError(''); }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Add User
                        </button>
                    </div>
                </div>

                {/* Filter Panel */}
                {showFilterPanel && (
                    <div className="pu-filter-panel animate-fade-in">
                        <div className="pu-filter-group">
                            <label>Year</label>
                            <div className="pu-filter-chips">
                                {YEARS.map(y => (
                                    <button key={y} className={`pu-fchip ${filterYear === y ? 'active' : ''}`} onClick={() => { setFilterYear(y); setCurrentPage(1); }}>{y}</button>
                                ))}
                            </div>
                        </div>
                        <div className="pu-filter-group">
                            <label>Month</label>
                            <div className="pu-filter-chips">
                                {MONTH_NAMES.map(m => (
                                    <button key={m} className={`pu-fchip ${filterMonth === m ? 'active' : ''}`} onClick={() => { setFilterMonth(m); setCurrentPage(1); }}>{m}</button>
                                ))}
                            </div>
                        </div>
                        <div className="pu-filter-group">
                            <label>Status</label>
                            <div className="pu-filter-chips">
                                {['All', 'active', 'inactive', 'archived'].map(s => (
                                    <button key={s} className={`pu-fchip ${filterStatus === s ? 'active' : ''}`} onClick={() => { setFilterStatus(s); setCurrentPage(1); }}>
                                        {s === 'All' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="pu-table-card">
                    <table className="pu-table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Role</th>
                                <th>Department</th>
                                <th>Joined</th>
                                <th>Status</th>
                                <th>Access</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paged.length === 0 ? (
                                <tr><td colSpan={6} className="pu-empty">No users found.</td></tr>
                            ) : paged.map(user => (
                                <tr key={user.id} className={`${user.status === 'inactive' ? 'row-inactive' : ''} ${user.status === 'archived' ? 'row-archived' : ''}`}>
                                    <td>
                                        <div className="pu-user-cell">
                                            <div className="pu-avatar">
                                                {user.avatar ? (
                                                    <img
                                                        src={`${API_BASE_URL}/uploads/${user.avatar}`}
                                                        alt="Avatar"
                                                        className="pu-avatar-img"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.parentElement.innerText = user.name.charAt(0);
                                                        }}
                                                    />
                                                ) : (
                                                    user.name.charAt(0)
                                                )}
                                            </div>
                                            <div>
                                                <p className="pu-name">{user.name} <span style={{ opacity: 0.6, fontSize: '0.9em' }}>(@{user.username})</span></p>
                                                <p className="pu-email">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`pu-role-badge role-${(user.UserRole?.name || user.role || 'user').toLowerCase().replace(/\s+/g, '-')}`}>
                                            {user.UserRole?.name || user.role || 'User'}
                                        </span>
                                    </td>
                                    <td className="pu-dept">
                                        {user.Section?.name || user.department || '—'}
                                    </td>
                                    <td className="pu-date">{user.dateJoined || user.createdAt?.split('T')[0]}</td>
                                    <td>
                                        <div className="pu-status-container">
                                            <span className={`pu-status-badge ${user.status}`}>
                                                <span className="pu-status-dot"></span>
                                                {user.status === 'active' ? 'Active' : user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                                            </span>
                                            {activeSessions.some(session => String(session.userId) === String(user.id)) && (
                                                <span className="pulse-online-badge" title="User is currently online">
                                                    Online
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="pu-row-actions">
                                            <button
                                                className="pu-action-btn edit"
                                                onClick={() => {
                                                    setForm({
                                                        id: user.id,
                                                        name: user.name,
                                                        username: user.username || '',
                                                        email: user.email,
                                                        roleId: user.roleId || '',
                                                        department: user.department || '',
                                                        groupId: user.groupId || '',
                                                        phone: user.phone || '',
                                                        position: user.position || '',
                                                        bio: user.bio || '',
                                                        password: '' // Keep empty unless changing
                                                    });
                                                    setFormError('');
                                                    setShowModal(true);
                                                }}
                                                title="Edit user details"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                </svg>
                                            </button>
                                            {user.status === 'archived' && (
                                                <button
                                                    className="pu-action-btn restore"
                                                    onClick={() => handleUnarchiveUser(user)}
                                                    title="Restore archived user"
                                                    style={{ color: '#0ea5e9' }}
                                                >
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                                                        <path d="M21 3v5h-5" />
                                                        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                                                        <path d="M8 16H3v5" />
                                                    </svg>
                                                </button>
                                            )}
                                            {user.status !== 'archived' && (
                                                <>
                                                    <button
                                                        className="pu-action-btn archive"
                                                        onClick={() => handleArchiveUser(user)}
                                                        title="Archive user"
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                            <polyline points="21 8 21 21 3 21 3 8"></polyline>
                                                            <rect x="1" y="3" width="22" height="5"></rect>
                                                            <line x1="10" y1="12" x2="14" y2="12"></line>
                                                        </svg>
                                                    </button>
                                                    <button
                                                        className={`pu-toggle ${user.status === 'active' ? 'on' : 'off'}`}
                                                        onClick={() => toggleStatus(user.id)}
                                                        title={user.status === 'active' ? 'Disable user' : 'Enable user'}
                                                    >
                                                        <span className="pu-toggle-knob"></span>
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    paginate={setCurrentPage}
                />
            </div>

            {/* Add/Edit Personnel Modal - Refactored to Universal System */}
            {showModal && createPortal(
                <div className="modern-overlay animate-fade-in" onClick={() => setShowModal(false)}>
                    <div className="modern-modal animate-zoom-in" style={{ width: '700px' }} onClick={e => e.stopPropagation()}>
                        <div className="modern-modal-header">
                            <h3>{form.id ? 'Edit Personnel Profile' : 'Register New Personnel'}</h3>
                            <button className="close-btn-modern" onClick={() => setShowModal(false)}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>
                        <div className="modern-modal-body no-padding">
                            {formError && <div className="pu-form-error-sticky">{formError}</div>}
                            
                            <div className="pu-form-sections">
                                {/* Section 1: Basic Information */}
                                <div className="form-section">
                                    <h4 className="section-title">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                        Basic Information
                                    </h4>
                                    <div className="pu-form-grid-v2">
                                        <div className="pu-field-v2">
                                            <label>Full Name <span>*</span></label>
                                            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Maria Santos" autoComplete="off" />
                                        </div>
                                        <div className="pu-field-v2">
                                            <label>Username <span>*</span></label>
                                            <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="e.g. marias" autoComplete="off" />
                                        </div>
                                        <div className="pu-field-v2">
                                            <label>Email Address <span>*</span></label>
                                            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@itsd.com" autoComplete="off" />
                                        </div>
                                        <div className="pu-field-v2">
                                            <label>Phone Number</label>
                                            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="09XX-XXX-XXXX" autoComplete="off" />
                                        </div>
                                        <div className="pu-field-v2">
                                            <label>Date Joined</label>
                                            <input type="date" value={form.dateJoined || ''} onChange={e => setForm(f => ({ ...f, dateJoined: e.target.value }))} />
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Professional Details */}
                                <div className="form-section">
                                    <h4 className="section-title">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                                        Professional Details
                                    </h4>
                                    <div className="pu-form-grid-v2">
                                        <div className="pu-field-v2">
                                            <label>Designated Role</label>
                                            <select 
                                                value={form.roleId} 
                                                onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))}
                                                required
                                            >
                                                <option value="">Select Role...</option>
                                                {roles.map(r => (
                                                    <option key={r.id} value={r.id}>{r.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="pu-field-v2">
                                            <label>ITSD Section / Group</label>
                                            <select 
                                                value={form.groupId} 
                                                onChange={e => {
                                                    const g = groups.find(group => String(group.id) === String(e.target.value));
                                                    setForm(f => ({ 
                                                        ...f, 
                                                        groupId: e.target.value,
                                                        department: g ? g.name : f.department 
                                                    }));
                                                }}
                                            >
                                                <option value="">Select Section...</option>
                                                {groups.map(g => (
                                                    <option key={g.id} value={g.id}>{g.name}</option>
                                                ))}
                                            </select>
                                            {form.groupId && groups.find(g => String(g.id) === String(form.groupId))?.SectionHead && (
                                                <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                                    Current Section Head: <strong style={{ color: '#0f172a' }}>{groups.find(g => String(g.id) === String(form.groupId))?.SectionHead.name}</strong>
                                                </div>
                                            )}
                                        </div>
                                        <div className="pu-field-v2">
                                            <label>Legacy Department (Literal)</label>
                                            <input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="e.g. ITSD" />
                                        </div>
                                        <div className="pu-field-v2" style={{ gridColumn: 'span 2' }}>
                                            <label>Official Position</label>
                                            <input value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} placeholder="e.g. Senior Technical Staff" />
                                        </div>
                                        <div className="pu-field-v2" style={{ gridColumn: 'span 2' }}>
                                            <label>Short Biography</label>
                                            <textarea
                                                value={form.bio}
                                                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                                                placeholder="Brief introduction of the personnel and their expertise..."
                                                rows="3"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: Account Security */}
                                <div className="form-section no-border">
                                    <h4 className="section-title">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                        Account Security
                                    </h4>
                                    <div className="pu-form-grid-v2">
                                        <div className="pu-field-v2" style={{ gridColumn: 'span 2' }}>
                                            <label>Account Password {form.id ? '(Optional)' : '<span>*</span>'}</label>
                                            <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={form.id ? "Enter only if changing" : "Choose a secure password"} autoComplete="new-password" />
                                            {!form.id && <small className="field-help">User will need this password for their initial login.</small>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modern-modal-footer">
                            <button className="pu-btn-v2 secondary" style={{ flex: 'none', width: 'auto' }} onClick={() => setShowModal(false)}>Cancel</button>
                            <button className="pu-btn-v2" style={{ flex: 'none', width: 'auto', background: 'var(--primary-navy)', color: 'white' }} onClick={form.id ? () => handleUpdateUser(form.id) : handleAddUser}>
                                {form.id ? 'Save Changes' : 'Add User'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* Premium Archive Confirmation Modal - Refactored to Universal System */}
            {showConfirmArchive && createPortal(
                <div className="modern-overlay animate-fade-in" onClick={() => setShowConfirmArchive(false)}>
                    <div className="modern-modal animate-zoom-in" style={{ width: '420px' }} onClick={e => e.stopPropagation()}>
                        <div className="modern-modal-header" style={{ border: 'none', paddingBottom: 0 }}>
                            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingTop: '10px' }}>
                                <div className="pu-icon-glow-red">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                        <line x1="12" y1="9" x2="12" y2="13"></line>
                                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="modern-modal-body" style={{ textAlign: 'center', paddingTop: '10px' }}>
                            <div className="pu-modal-content-modern">
                                <h3 style={{ margin: '0 0 12px' }}>Archive Personnel?</h3>
                                <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Are you sure you want to archive <strong>{userToArchive?.name}</strong>?</p>
                                <div className="pu-warn-box">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
                                    </svg>
                                    <span>User will lose system access, but records remain.</span>
                                </div>
                            </div>
                        </div>

                        <div className="modern-modal-footer">
                            <button className="pu-btn-v2 secondary" onClick={() => setShowConfirmArchive(false)}>Keep Active</button>
                            <button className="pu-btn-v2 danger" onClick={executeArchive}>Archive User</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* Premium Unarchive Confirmation Modal */}
            {showConfirmUnarchive && createPortal(
                <div className="modern-overlay animate-fade-in" onClick={() => setShowConfirmUnarchive(false)}>
                    <div className="modern-modal animate-zoom-in" style={{ width: '420px' }} onClick={e => e.stopPropagation()}>
                        <div className="modern-modal-header" style={{ border: 'none', paddingBottom: 0 }}>
                            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingTop: '10px' }}>
                                <div className="pu-icon-glow-blue" style={{ background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', width: '56px', height: '56px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                                        <path d="M21 3v5h-5" />
                                        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                                        <path d="M8 16H3v5" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="modern-modal-body" style={{ textAlign: 'center', paddingTop: '10px' }}>
                            <div className="pu-modal-content-modern">
                                <h3 style={{ margin: '0 0 12px' }}>Restore Personnel?</h3>
                                <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Are you sure you want to unarchive <strong>{userToUnarchive?.name}</strong>?</p>
                                <div className="pu-warn-box" style={{ background: 'rgba(14, 165, 233, 0.05)', color: '#0369a1', borderColor: 'rgba(14, 165, 233, 0.2)', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginTop: '15px' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <circle cx="12" cy="12" r="10"></circle><path d="M12 16V12"></path><path d="M12 8h.01"></path>
                                    </svg>
                                    <span>Account status will be set to Inactive. You can re-enable it manually.</span>
                                </div>
                            </div>
                        </div>

                        <div className="modern-modal-footer">
                            <button className="pu-btn-v2 secondary" onClick={() => setShowConfirmUnarchive(false)}>Cancel</button>
                            <button className="pu-btn-v2" style={{ background: '#112d42', color: 'white' }} onClick={executeUnarchive}>Unarchive User</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* Premium Deactivation Confirmation Modal */}
            {showConfirmDeactivate && createPortal(
                <div className="modern-overlay animate-fade-in" onClick={() => setShowConfirmDeactivate(false)}>
                    <div className="modern-modal animate-zoom-in" style={{ width: '420px' }} onClick={e => e.stopPropagation()}>
                        <div className="modern-modal-header" style={{ border: 'none', paddingBottom: 0 }}>
                            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', paddingTop: '10px' }}>
                                <div className="pu-icon-glow-red" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', animation: 'none' }}>
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                        <line x1="12" y1="9" x2="12" y2="13"></line>
                                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="modern-modal-body" style={{ textAlign: 'center', paddingTop: '10px' }}>
                            <div className="pu-modal-content-modern">
                                <h3 style={{ margin: '0 0 12px' }}>Deactivate Personnel?</h3>
                                <p style={{ color: '#64748b', fontSize: '0.95rem' }}>Are you sure you want to deactivate <strong>{userToDeactivate?.name}</strong>?</p>
                                <div className="pu-warn-box" style={{ background: 'rgba(245, 158, 11, 0.05)', color: '#b45309', borderColor: 'rgba(245, 158, 11, 0.2)' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <circle cx="12" cy="12" r="10"></circle><path d="M12 16V12"></path><path d="M12 8h.01"></path>
                                    </svg>
                                    <span>User will lose system access until re-enabled.</span>
                                </div>
                            </div>
                        </div>

                        <div className="modern-modal-footer">
                            <button className="pu-btn-v2 secondary" onClick={() => setShowConfirmDeactivate(false)}>Cancel</button>
                            <button className="pu-btn-v2" style={{ background: '#f59e0b', color: 'white' }} onClick={executeDeactivate}>Deactivate User</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </AdminLayout>
    );
};

export default AdminUsers;
