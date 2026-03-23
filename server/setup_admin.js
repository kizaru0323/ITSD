const { User, Role, Permission, RolePermission } = require('./models/index');
const sequelize = require('./db.config');
const bcrypt = require('bcryptjs');

async function setupAdmin() {
    try {
        await sequelize.authenticate();
        console.log('Database connected...');

        // 1. Ensure essential roles exist
        const roles = [
            { name: 'Admin', description: 'Full System Access' },
            { name: 'Division Head', description: 'Division-level management' },
            { name: 'Section Head', description: 'Section-level management' },
            { name: 'Staff', description: 'Office Personnel' },
            { name: 'User', description: 'Standard User' }
        ];

        for (const r of roles) {
            await Role.findOrCreate({ where: { name: r.name }, defaults: r });
        }
        console.log('Roles verified.');

        // 2. Ensure basic permissions exist
        const permissions = [
            { name: 'View Dashboard', slug: 'view_dashboard', category: 'General' },
            { name: 'Manage Users', slug: 'manage_users', category: 'Security' },
            { name: 'Create Records', slug: 'create_record', category: 'Records' },
            { name: 'Edit Records', slug: 'edit_record', category: 'Records' },
            { name: 'Approve Records', slug: 'approve_record', category: 'Records' }
        ];

        for (const p of permissions) {
            await Permission.findOrCreate({ where: { slug: p.slug }, defaults: p });
        }
        console.log('Permissions verified.');

        // 3. Link Admin role to all permissions
        const adminRole = await Role.findOne({ where: { name: 'Admin' } });
        const allPerms = await Permission.findAll();
        for (const perm of allPerms) {
            await RolePermission.findOrCreate({
                where: { roleId: adminRole.id, permissionId: perm.id }
            });
        }
        console.log('Admin permissions linked.');

        // 4. Create/Update Default Admin User
        const adminPassword = 'admin123';
        const hashedPassword = await bcrypt.hash(adminPassword, 10);

        const [user, created] = await User.findOrCreate({
            where: { username: 'admin' },
            defaults: {
                name: 'System Administrator',
                email: 'admin@itsd.gov.ph',
                password: hashedPassword,
                role: 'Admin',
                roleId: adminRole.id,
                status: 'active'
            }
        });

        if (!created) {
            await user.update({
                password: hashedPassword,
                role: 'Admin',
                roleId: adminRole.id,
                status: 'active'
            });
            console.log('Admin user updated.');
        } else {
            console.log('Admin user created.');
        }

        console.log('-----------------------------------------');
        console.log('SETUP COMPLETE');
        console.log('Login: admin');
        console.log('Password: admin123');
        console.log('-----------------------------------------');

    } catch (error) {
        console.error('Setup failed:', error);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

setupAdmin();
