const { Group, User } = require('./models/index');

async function checkGroups() {
    try {
        const groups = await Group.findAll({
            include: [{
                model: User,
                as: 'SectionHead',
                attributes: ['id', 'name', 'role']
            }]
        });
        console.log(JSON.stringify(groups, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkGroups();
