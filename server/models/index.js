const User = require('./User');
const Group = require('./Group');
const Announcement = require('./Announcement');
const ActivityLog = require('./ActivityLog');
const Communication = require('./Communication');
const CommConfig = require('./CommConfig');
const Role = require('./Role');
const Permission = require('./Permission');
const RolePermission = require('./RolePermission');
const AccountRequest = require('./AccountRequest');
const Notification = require('./Notification');
const CommunicationAssignees = require('./CommunicationAssignees');
const CommunicationSections = require('./CommunicationSections');
const ActiveSession = require('./ActiveSession');
const Office = require('./Office');
const InternalRequest = require('./InternalRequest');
const InternalRequestAssignees = require('./InternalRequestAssignees');
const Attachment = require('./Attachment');

// --- associations ---

// Communication <-> User (Multi-Assignees)
Communication.belongsToMany(User, { 
    through: CommunicationAssignees, 
    as: 'Assignees', 
    foreignKey: 'communicationId',
    otherKey: 'userId'
});
User.belongsToMany(Communication, { 
    through: CommunicationAssignees, 
    as: 'AssignedTasks', 
    foreignKey: 'userId',
    otherKey: 'communicationId'
});

// Communication <-> User (Single Reference - Optional for backwards compat if needed, but we'll focus on the collection)
// We'll keep the existing belongsTo for assignedToId for now to avoid breaking existing queries until everything is migrated
Communication.belongsTo(User, { as: 'Assignee', foreignKey: 'assignedToId' });
User.hasMany(Communication, { foreignKey: 'assignedToId', as: 'AssignedCommunications' });

// Communication <-> User (Received By)
Communication.belongsTo(User, { as: 'Receiver', foreignKey: 'sectionHeadId' });
User.hasMany(Communication, { foreignKey: 'sectionHeadId', as: 'ReceivedCommunications' });

// Communication <-> User (Division Head Selection)
Communication.belongsTo(User, { as: 'DivHead', foreignKey: 'divisionHeadId' });
User.hasMany(Communication, { foreignKey: 'divisionHeadId', as: 'ReviewedCommunications' });

// Communication <-> Group (Office - Legacy/Single)
Communication.belongsTo(Group, { as: 'Office', foreignKey: 'officeId' });
Group.hasMany(Communication, { foreignKey: 'officeId' });

// Communication <-> Group (Many-to-Many Sections)
Communication.belongsToMany(Group, { 
    through: CommunicationSections, 
    as: 'AssignedSections', 
    foreignKey: 'communicationId',
    otherKey: 'groupId'
});
Group.belongsToMany(Communication, { 
    through: CommunicationSections, 
    as: 'SectionCommunications', 
    foreignKey: 'groupId',
    otherKey: 'communicationId'
});

// Group <-> User (Head & Personnel)
Group.belongsTo(User, { as: 'SectionHead', foreignKey: 'headId' });
User.hasOne(Group, { as: 'HeadedGroup', foreignKey: 'headId' });

Group.hasMany(User, { as: 'Personnel', foreignKey: 'groupId' });
User.belongsTo(Group, { as: 'Section', foreignKey: 'groupId' });

// Communication <-> User (Submitter)
Communication.belongsTo(User, { as: 'Submitter', foreignKey: 'userId' });
User.hasMany(Communication, { foreignKey: 'userId', as: 'SubmittedCommunications' });

// Announcement <-> User (Optional: Targeted User)
Announcement.belongsTo(User, { as: 'TargetUser', foreignKey: 'targetUserId' });
User.hasMany(Announcement, { foreignKey: 'targetUserId' });

ActivityLog.belongsTo(User, { foreignKey: 'userId', as: 'User' });
User.hasMany(ActivityLog, { foreignKey: 'userId' });

// InternalRequest <-> User
InternalRequest.belongsTo(User, { as: 'Sender', foreignKey: 'userId' });
InternalRequest.belongsTo(User, { as: 'Recipient', foreignKey: 'divisionHeadId' });
User.hasMany(InternalRequest, { foreignKey: 'userId', as: 'SentInternalRequests' });
User.hasMany(InternalRequest, { foreignKey: 'divisionHeadId', as: 'ReceivedInternalRequests' });

// InternalRequest <-> User (Personnel Delegation)
InternalRequest.belongsToMany(User, { 
    through: InternalRequestAssignees, 
    as: 'Assignees', 
    foreignKey: 'internalRequestId',
    otherKey: 'userId'
});
User.belongsToMany(InternalRequest, { 
    through: InternalRequestAssignees, 
    as: 'AssignedInternalRequests', 
    foreignKey: 'userId',
    otherKey: 'internalRequestId'
});

// --- Attachment Associations ---
Communication.hasMany(Attachment, { as: 'FileAttachments', foreignKey: 'communicationId' });
Attachment.belongsTo(Communication, { foreignKey: 'communicationId' });

InternalRequest.hasMany(Attachment, { as: 'FileAttachments', foreignKey: 'internalRequestId' });
Attachment.belongsTo(InternalRequest, { foreignKey: 'internalRequestId' });

// User <-> Role
User.belongsTo(Role, { foreignKey: 'roleId', as: 'UserRole' });
Role.hasMany(User, { foreignKey: 'roleId' });

// Role <-> Permission (Many-to-Many)
Role.belongsToMany(Permission, { 
    through: RolePermission, 
    foreignKey: 'roleId',
    otherKey: 'permissionId'
});
Permission.belongsToMany(Role, { 
    through: RolePermission, 
    foreignKey: 'permissionId',
});

// Notification <-> User
Notification.belongsTo(User, { foreignKey: 'userId', as: 'User' });
User.hasMany(Notification, { foreignKey: 'userId' });

// ActiveSession <-> User
ActiveSession.belongsTo(User, { foreignKey: 'userId' });
User.hasOne(ActiveSession, { foreignKey: 'userId' });

module.exports = {
    User,
    Group,
    Announcement,
    ActivityLog,
    Communication,
    CommConfig,
    Role,
    Permission,
    RolePermission,
    AccountRequest,
    Notification,
    CommunicationAssignees,
    CommunicationSections,
    ActiveSession,
    Office,
    InternalRequest,
    InternalRequestAssignees,
    Attachment
};
