const { Communication } = require('./models/index');
const sequelize = require('./db.config');

async function check() {
    try {
        await sequelize.authenticate();
        const records = await Communication.findAll({
            limit: 5,
            order: [['createdAt', 'DESC']],
            attributes: ['id', 'trackingId', 'subject', 'status', 'userId']
        });
        console.log('Recent Communications:');
        records.forEach(r => {
            console.log(JSON.stringify(r.toJSON(), null, 2));
        });
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

check();
