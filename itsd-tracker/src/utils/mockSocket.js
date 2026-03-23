/**
 * Mock Socket.IO Utility
 * Simulates real-time communication using browser events.
 * This allows multiple tabs/windows in the same browser to "communicate" 
 * without a backend server.
 */

class MockSocket {
    constructor() {
        this.listeners = {};
        this.handleEvent = this.handleEvent.bind(this);

        // Listen for window-level custom events
        window.addEventListener('mock-socket-event', this.handleEvent);
    }

    handleEvent(event) {
        const { type, data } = event.detail;
        if (this.listeners[type]) {
            this.listeners[type].forEach(callback => callback(data));
        }
    }

    on(type, callback) {
        if (!this.listeners[type]) {
            this.listeners[type] = [];
        }
        this.listeners[type].push(callback);
    }

    off(type, callback) {
        if (!this.listeners[type]) return;
        this.listeners[type] = this.listeners[type].filter(cb => cb !== callback);
    }

    emit(type, data) {
        // Dispatch event globally so other instances/tabs can hear it
        const event = new CustomEvent('mock-socket-event', {
            detail: { type, data }
        });
        window.dispatchEvent(event);

        // Also simulate cross-tab communication using localStorage if needed,
        // but for a single-page app or same-session tabs, window events are fast.
        // For true cross-tab, we'd use:
        sessionStorage.setItem('mock_socket_last_event', JSON.stringify({
            type,
            data,
            timestamp: Date.now()
        }));
    }

    disconnect() {
        window.removeEventListener('mock-socket-event', this.handleEvent);
        this.listeners = {};
    }
}

const socket = new MockSocket();

// Cross-tab synchronization listener
window.addEventListener('storage', (e) => {
    if (e.key === 'mock_socket_last_event' && e.newValue) {
        const { type, data } = JSON.parse(e.newValue);
        // Trigger listeners for events coming from other tabs
        if (socket.listeners[type]) {
            socket.listeners[type].forEach(callback => callback(data));
        }
    }
});

export default socket;
