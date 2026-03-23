import React, { useState, useEffect } from 'react';
import UserLayout from '../../layouts/UserLayout';
import AdminLayout from '../../layouts/AdminLayout';
import './Profile.css';

const UserProfile = ({ role = 'USER' }) => {
    const is_admin = role && role.toUpperCase() === 'ADMIN';
    const storageKey = is_admin ? 'itsd_admin_profile' : 'itsd_user_profile';
    const Layout = is_admin ? AdminLayout : UserLayout;

    const [profile, setProfile] = useState(() => {
        const saved = sessionStorage.getItem(storageKey);
        if (saved) return JSON.parse(saved);

        return is_admin ? {
            fullName: 'Executive Administrator',
            email: 'admin@valencia.gov.ph',
            phone: '09XX-XXX-XXXX',
            department: 'Executive Office',
            position: 'System Administrator',
            bio: 'Head of Executive Control & Systems Oversight.'
        } : {
            fullName: 'Public User',
            email: 'user@valencia.gov.ph',
            phone: '0912-345-6789',
            department: 'Information Technology Services Division',
            position: 'Technical Staff',
            bio: 'Dedicated public servant at ITSD Valencia City.'
        };
    });

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ ...profile });
    const [savedMsg, setSavedMsg] = useState('');

    const handleSave = () => {
        setProfile(formData);
        sessionStorage.setItem(storageKey, JSON.stringify(formData));

        // Sync with global header session storage
        const currentSession = sessionStorage.getItem('itsd_user');
        if (currentSession) {
            const sessionObj = JSON.parse(currentSession);
            sessionObj.name = formData.fullName; // Sync name
            sessionStorage.setItem('itsd_user', JSON.stringify(sessionObj));
            
            // Trigger storage event for other components in same tab
            window.dispatchEvent(new Event('storage'));
        }

        setIsEditing(false);
        setSavedMsg('Profile updated successfully!');
        setTimeout(() => setSavedMsg(''), 3000);
    };

    return (
        <Layout title={null}>
            <div className="profile-page-container animate-fade-in">
                <div className="profile-header-card">
                    <div className="profile-cover"></div>
                    <div className="profile-info-main">
                        <div className="profile-avatar-large">
                            {profile.fullName.charAt(0)}
                            <div className="online-indicator"></div>
                        </div>
                        <div className="profile-text-details">
                            {isEditing ? (
                                <input
                                    type="text"
                                    className="header-name-input"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    autoFocus
                                />
                            ) : (
                                <h2>{profile.fullName}</h2>
                            )}
                            <p className="role-dept">{profile.position} • {profile.department}</p>
                            <p className="bio-snippet">{profile.bio}</p>
                        </div>
                        <button
                            className={`edit-profile-btn ${isEditing ? 'cancel' : ''}`}
                            onClick={() => {
                                if (isEditing) setFormData({ ...profile });
                                setIsEditing(!isEditing);
                            }}
                        >
                            {isEditing ? 'Cancel' : 'Edit Profile'}
                        </button>
                    </div>
                </div>

                <div className="profile-content-grid">
                    <div className="profile-details-card">
                        <div className="card-header">
                            <h3>Personal Information</h3>
                            {savedMsg && <span className="save-success-msg">{savedMsg}</span>}
                        </div>

                        <div className="profile-form-modern">
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Full Name</label>
                                    <input
                                        type="text"
                                        readOnly={!isEditing}
                                        className={!isEditing ? 'readonly' : ''}
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email Address</label>
                                    <input
                                        type="email"
                                        readOnly={!isEditing}
                                        className={!isEditing ? 'readonly' : ''}
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Phone Number</label>
                                    <input
                                        type="text"
                                        readOnly={!isEditing}
                                        className={!isEditing ? 'readonly' : ''}
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Department</label>
                                    <input
                                        type="text"
                                        readOnly={!isEditing}
                                        className={!isEditing ? 'readonly' : ''}
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group full">
                                    <label>Position</label>
                                    <input
                                        type="text"
                                        readOnly={!isEditing}
                                        className={!isEditing ? 'readonly' : ''}
                                        value={formData.position}
                                        onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                                    />
                                </div>
                            </div>

                            {isEditing && (
                                <div className="form-actions">
                                    <button className="save-profile-btn" onClick={handleSave}>
                                        Save Changes
                                    </button>
                                </div>
                            )}

                            <div className="profile-inline-stats">
                                <div className="inline-stat-item">
                                    <span className="label">ACCOUNT STATUS</span>
                                    <span className="value status-active">ACTIVE / VERIFIED</span>
                                </div>
                                <div className="inline-stat-item">
                                    <span className="label">MEMBER SINCE</span>
                                    <span className="value">Jan 2026</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default UserProfile;
