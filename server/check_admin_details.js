const { User, Role, Group } = require('./models/index');
const sequelize = require('./db.config');

async function checkAdmins() {
    try {
        await sequelize.authenticate();
        const users = await User.findAll({ 
            where: { role: 'admin' }, 
            include: [
                { model: Role, as: 'UserRole' },
                { model: Group, as: 'HeadedGroup' }
            ] 
        });
        
        console.log('--- Administrator Users ---');
        users.forEach(u => {
            console.log(`ID: ${u.id}`);
            console.log(`Name: ${u.name}`);
            console.log(`Email: ${u.email}`);
            console.log(`Role (Column): ${u.role}`);
            console.log(`Role (RBAC): ${u.UserRole ? u.UserRole.name : 'NONE'}`);
            console.log(`Group ID: ${u.groupId}`);
            console.log(`Heads Group: ${u.HeadedGroup ? u.HeadedGroup.name : 'NONE'}`);
            console.log('---------------------------');
        });
    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
}

checkAdmins();
