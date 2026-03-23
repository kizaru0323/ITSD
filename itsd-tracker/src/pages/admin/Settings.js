import React, { useState } from 'react';
import AdminLayout from '../../layouts/AdminLayout';

const Settings = () => {
    const [activeTab, setActiveTab] = useState('profile');

    // Profile state
    const [profile, setProfile] = useState(() => {
        const saved = sessionStorage.getItem('itsd_admin_profile');
        return saved ? JSON.parse(saved) : {
            fullName: 'Harold G. Tulod',
            email: 'admin@itsd.gov.ph',
            phone: '09XX-XXX-XXXX',
            department: 'ITSD',
            position: 'Administrator',
        };
    });
    const [isEditingBannerName, setIsEditingBannerName] = useState(false);
    const [bannerName, setBannerName] = useState(profile.fullName);

    // Security state
    const [security, setSecurity] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    // Notifications state
    const [notifications, setNotifications] = useState({
        emailOnNewRecord: true,
        emailOnStatusChange: true,
        emailOnAssigned: false,
        browserNotifications: true,
    });

    // System state
    const [system, setSystem] = useState({
        recordsPerPage: '10',
        dateFormat: 'MMMM DD, YYYY',
        timezone: 'Asia/Manila',
        language: 'English',
    });

    const [savedMsg, setSavedMsg] = useState('');

    const showSaved = () => {
        // Sync with global session
        const currentUser = JSON.parse(sessionStorage.getItem('itsd_current_user') || '{}');
        currentUser.name = profile.fullName;
        sessionStorage.setItem('itsd_current_user', JSON.stringify(currentUser));
        sessionStorage.setItem('itsd_session_admin', JSON.stringify(currentUser));
        sessionStorage.setItem('itsd_admin_profile', JSON.stringify(profile));
        
        window.dispatchEvent(new Event('storage'));
        setSavedMsg('Changes saved successfully!');
        setTimeout(() => setSavedMsg(''), 3000);
    };

    const handleSaveBannerName = () => {
        const updatedProfile = { ...profile, fullName: bannerName };
        setProfile(updatedProfile);
        setIsEditingBannerName(false);
        
        // Instant sync for banner edit
        const currentUser = JSON.parse(sessionStorage.getItem('itsd_current_user') || '{}');
        currentUser.name = bannerName;
        sessionStorage.setItem('itsd_current_user', JSON.stringify(currentUser));
        sessionStorage.setItem('itsd_session_admin', JSON.stringify(currentUser));
        sessionStorage.setItem('itsd_admin_profile', JSON.stringify(updatedProfile));
        
        window.dispatchEvent(new Event('storage'));
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
            id: 'notifications',
            label: 'Notifications',
            icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
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
    ];

    return (
        <AdminLayout
            title="Settings"
            subtitle="Manage your profile and system preferences"
        >
            <div className="settings-page">

                {/* Tabs */}
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

                {/* Cards */}
                <div className="settings-card">

                    {/* ── PROFILE ── */}
                    {activeTab === 'profile' && (
                        <>
                            <div className="settings-card-header">
                                <h3>Profile Information</h3>
                                <p>Update your personal details and display information.</p>
                            </div>

                            {/* Avatar */}
                            <div className="settings-avatar-row">
                                <div className="settings-avatar">{profile.fullName.substring(0, 2).toUpperCase()}</div>
                                <div>
                                    {isEditingBannerName ? (
                                        <div className="banner-name-edit-group">
                                            <input
                                                className="banner-name-input"
                                                value={bannerName}
                                                onChange={e => setBannerName(e.target.value)}
                                                autoFocus
                                                onKeyDown={e => e.key === 'Enter' && handleSaveBannerName()}
                                            />
                                            <button className="banner-name-save" onClick={handleSaveBannerName}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="settings-avatar-name" onClick={() => { setBannerName(profile.fullName); setIsEditingBannerName(true); }}>
                                            {profile.fullName}
                                            <svg className="edit-icon-inline" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg>
                                        </p>
                                    )}
                                    <p className="settings-avatar-role">{profile.position} · {profile.department}</p>
                                </div>
                            </div>

                            <div className="settings-form">
                                <div className="settings-form-row">
                                    <div className="settings-form-group">
                                        <label>Full Name</label>
                                        <input
                                            className="settings-input"
                                            value={profile.fullName}
                                            onChange={e => setProfile({ ...profile, fullName: e.target.value })}
                                        />
                                    </div>
                                    <div className="settings-form-group">
                                        <label>Email Address</label>
                                        <input
                                            className="settings-input"
                                            type="email"
                                            value={profile.email}
                                            onChange={e => setProfile({ ...profile, email: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="settings-form-row">
                                    <div className="settings-form-group">
                                        <label>Phone Number</label>
                                        <input
                                            className="settings-input"
                                            placeholder="e.g. 09XX-XXX-XXXX"
                                            value={profile.phone}
                                            onChange={e => setProfile({ ...profile, phone: e.target.value })}
                                        />
                                    </div>
                                    <div className="settings-form-group">
                                        <label>Department</label>
                                        <input
                                            className="settings-input"
                                            value={profile.department}
                                            onChange={e => setProfile({ ...profile, department: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="settings-form-row">
                                    <div className="settings-form-group">
                                        <label>Position / Role</label>
                                        <input
                                            className="settings-input"
                                            value={profile.position}
                                            onChange={e => setProfile({ ...profile, position: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── SECURITY ── */}
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
                                <div className="settings-password-hint">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                                    </svg>
                                    Password must be at least 8 characters and include a number and a special character.
                                </div>
                            </div>
                        </>
                    )}

                    {/* ── NOTIFICATIONS ── */}
                    {activeTab === 'notifications' && (
                        <>
                            <div className="settings-card-header">
                                <h3>Notification Preferences</h3>
                                <p>Choose which events trigger email or browser notifications.</p>
                            </div>
                            <div className="settings-toggles">
                                {[
                                    { key: 'emailOnNewRecord', label: 'Email on new ticket submitted', desc: 'Receive an email whenever a new ticket record is added.' },
                                    { key: 'emailOnStatusChange', label: 'Email on status change', desc: 'Get notified when a record status is updated.' },
                                    { key: 'emailOnAssigned', label: 'Email when assigned to a record', desc: 'Notify me when I am assigned to a record.' },
                                    { key: 'browserNotifications', label: 'Browser notifications', desc: 'Show in-browser alerts for real-time updates.' },
                                ].map(item => (
                                    <div key={item.key} className="settings-toggle-row">
                                        <div className="settings-toggle-text">
                                            <span className="settings-toggle-label">{item.label}</span>
                                            <span className="settings-toggle-desc">{item.desc}</span>
                                        </div>
                                        <button
                                            className={`settings-toggle-btn ${notifications[item.key] ? 'on' : 'off'}`}
                                            onClick={() => setNotifications({ ...notifications, [item.key]: !notifications[item.key] })}
                                            aria-checked={notifications[item.key]}
                                            role="switch"
                                        >
                                            <span className="settings-toggle-thumb" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* ── SYSTEM ── */}
                    {activeTab === 'system' && (
                        <>
                            <div className="settings-card-header">
                                <h3>System Preferences</h3>
                                <p>Configure display and regional settings for the application.</p>
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
                            </div>
                        </>
                    )}

                    {/* Footer */}
                    <div className="settings-card-footer">
                        {savedMsg && <span className="settings-saved-msg">{savedMsg}</span>}
                        <button className="settings-btn-save" onClick={showSaved}>
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Settings;
