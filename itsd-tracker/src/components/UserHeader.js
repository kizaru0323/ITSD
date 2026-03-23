import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { logActivity } from '../utils/activityLogger';
import { API_BASE_URL } from '../apiConfig';
import './UserHeader.css';

const UserHeader = ({ title, subtitle }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const savedUser = sessionStorage.getItem('itsd_user');
        if (savedUser) {
            setCurrentUser(JSON.parse(savedUser));
        }
    }, []);

    const profileName = currentUser?.name || 'Public User';
    const profileRole = currentUser?.role || 'Authorized Staff';

    // Compute Initials
    const getInitials = (name) => {
        if (!name) return 'US';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const profileInitials = getInitials(profileName);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            await logActivity('Logged Out', `${profileName} logged out via profile dropdown`, 'USER');
        } catch (error) {
            console.warn('Logout log error:', error);
        }
        // Clear active session from backend
        try {
            const userId = currentUser?.id;
            if (userId) {
                const token = sessionStorage.getItem('itsd_auth_token');
                await fetch(`${API_BASE_URL}/api/sessions/ping/${userId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
        } catch (_) { }
        sessionStorage.removeItem('itsd_user');
        sessionStorage.removeItem('itsd_auth_token');
        navigate('/login');
    };

    return (
        <div className="user-header-container">
            <div className="user-header-left">
                {title && <h1>{title}</h1>}
                {subtitle && <p>{subtitle}</p>}
            </div>

            <div className="user-header-right" ref={dropdownRef}>
                <div
                    className={`uh-profile-trigger ${dropdownOpen ? 'active' : ''}`}
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                    <div className="uh-profile-badge">{profileInitials}</div>
                    <div className="uh-profile-label">
                        <span className="uh-user-name">{profileName}</span>
                        <span className="uh-user-role">{profileRole}</span>
                    </div>
                    <span className="uh-chevron">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </span>
                </div>

                {dropdownOpen && (
                    <div className="uh-profile-dropdown animate-zoom-in">
                        <div className="uh-dropdown-info">
                            <div className="uh-dropdown-img">
                                {profileInitials}
                            </div>
                            <div className="uh-dropdown-text">
                                <span className="name">{profileName}</span>
                                <span className="role">{profileRole}</span>
                            </div>
                        </div>
                        <div className="uh-dropdown-divider"></div>
                        <Link to="/user/profile" className="uh-dropdown-item" onClick={() => setDropdownOpen(false)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            <span>My Profile</span>
                        </Link>
                        <Link to="/user/settings" className="uh-dropdown-item" onClick={() => setDropdownOpen(false)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                            <span>Settings</span>
                        </Link>
                        <div className="uh-dropdown-divider"></div>
                        <button className="uh-dropdown-item logout" onClick={handleLogout}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                            <span>Logout</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserHeader;
