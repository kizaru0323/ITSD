import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import AdminLayout from '../../layouts/AdminLayout';
import { API_BASE_URL } from '../../apiConfig';
import './Announcements.css';

const CategoryIcon = ({ category }) => {
    const cat = (category || 'General').toLowerCase();
    if (cat === 'maintenance') return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>;
    if (cat === 'update' || cat === 'system') return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>;
    if (cat === 'security') return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
    return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 5L6 9H2V15H6L11 19V5Z" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>;
};

const Announcements = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [openThreadId, setOpenThreadId] = useState(null);
    const [adminReply, setAdminReply] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        content: '',
        category: 'General',
        audienceType: 'GLOBAL',
        targetUserId: '',
        priority: false
    });

    const [currentUser] = useState(() => {
        const saved = sessionStorage.getItem('itsd_current_user');
        return saved ? JSON.parse(saved) : { name: 'Admin' };
    });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const headers = { 'Authorization': `Bearer ${token}` };
            const [annRes, userRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/announcements`, { headers }),
                fetch(`${API_BASE_URL}/api/users`, { headers })
            ]);
            const annData = await annRes.json();
            const userData = await userRes.json();
            setAnnouncements(Array.isArray(annData) ? annData : []);
            setUsers(Array.isArray(userData) ? userData : []);
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload = {
                title: formData.title,
                content: formData.content,
                category: formData.category,
                author: currentUser.name,
                targetUserId: formData.audienceType === 'GLOBAL' ? null : parseInt(formData.targetUserId),
                priority: formData.priority ? 'HIGH' : 'LOW',
                date: new Date().toISOString().split('T')[0]
            };
            const token = sessionStorage.getItem('itsd_auth_token');
            const res = await fetch(`${API_BASE_URL}/api/announcements`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                fetchData();
                setFormData({ title: '', content: '', category: 'General', audienceType: 'GLOBAL', targetUserId: '', priority: false });
                setShowModal(false);
            }
        } catch (err) { console.error(err); }
        finally { setIsSubmitting(false); }
    };

    const handleAdminReply = async (annId) => {
        if (!adminReply.trim()) return;
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const reply = { user: currentUser.name, role: 'ADMIN', text: adminReply.trim(), timestamp: new Date().toISOString() };
            const res = await fetch(`${API_BASE_URL}/api/announcements/${annId}/replies`, {
                method: 'PATCH', 
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reply })
            });
            if (res.ok) { fetchData(); setAdminReply(''); }
        } catch (err) { console.error(err); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this announcement?')) return;
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const res = await fetch(`${API_BASE_URL}/api/announcements/${id}`, { 
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setAnnouncements(prev => prev.filter(a => a.id !== id));
        } catch (err) { console.error(err); }
    };

    return (
        <AdminLayout title="Announcement Center" subtitle="Broadcast critical updates and system-wide alerts.">
            <div className="announcements-admin-container animate-fade-in">

                {/* Top Action Bar */}
                <div className="ann-top-bar">
                    <h2>
                        Broadcasts
                        <span className="ann-count-badge">({announcements.length} active)</span>
                    </h2>
                    <button className="add-ann-btn" onClick={() => setShowModal(true)}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        New Announcement
                    </button>
                </div>

                {/* Entry Cards */}
                <div className="ann-entries">
                    {loading ? (
                        <div className="ann-empty-state"><p>Loading announcements...</p></div>
                    ) : announcements.length === 0 ? (
                        <div className="ann-empty-state">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                            <p>No announcements yet. Click "+ New Announcement" to start.</p>
                        </div>
                    ) : (
                        announcements.map(ann => {
                            const catKey = (ann.category || 'General').replace(' ', '');
                            const isHigh = (ann.priority || '').toUpperCase() === 'HIGH';
                            const replies = ann.replies || [];
                            const isOpen = openThreadId === ann.id;

                            return (
                                <div key={ann.id} className={`ann-entry-card ${isHigh ? 'priority-high' : ''}`}>
                                    <div className="ann-entry-main" onClick={() => setOpenThreadId(isOpen ? null : ann.id)}>
                                        <div className={`ann-entry-icon ${catKey.toLowerCase()}`}>
                                            <CategoryIcon category={catKey} />
                                        </div>
                                        <div className="ann-entry-body">
                                            <h4 className="ann-entry-title">{ann.title}</h4>
                                            <div className="ann-entry-meta">
                                                <span className="cat-dot" style={{ background: isHigh ? '#ef4444' : '#6366f1' }}></span>
                                                <span>{ann.category}</span>
                                                <span>•</span>
                                                <span>{new Date(ann.date || ann.createdAt).toLocaleDateString()}</span>
                                                <span>•</span>
                                                <span>by {ann.author || 'Admin'}</span>
                                            </div>
                                        </div>

                                        <div className="ann-entry-actions">
                                            <span className={`ann-target-pill ${ann.targetUserId ? 'specific' : 'global'}`}>
                                                {ann.targetUserId ? 'SPECIFIC' : 'GENERAL'}
                                            </span>
                                            <span
                                                className={`reply-count-chip ${replies.length > 0 ? 'has-replies' : ''}`}
                                                onClick={e => { e.stopPropagation(); setOpenThreadId(isOpen ? null : ann.id); }}
                                            >
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg> {replies.length}
                                            </span>
                                            <button className="delete-btn" onClick={e => { e.stopPropagation(); handleDelete(ann.id); }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Discussion Drawer */}
                                    {isOpen && (
                                        <div className="ann-discussion-drawer">
                                            <div className="drawer-label">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                                Conversation Thread
                                            </div>

                                            {/* Announcement Content */}
                                            <div className="ann-content-preview">
                                                <p>{ann.content}</p>
                                            </div>

                                            <div className="bc-thread">
                                                {replies.length === 0 ? (
                                                    <div className="bc-empty-thread">No replies yet. Users can respond to this in their Broadcast Feed.</div>
                                                ) : (
                                                    replies.map((r, i) => {
                                                        const isReplyAdmin = r.role && r.role.toUpperCase() === 'ADMIN';
                                                        return (
                                                            <div key={i} className={`chat-bubble ${isReplyAdmin ? 'from-admin' : 'from-user'}`}>
                                                                <div className="bubble-avatar">
                                                                    {(r.user || 'U').charAt(0).toUpperCase()}
                                                                </div>
                                                                <div className="bubble-content">
                                                                    <div className="bubble-name">
                                                                        {r.user}
                                                                        {isReplyAdmin && <span className="official-marker">OFFICIAL</span>}
                                                                    </div>
                                                                    <p className="bubble-text">{r.text}</p>
                                                                    <div className="bubble-time">
                                                                        {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })
                                                )}
                                            </div>

                                            <div className="bc-compose">
                                                <input
                                                    type="text"
                                                    placeholder="Write an official response..."
                                                    value={adminReply}
                                                    onChange={e => setAdminReply(e.target.value)}
                                                    onKeyPress={e => e.key === 'Enter' && handleAdminReply(ann.id)}
                                                />
                                                <button className="bc-send-btn" onClick={() => handleAdminReply(ann.id)}>
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                        <line x1="22" y1="2" x2="11" y2="13" />
                                                        <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {
                    showModal && createPortal(
                        <div className="modern-overlay animate-fade-in" onClick={() => setShowModal(false)}>
                            <div className="modern-modal animate-zoom-in" onClick={e => e.stopPropagation()} style={{ width: '550px', maxWidth: '95vw' }}>
                                <div className="modern-modal-header">
                                    <h3>
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginRight: '12px' }}><path d="M11 5L6 9H2V15H6L11 19V5Z" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
                                        New Announcement
                                    </h3>
                                    <button className="close-btn-modern" onClick={() => setShowModal(false)}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                        </svg>
                                    </button>
                                </div>

                                <form id="ann-form" onSubmit={handleSubmit}>
                                    <div className="modern-modal-body">
                                        {/* Audience Selector */}
                                        <div className="audience-selector" style={{ marginBottom: '24px' }}>
                                            <div
                                                className={`audience-option ${formData.audienceType === 'GLOBAL' ? 'selected' : ''}`}
                                                onClick={() => setFormData(p => ({ ...p, audienceType: 'GLOBAL', targetUserId: '' }))}
                                            >
                                                <div className="audience-icon">
                                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                                                </div>
                                                <div className="audience-label">General</div>
                                            </div>
                                            <div
                                                className={`audience-option ${formData.audienceType === 'SPECIFIC' ? 'selected' : ''}`}
                                                onClick={() => setFormData(p => ({ ...p, audienceType: 'SPECIFIC' }))}
                                            >
                                                <div className="audience-icon">
                                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                                </div>
                                                <div className="audience-label">Specific Personnel</div>
                                            </div>
                                        </div>

                                        {formData.audienceType === 'SPECIFIC' && (
                                            <div className="form-group" style={{ animation: 'fadeIn 0.3s ease' }}>
                                                <label>Select Personnel</label>
                                                <select name="targetUserId" className="form-control" value={formData.targetUserId} onChange={handleChange} required>
                                                    <option value="">-- Choose User --</option>
                                                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                                                </select>
                                            </div>
                                        )}

                                        <div className="form-group">
                                            <label>Title</label>
                                            <input type="text" name="title" className="form-control" placeholder="Announcement title..." value={formData.title} onChange={handleChange} required />
                                        </div>

                                        <div className="form-group">
                                            <label>Category</label>
                                            <select name="category" className="form-control" value={formData.category} onChange={handleChange}>
                                                <option value="General">General</option>
                                                <option value="Maintenance">Maintenance</option>
                                                <option value="Update">System Update</option>
                                                <option value="Security">Security</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>Content</label>
                                            <textarea name="content" className="form-control" rows="4" placeholder="Announcement details..." value={formData.content} onChange={handleChange} required />
                                        </div>

                                        <label className={`priority-checkbox ${formData.priority ? 'active' : ''}`} style={{ marginTop: '12px' }}>
                                            <input type="checkbox" name="priority" checked={formData.priority} onChange={handleChange} />
                                            <div>
                                                <span className="p-label" style={{ fontSize: '12px', fontWeight: 800 }}>Mark as Critical</span>
                                                <span className="p-hint" style={{ fontSize: '11px' }}>Will be visually highlighted in the user feed</span>
                                            </div>
                                        </label>
                                    </div>

                                    <div className="modern-modal-footer">
                                        <button type="button" className="v2-btn-secondary" onClick={() => setShowModal(false)}>Discard</button>
                                        <button type="submit" className="pu-btn primary" disabled={isSubmitting} style={{ borderRadius: '12px' }}>
                                            {isSubmitting ? 'Publishing...' : 'Publish Announcement'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>,
                        document.body
                    )
                }
            </div>
        </AdminLayout>
    );
};

export default Announcements;
