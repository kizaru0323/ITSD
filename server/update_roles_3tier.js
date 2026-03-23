const { Role, Permission, RolePermission } = require('./models/index');
const sequelize = require('./db.config');

async function updateRoles() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // 1. Update/Ensure Admin Role (ID 1)
        const [adminRole] = await Role.findOrCreate({
            where: { id: 1 },
            defaults: { name: 'Admin', description: 'Full system executive control' }
        });
        if (adminRole.name !== 'Admin') {
            await adminRole.update({ name: 'Admin', description: 'Full system executive control' });
            console.log('Updated Role ID 1 to Admin');
        }

        // 2. Update/Ensure Users Role (ID 2)
        const [usersRole] = await Role.findOrCreate({
            where: { id: 2 },
            defaults: { name: 'Users', description: 'Personnel / Assignees' }
        });
        if (usersRole.name !== 'Users') {
            await usersRole.update({ name: 'Users', description: 'Personnel / Assignees' });
            console.log('Updated Role ID 2 to Users');
        }

        // 3. Create/Ensure Administrative Role (ID 3)
        const [adminStaffRole] = await Role.findOrCreate({
            where: { id: 3 },
            defaults: { name: 'Administrative', description: 'Office staff who submits communications' }
        });
        if (adminStaffRole.name !== 'Administrative') {
            await adminStaffRole.update({ name: 'Administrative', description: 'Office staff who submits communications' });
            console.log('Updated Role ID 3 to Administrative');
        }

        // 4. Create/Ensure Section Head Role (ID 6)
        const [sectionHeadRole] = await Role.findOrCreate({
            where: { id: 6 },
            defaults: { name: 'Section Head', description: 'Management within department' }
        });
        console.log('Ensured Role ID 6: Section Head');

        const allPerms = await Permission.findAll();
        const staffPermSlugs = ['view_dashboard', 'create_record', 'view_logs'];
        const usersPermSlugs = ['view_dashboard', 'view_logs']; 

        // Clear existing permissions for roles 1, 2, 3
        await RolePermission.destroy({ where: { roleId: [1, 2, 3] } });

        // Assign all to ADMIN
        for (const p of allPerms) {
            await RolePermission.create({
                roleId: 1, permissionId: p.id
            });
        }

        // Assign specific to STAFF
        for (const p of allPerms) {
            if (staffPermSlugs.includes(p.slug)) {
                await RolePermission.create({
                    roleId: 3, permissionId: p.id
                });
            }
        }

        // Assign specific to USERS
        for (const p of allPerms) {
            if (usersPermSlugs.includes(p.slug)) {
                await RolePermission.create({
                    roleId: 2, permissionId: p.id
                });
            }
        }

        console.log('Role hierarchy and permissions updated successfully.');
    } catch (error) {
        console.error('Error updating roles:', error);
    } finally {
        await sequelize.close();
    }
}

updateRoles();
