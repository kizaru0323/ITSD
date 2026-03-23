const { Office } = require('./models');

const OFFICES = [
    'CMO', 'BAC', 'HRMO', 'CNCO', 'CEO', 'CADO', 'CASSCO', 'CHO', 'CBO', 'CDRRMO',
    'GSO', 'CENRO', 'CEEO', 'CLO', 'BPLD', 'CPDC', 'CCRO', 'CSWD', 'TOURISM OFFICE',
    'CTO', 'CVO', 'PROSECUTOR\'S OFFICE', 'DILG VALENCIA', 'DBM', 'BFP', 'COA', 'ITSD', 'PNP'
];

async function seedOffices() {
    try {
        console.log('Seeding offices...');
        for (const name of OFFICES) {
            await Office.findOrCreate({
                where: { name },
                defaults: { type: 'INTERNAL' }
            });
        }
        console.log('Seeding complete.');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seedOffices();
