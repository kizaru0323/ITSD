import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { hasPermission } from '../utils/auth';
import './Sidebar.css';

const UserSidebar = () => {
  // Trigger reload fix
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const closeMobile = () => setMobileOpen(false);


  const navItems = [
    { label: 'OVERVIEW', path: '/user/overview', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg> },
    { label: 'NEW TICKET', path: '/user/new-communication', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>, permission: 'create_record' },
    { label: 'INTERNAL REQUEST', path: '/user/internal-request', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M15.05 5A5 5 0 0 1 19 8.95M15.05 1L23 8.95M1 7h16M1 11h11M1 15h11M1 19h16"/></svg>, permission: 'create_record' },
    { label: 'INTERNAL LIST', path: '/user/internal-list', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="9" x2="15" y2="9"></line><line x1="9" y1="13" x2="15" y2="13"></line><line x1="9" y1="17" x2="15" y2="17"></line></svg> },
    { label: 'TICKET LISTS', path: '/user/communications', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg> },
    { label: 'PROCESSED LISTS', path: '/user/processed', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> },
    { label: 'ANNOUNCEMENTS', path: '/user/announcements', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg> },
    { label: 'ORGANIZATIONS', path: '/user/organizations', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> },
    { label: 'ACTIVITY LOGS', path: '/user/activity-logs', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> },
  ];

  const filteredItems = navItems.filter(item => {
    const session = sessionStorage.getItem('itsd_user');
    const user = session ? JSON.parse(session) : null;
    const userRole = user?.role?.toLowerCase() || '';
    const isSectionHead = userRole === 'section head' || user?.roleId === 6;

    // Logic: 
    // 1. If user is Section Head: Show 'INTERNAL REQUEST', Hide 'NEW TICKET'
    // 2. If user is NOT Section Head: Show 'NEW TICKET', Hide 'INTERNAL REQUEST'
    
    if (item.label === 'NEW TICKET') {
      if (isSectionHead) return false;
      return !item.permission || hasPermission(item.permission);
    }

    if (item.label === 'INTERNAL REQUEST') {
      if (!isSectionHead) return false;
      return !item.permission || hasPermission(item.permission);
    }

    if (item.label === 'INTERNAL LIST') {
      const isDivHead = userRole === 'division head' || user?.roleId === 7;
      return isSectionHead || isDivHead;
    }
    
    return !item.permission || hasPermission(item.permission);
  });

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
            <small>SERVICE PORTAL</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          {filteredItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${item.isSpecial ? 'special-nav' : ''}`}
              onClick={closeMobile}
            >
              <div className="nav-item-content">
                <div className="icon-label-group">
                  <span className="icon">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge && <span className="badge">{item.badge}</span>}
              </div>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer" />
      </aside>
    </>
  );
};

export default UserSidebar;
