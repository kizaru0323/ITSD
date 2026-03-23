const { User } = require('./models/index');
const sequelize = require('./db.config');

async function check() {
    try {
        await sequelize.authenticate();
        const users = await User.findAll({
            attributes: ['id', 'name', 'role', 'department']
        });
        console.log('Users:');
        users.forEach(u => {
            console.log(JSON.stringify(u.toJSON(), null, 2));
        });
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

check();
