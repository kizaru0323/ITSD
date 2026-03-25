const { DataTypes } = require('sequelize');
const sequelize = require('../db.config');

const UserPermission = sequelize.define('UserPermission', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    permissionId: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    timestamps: true
});

module.exports = UserPermission;
