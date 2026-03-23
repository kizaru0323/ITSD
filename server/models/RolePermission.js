const { DataTypes } = require('sequelize');
const sequelize = require('../db.config');

const RolePermission = sequelize.define('RolePermission', {
    roleId: {
        type: DataTypes.INTEGER,
        primaryKey: true
    },
    permissionId: {
        type: DataTypes.INTEGER,
        primaryKey: true
    }
}, {
    tableName: 'role_permissions',
    timestamps: false
});

module.exports = RolePermission;
