import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../apiConfig';
import CommunicationDetailModal from './CommunicationDetailModal';
import './NotificationBell.css';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedCommId, setSelectedCommId] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [filter, setFilter] = useState('ALL'); // 'ALL' or 'UNREAD'
    const dropdownRef = useRef(null);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchNotifications = async () => {
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const res = await fetch(`${API_BASE_URL}/api/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (Array.isArray(data)) setNotifications(data);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    const markAsRead = async (notification) => {
        if (notification.isRead) {
            // If already read, just open detail modal if applicable
            if (notification.relatedType === 'COMMUNICATION' && notification.relatedId) {
                setSelectedCommId(notification.relatedId);
                setShowDetailModal(true);
            }
            return;
        }

        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            await fetch(`${API_BASE_URL}/api/notifications/${notification.id}/read`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            // Update local state without removing the item
            setNotifications(notifications.map(n => 
                n.id === notification.id ? { ...n, isRead: true } : n
            ));

            // Open detail modal if applicable
            if (notification.relatedType === 'COMMUNICATION' && notification.relatedId) {
                setSelectedCommId(notification.relatedId);
                setShowDetailModal(true);
            }
        } catch (error) {
            console.error('Error marking as read:', error);
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="notification-bell-container" ref={dropdownRef}>
            <button className={`bell-btn ${unreadCount > 0 ? 'has-unread' : ''}`} onClick={() => setIsOpen(!isOpen)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                {unreadCount > 0 && <span className="unread-count">{unreadCount}</span>}
            </button>

            {isOpen && (
                <div className="notification-dropdown animate-slide-down">
                    <div className="dropdown-header">
                        <h4>Notifications</h4>
                        <div className="notif-filters">
                            <button 
                                className={`filter-btn ${filter === 'ALL' ? 'active' : ''}`}
                                onClick={() => setFilter('ALL')}
                            >All</button>
                            <button 
                                className={`filter-btn ${filter === 'UNREAD' ? 'active' : ''}`}
                                onClick={() => setFilter('UNREAD')}
                            >Unread</button>
                        </div>
                    </div>
                    <div className="dropdown-body">
                        {notifications.length === 0 ? (
                            <p className="no-notifs">No notifications yet</p>
                        ) : (
                            notifications
                                .filter(n => filter === 'ALL' || !n.isRead)
                                .map(n => (
                                <div key={n.id} className={`notif-item ${n.type.toLowerCase()} ${n.isRead ? 'read' : ''}`} onClick={() => markAsRead(n)}>
                                    <div className="notif-content">
                                        <p>{n.message}</p>
                                        <span className="notif-time">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="notif-read-dot"></div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {showDetailModal && (
                <CommunicationDetailModal 
                    communicationId={selectedCommId} 
                    onClose={() => {
                        setShowDetailModal(false);
                        setSelectedCommId(null);
                    }} 
                />
            )}
        </div>
    );
};

export default NotificationBell;
