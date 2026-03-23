import React, { useState, useEffect } from 'react';
import UserLayout from '../../layouts/UserLayout';
import { API_BASE_URL } from '../../apiConfig';
import './UserProjects.css';

const UserProjects = () => {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMyComms = async () => {
            try {
                const token = sessionStorage.getItem('itsd_auth_token');
                const res = await fetch(`${API_BASE_URL}/api/communications/me`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                setProjects(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Error fetching my communications:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchMyComms();
    }, []);

    const [selectedProject, setSelectedProject] = useState(null);


    return (
        <UserLayout
            title={selectedProject ? "Track Ticket" : "My Tickets"}
            subtitle={selectedProject ? `Detailed status for ${selectedProject.trackingId}` : "Monitor and manage your submitted requests in real-time"}
        >
            <div className={`user-projects-wrapper ${selectedProject ? 'showing-detail' : 'showing-list'}`}>
                {/* Visual Decorations */}
                <div className="premium-glow-system">
                    <div className="glow-sphere sphere-1"></div>
                    <div className="glow-sphere sphere-2"></div>
                </div>

                {loading ? (
                    <div className="projects-loading">Loading your tickets...</div>
                ) : !selectedProject ? (
                    /* =============================================
                       MODERN CARD-BASED LIST VIEW
                       ============================================= */
                    <div className="projects-modern-view animate-fade-in">
                        <div className="content-header-modern">
                            <div className="header-meta">
                                <h3>Submissions List</h3>
                                <p>You have {projects.length} active tickets</p>
                            </div>
                        </div>

                        <div className="projects-cards-container">
                            {projects.map(project => (
                                <div
                                    key={project.id}
                                    className="modern-project-card glass-morph"
                                    onClick={() => setSelectedProject(project)}
                                >
                                    <div className="card-top">
                                        <div className="id-badge">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                                            {project.trackingId}
                                        </div>
                                        <span className={`status-tag ${project.status.toLowerCase().replace(' ', '-')}`}>
                                            {project.status}
                                        </span>
                                    </div>

                                    <h4 className="card-title">{project.subject}</h4>

                                    <div className="card-info">
                                        <div className="info-item">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                                            <span>{project.department}</span>
                                        </div>
                                        <div className="info-item">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                            <span>{new Date(project.date).toLocaleDateString()}</span>
                                        </div>
                                    </div>

                                    <div className="card-footer">
                                        <button className="btn-track-modern">
                                            Track Status
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    /* =============================================
                       MODERN DETAIL VIEW (ROADMAP)
                       ============================================= */
                    <div className="project-modern-detail animate-slide-up">
                        <div className="detail-navigation">
                            <button className="btn-back-modern glass-morph" onClick={() => setSelectedProject(null)}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                                <span>Return to List</span>
                            </button>
                        </div>

                        <div className="detail-hero glass-morph">
                            <div className="hero-content">
                                <div className="hero-header">
                                    <div className="badge-group">
                                        <span className="tracking-badge-premium">{selectedProject.trackingId}</span>
                                        <span className={`status-pill-premium ${selectedProject.status.toLowerCase().replace(' ', '-')}`}>
                                            {selectedProject.status}
                                        </span>
                                    </div>
                                    <h2 className="title-premium">{selectedProject.subject}</h2>
                                </div>

                                <div className="hero-grid">
                                    <div className="grid-item">
                                        <label>DEPARTMENT</label>
                                        <p>{selectedProject.department}</p>
                                    </div>
                                    <div className="grid-item">
                                        <label>SUBMISSION DATE</label>
                                        <p>{new Date(selectedProject.date).toLocaleDateString()}</p>
                                    </div>
                                    <div className="grid-item">
                                        <label>LAST ACTIVITY</label>
                                        <p>{selectedProject.lastUpdate}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="detail-body-grid">
                            <section className="timeline-card glass-morph">
                                <div className="card-header">
                                    <div className="header-icon">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                                    </div>
                                    <h3>Processing Roadmap</h3>
                                </div>

                                <div className="roadmap-container">
                                    {(selectedProject.timeline || [
                                        { label: 'Submitted', date: new Date(selectedProject.createdAt || selectedProject.date).toLocaleDateString(), status: 'Completed' },
                                        { label: 'Initial Review', date: '-', status: selectedProject.status === 'PENDING' ? 'Active' : 'Completed' },
                                        { label: 'Processing', date: '-', status: selectedProject.status === 'APPROVED' ? 'Active' : (selectedProject.status === 'COMPLETED' ? 'Completed' : 'Pending') },
                                        { label: 'Finalized', date: '-', status: selectedProject.status === 'COMPLETED' ? 'Completed' : 'Pending' }
                                    ]).map((step, index) => (
                                        <div key={index} className={`roadmap-step ${step.status.toLowerCase()}`}>
                                            <div className="step-glow"></div>
                                            <div className="step-indicator">
                                                {step.status === 'Completed' ? (
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                ) : step.status === 'Active' ? (
                                                    <div className="active-pulse"></div>
                                                ) : null}
                                            </div>
                                            <div className="step-content">
                                                <div className="step-main">
                                                    <span className="label">{step.label}</span>
                                                    <span className="date">{step.date}</span>
                                                </div>
                                                <span className={`status-mini-tag ${step.status.toLowerCase()}`}>{step.status}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <aside className="actions-side">
                                <section className="quick-actions-card glass-morph">
                                    <h3>Documents</h3>
                                    <p className="description">Access related files and ticket record.</p>
                                    <button className="btn-action-premium primary">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                        View Full Ticket
                                    </button>
                                    <button className="btn-action-premium secondary">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                        Export Status Report
                                    </button>
                                </section>

                                <div className="help-tip glass-morph">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                                    <div>
                                        <strong>Help Center</strong>
                                        <p>Questions about the process? Contact ITSD Support at local 211.</p>
                                    </div>
                                </div>
                            </aside>
                        </div>
                    </div>
                )}
            </div>
        </UserLayout>
    );
};

export default UserProjects;
