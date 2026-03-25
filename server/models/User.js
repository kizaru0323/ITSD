const { DataTypes } = require('sequelize');
const sequelize = require('../db.config');

const User = sequelize.define('User', {
    name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    email: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false,
        validate: {
            isEmail: true
        }
    },
    username: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.STRING,
        defaultValue: 'user',
        validate: {
            isIn: [['Admin', 'User', 'Users', 'Administrative', 'Admin Section', 'Section Head', 'Division Head', 'admin', 'user', 'admin section', 'System']]
        }
    },
    roleId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'roles',
            key: 'id'
        }
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'active',
        validate: {
            isIn: [['active', 'inactive', 'archived']]
        }
    },
    department: {
        type: DataTypes.VIRTUAL,
        get() {
            return this.Section ? this.Section.name : null;
        }
    },
    position: {
        type: DataTypes.STRING,
        allowNull: true
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true
    },
    bio: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    avatar: {
        type: DataTypes.STRING,
        allowNull: true
    },
    groupId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'groups',
            key: 'id'
        },
        allowNull: true
    }
}, {
    tableName: 'users',
    timestamps: true,
    underscored: true // Use created_at and updated_at
});

module.exports = User;
