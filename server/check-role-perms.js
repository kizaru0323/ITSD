const { Role, Permission, RolePermission } = require('./models/index');

async function checkAdminSection() {
    try {
        const role = await Role.findOne({
            where: { name: 'Admin Section' },
            include: [{ model: Permission }]
        });
        if (role) {
            console.log('Admin Section Permissions:');
            role.Permissions.forEach(p => console.log(`- ${p.slug}`));
        } else {
            console.log('Admin Section role not found');
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

checkAdminSection();
