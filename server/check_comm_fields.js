const { Communication } = require('./models/index');
const sequelize = require('./db.config');

async function check() {
    try {
        await sequelize.authenticate();
        const first = await Communication.findOne();
        if (first) {
            console.log('Fields in Communication:', Object.keys(first.get()));
        } else {
            console.log('No communications found.');
        }
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

check();
