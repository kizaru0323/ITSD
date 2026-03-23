const { ActivityLog } = require('../models/index');

/**
 * Reusable utility to log user activities with IP and Device tracking
 * @param {Number} userId - The ID of the user performing the action
 * @param {String} action - The action being performed
 * @param {String} module - The system module (e.g., 'Records', 'Security')
 * @param {Object} req - The Express request object (optional, for IP and metadata)
 */
const logActivity = async (userId, action, module, req = null, details = null) => {
    try {
        await ActivityLog.create({
            userId: userId || (req && req.user ? req.user.id : null),
            action: action,
            module: module,
            ipAddress: req ? (req.ip || req.connection.remoteAddress) : null,
            userAgent: req ? req.headers['user-agent'] : null,
            details: details
        });
    } catch (error) {
        console.error('CRITICAL: Activity Logging Failed:', error.message);
    }
};

module.exports = { logActivity };
