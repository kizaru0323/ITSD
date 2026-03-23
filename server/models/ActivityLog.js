const { DataTypes } = require('sequelize');
const sequelize = require('../db.config');

const ActivityLog = sequelize.define('ActivityLog', {
    userId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        field: 'user_id'
    },
    action: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    module: {
        type: DataTypes.TEXT
    },
    ipAddress: {
        type: DataTypes.STRING,
        field: 'ip_address'
    },
    userAgent: {
        type: DataTypes.TEXT,
        field: 'user_agent'
    },
    details: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'activity_logs',
    timestamps: true,
    updatedAt: false,
    createdAt: 'created_at',
    indexes: [
        { fields: ['user_id'] },
        { fields: ['created_at'] }
    ]
});

module.exports = ActivityLog;
