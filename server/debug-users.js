const { User, Role } = require('./models');

async function checkUsers() {
    try {
        const users = await User.findAll({
            include: [{ model: Role, as: 'UserRole' }]
        });
        console.log('--- USER DATA ---');
        users.forEach(u => {
            console.log(`Name: ${u.name}, Role: ${u.role}, RoleID: ${u.roleId}, ActualRole: ${u.UserRole?.name}`);
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkUsers();
