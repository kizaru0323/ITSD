const express = require('express');
const cors = require('cors');
const sequelize = require('./db.config');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const authenticate = require('./middleware/auth');
require('dotenv').config();

const bcrypt = require('bcryptjs');
const {
    Communication, User, Group, Announcement, ActivityLog,
    CommConfig, Role, Permission, RolePermission, AccountRequest, Notification,
    ActiveSession, CommunicationAssignees, InternalRequest, InternalRequestAssignees,
    Attachment
} = require('./models/index');
const officeRoutes = require('./routes/officeRoutes');
const { logActivity } = require('./utils/logger');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check and DB connection verification
app.get('/api/health', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.json({
            status: 'UP',
            database: 'Connected',
            message: 'Server is healthy and database is connected.'
        });
    } catch (error) {
        res.status(500).json({
            status: 'READY FOR ARCHIVING',
            database: 'Disconnected',
            error: error.message
        });
    }
});

// ── Active Session Tracking (DB-backed for persistence) ──
// Sessions expire after 90s with no heartbeat
const SESSION_TTL_MS = 90 * 1000;

// Heartbeat: called on login + every 30s by the frontend
app.post('/api/sessions/ping', authenticate, async (req, res) => {
    try {
        const { userId, name, role } = req.body;
        if (!userId || !name) return res.status(400).json({ error: 'userId and name required' });

        await ActiveSession.upsert({
            userId: parseInt(userId),
            name,
            role,
            lastPing: Date.now()
        });

        res.json({ status: 'ok' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.use('/api/offices', officeRoutes);

// Clear session on logout
app.delete('/api/sessions/ping/:userId', authenticate, async (req, res) => {
    try {
        await ActiveSession.destroy({ where: { userId: req.params.userId } });
        res.json({ status: 'cleared' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get currently active users (pinged within TTL)
app.get('/api/sessions/active', authenticate, async (req, res) => {
    try {
        const now = Date.now();
        const expiryTime = now - SESSION_TTL_MS;

        // Clean up expired sessions first
        await ActiveSession.destroy({
            where: {
                lastPing: { [Op.lt]: expiryTime }
            }
        });

        const active = await ActiveSession.findAll();
        res.json(active);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const path = require('path');
const multer = require('multer');

// Configure Multer for file uploads (MEMORY STORAGE for DB-backed files)
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPG, PNG, WEBP, PDF, DOC, and EXCEL files are allowed.'), false);
        }
    }
});

// Legacy static file serving removed - all files now stored in DB

// GET Attachment by ID (DB-backed)
app.get('/api/attachments/:id', async (req, res) => {
    try {
        const attachment = await Attachment.findByPk(req.params.id);
        if (!attachment) return res.status(404).json({ error: 'File not found' });

        res.set({
            'Content-Type': attachment.mimeType,
            'Content-Disposition': `inline; filename="${attachment.filename}"`,
            'Cache-Control': 'public, max-age=31536000'
        });
        res.send(attachment.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET all communications
app.get('/api/communications', authenticate, async (req, res) => {
    try {
        // 1. Get IDs of communications where user is an assignee
        const userAssignments = await CommunicationAssignees.findAll({
            where: { userId: req.user.id },
            attributes: ['communicationId']
        });
        const assignedIds = userAssignments.map(ua => ua.communicationId);

        const userPermissions = req.user.permissions || [];
        const isAdmin = userPermissions.includes('manage_users') || userPermissions.includes('manage_settings') || userPermissions.includes('manage_all_communications');
        const isDivHead = userPermissions.includes('review_communication');
        const isAdminSection = userPermissions.includes('direct_memos') || userPermissions.includes('create_record');

        // 4. Build filtering logic based on role
        // Admin and Admin Section (Dispatch) see everything
        let whereClause = {};

        if (!isAdmin && !isAdminSection) {
            if (isDivHead) {
                // Division Head sees their review tasks + anything in progress/done
                whereClause = {
                    [Op.or]: [
                        { status: ['PENDING_DIV_HEAD', 'PENDING_DIV_APPROVAL', 'DIV_ACCEPTED', 'PENDING_SECTION_HEAD', 'APPROVED', 'COMPLETED', 'READY FOR ARCHIVING'] },
                        { divisionHeadId: req.user.id },
                        { userId: req.user.id }
                    ]
                };
            } else {
                // Section Heads and Regular Users
                const isSectionHead = req.user.role === 'Section Head';

                if (isSectionHead) {
// Section Head: Sees their own, specifically assigned, OR approved/pending-section-head tickets
                    whereClause = {
                        [Op.or]: [
                            { userId: req.user.id },
                            // Section Heads see tickets pending their action
                            { 
                                [Op.and]: [
                                    { status: 'PENDING_SECTION_HEAD' },
                                    { 
                                        [Op.or]: [
                                            { sectionHeadId: req.user.id },
                                            { id: { [Op.in]: assignedIds } }
                                        ]
                                    }
                                ]
                            },
                            // Section Heads see tickets that are APPROVED or later for their section
                            {
                                [Op.and]: [
                                    { status: ['APPROVED', 'COMPLETED', 'READY FOR ARCHIVING'] },
                                    {
                                        [Op.or]: [
                                            { sectionHeadId: req.user.id },
                                            { assignedToId: req.user.id },
                                            { id: { [Op.in]: assignedIds } }
                                        ]
                                    }
                                ]
                            }
                        ]
                    };
                } else {
                    // Regular users: Only their own or explicitly assigned AND status is APPROVED or later
                    whereClause = {
                        [Op.or]: [
                            { userId: req.user.id }, // Can see their own always
                            {
                                [Op.and]: [
                                    { status: ['APPROVED', 'COMPLETED', 'READY FOR ARCHIVING'] },
                                    {
                                        [Op.or]: [
                                            { assignedToId: req.user.id },
                                            { id: { [Op.in]: assignedIds } }
                                        ]
                                    }
                                ]
                            }
                        ]
                    };
                }
            }
        }
        console.log('GET /api/communications - User ID:', req.user.id, 'Role:', req.user.role);
        console.log('whereClause:', JSON.stringify(whereClause));

        const communications = await Communication.findAll({
            where: whereClause,
            include: [
                { model: User, as: 'Assignee' },
                { model: User, as: 'Assignees' }, // Include the many-to-many collection
                { model: User, as: 'Receiver' },
                { model: Group, as: 'Office' },
                {
                    model: Group,
                    as: 'AssignedSections',
                    include: [{ model: User, as: 'SectionHead', attributes: ['id', 'name'] }]
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(communications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- ANALYTICS ENDPOINTS ---

// GET system overview stats (optimized)
app.get('/api/analytics/overview', authenticate, async (req, res) => {
    try {
        const userPermissions = req.user.permissions || [];
        if (!userPermissions.includes('view_analytics') && !userPermissions.includes('manage_users')) {
            return res.status(403).json({ error: 'Permission denied: Analytics access required.' });
        }

        // 7. Active today, New this month, and Stats
        const today = new Date();
        today.setHours(0,0,0,0);
        const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const [activeToday, newThisMonth, totalUsers, totalComms, statusCounts, roleCounts, priorityCounts, followUpCount] = await Promise.all([
            User.count({ where: { updatedAt: { [Op.gte]: today } } }),
            User.count({ where: { createdAt: { [Op.gte]: firstOfMonth } } }),
            User.count(),
            Communication.count(),
            Communication.findAll({
                attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
                group: ['status']
            }),
            User.findAll({
                attributes: ['role', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
                group: ['role']
            }),
            Communication.findAll({
                attributes: ['priority', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
                group: ['priority']
            }),
            Communication.count({ where: { followUp: { [Op.ne]: null, [Op.ne]: '' } } })
        ]);

        res.json({
            totalUsers,
            totalComms,
            activeToday,
            newThisMonth,
            avgSessionTime: '11h 27m', // Simplified for now
            totalFollowUps: followUpCount,
            statusDistribution: statusCounts,
            roleDistribution: roleCounts,
            priorityDistribution: priorityCounts,
            timestamp: new Date()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET system performance metrics
app.get('/api/analytics/performance', authenticate, async (req, res) => {
    try {
        const userPermissions = req.user.permissions || [];
        if (!userPermissions.includes('view_analytics') && !userPermissions.includes('manage_users')) {
            return res.status(403).json({ error: 'Permission denied: Analytics access required.' });
        }

        // 1. Average completion time (for COMPLETED status)
        const completedComms = await Communication.findAll({
            where: { status: 'COMPLETED' },
            attributes: ['createdAt', 'updatedAt']
        });

        let totalDuration = 0;
        completedComms.forEach(c => {
            const start = new Date(c.createdAt);
            const end = new Date(c.updatedAt);
            totalDuration += (end - start);
        });
        const avgCompletionDays = completedComms.length > 0
            ? (totalDuration / completedComms.length / (1000 * 60 * 60 * 24)).toFixed(2)
            : 0;

        // 2. Volume by month (Last 12 months)
        const last12Months = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            last12Months.push({
                month: d.toLocaleString('default', { month: 'short' }),
                year: d.getFullYear(),
                count: 0
            });
        }

        const allComms = await Communication.findAll({ attributes: ['createdAt'] });
        allComms.forEach(c => {
            const cd = new Date(c.createdAt);
            const m = cd.toLocaleString('default', { month: 'short' });
            const y = cd.getFullYear();
            const found = last12Months.find(l => l.month === m && l.year === y);
            if (found) found.count++;
        });

        res.json({
            avgCompletionDays,
            monthlyVolume: last12Months,
            totalSamples: completedComms.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- ADVANCED COMMAND CENTER V3 ENDPOINTS ---

// 1. Bottleneck Analysis: Avg time in each status
app.get('/api/analytics/bottlenecks', authenticate, async (req, res) => {
    try {
        const userPermissions = req.user.permissions || [];
        if (!userPermissions.includes('view_analytics') && !userPermissions.includes('manage_users')) {
            return res.status(403).json({ error: 'Permission denied: Analytics access required.' });
        }

        // We'll approximate by looking at (updatedAt - createdAt) for records currently in that status
        const statuses = ['PENDING_DIV_HEAD', 'PENDING_SECTION_HEAD', 'PENDING_DIV_APPROVAL', 'APPROVED'];
        const bottlenecks = await Promise.all(statuses.map(async (s) => {
            const docs = await Communication.findAll({
                where: { status: s },
                attributes: ['createdAt', 'updatedAt']
            });

            let totalWait = 0;
            const now = new Date();
            docs.forEach(d => {
                totalWait += (now - new Date(d.createdAt));
            });

            return {
                status: s,
                avgWaitDays: docs.length > 0 ? (totalWait / docs.length / (1000 * 60 * 60 * 24)).toFixed(1) : 0,
                count: docs.length
            };
        }));

        res.json(bottlenecks);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Section Performance: Compare Groups
app.get('/api/analytics/section-performance', authenticate, async (req, res) => {
    try {
        const userPermissions = req.user.permissions || [];
        if (!userPermissions.includes('view_analytics') && !userPermissions.includes('manage_users')) {
            return res.status(403).json({ error: 'Permission denied: Analytics access required.' });
        }

        const groups = await Group.findAll({
            include: [{
                model: Communication,
                as: 'SectionCommunications',
                attributes: ['status', 'createdAt', 'updatedAt']
            }]
        });

        const performance = groups.map(g => {
            const comms = g.SectionCommunications || [];
            const completed = comms.filter(c => c.status === 'COMPLETED' || c.status === 'READY FOR ARCHIVING');

            let totalTime = 0;
            completed.forEach(c => {
                totalTime += (new Date(c.updatedAt) - new Date(c.createdAt));
            });

            return {
                section: g.name,
                total: comms.length,
                completed: completed.length,
                efficiency: comms.length > 0 ? ((completed.length / comms.length) * 100).toFixed(0) : 0,
                avgDays: completed.length > 0 ? (totalTime / completed.length / (1000 * 60 * 60 * 24)).toFixed(1) : 0
            };
        });

        res.json(performance);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. System Health: Real-time Server Stats
app.get('/api/analytics/system-health', authenticate, async (req, res) => {
    try {
        const userPermissions = req.user.permissions || [];
        if (!userPermissions.includes('view_analytics') && !userPermissions.includes('manage_users')) {
            return res.status(403).json({ error: 'Permission denied: Analytics access required.' });
        }

        const stats = {
            uptime: os.uptime(),
            cpuLoad: os.loadavg()[0].toFixed(2),
            freeMem: (os.freemem() / 1024 / 1024 / 1024).toFixed(2),
            totalMem: (os.totalmem() / 1024 / 1024 / 1024).toFixed(2),
            platform: os.platform(),
            nodeVersion: process.version
        };

        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 5. User Growth: Monthly cumulative
app.get('/api/analytics/user-growth', authenticate, async (req, res) => {
    try {
        const userPermissions = req.user.permissions || [];
        if (!userPermissions.includes('view_analytics') && !userPermissions.includes('manage_users')) {
            return res.status(403).json({ error: 'Permission denied: Analytics access required.' });
        }

        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            months.push({
                name: d.toLocaleString('default', { month: 'short' }),
                date: new Date(d.getFullYear(), d.getMonth() + 1, 0) // End of month
            });
        }

        const growth = await Promise.all(months.map(async (m) => {
            const count = await User.count({
                where: { createdAt: { [Op.lte]: m.date } }
            });
            return { month: m.name, total: count };
        }));

        res.json(growth);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 6. Activity Trend: Logins, Creations, Deletions (Last 7 days)
app.get('/api/analytics/activity-trend', authenticate, async (req, res) => {
    try {
        const userPermissions = req.user.permissions || [];
        if (!userPermissions.includes('view_analytics') && !userPermissions.includes('manage_users')) {
            return res.status(403).json({ error: 'Permission denied: Analytics access required.' });
        }

        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push({
                day: d.toLocaleString('default', { weekday: 'short' }),
                date: d.toISOString().split('T')[0]
            });
        }

        const trend = await Promise.all(days.map(async (d) => {
            const [logins, creations] = await Promise.all([
                ActivityLog.count({
                    where: {
                        action: { [Op.iLike]: '%login%' },
                        created_at: {
                            [Op.gte]: new Date(d.date + 'T00:00:00Z'),
                            [Op.lte]: new Date(d.date + 'T23:59:59Z')
                        }
                    }
                }),
                ActivityLog.count({
                    where: {
                        action: { [Op.iLike]: '%Submitted Communication%' },
                        created_at: {
                            [Op.gte]: new Date(d.date + 'T00:00:00Z'),
                            [Op.lte]: new Date(d.date + 'T23:59:59Z')
                        }
                    }
                })
            ]);
            return { day: d.day, logins, creations, deletions: 0 }; // Deletions not tracked yet
        }));

        res.json(trend);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 7. Communication Direction Trend (Last 7 days)
app.get('/api/analytics/communication-direction', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'Admin' && req.user.roleId !== 1) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push({
                day: d.toLocaleString('default', { weekday: 'short' }),
                date: d.toISOString().split('T')[0]
            });
        }

        const trend = await Promise.all(days.map(async (d) => {
            const [incoming, outgoing, itsd] = await Promise.all([
                Communication.count({
                    where: {
                        direction: 'INCOMING',
                        createdAt: {
                            [Op.gte]: new Date(d.date + 'T00:00:00Z'),
                            [Op.lte]: new Date(d.date + 'T23:59:59Z')
                        }
                    }
                }),
                Communication.count({
                    where: {
                        direction: 'OUTGOING',
                        createdAt: {
                            [Op.gte]: new Date(d.date + 'T00:00:00Z'),
                            [Op.lte]: new Date(d.date + 'T23:59:59Z')
                        }
                    }
                }),
                Communication.count({
                    where: {
                        direction: 'ITSD ONLY',
                        createdAt: {
                            [Op.gte]: new Date(d.date + 'T00:00:00Z'),
                            [Op.lte]: new Date(d.date + 'T23:59:59Z')
                        }
                    }
                })
            ]);
            return { day: d.day, incoming, outgoing, itsd };
        }));

        res.json(trend);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET user's own communications (for UserProjects page)
app.get('/api/communications/me', authenticate, async (req, res) => {
    try {
        // Fetch IDs where user is part of many-to-many assignees
        const assignedRecords = await CommunicationAssignees.findAll({
            where: { userId: req.user.id },
            attributes: ['communicationId']
        });
        const assignedIds = assignedRecords.map(r => r.communicationId);

        const communications = await Communication.findAll({
            where: {
                [Op.or]: [
                    { userId: req.user.id },
                    { assignedToId: req.user.id },
                    { sectionHeadId: req.user.id },
                    { id: { [Op.in]: assignedIds } }
                ]
            },
            include: [
                { model: Group, as: 'Office' }
            ],
            order: [['createdAt', 'DESC']]
        });
        console.log('GET /api/communications/me - Found:', communications.length);
        res.json(communications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET a single communication by ID
app.get('/api/communications/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const communication = await Communication.findByPk(id, {
            include: [
                { model: User, as: 'Assignee' },
                { model: User, as: 'Assignees' },
                { model: User, as: 'Receiver' },
                { model: Group, as: 'Office' },
                {
                    model: Group,
                    as: 'AssignedSections',
                    include: [{ model: User, as: 'SectionHead', attributes: ['id', 'name'] }]
                }
            ]
        });

        if (!communication) {
            return res.status(404).json({ error: 'Communication not found' });
        }

        res.json(communication);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST new communication with multiple file uploads
app.post('/api/communications', authenticate, upload.array('attachment', 10), async (req, res) => {
    // Permission check
    if (!req.user.permissions?.includes('create_communication')) {
        return res.status(403).json({ error: 'Permission denied: Access restricted for this account type.' });
    }
    try {
        const data = req.body;
        data.userId = req.user.id; // Track the creator

        // Basic validation
        const requiredFields = ['direction', 'date', 'subject'];
        for (const field of requiredFields) {
            if (!data[field]) {
                return res.status(400).json({ error: `Field '${field}' is required.` });
            }
        }

        // Specialized check for 'kind' (Category)
        if (!data.kinds && !data.otherKind) {
            return res.status(400).json({ error: "Category (Kind) is required. Please select at least one category or specify in 'Others'." });
        }


        // Handle multiple file uploads (SAVE TO DB)
        const attachmentsMetadata = [];
        if (req.files && req.files.length > 0) {
            // We'll create the record first to get the communication ID,
            // but we can also use req.files temporarily.
            // Actually, we'll save them as we go but we need the commId.
        }

        // Map 'kinds' from frontend to 'kind' in database
        if (data.kinds) {
            let kindList = data.kinds;
            if (data.otherKind) {
                kindList = kindList ? `${kindList}, ${data.otherKind}` : data.otherKind;
            }
            data.kind = kindList;
        } else if (data.otherKind) {
            data.kind = data.otherKind;
        }

        // Try to resolve IDs from strings if provided and set Labels
        if (data.sectionHead) data.sectionHeadLabel = data.sectionHead;
        if (data.divisionHead) data.divisionHeadLabel = data.divisionHead;
        if (data.office) data.officeLabel = data.office;
        if (data.assignedTo) data.assignedToLabel = data.assignedTo;

        // If IDs are missing but Labels are present, try to find them (backwards compatibility)
        if (!data.sectionHeadId && data.sectionHead) {
            const user = await User.findOne({ where: { name: data.sectionHead } });
            if (user) data.sectionHeadId = user.id;
        }
        if (!data.divisionHeadId && data.divisionHead) {
            const user = await User.findOne({ where: { name: data.divisionHead } });
            if (user) data.divisionHeadId = user.id;
        }
        if (!data.officeId && data.office) {
            const group = await Group.findOne({ where: { name: data.office } });
            if (group) data.officeId = group.id;
        }
        if (!data.assignedToId && data.assignedTo) {
            const user = await User.findOne({ where: { name: data.assignedTo } });
            if (user) data.assignedToId = user.id;
        }

        // Sanitize integer fields (convert "" to null)
        ['sectionHeadId', 'divisionHeadId', 'officeId', 'assignedToId', 'userId'].forEach(f => {
            if (data[f] === '') data[f] = null;
        });

        const newComm = await Communication.create(data);

        // --- NEW: Tiered Communication Flow Logic (Matches User's Requested "Big 5" Flow) ---
        const userRole = req.user.role;
        
        let targetStatus = 'PENDING'; // Default fallback

        if (userRole === 'Admin Section') {
            // Flow: Admin Section -> Division Head Review
            // UNLESS a Section Head is already selected, then it goes direct (Legacy Restoration)
            targetStatus = data.sectionHeadId ? 'PENDING_SECTION_HEAD' : 'PENDING_DIV_HEAD';
        } else if (userRole === 'Division Head') {
            // Flow: Division Head -> Section Head (Direct)
            targetStatus = 'PENDING_SECTION_HEAD';
        } else if (userRole === 'Section Head') {
            // Flow: Section Head -> Division Head Approval (Internal ITSD Request)
            targetStatus = 'PENDING_DIV_APPROVAL';
        } else if (userRole === 'Admin') {
            // Admin can create anything, but usually follows Div Head or Admin Section flow.
            // Default to PENDING_DIV_HEAD for review or PENDING_SECTION_HEAD if direct.
            targetStatus = data.isDirectPost === 'true' || data.isDirectPost === true ? 'PENDING_SECTION_HEAD' : 'PENDING_DIV_HEAD';
        } else {
            // Regular User (if allowed)
            targetStatus = 'PENDING_DIV_HEAD';
        }

        newComm.status = targetStatus;
        await newComm.save();

        // --- NEW: Multi-Assignee Attachment ---
        if (data.assignedToIds) {
            let ids = [];
            try {
                if (typeof data.assignedToIds === 'string') {
                    const parsed = JSON.parse(data.assignedToIds);
                    ids = Array.isArray(parsed) ? parsed : [parsed];
                } else {
                    ids = Array.isArray(data.assignedToIds) ? data.assignedToIds : [data.assignedToIds];
                }
            } catch (e) {
                ids = [data.assignedToIds];
            }

            const validIds = ids
                .map(id => parseInt(id))
                .filter(id => !isNaN(id) && id > 0);

            if (validIds.length > 0) {
                await newComm.setAssignees(validIds);
            }
        }

        // --- SAVE ATTACHMENTS TO DATABASE ---
        if (req.files && req.files.length > 0) {
            const uploadedAttachments = await Promise.all(req.files.map(async (file) => {
                return await Attachment.create({
                    filename: file.originalname,
                    mimeType: file.mimetype,
                    data: file.buffer,
                    communicationId: newComm.id
                });
            }));
            
            // Update the communication with the new attachment references (mapping to backend IDs)
            newComm.attachments = uploadedAttachments.map(att => ({
                id: att.id,
                name: att.filename,
                isDb: true
            }));
            await newComm.save();
        } else {
            newComm.attachments = [];
            await newComm.save();
        }

        // Notify Division Head (Tiered Flow)
        if (newComm.status === 'PENDING_DIV_HEAD' || newComm.status === 'PENDING_DIV_APPROVAL') {
            const divHeads = await User.findAll({ where: { role: 'Division Head' } });

            // Fetch submitter info for clearer notification if it's internal
            let submitterName = 'Section Head';
            if (newComm.direction === 'ITSD ONLY' && newComm.userId) {
                const sub = await User.findByPk(newComm.userId);
                if (sub) submitterName = sub.name;
            }

            for (const dh of divHeads) {
                const notifMessage = newComm.direction === 'ITSD ONLY'
                    ? `NEW INTERNAL REQUEST from ${submitterName}: ${newComm.subject}`
                    : `New communication ${newComm.trackingId} requires your review/approval.`;

                await Notification.create({
                    userId: dh.id,
                    message: notifMessage,
                    type: newComm.direction === 'ITSD ONLY' ? 'WARNING' : 'INFO',
                    relatedId: newComm.id,
                    relatedType: 'COMMUNICATION'
                });
            }
        }

        // Notify Section Head specifically (Delegation Flow - if already assigned)
        if (newComm.sectionHeadId && newComm.status === 'PENDING') {
            await Notification.create({
                userId: newComm.sectionHeadId,
                message: `New communication ${newComm.trackingId} has been routed to you for internal assignment.`,
                type: 'INFO',
                relatedId: newComm.id,
                relatedType: 'COMMUNICATION'
            });
        }

        // Notify Admins of new submission
        const { Op } = require('sequelize');
        const admins = await User.findAll({ where: { [Op.or]: [{ role: 'admin' }, { role: 'Admin' }, { roleId: 1 }] } });
        for (const admin of admins) {
            await Notification.create({
                userId: admin.id,
                message: `New communication ${newComm.trackingId} submitted by ${req.user.name}.`,
                type: 'INFO',
                relatedId: newComm.id,
                relatedType: 'COMMUNICATION'
            });
        }

        // Log the activity using centralized utility with details
        await logActivity(req.user.id, 'Submitted Communication', 'Communications', req, `Tracking ID: ${newComm.trackingId} | Subject: ${newComm.subject}`);

        res.status(201).json(newComm);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// GET all internal requests
app.get('/api/internal-requests', authenticate, async (req, res) => {
    try {
        const userPermissions = req.user.permissions || [];
        const isDivHead = userPermissions.includes('review_communication');
        const isAdmin = userPermissions.includes('manage_users') || userPermissions.includes('manage_settings');

        let whereClause = {};
        if (isDivHead) {
            whereClause = { divisionHeadId: req.user.id };
        } else if (req.user.role === 'Admin Section' || isAdmin) {
            // Admin Section and Master Admin see all
            whereClause = {};
        } else {
            whereClause = { userId: req.user.id };
        }

        const requests = await InternalRequest.findAll({
            where: whereClause,
            include: [
                { model: User, as: 'Sender', attributes: ['id', 'name'] },
                { model: User, as: 'Recipient', attributes: ['id', 'name'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/internal-requests', authenticate, upload.array('attachment', 10), async (req, res) => {
    try {
        const data = req.body;
        data.userId = req.user.id;

        const newInternal = await InternalRequest.create({
            ...data,
            status: 'PENDING_DIV_APPROVAL'
        });

        // --- SAVE ATTACHMENTS TO DATABASE ---
        if (req.files && req.files.length > 0) {
            const uploadedAttachments = await Promise.all(req.files.map(async (file) => {
                return await Attachment.create({
                    filename: file.originalname,
                    mimeType: file.mimetype,
                    data: file.buffer,
                    internalRequestId: newInternal.id
                });
            }));
            
            // Update the internal request with the new attachment references
            newInternal.attachments = uploadedAttachments.map(att => ({
                id: att.id,
                name: att.filename,
                isDb: true
            }));
            await newInternal.save();
        } else {
            newInternal.attachments = [];
            await newInternal.save();
        }

        const divHeads = await User.findAll({ where: { role: 'Division Head' } });
        for (const dh of divHeads) {
            await Notification.create({
                userId: dh.id,
                message: `NEW INTERNAL REQUEST from ${req.user.name}: ${newInternal.subject}`,
                type: 'WARNING',
                relatedId: newInternal.id,
                relatedType: 'INTERNAL_REQUEST'
            });
        }

        await logActivity(req.user.id, 'Sent Internal Request', 'Internal', req, `Tracking ID: ${newInternal.trackingId}`);
        res.status(201).json(newInternal);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// --- INTERNAL REQUESTS LIFE-CYCLE ---

app.patch('/api/internal-requests/:id/review', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;
        const userRole = req.user.role?.toLowerCase() || '';
        const isDivHead = userRole === 'division head' || req.user.roleId === 7;
        const isAdmin = userRole === 'admin' || req.user.roleId === 1;

        if (!isDivHead && !isAdmin) {
            return res.status(403).json({ error: 'Only Division Head can review internal requests.' });
        }

        const request = await InternalRequest.findByPk(id);
        if (!request) return res.status(404).json({ error: 'Request not found.' });

        request.status = status;
        if (remarks) request.remarks = remarks;
        await request.save();

        await Notification.create({
            userId: request.userId,
            message: `Your internal request "${request.subject}" has been ${status}.`,
            type: status === 'APPROVED' ? 'SUCCESS' : 'WARNING',
            relatedId: request.id,
            relatedType: 'INTERNAL_REQUEST'
        });

        await logActivity(req.user.id, `Reviewed Internal Request: ${status}`, 'Internal', req, `ID: ${id}`);
        res.json(request);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.patch('/api/internal-requests/:id/delegate', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { assigneeIds } = req.body;

        const request = await InternalRequest.findByPk(id);
        if (!request) return res.status(404).json({ error: 'Request not found.' });

        if (request.userId !== req.user.id) {
            return res.status(403).json({ error: 'Only the submitting Section Head can delegate personnel.' });
        }

        if (request.status !== 'APPROVED') {
            return res.status(400).json({ error: 'Personnel can only be assigned to approved requests.' });
        }

        if (!req.user.groupId) {
            return res.status(400).json({ error: 'Your account is not assigned to a section. Please contact an admin.' });
        }

        const personnel = await User.findAll({
            where: {
                id: { [Op.in]: assigneeIds },
                groupId: req.user.groupId
            }
        });

        if (personnel.length !== assigneeIds.length) {
            return res.status(400).json({ error: 'You can only assign personnel from your own section.' });
        }

        await request.setAssignees(assigneeIds);
        request.status = 'DELEGATED'; // Mark as delegated to prevent re-delegation
        await request.save();

        for (const p of personnel) {
            await Notification.create({
                userId: p.id,
                message: `Assigned to internal task: ${request.subject}`,
                type: 'INFO',
                relatedId: request.id,
                relatedType: 'INTERNAL_REQUEST'
            });
        }

        await logActivity(req.user.id, 'Delegated Internal Task', 'Internal', req, `ID: ${id}`);
        res.json({ message: 'Personnel assigned.' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// PUT update internal request (for Section Head to resubmit RETURNED records)
app.put('/api/internal-requests/:id', authenticate, upload.array('attachment', 10), async (req, res) => {
    try {
        const { id } = req.params;
        const request = await InternalRequest.findByPk(id);

        if (!request) return res.status(404).json({ error: 'Internal request not found' });

        const isOwner = request.userId === req.user.id;
        const isAdmin = req.user.role?.toLowerCase() === 'admin' || req.user.roleId === 1;

        if (!isOwner && !isAdmin) return res.status(403).json({ error: 'Permission denied' });

        const data = req.body;
        let currentAttachments = Array.isArray(request.attachments) ? request.attachments : [];
        if (req.body.existingAttachments) {
            try { currentAttachments = JSON.parse(req.body.existingAttachments); } catch (e) { }
        }
        
        if (req.files && req.files.length > 0) {
            const uploadedAttachments = await Promise.all(req.files.map(async (file) => {
                return await Attachment.create({
                    filename: file.originalname,
                    mimeType: file.mimetype,
                    data: file.buffer,
                    internalRequestId: request.id
                });
            }));
            
            const newRefs = uploadedAttachments.map(att => ({
                id: att.id,
                name: att.filename,
                isDb: true
            }));
            data.attachments = [...currentAttachments, ...newRefs];
        } else {
            data.attachments = currentAttachments;
        }

        data.status = 'PENDING_DIV_APPROVAL';
        await request.update(data);

        const divHeads = await User.findAll({ where: { role: 'Division Head' } });
        for (const dh of divHeads) {
            await Notification.create({
                userId: dh.id,
                message: `INTERNAL REQUEST resubmitted by ${req.user.name}: ${request.subject}`,
                type: 'INFO',
                relatedId: request.id,
                relatedType: 'INTERNAL_REQUEST'
            });
        }

        await logActivity(req.user.id, 'Resubmitted Internal Request', 'Internal', req, `ID: ${id}`);
        res.json(request);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// NEW: Division Head Review Endpoint
app.patch('/api/communications/:id/div-review', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { action, publicRemarks } = req.body;

        // Permission check
        const userPermissions = req.user.permissions || [];
        const isDivHead = userPermissions.includes('review_communication');
        const isAdmin = userPermissions.includes('manage_users') || userPermissions.includes('manage_settings');

        if (req.user.role === 'Admin Section') {
            return res.status(403).json({ error: 'Permission denied: Admin Section cannot perform approval/review actions.' });
        }

        if (!isDivHead && !isAdmin) {
            return res.status(403).json({ error: 'Permission denied: Only the Division Head can perform this action.' });
        }

        const communication = await Communication.findByPk(id);
        if (!communication) return res.status(404).json({ error: 'Communication not found' });

        // Allow Division Head to edit fields during review
        const fieldsToUpdate = ['sectionHeadId', 'officeId', 'assignedToId', 'priority', 'subject', 'details', 'kind', 'type', 'direction', 'date'];
        fieldsToUpdate.forEach(field => {
            if (req.body[field] !== undefined) {
                communication[field] = req.body[field];
            }
        });

        // Handle multi-assignees if provided
        if (req.body.assignedToIds) {
            let ids = [];
            try {
                ids = Array.isArray(req.body.assignedToIds) ? req.body.assignedToIds : JSON.parse(req.body.assignedToIds);
            } catch (e) { ids = [req.body.assignedToIds]; }
            const validIds = ids.map(id => parseInt(id)).filter(id => !isNaN(id) && id > 0);
            if (validIds.length > 0) await communication.setAssignees(validIds);
        }

        if (action === 'ACCEPT') {
            const { Group, User } = require('./models/index');
            const assignedSections = await communication.getAssignedSections();

            if (assignedSections && assignedSections.length > 0) {
                communication.status = 'PENDING_SECTION_HEAD';

                // NOTIFY SECTION HEADS HERE
                for (const group of assignedSections) {
                    if (group.headId) {
                        await Notification.create({
                            userId: group.headId,
                            message: `New communication ${communication.trackingId} has been assigned to your section (${group.name}) by Division Head.`,
                            type: 'INFO',
                            relatedId: communication.id,
                            relatedType: 'COMMUNICATION'
                        });
                    }
                }
            } else {
                communication.status = 'DIV_ACCEPTED';
            }
        } else if (action === 'DECLINE') {
            communication.status = 'DIV_DECLINED';
        } else if (action === 'RETURN') {
            communication.status = 'DIV_RETURNED';
        } else if (action === 'APPROVE_INTERNAL') {
            communication.status = 'APPROVED';
        } else {
            return res.status(400).json({ error: 'Invalid action' });
        }

        if (publicRemarks) communication.publicRemarks = publicRemarks;
        await communication.save();

        // Notify submitter
        await Notification.create({
            userId: communication.userId,
            message: `Your communication ${communication.trackingId} has been ${communication.status.replace('_', ' ')}.`,
            type: action === 'DECLINE' ? 'WARNING' : 'INFO',
            relatedId: communication.id,
            relatedType: 'COMMUNICATION'
        });

        await logActivity(req.user.id, `Division Head ${action}`, 'Communications', req, `Tracking ID: ${communication.trackingId}`);
        res.json(communication);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// NEW: Multi-Section Assignment Endpoint (Division Head)
app.patch('/api/communications/:id/assign-sections', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { groupIds } = req.body; // Array of Group IDs

        const userPermissions = req.user.permissions || [];
        const isDivHead = userPermissions.includes('review_communication');
        const isAdmin = userPermissions.includes('manage_users') || userPermissions.includes('manage_settings');

        const { CommunicationSections, Group, User } = require('./models/index');
        const communication = await Communication.findByPk(id, {
            include: [{ model: Group, as: 'AssignedSections' }]
        });
        if (!communication) return res.status(404).json({ error: 'Communication not found' });

        if (!isDivHead && !isAdmin) {
            return res.status(403).json({ error: 'Permission denied: Only the Division Head can perform multi-section assignment.' });
        }

        if (Array.isArray(groupIds) && groupIds.length > 0) {
            await communication.setAssignedSections(groupIds);

            // AUTO-ASSIGN PERSONNEL: If only one section is assigned, set sectionHeadId to its head
            if (groupIds.length === 1) {
                const group = await Group.findByPk(groupIds[0]);
                if (group && group.headId) {
                    communication.sectionHeadId = group.headId;
                }
            }

            // Only move to PENDING_SECTION_HEAD if already accepted or by a section head
            if (!['PENDING', 'PENDING_DIV_HEAD', 'PENDING_DIV_APPROVAL'].includes(communication.status)) {
                communication.status = 'PENDING_SECTION_HEAD';
            }
            await communication.save();

            // Notify Section Heads of assigned groups
            const groups = await Group.findAll({
                where: { id: { [Op.in]: groupIds } },
                include: [{ model: User, as: 'SectionHead' }]
            });

            for (const group of groups) {
                if (group.headId) {
                    await Notification.create({
                        userId: group.headId,
                        message: `New communication ${communication.trackingId} has been assigned to your section (${group.name}) for action.`,
                        type: 'INFO',
                        relatedId: communication.id,
                        relatedType: 'COMMUNICATION'
                    });
                }
            }
        } else {
            // For Div Head during review, just keep the associations and status as is
            await communication.save();
        }

        res.json({ message: 'Sections assigned successfully', status: communication.status });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PATCH update communication status
app.patch('/api/communications/:id/status', authenticate, upload.array('proof', 5), async (req, res) => {
    try {
        const { id } = req.params;
        const { status, publicRemarks, completionRemarks } = req.body;
        const communication = await Communication.findByPk(id);
        if (!communication) {
            return res.status(404).json({ error: 'Communication not found' });
        }
        if (status) {
            // Role/Permission-Based Status Enforcement
            const s = status.toUpperCase();

            if (['APPROVED', 'DECLINED', 'RETURNED'].includes(s)) {
                // Determine required permission
                const requiredPerm = s === 'APPROVED' ? 'approve_record' : (s === 'DECLINED' ? 'decline_record' : 'return_record');

                // Enforce Permission
                if (req.user.role === 'Admin Section') {
                    return res.status(403).json({ error: 'Permission denied: Admin Section cannot approve, decline, or return communications.' });
                }

                if (req.user.role !== 'Section Head' && !req.user.permissions?.includes(requiredPerm)) {
                    return res.status(403).json({ error: `Permission denied: Your role does not have authorization to ${s.toLowerCase()} records.` });
                }

                // Enforce "His/Her own section head" ownership (Unless Admin)
                const isMasterAdmin = req.user.role === 'admin';

                // --- NEW: Multi-section head check ---
                let isDesignatedSectionHead = communication.sectionHeadId && parseInt(communication.sectionHeadId) === req.user.id;
                if (!isDesignatedSectionHead) {
                    const assignedSections = await communication.getAssignedSections();
                    const groupIds = assignedSections.map(s => s.id);
                    // Check if user is head of any of these groups
                    const userGroups = await Group.findAll({ where: { headId: req.user.id, id: { [Op.in]: groupIds } } });
                    if (userGroups.length > 0) isDesignatedSectionHead = true;
                }

                if (!isMasterAdmin && !isDesignatedSectionHead) {
                    return res.status(403).json({ error: `Permission denied: You can only ${s.toLowerCase()} communications specifically routed to you as Section Head.` });
                }
            }

            if (s === 'COMPLETED') {
                if (!req.user.permissions?.includes('complete_task')) {
                    return res.status(403).json({ error: 'Permission denied: Your role does not have authorization to mark tasks as completed.' });
                }

                // Ensure they are actually an assignee (Unless Admin/Section Head)
                const isMasterAdmin = req.user.role === 'admin';

                // --- NEW: Multi-section head check ---
                let isDesignatedSectionHead = communication.sectionHeadId && parseInt(communication.sectionHeadId) === req.user.id;
                if (!isDesignatedSectionHead) {
                    const assignedSections = await communication.getAssignedSections();
                    const groupIds = assignedSections.map(s => s.id);
                    const userGroups = await Group.findAll({ where: { headId: req.user.id, id: { [Op.in]: groupIds } } });
                    if (userGroups.length > 0) isDesignatedSectionHead = true;
                }

                if (!isMasterAdmin && !isDesignatedSectionHead) {
                    const assignees = await communication.getAssignees();
                    const isAssignee = assignees.some(u => u.id === req.user.id);
                    if (!isAssignee) {
                        return res.status(403).json({ error: 'Permission denied: You can only complete tasks assigned to you.' });
                    }
                }

                // Handle proof of completion files (SAVE TO DB)
                if (req.files && req.files.length > 0) {
                    const uploadedProof = await Promise.all(req.files.map(async (file) => {
                        return await Attachment.create({
                            filename: file.originalname,
                            mimeType: file.mimetype,
                            data: file.buffer,
                            communicationId: communication.id
                            // We can tag this as proof in fileName or a separate field if needed, 
                            // but for now we'll just link it.
                        });
                    }));
                    
                    communication.completionProof = uploadedProof.map(att => ({
                        id: att.id,
                        name: att.filename,
                        isDb: true
                    }));
                }
                if (completionRemarks) {
                    communication.completionRemarks = completionRemarks;
                }
            }

            communication.status = status;

            if (s === 'COMPLETED') {
                // 1. Notify Submitter
                await Notification.create({
                    userId: communication.userId,
                    message: `Communication ${communication.trackingId} has been marked as COMPLETED by ${req.user.name}.`,
                    type: 'SUCCESS',
                    relatedId: communication.id,
                    relatedType: 'COMMUNICATION'
                });

                // 2. Notify Section Head(s)
                const sectionHeadIds = new Set();
                if (communication.sectionHeadId) sectionHeadIds.add(communication.sectionHeadId);

                const assignedSections = await communication.getAssignedSections({ include: [{ model: User, as: 'SectionHead' }] });
                assignedSections.forEach(group => {
                    if (group.headId) sectionHeadIds.add(group.headId);
                });

                for (const headId of sectionHeadIds) {
                    if (headId === req.user.id) continue;
                    await Notification.create({
                        userId: headId,
                        message: `Task ${communication.trackingId} in your section has been completed by ${req.user.name}.`,
                        type: 'SUCCESS',
                        relatedId: communication.id,
                        relatedType: 'COMMUNICATION'
                    });
                }

                // 3. Notify All Division Heads
                const divHeads = await User.findAll({ where: { role: 'Division Head' } });
                for (const dh of divHeads) {
                    if (dh.id === req.user.id) continue;
                    await Notification.create({
                        userId: dh.id,
                        message: `Communication ${communication.trackingId} is now COMPLETED by ${req.user.name}.`,
                        type: 'SUCCESS',
                        relatedId: communication.id,
                        relatedType: 'COMMUNICATION'
                    });
                }

                // 4. Notify All Admins
                const admins = await User.findAll({ where: { role: 'admin' } });
                for (const adm of admins) {
                    if (adm.id === req.user.id) continue;
                    await Notification.create({
                        userId: adm.id,
                        message: `ACTION COMPLETED: ${communication.trackingId} has been finalized by ${req.user.name}.`,
                        type: 'SUCCESS',
                        relatedId: communication.id,
                        relatedType: 'COMMUNICATION'
                    });
                }

                // 5. Notify All Admin Section members
                const adminSections = await User.findAll({ where: { role: 'Admin Section' } });
                for (const as of adminSections) {
                    if (as.id === req.user.id) continue;
                    await Notification.create({
                        userId: as.id,
                        message: `Communication ${communication.trackingId} created by your section is now COMPLETED.`,
                        type: 'SUCCESS',
                        relatedId: communication.id,
                        relatedType: 'COMMUNICATION'
                    });
                }
            }
        }
        if (publicRemarks !== undefined) {
            communication.publicRemarks = publicRemarks;
        }

        // Handle Assignee Updates
        if (req.body.assignedToIds) {
            // Permission Check: Global Assignment Manager OR the designated Section Head for this record
            const isMasterAdmin = req.user.role === 'admin';
            let isDesignatedSectionHead = communication.sectionHeadId && parseInt(communication.sectionHeadId) === req.user.id;

            if (!isDesignatedSectionHead) {
                const assignedSections = await communication.getAssignedSections();
                const groupIds = assignedSections.map(s => s.id);
                const userGroups = await Group.findAll({ where: { headId: req.user.id, id: { [Op.in]: groupIds } } });
                if (userGroups.length > 0) isDesignatedSectionHead = true;
            }

            const canUpdateAssignees = req.user.permissions?.includes('manage_all_assignments') || isDesignatedSectionHead || isMasterAdmin;

            if (!canUpdateAssignees) {
                return res.status(403).json({ error: 'Permission denied: Only a master administrator or the designated Section Head can assign personnel.' });
            }

            // Gated Flow: Section Head can only assign AFTER Division Head accepts
            if (isDesignatedSectionHead && !isMasterAdmin && (communication.status === 'PENDING_DIV_HEAD' || communication.status === 'PENDING_DIV_APPROVAL')) {
                return res.status(403).json({ error: 'Division Head has not yet accepted this communication. Personnel assignment is restricted until accepted.' });
            }

            let ids = [];
            try {
                ids = typeof req.body.assignedToIds === 'string' ? JSON.parse(req.body.assignedToIds) : req.body.assignedToIds;
            } catch (e) {
                if (req.body.assignedToIds) ids = [req.body.assignedToIds];
            }

            if (Array.isArray(ids)) {
                // Get current assignees to compare
                const currentAssignees = await communication.getAssignees();
                const currentIds = currentAssignees.map(u => u.id);

                // Identify newly added IDs
                const newIds = ids.filter(id => !currentIds.includes(parseInt(id)));

                await communication.setAssignees(ids);

                // Notify only the newly added users (if any)
                // If it's already approved, they should know immediately.
                // If it's still pending, they'll be notified when it gets approved.
                // But for "Late Assignment", usually the record is already approved or being approved.
                if (communication.status === 'APPROVED' || status === 'APPROVED') {
                    for (const newId of newIds) {
                        await Notification.create({
                            userId: newId,
                            message: `You have been tagged as an assignee for ${communication.trackingId}.`,
                            type: 'INFO',
                            relatedId: communication.id,
                            relatedType: 'COMMUNICATION'
                        });
                    }
                }
            }
        }

        await communication.save();

        // Notify submitter of status update
        if (communication.userId) {
            let message = `Your communication ${communication.trackingId} has been ${status.toLowerCase()}.`;
            if (publicRemarks || communication.publicRemarks) {
                message += ` Remarks: ${publicRemarks || communication.publicRemarks}`;
            }

            await Notification.create({
                userId: communication.userId,
                message,
                type: status === 'APPROVED' ? 'SUCCESS' : status === 'DECLINED' ? 'WARNING' : status === 'RETURNED' ? 'INFO' : 'INFO',
                relatedId: communication.id,
                relatedType: 'COMMUNICATION'
            });
        }

        // Notify assignees (if different from submitter) and Section Head - Only on Approval!
        if (status === 'APPROVED') {
            const assignees = await communication.getAssignees();
            const assigneeNames = assignees.map(a => a.name).join(', ') || 'No one specifically assigned';

            // 1. Notify Section Head
            if (communication.sectionHeadId) {
                await Notification.create({
                    userId: communication.sectionHeadId,
                    message: `Communication ${communication.trackingId} has been APPROVED and assigned to: ${assigneeNames}.`,
                    type: 'SUCCESS',
                    relatedId: communication.id,
                    relatedType: 'COMMUNICATION'
                });
            }

            // 2. Notify assignees
            for (const assignee of assignees) {
                if (assignee.id !== communication.userId) {
                    await Notification.create({
                        userId: assignee.id,
                        message: `A communication assigned to you (${communication.trackingId}) has been approved and is ready for action.`,
                        type: 'SUCCESS',
                        relatedId: communication.id,
                        relatedType: 'COMMUNICATION'
                    });
                }
            }
        }

        // Logic for COMPLETION: Notify Submitter, Section Head, Division Head, and Admin
        if (status === 'COMPLETED') {
            const assigneeName = req.user.name || 'An assignee';

            // 1. Notify Submitter (Admin Section / Staff)
            if (communication.userId) {
                await Notification.create({
                    userId: communication.userId,
                    message: `The task for ${communication.trackingId} has been marked as COMPLETED by ${assigneeName}.`,
                    type: 'SUCCESS',
                    relatedId: communication.id,
                    relatedType: 'COMMUNICATION'
                });
            }

            // 2. Notify Division Head(s)
            const divHeads = await User.findAll({ where: { role: 'Division Head' } });
            for (const dh of divHeads) {
                await Notification.create({
                    userId: dh.id,
                    message: `Task ${communication.trackingId} completed by ${assigneeName}.`,
                    type: 'SUCCESS',
                    relatedId: communication.id,
                    relatedType: 'COMMUNICATION'
                });
            }

            // 3. Notify Section Head
            if (communication.sectionHeadId) {
                await Notification.create({
                    userId: communication.sectionHeadId,
                    message: `Your assigned task ${communication.trackingId} was completed by ${assigneeName}.`,
                    type: 'SUCCESS',
                    relatedId: communication.id,
                    relatedType: 'COMMUNICATION'
                });
            }

            // 4. Notify Admin(s)
            const { Op } = require('sequelize');
            const admins = await User.findAll({ where: { [Op.or]: [{ role: 'admin' }, { role: 'Admin' }, { roleId: 1 }] } });
            for (const admin of admins) {
                if (admin.id !== req.user.id) { // Don't notify self
                    await Notification.create({
                        userId: admin.id,
                        message: `Personnel ${assigneeName} has completed the work for ${communication.trackingId}.`,
                        type: 'SUCCESS',
                        relatedId: communication.id,
                        relatedType: 'COMMUNICATION'
                    });
                }
            }

            // 3. Notify Other Assignees (if any)
            const otherAssignees = await communication.getAssignees();
            for (const other of otherAssignees) {
                if (other.id !== req.user.id) {
                    await Notification.create({
                        userId: other.id,
                        message: `Personnel ${assigneeName} has marked the shared task ${communication.trackingId} as COMPLETED.`,
                        type: 'INFO',
                        relatedId: communication.id,
                        relatedType: 'COMMUNICATION'
                    });
                }
            }
        }

        // --- NEW: Notify Admin(s) on DECLINED or RETURNED ---
        if (status === 'DECLINED' || status === 'RETURNED') {
            const { Op } = require('sequelize');
            const admins = await User.findAll({ where: { [Op.or]: [{ role: 'admin' }, { role: 'Admin' }, { roleId: 1 }] } });
            const actionVerb = status === 'DECLINED' ? 'declined' : 'returned';
            const performerName = req.user.name || 'A Section Head';

            for (const admin of admins) {
                if (admin.id !== req.user.id) {
                    await Notification.create({
                        userId: admin.id,
                        message: `Communication ${communication.trackingId} has been ${actionVerb} by ${performerName}.`,
                        type: status === 'DECLINED' ? 'WARNING' : 'INFO',
                        relatedId: communication.id,
                        relatedType: 'COMMUNICATION'
                    });
                }
            }
        }

        // Backend Logging using centralized utility
        await logActivity(req.user.id, 'Status Update', 'Records', req);

        res.json(communication);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT update communication (specifically for Admin Section staff to resubmit RETURNED records)
app.put('/api/communications/:id', authenticate, upload.array('attachment', 10), async (req, res) => {
    try {
        const { id } = req.params;
        const communication = await Communication.findByPk(id, {
            include: [{ model: User, as: 'Assignees' }]
        });

        if (!communication) {
            return res.status(404).json({ error: 'Communication not found' });
        }

        // Permission check: Must be the creator, Admin, or Division Head (during review)
        const isCreator = communication.userId === req.user.id;
        const isAdmin = req.user.role?.toLowerCase() === 'admin' || req.user.roleId === 1;
        const isDivHead = req.user.role === 'Division Head' || req.user.permissions?.includes('div_head_review');

        if (!isCreator && !isAdmin && !isDivHead) {
            return res.status(403).json({ error: 'Permission denied: You do not have authorization to edit this communication.' });
        }

        // Staff can only edit if it was RETURNED, Div Heads can edit during PENDING_DIV_HEAD
        if (!isAdmin) {
            if (isDivHead && communication.status !== 'PENDING_DIV_HEAD' && communication.status !== 'PENDING_DIV_APPROVAL') {
                return res.status(400).json({ error: 'Division Head can only edit communications during the review stage.' });
            }
            if (!isDivHead && communication.status !== 'RETURNED') {
                return res.status(400).json({ error: 'Only communications with status "RETURNED" can be edited for correction.' });
            }
        }

        const data = req.body;

        // Handle file uploads and retention (SAVE TO DB)
        let currentAttachments = Array.isArray(communication.attachments) ? communication.attachments : [];
        if (req.body.existingAttachments) {
            try {
                currentAttachments = JSON.parse(req.body.existingAttachments);
            } catch (e) {
                console.error("Error parsing existingAttachments:", e);
            }
        }

        if (req.files && req.files.length > 0) {
            const uploadedAttachments = await Promise.all(req.files.map(async (file) => {
                return await Attachment.create({
                    filename: file.originalname,
                    mimeType: file.mimetype,
                    data: file.buffer,
                    communicationId: communication.id
                });
            }));
            
            const newRefs = uploadedAttachments.map(att => ({
                id: att.id,
                name: att.filename,
                isDb: true
            }));
            data.attachments = [...currentAttachments, ...newRefs];
        } else {
            data.attachments = currentAttachments;
        }

        // Map 'kinds' from frontend to 'kind' in database
        if (data.kinds) {
            let kindList = data.kinds;
            if (data.otherKind) {
                kindList = kindList ? `${kindList}, ${data.otherKind}` : data.otherKind;
            }
            data.kind = kindList;
        }

        // Resolve IDs and set Labels
        if (data.sectionHead) data.sectionHeadLabel = data.sectionHead;
        if (data.office) data.officeLabel = data.office;

        if (!data.sectionHeadId && data.sectionHead) {
            const user = await User.findOne({ where: { name: data.sectionHead } });
            if (user) data.sectionHeadId = user.id;
        }
        if (!data.officeId && data.office) {
            const group = await Group.findOne({ where: { name: data.office } });
            if (group) data.officeId = group.id;
        }

        // Reset status to PENDING for resubmission (unless Division Head is editing during review)
        if (!isDivHead) {
            data.status = 'PENDING';
        } else {
            // Keep the current status if Div Head is just saving changes
            data.status = communication.status;
        }

        await communication.update(data);

        // Notify Section Head of resubmission
        if (communication.sectionHeadId) {
            await Notification.create({
                userId: communication.sectionHeadId,
                message: `Communication ${communication.trackingId} has been resubmitted after correction and is waiting for review.`,
                type: 'INFO',
                relatedId: communication.id,
                relatedType: 'COMMUNICATION'
            });
        }

        // Notify Admins of resubmission
        const { Op } = require('sequelize');
        const admins = await User.findAll({ where: { [Op.or]: [{ role: 'admin' }, { role: 'Admin' }, { roleId: 1 }] } });
        for (const admin of admins) {
            if (admin.id !== req.user.id) {
                await Notification.create({
                    userId: admin.id,
                    message: `Communication ${communication.trackingId} has been resubmitted by ${req.user.name}.`,
                    type: 'INFO',
                    relatedId: communication.id,
                    relatedType: 'COMMUNICATION'
                });
            }
        }

        // Security Logging
        await logActivity(req.user.id, 'Resubmission', 'Communications', req, `Resubmitted communication: ${communication.trackingId}`);

        res.json(communication);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- AUTH ENDPOINTS ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('Login attempt for:', username);
        const user = await User.findOne({
            where: {
                [Op.or]: [
                    { username: username },
                    { email: username } // Fallback to email during transition
                ]
            }
        });

        if (!user) {
            console.log('User not found:', username);
            return res.status(401).json({ error: 'Invalid username/email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Password mismatch for:', username);
            return res.status(401).json({ error: 'Invalid username/email or password' });
        }

        // Check account status
        if (user.status !== 'active') {
            console.log('User account not active:', username, 'Status:', user.status);
            return res.status(403).json({
                error: `Account is ${user.status}. Please contact your administrator.`
            });
        }

        // Log the login activity
        await logActivity(user.id, `Logged in`, 'Authentication', req);

        // Fetch user permissions through their role AND direct overrides
        let rolePermissions = [];
        console.log('Fetching role permissions for roleId:', user.roleId);
        if (user.roleId) {
            const roleWithPerms = await Role.findByPk(user.roleId, {
                include: [{ model: Permission }]
            });
            if (roleWithPerms && roleWithPerms.Permissions) {
                rolePermissions = roleWithPerms.Permissions.map(p => p.slug);
            }
        } else if (user.role?.toLowerCase() === 'admin' || user.roleId === 1) {
            rolePermissions = ['view_dashboard', 'manage_users', 'manage_settings', 'view_reports', 'edit_record', 'approve_record', 'decline_record', 'return_record', 'complete_task'];
        }

        // Fetch direct overrides
        const directPerms = await user.getDirectPermissions();
        const directSlugs = directPerms.map(p => p.slug);

        // Merge and deduplicate
        const permissions = [...new Set([...rolePermissions, ...directSlugs])];

        // Sign JWT with exact required payload: {id, username, email, role, permissions}
        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email, role: user.role, permissions },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            groupId: user.groupId, // Include groupId for section-based logic
            permissions
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- USER ENDPOINTS ---
app.get('/api/users/:id', authenticate, async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            include: [{
                model: Role,
                as: 'UserRole',
                include: [{ model: Permission }]
            }, {
                model: Group,
                as: 'Section',
                attributes: ['id', 'name']
            }]
        });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const userData = user.toJSON();
        userData.permissions = user.UserRole?.Permissions?.map(p => p.slug) || [];

        res.json(userData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/users', authenticate, async (req, res) => {
    try {
        const { groupId, isHead, role, status } = req.query;
        let whereClause = {};

        if (groupId && groupId !== 'undefined' && groupId !== 'null') {
            whereClause.groupId = groupId;
        }

        if (status) {
            whereClause.status = status;
        }

        /* Removed direct role whereClause - handled via Role association include below */

        if (isHead === 'true') {
            // Logic to find group heads: Users mentioned in Group.headId
            const groupHeads = await Group.findAll({
                attributes: ['headId'],
                where: { headId: { [Op.ne]: null } }
            });
            const headIds = groupHeads.map(g => g.headId);
            whereClause.id = { [Op.in]: headIds };
        }

        const users = await User.findAll({
            where: whereClause,
            include: [
                {
                    model: Role,
                    as: 'UserRole',
                    where: role ? { name: role } : undefined
                },
                { model: Group, as: 'HeadedGroup', attributes: ['id', 'name'] },
                { model: Group, as: 'Section', attributes: ['id', 'name'] }
            ],
            order: [['name', 'ASC']]
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users', authenticate, async (req, res) => {
    try {
        const data = req.body;
        // Default password if not provided
        if (!data.password) data.password = 'user123';

        // Hash password
        data.password = await bcrypt.hash(data.password, 10);

        // Sync role string with roleId dynamically
        if (data.roleId) {
            const roleObj = await Role.findByPk(data.roleId);
            if (roleObj) data.role = roleObj.name;
        } else if (!data.role) {
            data.role = 'User';
        }

        // Generate username if not provided
        if (!data.username && data.email) {
            data.username = data.email.split('@')[0];
        }

        const user = await User.create(data);

        // Security Logging
        await logActivity(req.user.id, 'User Creation', 'Users', req, `Created user: ${user.username}`);

        res.status(201).json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.patch('/api/users/:id', authenticate, upload.single('avatar'), async (req, res) => {
    try {
        const { id } = req.params;
        const { role, roleId, status, password, department, ...allowedData } = req.body;
        const data = { ...allowedData };

        if (req.file) {
            data.avatar = req.file.filename;
        }

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (password) {
            data.password = await bcrypt.hash(password, 10);
        }

        // Only admins can update role and status
        if (req.user.role?.toLowerCase() === 'admin' || req.user.roleId === 1) {
            if (role) data.role = role;
            if (roleId) data.roleId = roleId;
            if (status) data.status = status;
            // Sync role string with roleId dynamically if they were provided (and user is admin)
            if (data.roleId) {
                const roleObj = await Role.findByPk(data.roleId);
                if (roleObj) data.role = roleObj.name;
            } else if (role) {
                data.role = role;
            }
        }

        await user.update(data);

        // Security Logging
        await logActivity(req.user.id, 'Profile Update', 'Users', req);

        res.json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/users/:id/change-password', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;

        // Security check: Users can only change their own password, unless admin
        if (req.user.id !== parseInt(id) && req.user.role?.toLowerCase() !== 'admin' && req.user.roleId !== 1) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Incorrect current password' });
        }

        // Hash and update new password
        user.password = await bcrypt.hash(newPassword, 10);
        await user.save();

        // Security Logging
        await logActivity(req.user.id, 'Password Changed', 'Authentication', req);

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- GROUP ENDPOINTS ---
app.get('/api/groups', authenticate, async (req, res) => {
    try {
        const groups = await Group.findAll({
            include: [{
                model: User,
                as: 'SectionHead',
                attributes: ['id', 'name']
            }],
            order: [['name', 'ASC']]
        });
        res.json(groups);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/groups', authenticate, async (req, res) => {
    try {
        const group = await Group.create(req.body);

        // Security Logging using centralized utility
        await logActivity(req.user.id, 'Group Created', 'Groups', req);

        res.status(201).json(group);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/groups/:id', authenticate, async (req, res) => {
    try {
        const group = await Group.findByPk(req.params.id);
        if (group) {
            const groupName = group.name;
            await group.destroy();

            // Security Logging using centralized utility
            await logActivity(req.user.id, 'Group Deleted', 'Groups', req);
        }
        res.json({ message: 'Group deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/groups/:id', authenticate, async (req, res) => {
    try {
        const group = await Group.findByPk(req.params.id);
        if (group) {
            await group.update(req.body);

            // Security Logging using centralized utility
            await logActivity(req.user.id, 'Group Updated', 'Groups', req);
        }
        res.json(group || { error: 'Not found' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// --- ANNOUNCEMENT ENDPOINTS ---
app.get('/api/announcements', authenticate, async (req, res) => {
    try {
        const announcements = await Announcement.findAll({ order: [['createdAt', 'DESC']] });
        res.json(announcements);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/announcements', authenticate, async (req, res) => {
    try {
        const announcement = await Announcement.create(req.body);

        // Security Logging using centralized utility
        await logActivity(req.user.id, 'Announcement Published', 'Announcements', req);

        res.status(201).json(announcement);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.patch('/api/announcements/:id/replies', authenticate, async (req, res) => {
    try {
        const announcement = await Announcement.findByPk(req.params.id);
        if (announcement) {
            const replies = [...announcement.replies, req.body.reply];
            await announcement.update({ replies });

            // Security Logging (only if it's an admin reply) using centralized utility
            if (req.user.role === 'admin') {
                await logActivity(req.user.id, 'Announcement Reply', 'Announcements', req);
            }

            res.json(announcement);
        } else {
            res.status(404).json({ error: 'Not found' });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/announcements/:id', authenticate, async (req, res) => {
    try {
        const announcement = await Announcement.findByPk(req.params.id);
        if (announcement) {
            const title = announcement.title;
            await announcement.destroy();

            // Security Logging using centralized utility
            await logActivity(req.user.id, 'Announcement Deleted', 'Announcements', req);
        }
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});




// --- RBAC ENDPOINTS ---

// GET all roles
app.get('/api/roles', authenticate, async (req, res) => {
    try {
        const roles = await Role.findAll({
            include: [{ model: Permission }]
        });
        res.json(roles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST new role
app.post('/api/roles', authenticate, async (req, res) => {
    try {
        const role = await Role.create(req.body);
        await logActivity(req.user.id, 'Role Creation', 'System', req);
        res.status(201).json(role);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE role
app.delete('/api/roles/:id', authenticate, async (req, res) => {
    try {
        const role = await Role.findByPk(req.params.id);
        if (!role) return res.status(404).json({ error: 'Role not found' });

        // PROTECT CORE ROLES
        const protectedRoles = ['Admin', 'Division Head', 'Section Head', 'Admin Section', 'User'];
        if (protectedRoles.includes(role.name)) {
            return res.status(403).json({ error: `The '${role.name}' role is a core system role and cannot be deleted.` });
        }

        await role.destroy();
        await logActivity(req.user.id, 'Role Deleted', 'Settings', req, `Deleted role: ${role.name}`);
        res.json({ message: 'Role deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- USER PERMISSIONS OVERRIDES ---
app.get('/api/users/:id/permissions', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id, {
            include: [
                { model: Role, as: 'UserRole', include: [{ model: Permission }] },
                { model: Permission, as: 'DirectPermissions' }
            ]
        });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const allAvailablePermissions = await Permission.findAll();
        const rolePermissionIds = user.UserRole?.Permissions?.map(p => p.id) || [];
        const directPermissionIds = user.DirectPermissions?.map(p => p.id) || [];

        res.json({
            available: allAvailablePermissions,
            rolePermissionIds,
            directPermissionIds
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users/:id/permissions', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { permissionIds } = req.body; // Array of Permission IDs
        if (!Array.isArray(permissionIds)) return res.status(400).json({ error: 'permissionIds must be an array' });

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Overwrite direct permissions
        await UserPermission.destroy({ where: { userId: id } });
        const newPerms = permissionIds.map(pid => ({ userId: id, permissionId: pid }));
        await UserPermission.bulkCreate(newPerms);

        await logActivity(req.user.id, 'User Permissions Override', 'Users', req, `Updated direct permissions for ${user.username}`);
        res.json({ message: 'User permissions updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST assign permissions to role
app.post('/api/roles/:id/permissions', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { permissionIds } = req.body;
        const role = await Role.findByPk(id);
        if (!role) return res.status(404).json({ error: 'Role not found' });

        await RolePermission.destroy({ where: { roleId: id } });

        if (permissionIds && permissionIds.length > 0) {
            const records = permissionIds.map(pid => ({
                roleId: parseInt(id),
                permissionId: pid
            }));
            await RolePermission.bulkCreate(records);
        }

        await logActivity(req.user.id, 'Permissions Sync', 'System', req);
        res.json({ message: 'Permissions updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET all permissions
app.get('/api/permissions', authenticate, async (req, res) => {
    try {
        const permissions = await Permission.findAll({ order: [['category', 'ASC'], ['name', 'ASC']] });
        res.json(permissions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST new permission
app.post('/api/permissions', authenticate, async (req, res) => {
    try {
        const permission = await Permission.create(req.body);
        await logActivity(req.user.id, 'Permission Creation', 'System', req);
        res.status(201).json(permission);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// DELETE permission
app.delete('/api/permissions/:id', authenticate, async (req, res) => {
    try {
        const permission = await Permission.findByPk(req.params.id);
        if (permission) {
            await permission.destroy();
            await logActivity(req.user.id, 'Permission Deletion', 'System', req);
            res.json({ message: 'Permission deleted' });
        } else {
            res.status(404).json({ error: 'Permission not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- COMM CONFIG ENDPOINTS ---
app.get('/api/config/:key', authenticate, async (req, res) => {
    try {
        const config = await CommConfig.findOne({ where: { key: req.params.key } });
        res.json(config ? config.value : null);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/config/:key', authenticate, async (req, res) => {
    try {
        const [config, created] = await CommConfig.findOrCreate({
            where: { key: req.params.key },
            defaults: { value: req.body.value }
        });
        if (!created) {
            await config.update({ value: req.body.value });
        }

        // Security Logging using centralized utility
        await logActivity(req.user.id, 'System Configuration Override', 'System', req);

        res.json(config);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// --- ACTIVITY LOG ENDPOINTS ---
app.post('/api/logs', authenticate, async (req, res) => {
    try {
        const { action, module, details } = req.body;
        await logActivity(req.user.id, action, module, req, details);
        res.status(201).json({ status: 'logged' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/logs', authenticate, async (req, res) => {
    try {
        const userPermissions = req.user.permissions || [];
        const isAdmin = userPermissions.includes('manage_users') || userPermissions.includes('manage_settings');

        // Scope logs: users only see their own, admins see all
        let whereClause = {};
        if (!isAdmin) {
            whereClause.userId = req.user.id;
        }

        const logs = await ActivityLog.findAll({
            where: whereClause,
            include: [{
                model: User,
                as: 'User',
                attributes: ['name', 'role']
            }],
            order: [['created_at', 'DESC']],
            limit: 500
        });

        // Map to return expected format: user name, role, action, module, timestamp, details
        const result = logs.map(log => ({
            id: log.id,
            name: log.User ? log.User.name : 'Unknown',
            role: log.User ? log.User.role : 'Unknown',
            action: log.action,
            module: log.module,
            details: log.details,
            timestamp: log.created_at,
            ipAddress: log.ipAddress, // for admins
            userAgent: log.userAgent // for admins
        }));

        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- ACCOUNT RE-ACTIVATION REQUESTS ---

// Public POST: Submit a request
app.post('/api/account-requests', async (req, res) => {
    try {
        const { name, email, reason, type } = req.body;
        if (!name || !email || !reason) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        const request = await AccountRequest.create({
            name,
            email,
            reason,
            type: type || 'reactivation'
        });
        res.status(201).json(request);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin GET: List all requests
app.get('/api/account-requests', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
        const requests = await AccountRequest.findAll({ order: [['createdAt', 'DESC']] });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin PATCH: Update request status
app.patch('/api/account-requests/:id', authenticate, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
        const { id } = req.params;
        const { status } = req.body;
        const request = await AccountRequest.findByPk(id);
        if (!request) return res.status(404).json({ error: 'Request not found' });

        request.status = status;
        await request.save();

        let message = 'Request updated';

        // If approved and it's a password reset, perform the reset
        if (status === 'approved' && request.type === 'password_reset') {
            const user = await User.findOne({ where: { email: request.email } });
            if (user) {
                const tempPassword = crypto.randomBytes(4).toString('hex'); // Generates an 8-character secure random string
                user.password = await bcrypt.hash(tempPassword, 10);
                await user.save();

                await logActivity(req.user.id, 'Admin Password Reset', 'Authentication', req, `Reset password for ${user.email} (Approved Request ID: ${id})`);
                message = `Request approved. Password for ${user.email} reset to: ${tempPassword}`;
            } else {
                message = `Request approved, but no user found with email ${request.email} to reset password.`;
            }
        } else if (status === 'approved' && request.type === 'reactivation') {
            const user = await User.findOne({ where: { email: request.email } });
            if (user) {
                user.status = 'active';
                await user.save();
                await logActivity(req.user.id, 'Account Reactivation Approval', 'Authentication', req, `Approved and activated account for ${request.email}`);
                message = `Request approved. Account for ${user.email} has been activated.`;
            } else {
                message = `Request approved, but no user found with email ${request.email} to activate.`;
            }
        }

        res.json({ ...request.toJSON(), message });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Test DB connection on startup and sync models
sequelize.authenticate()
    .then(async () => {
        console.log('Database connected successfully.');

        // Sync all models
        try {
            await sequelize.sync({ alter: true });
            console.log('Database models synced successfully.');
        } catch (syncError) {
            console.error('CRITICAL: Database Synchronization Failed:', syncError);
            process.exit(1);
        }

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}.`);
        });
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
        process.exit(1);
    });

// --- Notifications API ---
app.get('/api/notifications', authenticate, async (req, res) => {
    try {
        const notifications = await Notification.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']],
            limit: 20
        });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/notifications/:id/read', authenticate, async (req, res) => {
    try {
        const notification = await Notification.findOne({
            where: { id: req.params.id, userId: req.user.id }
        });
        if (!notification) return res.status(404).json({ error: 'Notification not found' });

        notification.isRead = true;
        await notification.save();
        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Batch Operations ---
app.post('/api/communications/batch-status', authenticate, async (req, res) => {
    const { ids, status } = req.body;
    if (!ids || !Array.isArray(ids) || !status) {
        return res.status(400).json({ error: 'IDs array and status are required' });
    }

    try {
        await Communication.update({ status }, { where: { id: ids } });

        // Notify submitters of the update
        const comms = await Communication.findAll({ where: { id: ids } });
        for (const comm of comms) {
            if (comm.userId) {
                let message = `Communication ${comm.trackingId} has been ${status.toLowerCase()}.`;
                if (comm.publicRemarks) {
                    message += ` Remarks: ${comm.publicRemarks}`;
                }

                await Notification.create({
                    userId: comm.userId,
                    message,
                    type: status === 'APPROVED' ? 'SUCCESS' : status === 'DECLINED' ? 'WARNING' : status === 'RETURNED' ? 'INFO' : 'INFO',
                    relatedId: comm.id,
                    relatedType: 'COMMUNICATION'
                });
            }

            // Notify assignee (if different from submitter) - Only on Approval!
            if (status === 'APPROVED' && comm.assignedToId && comm.assignedToId !== comm.userId) {
                await Notification.create({
                    userId: comm.assignedToId,
                    message: `A communication assigned to you (${comm.trackingId}) has been approved and is ready for action.`,
                    type: 'SUCCESS',
                    relatedId: comm.id,
                    relatedType: 'COMMUNICATION'
                });
            }
        }

        await logActivity(req.user.id, 'Batch Status Update', 'Communication', req, `Updated ${ids.length} records to ${status}`);
        res.json({ message: `Successfully updated ${ids.length} records to ${status}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.patch('/api/communications/:id/public-remarks', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { publicRemarks } = req.body;

        // Only admin/staff can update public remarks
        if (req.user.role !== 'admin' && !req.user.permissions?.includes('edit_record')) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const communication = await Communication.findByPk(id);
        if (!communication) return res.status(404).json({ error: 'Communication not found' });

        communication.publicRemarks = publicRemarks;
        await communication.save();

        res.json({ message: 'Public remarks updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
