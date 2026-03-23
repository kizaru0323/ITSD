const { DataTypes } = require('sequelize');
const sequelize = require('../db.config');

const Role = sequelize.define('Role', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    description: {
        type: DataTypes.TEXT
    }
}, {
    tableName: 'roles',
    timestamps: true
});

module.exports = Role;
