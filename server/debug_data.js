const { User, Group } = require('./models');
const sequelize = require('./db.config');
require('dotenv').config();

async function check() {
    try {
        await sequelize.authenticate();
        const users = await User.findAll({ attributes: ['id', 'name', 'email', 'role'] });
        const groups = await Group.findAll();
        console.log('--- USERS ---');
        console.log(JSON.stringify(users, null, 2));
        console.log('--- GROUPS ---');
        console.log(JSON.stringify(groups, null, 2));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sequelize.close();
    }
}
check();
