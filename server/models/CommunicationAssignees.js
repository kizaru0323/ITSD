const { DataTypes } = require('sequelize');
const sequelize = require('../db.config');

const CommunicationAssignees = sequelize.define('CommunicationAssignees', {
    communicationId: {
        type: DataTypes.INTEGER,
        references: { model: 'communications', key: 'id' }
    },
    userId: {
        type: DataTypes.INTEGER,
        references: { model: 'users', key: 'id' }
    }
}, {
    tableName: 'communication_assignees',
    timestamps: false
});

module.exports = CommunicationAssignees;
