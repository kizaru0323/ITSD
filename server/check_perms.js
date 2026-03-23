const { Role, Permission, RolePermission } = require('./models/index');
const sequelize = require('./db.config');

async function checkPermissions() {
    try {
        await sequelize.authenticate();
        const roles = await Role.findAll({
            include: [{ model: Permission }]
        });

        for (const role of roles) {
            console.log(`Role: ${role.name} (ID: ${role.id})`);
            console.log('Permissions:', role.Permissions.map(p => p.slug).join(', '));
            console.log('---');
        }
    } catch (error) {
        console.error(error);
    } finally {
        await sequelize.close();
    }
}

checkPermissions();
