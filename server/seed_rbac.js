const { Role, Permission, RolePermission, User } = require('./models/index');
const sequelize = require('./db.config');

async function seedRBAC() {
    try {
        await sequelize.authenticate();
        console.log('Database connected for seeding...');

        // 1. Create permissions
        const permissionsData = [
            { name: 'View Dashboard', slug: 'view_dashboard', category: 'General' },
            { name: 'Manage Users', slug: 'manage_users', category: 'Security' },
            { name: 'Manage Roles', slug: 'manage_roles', category: 'Security' },
            { name: 'Manage Permissions', slug: 'manage_permissions', category: 'Security' },
            { name: 'View Activity Logs', slug: 'view_logs', category: 'Records' },
            { name: 'Submit Communications', slug: 'create_record', category: 'Records' },
            { name: 'Process Records (Approve/Decline)', slug: 'edit_record', category: 'Records' },
            { name: 'Global Assignment Management', slug: 'manage_all_assignments', category: 'Records' },
            { name: 'Manage Settings', slug: 'manage_settings', category: 'System' }
        ];

        const createdPermissions = [];
        for (const p of permissionsData) {
            let perm = await Permission.findOne({ where: { slug: p.slug } });
            if (!perm) {
                perm = await Permission.create(p);
                console.log(`Permission created: ${p.slug}`);
            } else {
                await perm.update(p);
                console.log(`Permission updated: ${p.slug}`);
            }
            createdPermissions.push(perm);
        }

        // 2. Create roles
        async function getOrCreateRole(name, description) {
            let role = await Role.findOne({ where: { name } });
            if (!role) {
                role = await Role.create({ name, description });
                console.log(`Role created: ${name}`);
            } else {
                await role.update({ description });
                console.log(`Role updated: ${name}`);
            }
            return role;
        }

        const adminRole = await getOrCreateRole('Administrator', 'Full system access (Master Admin)');
        const userRole = await getOrCreateRole('Regular User', 'Standard user access');
        const sectionHeadRole = await getOrCreateRole('Section Head', 'Management within department');
        const staffRole = await getOrCreateRole('ADMINISTRATIVE / STAFF', 'Office staff who submits communications');

        // 3. Assign permissions to Administrator (All)
        for (const perm of createdPermissions) {
            await RolePermission.findOrCreate({
                where: { roleId: adminRole.id, permissionId: perm.id }
            });
        }
        console.log('Permissions assigned to Administrator');

        // 4. Assign permissions to Section Head (Limited Assignment)
        const sectionHeadPermSlugs = ['view_dashboard', 'create_record', 'view_logs', 'edit_record'];
        const sectionHeadPerms = createdPermissions.filter(p => sectionHeadPermSlugs.includes(p.slug));
        for (const perm of sectionHeadPerms) {
            await RolePermission.findOrCreate({
                where: { roleId: sectionHeadRole.id, permissionId: perm.id }
            });
        }
        console.log('Permissions assigned to Section Head');

        // 5. Assign permissions to Regular User (Limited)
        const userPermSlugs = ['view_dashboard', 'create_record', 'view_logs'];
        const userPerms = createdPermissions.filter(p => userPermSlugs.includes(p.slug));
        for (const perm of userPerms) {
            await RolePermission.findOrCreate({
                where: { roleId: userRole.id, permissionId: perm.id }
            });
        }
        console.log('Permissions assigned to Regular User');

        // 5. Update existing users to have roles
        // Find admin user (admin@valencia.gov.ph or similar)
        const adminUser = await User.findOne({ where: { role: 'admin' } });
        if (adminUser) {
            await adminUser.update({ roleId: adminRole.id });
            console.log(`Updated user ${adminUser.email} to Administrator role`);
        }

        const regularUsers = await User.findAll({ where: { role: 'user' } });
        for (const u of regularUsers) {
            await u.update({ roleId: userRole.id });
            console.log(`Updated user ${u.email} to Regular User role`);
        }

        console.log('RBAC Seeding completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seedRBAC();
