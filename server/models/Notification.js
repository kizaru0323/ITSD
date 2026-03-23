const { DataTypes } = require('sequelize');
const sequelize = require('../db.config');

const Notification = sequelize.define('Notification', {
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' }
    },
    message: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('INFO', 'SUCCESS', 'WARNING'),
        defaultValue: 'INFO'
    },
    relatedId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    relatedType: {
        type: DataTypes.STRING,
        allowNull: true
    },
    isRead: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'notifications',
    timestamps: true
});

module.exports = Notification;
