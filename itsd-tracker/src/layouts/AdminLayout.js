import React, { useEffect } from 'react';
import AdminSidebar from '../components/AdminSidebar';
import DashboardHeader from '../components/DashboardHeader';
import useSessionPing from '../hooks/useSessionPing';
import { hasPermission } from '../utils/auth';

const AdminLayout = ({ children, title = "ADMINISTRATION", subtitle = "System Executive Control & Oversight", permissionRequired }) => {
  useSessionPing();

  useEffect(() => {
    // Bypass login activity logging for now
    /*
    const sessionLogged = sessionStorage.getItem('admin_login_logged');
    if (!sessionLogged) {
      logActivity('Login', 'Administrator logged into the system', 'ADMIN');
      sessionStorage.setItem('admin_login_logged', 'true');
    }
    */
  }, []);

  // Access Control check
  const isAuthorized = !permissionRequired || hasPermission(permissionRequired);

  return (
    <div className="app-layout">
      <AdminSidebar />
      <main className="app-main">
        <DashboardHeader
          title={title}
          subtitle={subtitle}
          role="ADMIN"
        />
        <div className="content-container animate-fade-in">
          {isAuthorized ? (
            children
          ) : (
            <div className="access-denied-area glass-premium">
              <div className="access-denied-content">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <h2>Access Restricted</h2>
                <p>You do not have the required capability (<strong>{permissionRequired}</strong>) to access this administrative module.</p>
                <button className="btn-primary" onClick={() => window.location.href = '/admin'}>Return to Overview</button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
