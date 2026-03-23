import React, { useState, useEffect } from 'react';
import AdminLayout from '../../layouts/AdminLayout';
import { API_BASE_URL } from '../../apiConfig';
import './Offices.css';

const Offices = () => {
    const [offices, setOffices] = useState([]);
    const [newOfficeName, setNewOfficeName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchOffices();
    }, []);

    const fetchOffices = async () => {
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const res = await fetch(`${API_BASE_URL}/api/offices`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setOffices(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching offices:', err);
        }
    };

    const handleAddOffice = async (e) => {
        e.preventDefault();
        if (!newOfficeName.trim()) return;
        setIsLoading(true);
        setError('');
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            const res = await fetch(`${API_BASE_URL}/api/offices`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: newOfficeName.trim(), type: 'INTERNAL' })
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to add office');
            }
            setNewOfficeName('');
            fetchOffices();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteOffice = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
        try {
            const token = sessionStorage.getItem('itsd_auth_token');
            await fetch(`${API_BASE_URL}/api/offices/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchOffices();
        } catch (err) {
            console.error('Error deleting office:', err);
        }
    };

    return (
        <AdminLayout
            title="Office Management"
            subtitle="Manage internal offices and external organizations"
            permissionRequired="manage_users"
        >
            <div className="offices-container animate-fade-in">
                <div className="offices-card glass-premium">
                    <div className="offices-header">
                        <h3>All Offices / Organizations</h3>
                        <form className="add-office-form" onSubmit={handleAddOffice}>
                            <input
                                type="text"
                                placeholder="Enter office name..."
                                value={newOfficeName}
                                onChange={(e) => setNewOfficeName(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                            <button type="submit" className="add-btn" disabled={isLoading}>
                                {isLoading ? 'Adding...' : 'Add Office'}
                            </button>
                        </form>
                    </div>
                    {error && <div className="offices-error">{error}</div>}
                    <div className="offices-list">
                        {offices.length === 0 ? (
                            <div className="empty-offices">No offices found. Add one above.</div>
                        ) : (
                            <div className="offices-grid">
                                {offices.map((office) => (
                                    <div key={office.id} className="office-item animate-zoom-in">
                                        <div className="office-info">
                                            <span className="office-name">{office.name}</span>
                                            <span className="office-type">{office.type}</span>
                                        </div>
                                        <button
                                            className="delete-btn"
                                            onClick={() => handleDeleteOffice(office.id, office.name)}
                                            title="Delete Office"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default Offices;
