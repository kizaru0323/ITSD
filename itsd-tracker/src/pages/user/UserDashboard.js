import React, { useState, useEffect } from "react";
import UserLayout from "../../layouts/UserLayout";
import { getCurrentUser } from '../../utils/auth';
import { API_BASE_URL } from '../../apiConfig';
import "./UserDashboard.css"; // We'll create this to match the premium theme

const UserDashboard = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, declined: 0, completed: 0 });

  const [currentUser] = useState(() => getCurrentUser());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = sessionStorage.getItem('itsd_auth_token');
        const headers = { 'Authorization': `Bearer ${token}` };

        // Fetch Announcements
        const annRes = await fetch(`${API_BASE_URL}/api/announcements`, { headers });
        const allAnn = await annRes.json();
        const filteredAnn = allAnn.filter(ann => {
          if (!ann.targetUserId || ann.targetUserId === 'GLOBAL') return true;
          if (currentUser && currentUser.id && ann.targetUserId.toString() === currentUser.id.toString()) return true;
          return false;
        });
        setAnnouncements(filteredAnn);

        // Fetch Communications for Stats
        const commRes = await fetch(`${API_BASE_URL}/api/communications`, { headers });
        const comms = await commRes.json();
        const total = comms.length;
        const approved = comms.filter(c => c.status === 'APPROVED').length;
        const pending = comms.filter(c => {
          const s = (c.status || '').toUpperCase();
          return s === 'PENDING' || s === 'READY FOR ARCHIVING' || s === 'PENDING_DIV_HEAD' || s === 'PENDING_DIV_APPROVAL' || s === 'PENDING_SECTION_HEAD' || s === 'DIV_ACCEPTED';
        }).length;
        const declined = comms.filter(c => c.status === 'DECLINED').length;
        const completed = comms.filter(c => c.status === 'COMPLETED').length;
        setStats({ total, approved, pending, declined, completed });

        // Fetch Recent Activities (JWT handles partitioning)
        const logRes = await fetch(`${API_BASE_URL}/api/logs`, { headers });
        const logs = await logRes.json();

        setActivities(Array.isArray(logs) ? logs.slice(0, 10) : []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchData();
  }, [currentUser]);

  return (
    <UserLayout
      title={`Welcome Back, ${currentUser?.name || "User"}`}
      subtitle="Track your communications and system activities in real-time."
      permissionRequired="view_dashboard"
    >
      <div className="user-dashboard-container animate-fade-in">


        <div className="stats-header-grid animate-fade-in-up">
          <div className="modern-stat-card glass-premium blue">
            <div className="stat-icon-circle">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                <polyline points="2 12 12 17 22 12"></polyline>
                <polyline points="2 17 12 22 22 17"></polyline>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-label">TOTAL</span>
              <span className="stat-value">{stats.total < 10 ? `0${stats.total}` : stats.total}</span>
            </div>
          </div>
          <div className="modern-stat-card glass-premium navy">
            <div className="stat-icon-circle">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-label">APPROVED</span>
              <span className="stat-value">{stats.approved < 10 ? `0${stats.approved}` : stats.approved}</span>
            </div>
          </div>
          <div className="modern-stat-card glass-premium yellow">
            <div className="stat-icon-circle">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-label">PENDING</span>
              <span className="stat-value">{stats.pending < 10 ? `0${stats.pending}` : stats.pending}</span>
            </div>
          </div>
          <div className="modern-stat-card glass-premium red">
            <div className="stat-icon-circle">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-label">DECLINED</span>
              <span className="stat-value">{stats.declined < 10 ? `0${stats.declined}` : stats.declined}</span>
            </div>
          </div>
          <div className="modern-stat-card glass-premium indigo">
            <div className="stat-icon-circle">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div className="stat-info">
              <span className="stat-label">COMPLETED</span>
              <span className="stat-value">{stats.completed < 10 ? `0${stats.completed}` : stats.completed}</span>
            </div>
          </div>
        </div>

        <div className="dashboard-grid">
          <section className="dashboard-card glass-premium announcements-section">
            <div className="card-header">
              <div className="header-icon-box navy">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M11 5L6 9H2V15H6L11 19V5Z"></path>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
              </div>
              <h3>System Announcements</h3>
            </div>

            <div className="announcements-scroll">
              {announcements.length > 0 ? (
                announcements.map(ann => (
                  <div key={ann.id} className={`announcement-entry priority-${ann.priority.toLowerCase()} ${ann.targetUserId !== 'GLOBAL' && ann.targetUserId ? 'targeted' : ''}`}>
                    <div className="entry-marker"></div>
                    <div className="entry-content">
                      <div className="entry-head">
                        <div className="title-row">
                          <h4>{ann.title}</h4>
                          {ann.targetUserId !== 'GLOBAL' && ann.targetUserId && (
                            <span className="followup-tag">Follow-up</span>
                          )}
                        </div>
                        <span className="entry-date">{new Date(ann.date).toLocaleDateString()}</span>
                      </div>
                      <p>{ann.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <p>No active announcements at this time.</p>
                </div>
              )}
            </div>
          </section>

          <section className="dashboard-card glass-premium activity-section">
            <div className="card-header">
              <div className="header-icon-box yellow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
              </div>
              <h3>My Activity</h3>
            </div>

            <div className="activity-scroll">
              {activities.length > 0 ? (
                activities.map(log => (
                  <div key={log.id} className="activity-entry">
                    <div className="activity-icon-sm">
                      <div className="dot"></div>
                    </div>
                    <div className="activity-details">
                      <p className="activity-type">{log.action}</p>
                      <p className="activity-desc">{log.details}</p>
                      <span className="activity-time">{log.timestamp}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <p>No recent activity recorded.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </UserLayout>
  );
};

export default UserDashboard;
