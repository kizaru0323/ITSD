import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { logActivity } from '../utils/activityLogger';
import { API_BASE_URL } from '../apiConfig';
import NotificationBell from './NotificationBell';
import './DashboardHeader.css';

const DashboardHeader = ({ title, subtitle, role = 'USER' }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const isAdmin = role && role.toUpperCase() === 'ADMIN';
    useEffect(() => {

        const loadUser = () => {
            const savedUser = sessionStorage.getItem('itsd_user');
            if (savedUser) {
                setCurrentUser(JSON.parse(savedUser));
            }
        };

        loadUser();
    }, [role]);

    const is_admin = isAdmin;
    const profileName = currentUser?.name || (is_admin ? 'Superuser' : 'Public User');
    const profileRole = currentUser?.role || (is_admin ? 'Executive Administrator' : 'Authorized Staff');

    // Compute Initials
    const getInitials = (name) => {
        if (!name) return is_admin ? 'AD' : 'US';
        const parts = name.split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const profileInitials = getInitials(profileName);
    const settingsPath = is_admin ? '/admin/settings' : '/user/settings';

    // Close dropdowns on outside click
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
            await logActivity('Logged Out', `${profileName} logged out via profile dropdown`, is_admin ? 'ADMIN' : 'USER');
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
        <div className="dashboard-header">
            <div className="header-left">
                {title && <h1>{title}</h1>}
                {subtitle && <p>{subtitle}</p>}
            </div>

            <div className="header-right-actions">
                <NotificationBell />
                <div className={`premium-profile-container ${dropdownOpen ? 'menu-active' : ''}`} ref={dropdownRef}>
                    <div
                        className="avatar-trigger"
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                    >
                        <div className="avatar-circle">
                            {currentUser?.avatar ? (
                                <img
                                    src={`${API_BASE_URL}/uploads/${currentUser.avatar}`}
                                    alt="Profile"
                                    className="nav-avatar-img"
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.parentElement.innerText = profileInitials;
                                    }}
                                />
                            ) : profileInitials}
                        </div>
                        <div className="identity-labels">
                            <span className="user-name">{profileName}</span>
                            <span className="user-role">{profileRole}</span>
                        </div>
                    </div>

                    <div className="integrated-dropdown">
                        <div className="dropdown-divider"></div>
                        <Link to={settingsPath} className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                            <span>Account Settings</span>
                        </Link>
                        <button className="dropdown-item logout" onClick={handleLogout}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                            <span>Secure Logout</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardHeader;
