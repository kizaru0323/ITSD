import React, { useState, useEffect, useCallback } from 'react';
import UserLayout from '../../layouts/UserLayout';
import { API_BASE_URL } from '../../apiConfig';
import './UserAnnouncements.css';

const CategoryIcon = ({ category }) => {
    const cat = (category || 'General').toLowerCase();
    if (cat === 'maintenance') return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>;
    if (cat === 'update' || cat === 'system') return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>;
    if (cat === 'security') return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
    return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2V15H6L11 19V5Z" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>;
};

const UserAnnouncements = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);
    const [replyText, setReplyText] = useState({});

    const [currentUser] = useState(() => {
        const saved = sessionStorage.getItem('itsd_user');
        return saved ? JSON.parse(saved) : null;
    });

    const fetchAnnouncements = useCallback(async () => {
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const res = await fetch(`${API_BASE_URL}/api/announcements`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            const filtered = data.filter(ann => {
                if (!ann.targetUserId) return true;
                if (currentUser && currentUser.id && ann.targetUserId.toString() === currentUser.id.toString()) return true;
                return false;
            });
            setAnnouncements(filtered);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
        }
    }, [currentUser]);

    useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

    const submitReply = async (annId) => {
        const text = replyText[annId];
        if (!text || !text.trim()) return;

        try {
            const reply = {
                user: currentUser?.name || 'User',
                role: 'USER',
                text: text.trim(),
                timestamp: new Date().toISOString()
            };
            const token = sessionStorage.getItem('itsd_auth_token');
            const res = await fetch(`${API_BASE_URL}/api/announcements/${annId}/replies`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reply })
            });
            if (res.ok) {
                // Optimistic update
                setAnnouncements(prev => prev.map(a => {
                    if (a.id === annId) {
                        return { ...a, replies: [...(a.replies || []), reply] };
                    }
                    return a;
                }));
                setReplyText(prev => ({ ...prev, [annId]: '' }));
            }
        } catch (err) {
            console.error('Error:', err);
        }
    };

    return (
        <UserLayout title="Broadcast Feed" subtitle="Stay updated with the latest announcements and discussions.">
            <div className="user-announcements-container animate-fade-in">
                {loading ? (
                    <div className="bc-empty-feed"><p>Loading broadcasts...</p></div>
                ) : announcements.length === 0 ? (
                    <div className="bc-empty-feed">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        <p>No broadcasts available at this time.</p>
                    </div>
                ) : (
                    <div className="broadcast-feed">
                        {announcements.map(ann => {
                            const catKey = (ann.category || 'General').replace(' ', '');
                            const isHigh = (ann.priority || '').toUpperCase() === 'HIGH';
                            const isTargeted = !!ann.targetUserId;
                            const isExpanded = expandedId === ann.id;
                            const replies = ann.replies || [];

                            return (
                                <div
                                    key={ann.id}
                                    className={`broadcast-card ${isExpanded ? 'expanded' : ''} ${isHigh ? 'is-critical' : ''} ${isTargeted ? 'is-targeted' : ''}`}
                                >
                                    <div className="bc-header" onClick={() => setExpandedId(isExpanded ? null : ann.id)}>
                                        <div className="bc-header-left">
                                            <div className={`bc-cat-icon ${catKey.toLowerCase()}`}>
                                                <CategoryIcon category={catKey} />
                                            </div>
                                            <div className="bc-title-area">
                                                <h3>{ann.title}</h3>
                                                <div className="bc-meta-row">
                                                    <span className="bc-cat">{ann.category}</span>
                                                    <span>•</span>
                                                    <span>{new Date(ann.date || ann.createdAt).toLocaleDateString()}</span>
                                                    <span>•</span>
                                                    <span>{ann.author || 'Admin'}</span>
                                                    {replies.length > 0 && <span>• 💬 {replies.length}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bc-tags">
                                            {isHigh && <span className="bc-tag critical">CRITICAL</span>}
                                            {isTargeted && <span className="bc-tag for-you">FOR YOU</span>}
                                        </div>
                                    </div>

                                    {/* Body content */}
                                    <div className="bc-body">
                                        <p>{ann.content}</p>
                                    </div>

                                    {/* Collapsed prompt */}
                                    <div className="bc-tap-prompt">
                                        Click to read more & join the discussion
                                    </div>

                                    {/* Discussion */}
                                    <div className="bc-discussion" onClick={e => e.stopPropagation()}>
                                        <div className="bc-disc-label">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                            Discussion
                                        </div>

                                        <div className="bc-thread">
                                            {replies.length === 0 ? (
                                                <div className="bc-empty-thread">Be the first to reply to this announcement.</div>
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
                                                placeholder="Write a reply..."
                                                value={replyText[ann.id] || ''}
                                                onChange={e => setReplyText(prev => ({ ...prev, [ann.id]: e.target.value }))}
                                                onKeyPress={e => e.key === 'Enter' && submitReply(ann.id)}
                                            />
                                            <button className="bc-send-btn" onClick={() => submitReply(ann.id)}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <line x1="22" y1="2" x2="11" y2="13" />
                                                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
                }
            </div>
        </UserLayout>
    );
};

export default UserAnnouncements;
