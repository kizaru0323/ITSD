const { DataTypes } = require('sequelize');
const sequelize = require('../db.config');

const InternalRequestAssignees = sequelize.define('InternalRequestAssignees', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    internalRequestId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'internal_requests', key: 'id' }
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' }
    }
}, {
    tableName: 'internal_request_assignees',
    timestamps: true
});

module.exports = InternalRequestAssignees;
