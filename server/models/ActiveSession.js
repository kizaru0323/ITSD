const { DataTypes } = require('sequelize');
const sequelize = require('../db.config');

const ActiveSession = sequelize.define('ActiveSession', {
    userId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.STRING,
        allowNull: true
    },
    lastPing: {
        type: DataTypes.BIGINT,
        allowNull: false
    }
}, {
    tableName: 'active_sessions',
    timestamps: false
});

module.exports = ActiveSession;
