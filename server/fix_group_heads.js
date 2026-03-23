const { User, Group } = require('./models');
const sequelize = require('./db.config');

async function fix() {
    try {
        await sequelize.authenticate();
        const users = await User.findAll();
        const groups = await Group.findAll();

        for (const user of users) {
             // Link headId to group if they are a head
             const groupAsHead = groups.find(g => {
                 const headName = g.head.replace(/\s+/g, ' ').trim();
                 const userName = user.name.replace(/\s+/g, ' ').trim();
                 return userName.toLowerCase().includes(headName.toLowerCase()) || headName.toLowerCase().includes(userName.toLowerCase());
             });
             if (groupAsHead) {
                 console.log(`Linking group "${groupAsHead.name}" headId to User "${user.name}"`);
                 await groupAsHead.update({ headId: user.id });
             }

             // Link user to groupId based on personnel list or name match in group personnel JSON
             for (const group of groups) {
                 const personnel = Array.isArray(group.personnel) ? group.personnel : JSON.parse(group.personnel || '[]');
                 const isInPersonnel = personnel.some(p => {
                     const pName = p.name.replace(/\s+/g, ' ').trim();
                     const userName = user.name.replace(/\s+/g, ' ').trim();
                     return userName.toLowerCase().includes(pName.toLowerCase()) || pName.toLowerCase().includes(userName.toLowerCase());
                 });

                 if (isInPersonnel) {
                     console.log(`Linking User "${user.name}" to group "${group.name}"`);
                     await user.update({ groupId: group.id });
                     break;
                 }
             }
        }
        console.log('--- ENHANCED DATA FIX COMPLETED ---');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sequelize.close();
    }
}
fix();
