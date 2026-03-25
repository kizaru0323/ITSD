const { User, Role } = require('./models/index');

async function check() {
    try {
        const user = await User.findOne({ 
            where: { username: 'harold' },
            include: [{ model: Role, as: 'UserRole' }]
        });
        if (user) {
            console.log('User found:', user.toJSON());
            console.log('Role found:', user.UserRole ? user.UserRole.toJSON() : 'No Role');
        } else {
            console.log('User not found');
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        process.exit();
    }
}

check();
