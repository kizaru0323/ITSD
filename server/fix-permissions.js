const { Role, Permission, RolePermission } = require('./models');

async function fixPermissions() {
    try {
        console.log('--- FIXING PERMISSIONS ---');

        // 1. Define Standard Permissions
        const standardPermissions = [
            { name: 'View Dashboard', slug: 'view_dashboard', category: 'General' },
            { name: 'Create Communication', slug: 'create_communication', category: 'Communications' },
            { name: 'Direct Memos', slug: 'direct_memos', category: 'Communications' },
            { name: 'Review Communication', slug: 'review_communication', category: 'Communications' },
            { name: 'Approve Communication', slug: 'approve_communication', category: 'Communications' },
            { name: 'Post to Section', slug: 'post_to_section', category: 'Communications' },
            { name: 'Manage Users', slug: 'manage_users', category: 'System' },
            { name: 'Manage Settings', slug: 'manage_settings', category: 'System' },
            { name: 'View Analytics', slug: 'view_analytics', category: 'System' }
        ];

        for (const p of standardPermissions) {
            await Permission.findOrCreate({
                where: { slug: p.slug },
                defaults: p
            });
        }

        // 2. Map Roles
        const roles = await Role.findAll();
        const getRoleId = (name) => roles.find(r => r.name === name)?.id;
        const getPermId = async (slug) => (await Permission.findOne({ where: { slug } }))?.id;

        const roleMappings = {
            'Admin': [
                'view_dashboard', 'create_communication', 'direct_memos', 
                'review_communication', 'approve_communication', 'post_to_section',
                'manage_users', 'manage_settings', 'view_analytics'
            ],
            'Division Head': [
                'view_dashboard', 'create_communication', 'review_communication'
            ],
            'Section Head': [
                'view_dashboard', 'direct_memos', 'approve_communication'
            ],
            'Admin Section': [
                'view_dashboard', 'create_communication', 'review_communication'
            ],
            'User': [
                'view_dashboard'
            ]
        };

        for (const [roleName, slugs] of Object.entries(roleMappings)) {
            const roleId = getRoleId(roleName);
            if (!roleId) {
                console.log(`Role ${roleName} not found, skipping...`);
                continue;
            }

            // Clear old permissions for this role
            await RolePermission.destroy({ where: { roleId } });

            // Assign new ones
            for (const slug of slugs) {
                const permId = await getPermId(slug);
                if (permId) {
                    await RolePermission.create({ roleId, permissionId: permId });
                }
            }
            console.log(`Synced permissions for ${roleName}`);
        }

        console.log('--- PERMISSIONS FIXED ---');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing permissions:', error);
        process.exit(1);
    }
}

fixPermissions();
