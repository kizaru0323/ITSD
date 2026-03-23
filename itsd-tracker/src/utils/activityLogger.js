import { API_BASE_URL } from '../apiConfig';

/**
 * Utility to log user activities to PostgreSQL backend
 */
export const logActivity = async (type, details, role = 'USER', module = 'System') => {
    const newLog = {
        action: type,   
        details: details,
        module: module,
        timestamp: new Date().toISOString()
    };

    const token = sessionStorage.getItem('itsd_auth_token');

    try {
        await fetch(`${API_BASE_URL}/api/logs`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(newLog)
        });

        // Dispatch custom event for real-time UI updates
        window.dispatchEvent(new CustomEvent('activity_logged', { detail: { ...newLog, timestamp: new Date().toLocaleString() } }));
    } catch (error) {
        console.error('Failed to log activity to backend:', error);
    }
};

export const getActivities = async (limit = 100, userName = null) => {
    try {
        const token = sessionStorage.getItem('itsd_auth_token');
        const url = userName
            ? `${API_BASE_URL}/api/logs?user=${encodeURIComponent(userName)}`
            : `${API_BASE_URL}/api/logs`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        return data.slice(0, limit);
    } catch (error) {
        console.error('Error getting activities:', error);
        return [];
    }
};
