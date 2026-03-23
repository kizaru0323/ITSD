import { useEffect, useRef } from 'react';
import { API_BASE_URL } from '../apiConfig';

const PING_INTERVAL_MS = 30 * 1000; // 30 seconds

/**
 * Keeps the current user's session alive in the backend while they are active.
 * Call this hook from any layout component (AdminLayout / UserLayout) so it
 * starts pinging as soon as the user enters the authenticated area.
 */
const useSessionPing = () => {
    const intervalRef = useRef(null);

    const sendPing = () => {
        try {
            const raw = sessionStorage.getItem('itsd_user');
            if (!raw) return;
            const user = JSON.parse(raw);
            if (!user?.id) return;

            const token = sessionStorage.getItem('itsd_auth_token');
            fetch(`${API_BASE_URL}/api/sessions/ping`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: user.id,
                    name: user.name || user.email || 'Unknown',
                    role: user.role || 'User'
                })
            }).catch(() => { });
        } catch (_) { }
    };

    useEffect(() => {
        sendPing(); // immediate ping on mount
        intervalRef.current = setInterval(sendPing, PING_INTERVAL_MS);

        const handleUnload = () => {
            try {
                const raw = sessionStorage.getItem('itsd_user');
                if (!raw) return;
                const user = JSON.parse(raw);
                if (!user?.id) return;
                const token = sessionStorage.getItem('itsd_auth_token');
                // Use fetch with keepalive for reliable delivery on page close with headers
                fetch(`${API_BASE_URL}/api/sessions/ping/${user.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` },
                    keepalive: true
                }).catch(() => { });
            } catch (_) { }
        };

        window.addEventListener('beforeunload', handleUnload);

        return () => {
            clearInterval(intervalRef.current);
            window.removeEventListener('beforeunload', handleUnload);
        };
    }, []);
};

export default useSessionPing;
