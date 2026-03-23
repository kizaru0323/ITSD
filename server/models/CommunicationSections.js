const { DataTypes } = require('sequelize');
const sequelize = require('../db.config');

const CommunicationSections = sequelize.define('CommunicationSections', {
    communicationId: {
        type: DataTypes.INTEGER,
        references: { model: 'communications', key: 'id' }
    },
    groupId: {
        type: DataTypes.INTEGER,
        references: { model: 'groups', key: 'id' }
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'PENDING' // PENDING, APPROVED, DECLINED, RETURNED
    }
}, {
    tableName: 'communication_sections',
    timestamps: true
});

module.exports = CommunicationSections;
