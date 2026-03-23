const { DataTypes } = require('sequelize');
const sequelize = require('../db.config');

const Group = sequelize.define('Group', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    head: {
        type: DataTypes.STRING
    },
    headId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'users',
            key: 'id'
        },
        allowNull: true
    },
    personnel: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    itsdSupport: {
        type: DataTypes.JSONB,
        defaultValue: []
    }
}, {
    tableName: 'groups',
    timestamps: true
});

module.exports = Group;
