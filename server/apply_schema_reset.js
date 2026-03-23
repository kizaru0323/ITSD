const sequelize = require('./db.config');
const { User, ActivityLog } = require('./models/index');
const bcrypt = require('bcryptjs');

async function resetAndSeed() {
    try {
        console.log('Force syncing database (dropping and creating users/activity_logs)...');
        // We only want to drop/sync users and activity_logs as requested.
        // However, Sequelize doesn't easily support force syncing only specific tables while keeping others.
        // Instead, we will manually drop them.
        
        await sequelize.query('DROP TABLE IF EXISTS activity_logs CASCADE;');
        await sequelize.query('DROP TABLE IF EXISTS users CASCADE;');
        
        // Sync models
        await User.sync({ force: true });
        await ActivityLog.sync({ force: true });
        
        console.log('Creating seed users...');
        const adminPassword = await bcrypt.hash('admin123', 10);
        const userPassword = await bcrypt.hash('user123', 10);

        await User.create({
            name: 'System Admin',
            email: 'admin@valencia.gov.ph',
            password: adminPassword,
            role: 'admin'
        });

        await User.create({
            name: 'Regular User',
            email: 'user@valencia.gov.ph',
            password: userPassword,
            role: 'user'
        });

        console.log('Database reset and seed complete.');
        process.exit(0);
    } catch (error) {
        console.error('Error during reset/seed:', error);
        process.exit(1);
    }
}

resetAndSeed();
