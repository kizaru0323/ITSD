const sequelize = require('./db.config');
try {
    const models = require('./models/index');
    console.log('Models loaded successfully:', Object.keys(models));
    sequelize.authenticate()
        .then(() => {
            console.log('Database connection OK');
            process.exit(0);
        })
        .catch(err => {
            console.error('Connection error:', err);
            process.exit(1);
        });
} catch (e) {
    console.error('Error loading models:', e);
    process.exit(1);
}
