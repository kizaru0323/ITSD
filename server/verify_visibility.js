const { User, Communication, Role } = require('./models/index');
const { Op } = require('sequelize');

async function check() {
    try {
        const users = await User.findAll({
            include: [{ model: Role, as: 'UserRole' }]
        });
        
        console.log('--- USER ROLES ---');
        users.forEach(u => {
            console.log(`ID: ${u.id} | Name: ${u.name} | Role (string): ${u.role} | RoleID: ${u.roleId} | UserRole Title: ${u.UserRole?.title}`);
        });

        const comms = await Communication.findAll({
            attributes: ['id', 'status']
        });
        console.log('\n--- COMMUNICATION STATUSES ---');
        const statusCounts = {};
        comms.forEach(c => {
            statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
        });
        console.log(statusCounts);
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
