const fs = require('fs');
const path = require('path');
const { Communication, InternalRequest, Attachment } = require('./models/index');
const sequelize = require('./db.config');

const UPLOADS_DIR = path.join(__dirname, 'uploads');

async function migrate() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // 1. Migrate Communication Attachments
        console.log('Migrating Communication attachments...');
        const communications = await Communication.findAll();
        for (const comm of communications) {
            let updated = false;
            
            // Handle main attachments
            if (Array.isArray(comm.attachments)) {
                const newAttachments = [];
                for (const item of comm.attachments) {
                    if (typeof item === 'string') {
                        const filePath = path.join(UPLOADS_DIR, item);
                        if (fs.existsSync(filePath)) {
                            const data = fs.readFileSync(filePath);
                            const mimeType = getMimeType(item);
                            const att = await Attachment.create({
                                filename: item,
                                mimeType: mimeType,
                                data: data,
                                communicationId: comm.id
                            });
                            newAttachments.push({ id: att.id, name: item, isDb: true });
                            updated = true;
                            console.log(`Migrated ${item} for Comm ID: ${comm.id}`);
                        } else {
                            console.warn(`File not found: ${filePath}`);
                            newAttachments.push(item); // Keep as is if file missing
                        }
                    } else {
                        newAttachments.push(item);
                    }
                }
                if (updated) comm.attachments = newAttachments;
            }

            // Handle completionProof
            if (Array.isArray(comm.completionProof)) {
                const newProof = [];
                for (const item of comm.completionProof) {
                    if (typeof item === 'string') {
                        const filePath = path.join(UPLOADS_DIR, item);
                        if (fs.existsSync(filePath)) {
                            const data = fs.readFileSync(filePath);
                            const mimeType = getMimeType(item);
                            const att = await Attachment.create({
                                filename: item,
                                mimeType: mimeType,
                                data: data,
                                communicationId: comm.id
                            });
                            newProof.push({ id: att.id, name: item, isDb: true });
                            updated = true;
                            console.log(`Migrated proof ${item} for Comm ID: ${comm.id}`);
                        } else {
                            newProof.push(item);
                        }
                    } else {
                        newProof.push(item);
                    }
                }
                if (updated) comm.completionProof = newProof;
            }

            if (updated) await comm.save();
        }

        // 2. Migrate InternalRequest Attachments
        console.log('Migrating InternalRequest attachments...');
        const internalRequests = await InternalRequest.findAll();
        for (const req of internalRequests) {
            let updated = false;
            if (Array.isArray(req.attachments)) {
                const newAttachments = [];
                for (const item of req.attachments) {
                    if (typeof item === 'string') {
                        const filePath = path.join(UPLOADS_DIR, item);
                        if (fs.existsSync(filePath)) {
                            const data = fs.readFileSync(filePath);
                            const mimeType = getMimeType(item);
                            const att = await Attachment.create({
                                filename: item,
                                mimeType: mimeType,
                                data: data,
                                internalRequestId: req.id
                            });
                            newAttachments.push({ id: att.id, name: item, isDb: true });
                            updated = true;
                            console.log(`Migrated ${item} for IntReq ID: ${req.id}`);
                        } else {
                            newAttachments.push(item);
                        }
                    } else {
                        newAttachments.push(item);
                    }
                }
                if (updated) {
                    req.attachments = newAttachments;
                    await req.save();
                }
            }
        }

        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

function getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    switch (ext) {
        case '.pdf': return 'application/pdf';
        case '.jpg':
        case '.jpeg': return 'image/jpeg';
        case '.png': return 'image/png';
        case '.gif': return 'image/gif';
        case '.doc': return 'application/msword';
        case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        case '.xls': return 'application/vnd.ms-excel';
        case '.xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        default: return 'application/octet-stream';
    }
}

migrate();
