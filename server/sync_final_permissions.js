const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { Role, Permission, RolePermission, User } = require('./models/index');
const sequelize = require('./db.config');

async function syncFinalPermissions() {
    try {
        await sequelize.authenticate();
        console.log('--- SYNCING FINAL PERMISSIONS ---');

        // 1. Define All Required Permissions
        const allPermissions = [
            { name: 'View Dashboard', slug: 'view_dashboard', category: 'General' },
            { name: 'Create Record', slug: 'create_record', category: 'Records' },
            { name: 'Review Communication', slug: 'review_communication', category: 'Records' },
            { name: 'Approve Record', slug: 'approve_record', category: 'Records' },
            { name: 'Decline Record', slug: 'decline_record', category: 'Records' },
            { name: 'Return Record', slug: 'return_record', category: 'Records' },
            { name: 'Complete Task', slug: 'complete_task', category: 'Records' }, // CRITICAL for personnel
            { name: 'Manage All Assignments', slug: 'manage_all_assignments', category: 'Records' },
            { name: 'Manage Users', slug: 'manage_users', category: 'System' },
            { name: 'Manage Settings', slug: 'manage_settings', category: 'System' },
            { name: 'View Analytics', slug: 'view_analytics', category: 'System' },
            { name: 'Direct Memos', slug: 'direct_memos', category: 'Records' }
        ];

        for (const p of allPermissions) {
            const [perm] = await Permission.findOrCreate({
                where: { slug: p.slug },
                defaults: p
            });
            await perm.update(p); // Ensure category/name are updated
        }
        console.log('Permissions defined/updated.');

        // 2. Define Role Permissions
        const roleMappings = {
            'Admin': [
                'view_dashboard', 'create_record', 'review_communication', 'approve_record', 
                'decline_record', 'return_record', 'complete_task', 'manage_all_assignments', 
                'manage_users', 'manage_settings', 'view_analytics', 'direct_memos'
            ],
            'Division Head': [
                'view_dashboard', 'create_record', 'review_communication', 'approve_record', 
                'decline_record', 'return_record', 'complete_task', 'direct_memos'
            ],
            'Section Head': [
                'view_dashboard', 'create_record', 'approve_record', 'decline_record', 
                'return_record', 'complete_task', 'direct_memos'
            ],
            'Admin Section': [
                'view_dashboard', 'create_record', 'review_communication', 'direct_memos'
            ],
            'User': [
                'view_dashboard', 'complete_task' // Personnel MUST have complete_task
            ]
        };

        for (const [roleName, slugs] of Object.entries(roleMappings)) {
            const role = await Role.findOne({ where: { name: roleName } });
            if (!role) {
                console.log(`Role [${roleName}] not found, skipping.`);
                continue;
            }

            // Sync permissions for this role
            const perms = await Permission.findAll({ where: { slug: slugs } });
            await role.setPermissions(perms);
            console.log(`Synced ${perms.length} permissions for role: ${roleName}`);
        }

        console.log('--- SYNC COMPLETED ---');
        process.exit(0);
    } catch (error) {
        console.error('Sync failed:', error);
        process.exit(1);
    }
}

syncFinalPermissions();
