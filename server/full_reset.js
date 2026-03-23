const sequelize = require('./db.config');
const fs = require('fs');
const path = require('path');
const {
    User, Group, Announcement, ActivityLog, Communication,
    CommConfig, Role, Permission, RolePermission, AccountRequest,
    Notification, CommunicationAssignees, CommunicationSections,
    ActiveSession, Office, InternalRequest, InternalRequestAssignees,
    Attachment
} = require('./models/index');

async function fullReset() {
    try {
        console.log('Starting full database reset...');
        
        // Clear uploads directory
        const uploadsDir = path.join(__dirname, 'uploads');
        if (fs.existsSync(uploadsDir)) {
            console.log('Clearing uploads directory...');
            const files = fs.readdirSync(uploadsDir);
            for (const file of files) {
                if (file !== '.gitignore' && file !== '.gitkeep') {
                    fs.unlinkSync(path.join(uploadsDir, file));
                }
            }
        }
        
        // Disable foreign key checks for PostgreSQL to ensure smooth dropping
        await sequelize.query('SET CONSTRAINTS ALL DEFERRED');
        
        // We use sync({ force: true }) which drops all tables defined in models
        // But we might want to drop them explicitly if there are orphans or to be extra sure
        console.log('Force syncing all models (this drops and recreates tables)...');
        await sequelize.sync({ force: true });
        
        console.log('Database schema recreated. Now seeding initial data...');
        const bcrypt = require('bcryptjs');
        const adminPassword = await bcrypt.hash('admin123', 10);

        // Seed System Admin - MANDATORY for login
        await User.create({
            name: 'System Admin',
            email: 'admin@valencia.gov.ph',
            username: 'admin',
            password: adminPassword,
            role: 'Admin',
            status: 'active'
        });

        console.log('Seeding complete.');
        console.log('--------------------------------------------------');
        console.log('Admin Credentials:');
        console.log('Username: admin');
        console.log('Password: admin123');
        console.log('--------------------------------------------------');
        
        process.exit(0);
    } catch (error) {
        console.error('CRITICAL: Reset Failed:', error);
        process.exit(1);
    }
}

fullReset();
