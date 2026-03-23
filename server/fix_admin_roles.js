const { User } = require('./models/index');
const sequelize = require('./db.config');

async function fixRoles() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Find users who have roleId = 1 (Administrator) but role is not 'admin'
        const legacyAdmins = await User.findAll({
            where: {
                roleId: 1,
                role: 'user'
            }
        });

        console.log(`Found ${legacyAdmins.length} accounts to fix.`);

        for (const user of legacyAdmins) {
            console.log(`Fixing role for: ${user.name} (${user.email})...`);
            user.role = 'admin';
            await user.save();
        }

        console.log('Roles synchronized successfully.');
    } catch (error) {
        console.error('Error fixing roles:', error);
    } finally {
        await sequelize.close();
    }
}

fixRoles();
