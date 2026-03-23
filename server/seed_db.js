const { User, Permission, Group, CommConfig, ActivityLog, Announcement, Communication } = require('./models/index');
const sequelize = require('./db.config');

async function seedData() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();

        console.log('Resetting database (Dropping and recreating all tables)...');
        // This will drop ALL tables and recreate them based on the current models
        await sequelize.sync({ force: true });

        console.log('Seeding initial data...');

        // 1. Seed Permissions
        const permissions = [
            { name: 'View Dashboard', slug: 'view-dashboard', category: 'Dashboard' },
            { name: 'Manage Users', slug: 'manage-users', category: 'Users' },
            { name: 'Manage Roles', slug: 'manage-roles', category: 'System' },
            { name: 'Create Communications', slug: 'create-comms', category: 'Communications' },
        ];
        await Promise.all(permissions.map(p => Permission.create(p)));

        // 2. Seed Admin User
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        await User.create({
            name: 'ITSD ADMIN',
            email: 'admin@itsd.com',
            username: 'admin', // Added mandatory field
            password: hashedPassword, // Hashed password
            role: 'Admin',
            status: 'active'
        });

        // 3. Seed Default Group
        await Group.create({
            name: 'ITSD - INFORMATION TECHNOLOGY SERVICES DIVISION',
            personnel: JSON.stringify([{ name: 'ITSD HEAD', role: 'DIVISION HEAD' }]),
            support: JSON.stringify([{ name: 'SUPPORT 1', role: 'TECHNICAL' }])
        });

        // 4. Seed Comm Config
        await CommConfig.create({
            key: 'itsd_comm_config',
            value: {
                directions: ['INCOMING', 'OUTGOING', 'ITSD ONLY'],
                kinds: ['LETTER', 'MEMORANDUM', 'INDORSEMENT', 'REQUEST', 'URGENT COMMUNICATION', 'BUREAU/DIRECTORATE/OFFICE LETTER', 'ADVISORY', 'NOTICE', 'ITSD REQUEST FORM', 'OFFICE ORDER', 'CERTIFICATE'],
                types: ['IMAGE', 'PDF', 'EXCEL/SPREADSHEET', 'OTHERS'],
                tags: ['Software', 'Hardware', 'Network', 'Account', 'Security', 'Maintenance', 'Support']
            }
        });

        console.log('--- DATABASE RESET AND SEEDED SUCCESSFULLY ---');
        console.log('Admin Access:');
        console.log('Email: admin@itsd.com');
        console.log('Password: admin123');

    } catch (error) {
        console.error('Error during database reset:', error);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

seedData();
