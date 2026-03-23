const bcrypt = require('bcryptjs');
const { User } = require('./models/index');
const sequelize = require('./db.config');

async function testPasswordChange() {
    try {
        await sequelize.authenticate();
        console.log('Connected.');

        // Find a test user (or first user)
        const user = await User.findOne();
        if (!user) {
            console.log('No user found');
            return;
        }

        console.log('Testing for user:', user.email);

        // Define passwords
        const oldHash = user.password;
        const testCurrent = 'user123'; // Assuming this is the current password for testing
        const testNew = 'newPassword123';

        // 1. Verify bcrypt compare works
        const isMatch = await bcrypt.compare(testCurrent, oldHash);
        if (isMatch) {
            console.log('Current password matches correctly.');
        } else {
            console.log('Current password DOES NOT match. (Is it really user123?)');
            // If it's not user123, we should not proceed with the automated test that overwrites it
            return;
        }

        // 2. Hash new password
        const newHash = await bcrypt.hash(testNew, 10);
        console.log('New hash generated.');

        // 3. Verify new hash matches its original
        const isNewMatch = await bcrypt.compare(testNew, newHash);
        if (isNewMatch) {
            console.log('SUCCESS: New password hashing and comparison works.');
        } else {
            console.log('FAILURE: New password mismatch.');
        }

    } catch (e) {
        console.error('Test failed:', e);
    } finally {
        await sequelize.close();
    }
}

testPasswordChange();
