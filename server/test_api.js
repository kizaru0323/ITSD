const { User, Group } = require('./models');
const sequelize = require('./db.config');
const { Op } = require('sequelize');

async function test() {
    try {
        await sequelize.authenticate();
        // Mimic the API logic
        const groupHeads = await Group.findAll({ 
            attributes: ['headId'],
            where: { headId: { [Op.ne]: null } }
        });
        const headIds = groupHeads.map(g => g.headId);
        console.log('HEAD IDS IN GROUPS:', headIds);

        const users = await User.findAll({
            where: { id: { [Op.in]: headIds } },
            include: [{ model: Group, as: 'HeadedGroup', attributes: ['id', 'name'] }],
            order: [['name', 'ASC']]
        });

        console.log('SECTION HEADS RETURNED BY API LOGIC:');
        users.forEach(u => {
            console.log(`- ${u.name} (ID: ${u.id}) Heads Group: ${u.HeadedGroup?.name || 'NONE'}`);
        });

        const allUsers = await User.findAll();
        console.log('\n--- FILTERING TEST ---');
        const selectedHead = users.find(u => u.name.includes('TED'));
        if (selectedHead && selectedHead.HeadedGroup) {
            const personnel = allUsers.filter(u => u.groupId === selectedHead.HeadedGroup.id);
            console.log(`Personnel under TED (${selectedHead.HeadedGroup.name}):`);
            personnel.forEach(p => console.log(`  - ${p.name}`));
        }

    } catch (err) {
        console.error(err);
    } finally {
        await sequelize.close();
    }
}
test();
