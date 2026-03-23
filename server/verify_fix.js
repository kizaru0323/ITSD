// Verification script for Section Heads

async function verify() {
    const API_BASE_URL = 'http://localhost:5000';
    try {
        // We'll need a token. Since I can't easily get one, I'll check if the server is running and accessible.
        // Actually, I'll just check the code logic again or try to run a script that uses the models directly.
        
        const { User, Group } = require('./models');
        const { Op } = require('sequelize');

        console.log('--- Verifying Section Heads ---');
        const users = await User.findAll({
            where: { status: 'active' },
            include: [{ model: Group, as: 'HeadedGroup' }]
        });

        const activeHeads = users.filter(u => 
            (u.HeadedGroup) && 
            u.role !== 'Division Head' && 
            u.roleId !== 7 &&
            u.name !== 'Erlinda B. Sandig'
        );

        console.log('Active Section Heads found:', activeHeads.map(u => ({ id: u.id, name: u.name, status: u.status })));
        
        const inactiveHeads = await User.findAll({
            where: { status: { [Op.ne]: 'active' } },
            include: [{ model: Group, as: 'HeadedGroup' }]
        });

        const filteredInactive = inactiveHeads.filter(u => u.HeadedGroup);
        console.log('Inactive heads that SHOULD be filtered out:', filteredInactive.map(u => ({ id: u.id, name: u.name, status: u.status })));

        console.log('Verification Complete.');
    } catch (err) {
        console.error('Verification failed:', err);
    }
}

verify();
