const { DataTypes } = require('sequelize');
const sequelize = require('../db.config');

const Announcement = sequelize.define('Announcement', {
    title: {
        type: DataTypes.STRING,
        allowNull: false
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    category: {
        type: DataTypes.STRING,
        defaultValue: 'General'
    },
    author: {
        type: DataTypes.STRING,
        allowNull: true
    },
    targetUserId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    priority: {
        type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
        defaultValue: 'LOW'
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'published'
    },
    date: {
        type: DataTypes.DATEONLY,
        defaultValue: DataTypes.NOW
    },
    replies: {
        type: DataTypes.JSONB,
        defaultValue: []
    }
}, {
    tableName: 'announcements',
    timestamps: true
});

module.exports = Announcement;
