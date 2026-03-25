const jwt = require('jsonwebtoken');
const { User } = require('../models/index'); 
require('dotenv').config();

const authenticate = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Fetch latest user data including permissions to avoid JWT data drift
        const { User, Role, Permission } = require('../models/index');
        const user = await User.findByPk(decoded.id, {
            include: [
                {
                    model: Role,
                    as: 'UserRole',
                    include: [{ model: Permission }]
                },
                {
                    model: Permission,
                    as: 'DirectPermissions'
                }
            ]
        });
        
        if (!user || user.status !== 'active') {
            return res.status(403).json({ error: 'Account is inactive or has been disabled.' });
        }

        // Map permissions slugs from Role AND Direct User Overrides
        const rolePermissions = user.UserRole?.Permissions?.map(p => p.slug) || [];
        const directPermissions = user.DirectPermissions?.map(p => p.slug) || [];
        
        // Merge and remove duplicates
        const allPermissions = [...new Set([...rolePermissions, ...directPermissions])];

        // Override req.user with latest data from DB
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            roleId: user.roleId,
            groupId: user.groupId,
            permissions: allPermissions
        };
        next();
    } catch (error) {
        console.error('Authentication Error:', error.message);
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({ error: 'Session expired. Please log in again.' });
        }
        res.status(403).json({ error: 'Invalid security token. Please re-authenticate.' });
    }
};

module.exports = authenticate;
