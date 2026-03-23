const { User, Role, Group } = require('./models/index');
const sequelize = require('./db.config');

async function fixData() {
    try {
        await sequelize.authenticate();
        console.log('Database connected...');

        const roles = await Role.findAll();
        const adminRole = roles.find(r => r.name === 'Administrator');
        const sectionHeadRole = roles.find(r => r.name === 'Section Head');
        const userRole = roles.find(r => r.name === 'Regular User');

        const groups = await Group.findAll();
        const divisionGroup = groups.find(g => g.name === 'ITSD DIVISION');
        const websiteGroup = groups.find(g => g.name === 'WEBSITE MANAGEMENT SECTION');
        const softwareGroup = groups.find(g => g.name === 'SOFTWARE MANAGEMENT SECTION');
        const hardwareGroup = groups.find(g => g.name === 'HARDWARE MANAGEMENT SECTION');
        const adminSectionGroup = groups.find(g => g.name === 'ADMINISTRATIVE SECTION');

        // Verify groups exist
        const groupsFound = [divisionGroup, websiteGroup, softwareGroup, hardwareGroup, adminSectionGroup];
        if (groupsFound.some(g => !g)) {
            console.error('One or more groups not found!');
            groupsFound.forEach((g, i) => {
                if (!g) console.log(`Missing group: ${['Division', 'Website', 'Software', 'Hardware', 'AdminSection'][i]}`);
            });
            // Don't exit yet, try to find by name partially
        }

        console.log('Updating Harold...');
        const harold = await User.findOne({ where: { name: 'Harold Tulod' } });
        if (harold) await harold.update({ roleId: adminRole.id, groupId: null });

        console.log('Updating Ted...');
        const ted = await User.findOne({ where: { name: 'TED RAPHAEL A. PABIONA' } });
        if (ted) await ted.update({ roleId: sectionHeadRole.id, groupId: softwareGroup.id });

        console.log('Updating Rannel...');
        const rannel = await User.findOne({ where: { name: 'RANNEL JOHN D. CATOLPOS' } });
        if (rannel) await rannel.update({ roleId: sectionHeadRole.id, groupId: websiteGroup.id });

        console.log('Updating Mary...');
        const mary = await User.findOne({ where: { name: 'MARY KHRISTINE E. CAEL' } });
        if (mary) await mary.update({ roleId: userRole.id, groupId: adminSectionGroup.id });

        console.log('Updating Erlinda...');
        const erlinda = await User.findOne({ where: { name: 'ERLINDA B. SANDIG' } });
        if (erlinda) await erlinda.update({ roleId: sectionHeadRole.id, groupId: divisionGroup.id });

        console.log('Updating Rey Anthony...');
        const rey = await User.findOne({ where: { name: 'REY ANTHONY MAPALAD' } });
        if (rey) await rey.update({ roleId: sectionHeadRole.id, groupId: hardwareGroup.id });

        // Update others in Software section
        await User.update({ groupId: softwareGroup.id }, { where: { name: ['TRACES JAMES L. LEQUIN', 'COLLEN ALEXES E. PERNITES', 'JOHN DEXTER B. PEREZ', 'JEAN VILLE L. VILLALON'] } });

        console.log('Data synchronization completed.');
    } catch (error) {
        console.error('Error during data fix:', error);
    } finally {
        process.exit();
    }
}

fixData();
