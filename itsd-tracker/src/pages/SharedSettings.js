import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import AdminLayout from '../layouts/AdminLayout';
import UserLayout from '../layouts/UserLayout';
import { API_BASE_URL } from '../apiConfig';
import './user/Settings.css';

const SharedSettings = ({ role = 'USER' }) => {
    const is_admin = role && role.toUpperCase() === 'ADMIN';
    const Layout = is_admin ? AdminLayout : UserLayout;

    const [activeTab, setActiveTab] = useState('profile');
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [backupProfile, setBackupProfile] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const fileInputRef = useRef(null);
    const [showImageModal, setShowImageModal] = useState(false);

    const handleAvatarClick = () => {
        if (isEditingProfile) {
            fileInputRef.current.click();
        } else if (profile.avatar || previewUrl) {
            setShowImageModal(true);
        }
    };

    // Profile state
    const [profile, setProfile] = useState(() => {
        const saved = sessionStorage.getItem('itsd_user');
        if (saved) {
            const user = JSON.parse(saved);
            return {
                id: user.id || null,
                fullName: user.name || (is_admin ? 'Superuser' : 'Public User'),
                email: user.email || (is_admin ? 'admin@valencia.gov.ph' : 'user@valencia.gov.ph'),
                phone: user.phone || '',
                department: user.department || (is_admin ? 'Executive Office' : 'ITSD'),
                position: user.position || (is_admin ? 'System Administrator' : 'Technical Staff'),
                bio: user.bio || '',
                avatar: user.avatar || '',
            };
        }
        return is_admin ? {
            id: null,
            fullName: 'Superuser',
            email: 'admin@valencia.gov.ph',
            phone: '',
            department: 'Executive Office',
            position: 'System Administrator',
        } : {
            id: null,
            fullName: 'Public User',
            email: 'user@valencia.gov.ph',
            phone: '',
            department: 'ITSD',
            position: 'Technical Staff',
            bio: '',
            avatar: '',
        };
    });

    // Security state
    const [security, setSecurity] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });


    const [system, setSystem] = useState({
        recordsPerPage: '10',
        dateFormat: 'MMMM DD, YYYY',
        timezone: 'Asia/Manila',
        language: 'English',
    });

    // RBAC state
    const [roles, setRoles] = useState([]);
    const [allPermissions, setAllPermissions] = useState([]);
    const [isSavingRBAC, setIsSavingRBAC] = useState(false);
    const [selectedRole, setSelectedRole] = useState(null);

    const [savedMsg, setSavedMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        const fetchUserData = async () => {
            if (!profile.id) return;
            try {
                const token = sessionStorage.getItem('itsd_auth_token');
                const response = await fetch(`${API_BASE_URL}/api/users/${profile.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    const updated = {
                        id: data.id,
                        fullName: data.name,
                        email: data.email,
                        phone: data.phone || '',
                        department: data.department || '',
                        position: data.position || '',
                        bio: data.bio || '',
                        avatar: data.avatar || '',
                    };
                    setProfile(updated);

                    // Sync to specific session
                    const current = JSON.parse(sessionStorage.getItem('itsd_user') || '{}');
                    sessionStorage.setItem('itsd_user', JSON.stringify({
                        ...current,
                        ...updated,
                        name: updated.fullName
                    }));
                }
            } catch (error) {
                console.error('Error fetching settings info:', error);
            }
        };
        fetchUserData();
    }, [profile.id, is_admin]);

    // Fetch RBAC data
    useEffect(() => {
        if (is_admin && (activeTab === 'roles' || activeTab === 'permissions')) {
            fetchRBACData();
        }
    }, [is_admin, activeTab]);

    const fetchRBACData = async () => {
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const headers = { 'Authorization': `Bearer ${token}` };
            const [rolesRes, permRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/roles`, { headers }),
                fetch(`${API_BASE_URL}/api/permissions`, { headers })
            ]);
            const rolesData = await rolesRes.json();
            const permData = await permRes.json();
            setRoles(Array.isArray(rolesData) ? rolesData : []);
            setAllPermissions(Array.isArray(permData) ? permData : []);
        } catch (error) {
            console.error('Error fetching RBAC data:', error);
            setRoles([]);
            setAllPermissions([]);
        }
    };

    const handleSaveRolePermissions = async (roleId, permissionIds) => {
        try {
            setIsSavingRBAC(true);
            const token = sessionStorage.getItem('itsd_auth_token');
            const response = await fetch(`${API_BASE_URL}/api/roles/${roleId}/permissions`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ permissionIds })
            });
            if (response.ok) {
                setSavedMsg('Permissions updated successfully');
                setTimeout(() => setSavedMsg(''), 3000);
                fetchRBACData();
            }
        } catch (error) {
            console.error('Error saving permissions:', error);
        } finally {
            setIsSavingRBAC(false);
        }
    };

    const handleDeleteRole = async (roleId) => {
        if (!window.confirm('Are you sure you want to delete this role?')) return;
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const response = await fetch(`${API_BASE_URL}/api/roles/${roleId}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                fetchRBACData();
            } else {
                const data = await response.json();
                setErrorMsg(data.error || 'Failed to delete role');
                setTimeout(() => setErrorMsg(''), 3000);
            }
        } catch (error) {
            console.error('Error deleting role:', error);
        }
    };

    const showSaved = async () => {
        setErrorMsg('');
        try {
            const formData = new FormData();
            formData.append('name', profile.fullName);
            formData.append('email', profile.email);
            formData.append('phone', profile.phone);
            formData.append('department', profile.department);
            formData.append('position', profile.position);
            formData.append('bio', profile.bio);

            if (selectedFile) {
                formData.append('avatar', selectedFile);
            }

            const token = sessionStorage.getItem('itsd_auth_token');
            const response = await fetch(`${API_BASE_URL}/api/users/${profile.id}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update settings');
            }

            const updatedData = await response.json();

            // Sync back to specific session
            const currentSession = JSON.parse(sessionStorage.getItem('itsd_user') || '{}');
            sessionStorage.setItem('itsd_user', JSON.stringify({
                ...currentSession,
                name: updatedData.name,
                email: updatedData.email,
                department: updatedData.department,
                phone: updatedData.phone,
                position: updatedData.position,
                bio: updatedData.bio,
                avatar: updatedData.avatar
            }));

            setProfile(prev => ({ ...prev, avatar: updatedData.avatar }));
            setSelectedFile(null);
            setPreviewUrl(null);
            setSavedMsg('Changes saved successfully!');
            setTimeout(() => setSavedMsg(''), 3000);
            // Dispatch event to notify header (now session-scoped)
            window.dispatchEvent(new Event('storage'));
        } catch (error) {
            setErrorMsg(error.message);
        }
    };


    const handleSaveSecurity = async () => {
        setErrorMsg('');
        setSavedMsg('');

        if (!security.currentPassword || !security.newPassword || !security.confirmPassword) {
            setErrorMsg('All password fields are required');
            return;
        }

        if (security.newPassword !== security.confirmPassword) {
            setErrorMsg('New passwords do not match');
            return;
        }

        if (security.newPassword.length < 6) {
            setErrorMsg('New password must be at least 6 characters');
            return;
        }

        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const response = await fetch(`${API_BASE_URL}/api/users/${profile.id}/change-password`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    currentPassword: security.currentPassword,
                    newPassword: security.newPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update password');
            }

            setSavedMsg('Password updated successfully!');
            setSecurity({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            });
            setTimeout(() => setSavedMsg(''), 3000);
        } catch (error) {
            setErrorMsg(error.message);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveProfile = async () => {
        await showSaved();
        setIsEditingProfile(false);
    };

    const handleCancelProfile = () => {
        if (backupProfile) {
            setProfile(backupProfile);
        }
        setSelectedFile(null);
        setPreviewUrl(null);
        setIsEditingProfile(false);
    };

    const tabs = [
        {
            id: 'profile',
            label: 'Profile',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                </svg>
            ),
        },
        {
            id: 'security',
            label: 'Security',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
            ),
        },
        {
            id: 'system',
            label: 'System',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
            ),
        },
        ...(is_admin ? [
            {
                id: 'roles',
                label: 'Roles',
                icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
                    </svg>
                ),
            },
            {
                id: 'permissions',
                label: 'Permissions',
                icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                ),
            },
        ] : []),
    ];

    return (
        <Layout title={null}>
            <div className={`settings-page-container animate-fade-in ${is_admin ? 'admin-theme' : ''}`}>
                <div className="settings-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => { setActiveTab(tab.id); setSavedMsg(''); }}
                        >
                            <span className="settings-tab-icon">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="settings-card">
                    {activeTab === 'profile' && (
                        <>
                            <div className="settings-card-header profile-header-flex">
                                <div>
                                    <h3>Profile Information</h3>
                                    <p>Update your personal details and display information.</p>
                                </div>
                                {!isEditingProfile && (
                                    <button
                                        className="edit-toggle-btn"
                                        onClick={() => {
                                            setBackupProfile({ ...profile });
                                            setIsEditingProfile(true);
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                        Edit Profile
                                    </button>
                                )}
                            </div>

                            <div className="settings-avatar-header">
                                <div className="settings-cover"></div>
                                <div className="settings-avatar-row">
                                    <div
                                        className={`settings-avatar ${isEditingProfile ? 'editable' : (profile.avatar || previewUrl ? 'viewable' : '')}`}
                                        onClick={handleAvatarClick}
                                    >
                                        {previewUrl ? (
                                            <img src={previewUrl} alt="Preview" className="avatar-img" />
                                        ) : profile.avatar ? (
                                            <img src={`${API_BASE_URL}/uploads/${profile.avatar}`} alt="Avatar" className="avatar-img" />
                                        ) : (
                                            profile.fullName ? profile.fullName.charAt(0) : (is_admin ? 'AD' : 'US')
                                        )}
                                        {isEditingProfile && (
                                            <div className="avatar-overlay">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                                                    <circle cx="12" cy="13" r="4" />
                                                </svg>
                                            </div>
                                        )}
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            style={{ display: 'none' }}
                                            accept="image/*"
                                            onChange={handleFileChange}
                                        />
                                    </div>
                                    <div className="settings-avatar-text">
                                        {isEditingProfile ? (
                                            <input
                                                className="settings-input banner-name-input-unified"
                                                value={profile.fullName}
                                                onChange={e => setProfile({ ...profile, fullName: e.target.value })}
                                                placeholder="Enter full name"
                                            />
                                        ) : (
                                            <p className="settings-avatar-name">{profile.fullName}</p>
                                        )}
                                        <p className="settings-avatar-role">{profile.position} · {profile.department}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="settings-form compact-layout">
                                {/* Section 1: Contact Details */}
                                <div className="settings-section">
                                    <h4 className="settings-section-title">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                        Contact Details
                                    </h4>
                                    <div className="settings-form-row two-col">
                                        <div className="settings-form-group">
                                            <label>Email Address</label>
                                            {isEditingProfile ? (
                                                <input
                                                    className="settings-input"
                                                    type="email"
                                                    value={profile.email}
                                                    onChange={e => setProfile({ ...profile, email: e.target.value })}
                                                />
                                            ) : (
                                                <p className="settings-value-display">{profile.email}</p>
                                            )}
                                        </div>
                                        <div className="settings-form-group">
                                            <label>Phone Number</label>
                                            {isEditingProfile ? (
                                                <input
                                                    className="settings-input"
                                                    placeholder="09XX-XXX-XXXX"
                                                    value={profile.phone}
                                                    onChange={e => setProfile({ ...profile, phone: e.target.value })}
                                                />
                                            ) : (
                                                <p className="settings-value-display">{profile.phone || 'N/A'}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Professional Info */}
                                <div className="settings-section">
                                    <h4 className="settings-section-title">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                                        Professional Information
                                    </h4>
                                    <div className="settings-form-row two-col">
                                        <div className="settings-form-group">
                                            <label>Department</label>
                                            {isEditingProfile ? (
                                                <input
                                                    className="settings-input"
                                                    value={profile.department}
                                                    onChange={e => setProfile({ ...profile, department: e.target.value })}
                                                />
                                            ) : (
                                                <p className="settings-value-display">{profile.department || 'N/A'}</p>
                                            )}
                                        </div>
                                        <div className="settings-form-group">
                                            <label>Job Position</label>
                                            {isEditingProfile ? (
                                                <input
                                                    className="settings-input"
                                                    value={profile.position}
                                                    onChange={e => setProfile({ ...profile, position: e.target.value })}
                                                />
                                            ) : (
                                                <p className="settings-value-display">{profile.position || 'N/A'}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: Biography */}
                                <div className="settings-section last">
                                    <h4 className="settings-section-title">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                        About Me
                                    </h4>
                                    <div className="settings-form-row">
                                        <div className="settings-form-group full">
                                            {isEditingProfile ? (
                                                <textarea
                                                    className="settings-input"
                                                    value={profile.bio}
                                                    onChange={e => setProfile({ ...profile, bio: e.target.value })}
                                                    placeholder="Tell us something about yourself..."
                                                    rows="3"
                                                />
                                            ) : (
                                                <p className="settings-value-display bio">
                                                    {profile.bio || 'Provide a short biography to let others know you better.'}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'security' && (
                        <>
                            <div className="settings-card-header">
                                <h3>Account Security</h3>
                                <p>Change your password to keep your account protected.</p>
                            </div>
                            <div className="settings-form">
                                <div className="settings-form-group full">
                                    <label>Current Password</label>
                                    <input
                                        className="settings-input"
                                        type="password"
                                        placeholder="Enter current password"
                                        value={security.currentPassword}
                                        onChange={e => setSecurity({ ...security, currentPassword: e.target.value })}
                                    />
                                </div>
                                <div className="settings-form-row">
                                    <div className="settings-form-group">
                                        <label>New Password</label>
                                        <input
                                            className="settings-input"
                                            type="password"
                                            placeholder="Enter new password"
                                            value={security.newPassword}
                                            onChange={e => setSecurity({ ...security, newPassword: e.target.value })}
                                        />
                                    </div>
                                    <div className="settings-form-group">
                                        <label>Confirm New Password</label>
                                        <input
                                            className="settings-input"
                                            type="password"
                                            placeholder="Confirm new password"
                                            value={security.confirmPassword}
                                            onChange={e => setSecurity({ ...security, confirmPassword: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}


                    {activeTab === 'system' && (
                        <>
                            <div className="settings-card-header">
                                <h3>System Preferences</h3>
                                <p>{is_admin ? 'Configure global system settings.' : 'Configure your display preferences.'}</p>
                            </div>
                            <div className="settings-form">
                                <div className="settings-form-row">
                                    <div className="settings-form-group">
                                        <label>Records Per Page</label>
                                        <select
                                            className="settings-input"
                                            value={system.recordsPerPage}
                                            onChange={e => setSystem({ ...system, recordsPerPage: e.target.value })}
                                        >
                                            <option value="5">5</option>
                                            <option value="10">10</option>
                                            <option value="20">20</option>
                                            <option value="50">50</option>
                                        </select>
                                    </div>
                                    <div className="settings-form-group">
                                        <label>Date Format</label>
                                        <select
                                            className="settings-input"
                                            value={system.dateFormat}
                                            onChange={e => setSystem({ ...system, dateFormat: e.target.value })}
                                        >
                                            <option value="MMMM DD, YYYY">December 28, 2025</option>
                                            <option value="MM/DD/YYYY">12/28/2025</option>
                                            <option value="DD/MM/YYYY">28/12/2025</option>
                                            <option value="YYYY-MM-DD">2025-12-28</option>
                                        </select>
                                    </div>
                                </div>
                                {is_admin && (
                                    <div className="settings-form-row">
                                        <div className="settings-form-group">
                                            <label>Timezone</label>
                                            <select
                                                className="settings-input"
                                                value={system.timezone}
                                                onChange={e => setSystem({ ...system, timezone: e.target.value })}
                                            >
                                                <option value="Asia/Manila">Asia/Manila (PHT, UTC+8)</option>
                                                <option value="UTC">UTC</option>
                                            </select>
                                        </div>
                                        <div className="settings-form-group">
                                            <label>Language</label>
                                            <select
                                                className="settings-input"
                                                value={system.language}
                                                onChange={e => setSystem({ ...system, language: e.target.value })}
                                            >
                                                <option value="English">English</option>
                                                <option value="Filipino">Filipino</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {is_admin && activeTab === 'roles' && (
                        <div className="rbac-settings-container">
                            <div className="settings-card-header">
                                <h3>Manage Roles</h3>
                                <p>Create and edit system roles, and assign their permissions.</p>
                            </div>
                            <div className="roles-management-layout">
                                <div className="roles-list-sidebar">
                                    {(roles || []).map(role => (
                                        <div
                                            key={role.id}
                                            className={`role-item-mini ${selectedRole?.id === role.id ? 'active' : ''}`}
                                            onClick={() => setSelectedRole(role)}
                                        >
                                            <div className="role-info">
                                                <h4>{role.name}</h4>
                                                <p>{role.Permissions?.length || 0} permissions</p>
                                            </div>
                                            <button className="role-delete-subtle" onClick={(e) => { e.stopPropagation(); handleDeleteRole(role.id); }}>
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                    <button className="add-role-btn-subtle" onClick={() => {
                                        const name = window.prompt('Enter new role name:');
                                        if (name) {
                                            const token = sessionStorage.getItem('itsd_auth_token');
                                            fetch(`${API_BASE_URL}/api/roles`, {
                                                method: 'POST',
                                                headers: { 
                                                    'Content-Type': 'application/json',
                                                    'Authorization': `Bearer ${token}`
                                                },
                                                body: JSON.stringify({ name, description: '' })
                                            }).then(() => fetchRBACData());
                                        }
                                    }}>
                                        + Add New Role
                                    </button>
                                </div>
                                <div className="role-permissions-editor">
                                    {selectedRole ? (
                                        <>
                                            <div className="editor-header">
                                                <h4>Permissions for {selectedRole.name}</h4>
                                                <button
                                                    className="save-rbac-btn"
                                                    disabled={isSavingRBAC}
                                                    onClick={() => {
                                                        const checkboxes = document.querySelectorAll('.permission-checkbox:checked');
                                                        const ids = Array.from(checkboxes).map(cb => parseInt(cb.value));
                                                        handleSaveRolePermissions(selectedRole.id, ids);
                                                    }}
                                                >
                                                    {isSavingRBAC ? 'Saving...' : 'Save Changes'}
                                                </button>
                                            </div>
                                            <div className="permissions-grid-scroll">
                                                {(allPermissions || []).map(perm => (
                                                    <label key={perm.id} className="permission-checkbox-item">
                                                        <input
                                                            type="checkbox"
                                                            className="permission-checkbox"
                                                            value={perm.id}
                                                            defaultChecked={selectedRole.Permissions?.some(p => p.id === perm.id)}
                                                        />
                                                        <div className="perm-info">
                                                            <span className="perm-name">{perm.name}</span>
                                                            <span className="perm-slug">{perm.slug}</span>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="select-role-placeholder">
                                            <p>Select a role from the left to manage its permissions.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {is_admin && activeTab === 'permissions' && (
                        <div className="rbac-settings-container">
                            <div className="settings-card-header">
                                <h3>System Permissions</h3>
                                <p>View and manage granular system permissions available for role assignment.</p>
                            </div>
                            <div className="permissions-table-container">
                                <table className="rbac-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Slug</th>
                                            <th>Category</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(allPermissions || []).map(perm => (
                                            <tr key={perm.id}>
                                                <td>{perm.name}</td>
                                                <td><code>{perm.slug}</code></td>
                                                <td>{perm.category}</td>
                                                <td>
                                                    <button className="rbac-delete-btn" onClick={() => {
                                                        if (window.confirm('Delete this permission?')) {
                                                            const token = sessionStorage.getItem('itsd_auth_token');
                                                            fetch(`${API_BASE_URL}/api/permissions/${perm.id}`, { 
                                                                method: 'DELETE',
                                                                headers: { 'Authorization': `Bearer ${token}` }
                                                            })
                                                                .then(() => fetchRBACData());
                                                        }
                                                    }}>Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <button className="add-perm-btn-large" onClick={() => {
                                    const name = window.prompt('Permission Name:');
                                    const slug = window.prompt('Permission Slug:');
                                    if (name && slug) {
                                        const token = sessionStorage.getItem('itsd_auth_token');
                                        fetch(`${API_BASE_URL}/api/permissions`, {
                                            method: 'POST',
                                            headers: { 
                                                'Content-Type': 'application/json',
                                                'Authorization': `Bearer ${token}`
                                            },
                                            body: JSON.stringify({ name, slug, category: 'System' })
                                        }).then(() => fetchRBACData());
                                    }
                                }}>+ Add New Permission</button>
                            </div>
                        </div>
                    )}

                    <div className="settings-card-footer">
                        {savedMsg && <span className="settings-saved-msg">{savedMsg}</span>}
                        {errorMsg && <span className="settings-error-msg">{errorMsg}</span>}

                        {activeTab === 'profile' ? (
                            isEditingProfile && (
                                <div className="settings-footer-actions">
                                    <button className="settings-btn-cancel" onClick={handleCancelProfile}>Cancel</button>
                                    <button className="settings-btn-save" onClick={handleSaveProfile}>Save Changes</button>
                                </div>
                            )
                        ) : activeTab === 'security' ? (
                            <button className="settings-btn-save" onClick={handleSaveSecurity}>
                                Update Password
                            </button>
                        ) : (
                            <button className="settings-btn-save" onClick={showSaved}>
                                Save Changes
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Image Viewer Modal */}
            {showImageModal && createPortal(
                <div className="modern-overlay animate-fade-in" onClick={() => setShowImageModal(false)}>
                    <div className="image-viewer-content" onClick={e => e.stopPropagation()}>
                        <button className="image-viewer-close" onClick={() => setShowImageModal(false)}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                        <img
                            src={previewUrl || `${API_BASE_URL}/uploads/${profile.avatar}`}
                            alt="Full Profile"
                            className="full-avatar-image"
                        />
                    </div>
                </div>,
                document.body
            )}
        </Layout>
    );
};

export default SharedSettings;
