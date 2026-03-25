import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../apiConfig';

const UserPermissionsModal = ({ user, onClose, onSave }) => {
    const [available, setAvailable] = useState([]);
    const [rolePermIds, setRolePermIds] = useState([]);
    const [directPermIds, setDirectPermIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchPermissions();
    }, [user.id]);

    const fetchPermissions = async () => {
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const response = await fetch(`${API_BASE_URL}/api/users/${user.id}/permissions`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setAvailable(data.available || []);
            setRolePermIds(data.rolePermissionIds || []);
            setDirectPermIds(data.directPermissionIds || []);
        } catch (error) {
            console.error('Error fetching permissions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (permId) => {
        if (directPermIds.includes(permId)) {
            setDirectPermIds(directPermIds.filter(id => id !== permId));
        } else {
            setDirectPermIds([...directPermIds, permId]);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const response = await fetch(`${API_BASE_URL}/api/users/${user.id}/permissions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ permissionIds: directPermIds })
            });
            if (response.ok) {
                onSave();
            } else {
                alert('Failed to save permissions');
            }
        } catch (error) {
            console.error('Error saving permissions:', error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return null;

    return (
        <div className="modern-overlay animate-fade-in" onClick={onClose}>
            <div className="modern-modal animate-zoom-in" style={{ width: '500px' }} onClick={e => e.stopPropagation()}>
                <div className="modern-modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div className="permission-icon-glow">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                <path d="M12 8v4" /><path d="M12 16h.01" />
                            </svg>
                        </div>
                        <div>
                            <h3 style={{ margin: 0 }}>Permissions for {user.name}</h3>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Role: {user.UserRole?.name || 'User'}</p>
                        </div>
                    </div>
                </div>
                <div className="modern-modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    <div className="perm-section-label">Role-Based Permissions (Fixed)</div>
                    <div className="perm-grid">
                        {available.filter(p => rolePermIds.includes(p.id)).map(p => (
                            <div key={p.id} className="perm-item role-based">
                                <div className="perm-checkbox checked disabled">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                </div>
                                <div className="perm-info">
                                    <span className="perm-name">{p.name}</span>
                                    <span className="perm-desc">{p.description}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="perm-section-label" style={{ marginTop: '20px' }}>Custom Overrides (Optional)</div>
                    <div className="perm-grid">
                        {available.filter(p => !rolePermIds.includes(p.id)).map(p => (
                            <div 
                                key={p.id} 
                                className={`perm-item override ${directPermIds.includes(p.id) ? 'active' : ''}`}
                                onClick={() => handleToggle(p.id)}
                            >
                                <div className={`perm-checkbox ${directPermIds.includes(p.id) ? 'checked' : ''}`}>
                                    {directPermIds.includes(p.id) && (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    )}
                                </div>
                                <div className="perm-info">
                                    <span className="perm-name">{p.name}</span>
                                    <span className="perm-desc">{p.description}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="modern-modal-footer">
                    <button className="pu-btn-v2 secondary" onClick={onClose} disabled={saving}>Cancel</button>
                    <button className="pu-btn-v2" style={{ background: 'var(--primary-navy)', color: 'white' }} onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Permissions'}
                    </button>
                </div>
            </div>

            <style>{`
                .perm-section-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #64748b; margin-bottom: 12px; letter-spacing: 0.05em; }
                .perm-grid { display: flex; flex-direction: column; gap: 8px; }
                .perm-item { display: flex; alignItems: flex-start; gap: 12px; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; }
                .perm-item:hover { background: #f8fafc; border-color: #cbd5e1; }
                .perm-item.role-based { background: #f1f5f9; cursor: default; opacity: 0.8; }
                .perm-item.override.active { background: #eff6ff; border-color: #3b82f6; }
                .perm-checkbox { width: 18px; height: 18px; border-radius: 4px; border: 2px solid #cbd5e1; display: flex; alignItems: center; justifyContent: center; transition: all 0.2s; flex-shrink: 0; margin-top: 2px; }
                .perm-checkbox.checked { background: #3b82f6; border-color: #3b82f6; }
                .perm-checkbox.disabled { background: #94a3b8; border-color: #94a3b8; }
                .perm-info { display: flex; flex-direction: column; }
                .perm-name { font-size: 0.9rem; font-weight: 500; color: #0f172a; }
                .perm-desc { font-size: 0.75rem; color: #64748b; }
                .permission-icon-glow { width: 44px; height: 44px; background: rgba(59, 130, 246, 0.1); color: #3b82f6; border-radius: 12px; display: flex; alignItems: center; justifyContent: center; }
            `}</style>
        </div>
    );
};

export default UserPermissionsModal;
