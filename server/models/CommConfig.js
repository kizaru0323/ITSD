const { DataTypes } = require('sequelize');
const sequelize = require('../db.config');

const CommConfig = sequelize.define('CommConfig', {
    key: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    value: {
        type: DataTypes.JSONB,
        allowNull: false
    }
}, {
    tableName: 'comm_configs',
    timestamps: true
});

module.exports = CommConfig;
