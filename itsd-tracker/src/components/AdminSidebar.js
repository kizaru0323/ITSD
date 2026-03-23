import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { hasPermission } from '../utils/auth';
import './Sidebar.css';

const AdminSidebar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const closeMobile = () => setMobileOpen(false);

  const adminItems = [
    { label: 'DASHBOARD', path: '/admin', end: true, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg> },
    { label: 'TICKET LISTS', path: '/admin/communications', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>, permission: 'view_dashboard' },
    { label: 'PROCESSED LISTS', path: '/admin/processed', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>, permission: 'view_dashboard' },
    { label: 'PERSONNEL', path: '/admin/users', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>, permission: 'manage_users' },
    { label: 'GROUPS', path: '/admin/groups', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>, permission: 'manage_users' },
    { label: 'CALENDAR', path: '/admin/calendar', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>, permission: 'view_dashboard' },
    { label: 'ANNOUNCEMENTS', path: '/admin/announcements', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 5L6 9H2V15H6L11 19V5Z"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>, permission: 'view_dashboard' },
    { label: 'ACTIVITY LOGS', path: '/admin/activity-logs', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>, permission: 'manage_users' },
    { label: 'ACCOUNT REQUESTS', path: '/admin/requests', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="17" y1="8" x2="21" y2="12"></line><line x1="21" y1="8" x2="17" y2="12"></line></svg>, permission: 'manage_users' },
  ];

  const filteredItems = adminItems.filter(item => !item.permission || hasPermission(item.permission));

  return (
    <>
      <button className="sidebar-hamburger" onClick={() => setMobileOpen(true)} aria-label="Open menu">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {mobileOpen && <div className="sidebar-backdrop visible" onClick={closeMobile} />}

      <aside className={`sidebar${mobileOpen ? ' mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <img src="/itsdlogo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div className="sidebar-header-text">
            <h2>ITSD</h2>
            <p>Valencia City</p>
            <small>EXECUTIVE CONTROL</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          {filteredItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${item.isSpecial ? 'special-nav' : ''}`}
              onClick={closeMobile}
            >
              <div className="nav-item-content">
                <div className="icon-label-group">
                  <span className="icon">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              </div>
            </NavLink>
          ))}

        </nav>
      </aside>
    </>
  );
};

export default AdminSidebar;
