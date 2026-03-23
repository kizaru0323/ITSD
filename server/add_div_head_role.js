const { Role, Permission, RolePermission } = require('./models/index');
const sequelize = require('./db.config');

async function addDivHeadRole() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // 1. Ensure permission exists
        const [perm] = await Permission.findOrCreate({
            where: { slug: 'div_head_review' },
            defaults: { name: 'Division Head Review', slug: 'div_head_review', category: 'Records' }
        });

        // 2. Create Division Head Role
        const [divHeadRole] = await Role.findOrCreate({
            where: { name: 'Division Head' },
            defaults: { name: 'Division Head', description: 'Head of ITSD Division - Primary Reviewer' }
        });

        // 3. Assign permissions to Division Head
        const permsToAssign = ['view_dashboard', 'view_logs', 'div_head_review', 'create_record'];
        const allPerms = await Permission.findAll({ where: { slug: permsToAssign } });
        
        for (const p of allPerms) {
            await RolePermission.findOrCreate({
                where: { roleId: divHeadRole.id, permissionId: p.id }
            });
        }

        console.log('Division Head role and permissions created/updated successfully.');
    } catch (error) {
        console.error('Error adding role:', error);
    } finally {
        await sequelize.close();
    }
}

addDivHeadRole();
