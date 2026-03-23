const { ActivityLog, User } = require('./models/index');
const sequelize = require('./db.config');

async function test() {
    try {
        await sequelize.authenticate();
        console.log('Connected.');
        
        // Find a user
        const user = await User.findOne();
        if (!user) {
            console.log('No user found to log against');
            return;
        }

        // Create a log with details
        console.log('Creating test log...');
        const log = await ActivityLog.create({
            userId: user.id,
            action: 'Test Detailed Action',
            module: 'System',
            details: 'This is a test of the new details field: Tracking ID 12345'
        });
        console.log('Created log ID:', log.id);

        // Fetch it back
        const fetched = await ActivityLog.findByPk(log.id);
        console.log('Fetched Details:', fetched.details);

        if (fetched.details === 'This is a test of the new details field: Tracking ID 12345') {
            console.log('SUCCESS: Details field is working correctly.');
        } else {
            console.log('FAILURE: Details field mismatch.');
        }

    } catch (e) {
        console.error('Test failed:', e);
    } finally {
        await sequelize.close();
    }
}

test();
