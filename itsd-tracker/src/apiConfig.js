/**
 * Centralized API configuration for the ITSD Tracker application.
 * Change the API_BASE_URL here to point to a production server or different IP.
 */
export const API_BASE_URL = 'http://192.168.137.1:5000';

export const getApiUrl = (endpoint) => {
    // Ensure endpoint starts with /
    const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${API_BASE_URL}${formattedEndpoint}`;
};

export const getUploadUrl = (filename) => {
    if (!filename) return null;
    return `${API_BASE_URL}/uploads/${filename}`;
};

/**
 * Modern attachment URL resolver that supports both legacy strings
 * and the new database-backed attachment objects.
 */
export const getAttachmentUrl = (attachment) => {
    if (!attachment) return null;

    // Legacy support: filenames as strings
    if (typeof attachment === 'string') {
        return `${API_BASE_URL}/uploads/${attachment}`;
    }

    // New support: database objects with {id, name, isDb}
    if (attachment.isDb && attachment.id) {
        return `${API_BASE_URL}/api/attachments/${attachment.id}`;
    }

    return null;
};
