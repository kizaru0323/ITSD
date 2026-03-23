const { DataTypes } = require('sequelize');
const sequelize = require('../db.config');

const Office = sequelize.define('Office', {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    type: {
        type: DataTypes.STRING,
        defaultValue: 'INTERNAL' // INTERNAL or EXTERNAL
    }
}, {
    tableName: 'offices',
    timestamps: true
});

module.exports = Office;
