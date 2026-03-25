const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { Role } = require('./models/index');
const sequelize = require('./db.config');

async function listRoles() {
    try {
        await sequelize.authenticate();
        const roles = await Role.findAll();
        console.log('--- ROLES IN DATABASE ---');
        roles.forEach(r => console.log(`ID: ${r.id} | Name: "${r.name}"`));
        process.exit(0);
    } catch (error) {
        console.error('Failed to list roles:', error);
        process.exit(1);
    }
}

listRoles();
