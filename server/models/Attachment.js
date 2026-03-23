const { DataTypes } = require('sequelize');
const sequelize = require('../db.config');

const Attachment = sequelize.define('Attachment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    filename: {
        type: DataTypes.STRING,
        allowNull: false
    },
    mimeType: {
        type: DataTypes.STRING,
        allowNull: false
    },
    data: {
        type: DataTypes.BLOB('long'), // Using long blob to support larger files
        allowNull: false
    },
    communicationId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'communications', key: 'id' }
    },
    internalRequestId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'internal_requests', key: 'id' }
    }
}, {
    tableName: 'attachments',
    timestamps: true
});

module.exports = Attachment;
