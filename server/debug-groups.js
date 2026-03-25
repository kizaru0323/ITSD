const { Group, User } = require('./models/index');

async function debugGroups() {
    try {
        const groups = await Group.findAll({
            include: [{ model: User, as: 'SectionHead' }]
        });
        console.log('Groups and their Heads:');
        groups.forEach(g => {
            console.log(`- ${g.name}: Head = ${g.SectionHead ? g.SectionHead.name : 'UNASSIGNED'} (headId: ${g.headId})`);
        });

        const sectionHeads = await User.findAll({
            where: { role: 'Section Head' }
        });
        console.log('\nUsers with Section Head role:');
        sectionHeads.forEach(u => {
            console.log(`- ${u.name} (ID: ${u.id}, groupId: ${u.groupId})`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

debugGroups();
