const { Group, User } = require('./models/index');

async function fixHeads() {
    try {
        // 1. Map known users to their groups
        // kenny is Section Head for Software (ID 2)
        await Group.update({ headId: 3 }, { where: { id: 2 } });
        
        // harol is Division Head for Division (ID 1)
        await Group.update({ headId: 2 }, { where: { id: 1 } });

        // mobe is Admin Section, but let's assign them as Head of Admins Management Section (ID 4) for flow
        await Group.update({ headId: 4 }, { where: { id: 4 } });

        console.log('Group heads updated successfully.');

        const groups = await Group.findAll({
            include: [{ model: User, as: 'SectionHead' }]
        });
        groups.forEach(g => {
            console.log(`- ${g.name}: Head = ${g.SectionHead ? g.SectionHead.name : 'UNASSIGNED'}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}

fixHeads();
