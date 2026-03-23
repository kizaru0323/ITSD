const { Role, Permission, RolePermission } = require('./models/index');
const sequelize = require('./db.config');

async function checkRBAC() {
    try {
        await sequelize.authenticate();
        const roles = await Role.findAll({
            include: [{ model: Permission }]
        });
        console.log(JSON.stringify(roles, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkRBAC();
