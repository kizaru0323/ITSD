const { DataTypes } = require('sequelize');
const sequelize = require('../db.config');

const Permission = sequelize.define('Permission', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    slug: {
        type: DataTypes.STRING,
        unique: true
    },
    category: {
        type: DataTypes.STRING,
        defaultValue: 'System'
    },
    description: {
        type: DataTypes.TEXT
    }
}, {
    tableName: 'permissions',
    timestamps: true
});

module.exports = Permission;
