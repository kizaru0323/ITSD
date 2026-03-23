const { DataTypes } = require('sequelize');
const sequelize = require('../db.config');

const AccountRequest = sequelize.define('AccountRequest', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isEmail: true }
    },
    reason: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING,
        defaultValue: 'reactivation',
        validate: {
            isIn: [['reactivation', 'password_reset']]
        }
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'pending',
        validate: {
            isIn: [['pending', 'approved', 'declined']]
        }
    }
}, {
    tableName: 'account_requests',
    timestamps: true,
    underscored: true
});

module.exports = AccountRequest;
