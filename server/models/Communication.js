const { DataTypes } = require('sequelize');
const sequelize = require('../db.config');

const Communication = sequelize.define('Communication', {
    trackingId: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    direction: {
        type: DataTypes.ENUM('INCOMING', 'OUTGOING', 'ITSD ONLY'),
        allowNull: false
    },
    kind: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    subject: {
        type: DataTypes.STRING,
        allowNull: false
    },
    details: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    assignedToLabel: {
        type: DataTypes.STRING
    },
    assignedToId: {
        type: DataTypes.INTEGER,
        references: { model: 'users', key: 'id' }
    },
    sectionHeadLabel: {
        type: DataTypes.STRING
    },
    sectionHeadId: {
        type: DataTypes.INTEGER,
        references: { model: 'users', key: 'id' }
    },
    divisionHeadLabel: {
        type: DataTypes.STRING
    },
    divisionHeadId: {
        type: DataTypes.INTEGER,
        references: { model: 'users', key: 'id' }
    },
    officeLabel: {
        type: DataTypes.STRING
    },
    officeId: {
        type: DataTypes.INTEGER,
        references: { model: 'groups', key: 'id' }
    },
    tags: {
        type: DataTypes.STRING
    },
    attachments: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    followUp: {
        type: DataTypes.STRING
    },
    priority: {
        type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
        defaultValue: 'HIGH'
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'PENDING'
    },
    assignedTo: {
        type: DataTypes.VIRTUAL,
        get() {
            return this.Assignee ? this.Assignee.name : this.getDataValue('assignedToLabel');
        }
    },
    sectionHead: {
        type: DataTypes.VIRTUAL,
        get() {
            return this.Receiver ? this.Receiver.name : this.getDataValue('sectionHeadLabel');
        }
    },
    divisionHead: {
        type: DataTypes.VIRTUAL,
        get() {
            return this.DivHead ? this.DivHead.name : this.getDataValue('divisionHeadLabel');
        }
    },
    office: {
        type: DataTypes.VIRTUAL,
        get() {
            return this.Office ? this.Office.name : this.getDataValue('officeLabel');
        }
    },
    userId: {
        type: DataTypes.INTEGER,
        references: { model: 'users', key: 'id' }
    },
    publicRemarks: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    completionProof: {
        type: DataTypes.JSONB,
        defaultValue: []
    },
    completionRemarks: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'communications',
    timestamps: true
});

module.exports = Communication;
