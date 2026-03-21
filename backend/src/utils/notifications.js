const prisma = require('../config/database');
const logger = require('./logger');
const { mergeNotificationPreferences } = require('../services/organizationSettings.service');

function asObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function formatActorName(actor) {
    const firstName = String(actor?.firstName || '').trim();
    const lastName = String(actor?.lastName || '').trim();
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || actor?.email || 'An administrator';
}

function parseDeviceLabel(userAgent) {
    const ua = String(userAgent || '').toLowerCase();
    if (!ua) {
        return 'a new device';
    }

    const browser = ua.includes('chrome') && !ua.includes('edg')
        ? 'Chrome'
        : ua.includes('firefox')
            ? 'Firefox'
            : ua.includes('safari') && !ua.includes('chrome')
                ? 'Safari'
                : ua.includes('edg')
                    ? 'Edge'
                    : 'a browser';

    const os = ua.includes('windows')
        ? 'Windows'
        : ua.includes('mac os')
            ? 'macOS'
            : ua.includes('linux')
                ? 'Linux'
                : ua.includes('android')
                    ? 'Android'
                    : ua.includes('iphone') || ua.includes('ipad')
                        ? 'iOS'
                        : null;

    if (!os || browser === 'a browser') {
        return os ? `${browser} on ${os}` : 'a new device';
    }

    return `${browser} on ${os}`;
}

function normalizeMessage(message) {
    return String(message || '').trim().replace(/\s+/g, ' ').slice(0, 220);
}

async function resolveRoleName(roleId) {
    if (!roleId) return null;

    const role = await prisma.role.findUnique({
        where: { id: roleId },
        select: { name: true },
    });

    return role?.name || null;
}

async function resolvePolicyName(policyId) {
    if (!policyId) return null;

    const policy = await prisma.policy.findUnique({
        where: { id: policyId },
        select: { name: true },
    });

    return policy?.name || null;
}

async function resolveApiTokenName(tokenId) {
    if (!tokenId) return null;

    const token = await prisma.apiToken.findUnique({
        where: { id: tokenId },
        select: { name: true },
    });

    return token?.name || null;
}

async function buildNewLoginNotification(entry) {
    if (!entry.userId) {
        return null;
    }

    const priorLoginWhere = {
        userId: entry.userId,
        action: 'LOGIN',
        createdAt: { lte: entry.createdAt },
        NOT: { id: entry.id },
    };

    if (entry.userAgent) {
        priorLoginWhere.userAgent = entry.userAgent;
    } else if (entry.ipAddress) {
        priorLoginWhere.ipAddress = entry.ipAddress;
    } else {
        return null;
    }

    const priorLogin = await prisma.auditLog.findFirst({
        where: priorLoginWhere,
        select: { id: true },
    });

    if (priorLogin) {
        return null;
    }

    const location = entry.ipAddress ? ` from ${entry.ipAddress}` : '';

    return {
        targetUserId: entry.userId,
        preferenceKey: 'newLoginInApp',
        type: 'security',
        severity: 'warning',
        title: 'New device sign-in',
        message: `We noticed a sign-in on ${parseDeviceLabel(entry.userAgent)}${location}.`,
        link: '/dashboard/security?tab=history',
    };
}

function buildPasswordChangedNotification(entry) {
    if (!entry.userId) {
        return null;
    }

    const metadata = asObject(entry.metadata);
    const otherSessionsRevoked = Number(metadata.otherSessionsRevoked || 0);
    const message = otherSessionsRevoked > 0
        ? `Your password was updated and ${otherSessionsRevoked} other session${otherSessionsRevoked === 1 ? '' : 's'} were signed out.`
        : 'Your password was updated successfully.';

    return {
        targetUserId: entry.userId,
        preferenceKey: 'passwordChangedInApp',
        type: 'security',
        severity: 'info',
        title: 'Password changed',
        message,
        link: '/dashboard/security?tab=password',
    };
}

function buildMfaDisabledNotification(entry) {
    if (!entry.userId) {
        return null;
    }

    return {
        targetUserId: entry.userId,
        preferenceKey: 'mfaDisabledInApp',
        type: 'security',
        severity: 'critical',
        title: 'Two-factor authentication disabled',
        message: 'Multi-factor authentication was disabled for your account.',
        link: '/dashboard/security?tab=mfa',
    };
}

function buildAccountLockedNotification(entry) {
    if (!entry.userId) {
        return null;
    }

    return {
        targetUserId: entry.userId,
        preferenceKey: 'failedLoginInApp',
        type: 'security',
        severity: 'critical',
        title: 'Account locked',
        message: 'Your account was locked after repeated failed sign-in attempts.',
        link: '/dashboard/security?tab=history',
    };
}

function buildUserStatusChangedNotification(entry) {
    const metadata = asObject(entry.metadata);
    const newStatus = metadata.newStatus || metadata.to || null;
    const targetUserId = entry.resourceId || null;

    if (!targetUserId || newStatus !== 'LOCKED') {
        return null;
    }

    return {
        targetUserId,
        preferenceKey: 'failedLoginInApp',
        type: 'security',
        severity: 'critical',
        title: 'Account locked',
        message: `${formatActorName(entry.user)} locked your account.`,
        link: '/dashboard/security?tab=history',
    };
}

function buildUserCreatedNotification(entry) {
    const targetUserId = entry.resourceId || null;
    if (!targetUserId) {
        return null;
    }

    return {
        targetUserId,
        preferenceKey: 'userCreatedInApp',
        type: 'account',
        severity: 'info',
        title: 'Account created',
        message: `${formatActorName(entry.user)} created your IAM account.`,
        link: '/settings/profile',
    };
}

async function buildRoleAssignedNotification(entry) {
    const metadata = asObject(entry.metadata);
    const targetUserId = metadata.assignedTo || entry.resourceId || null;
    if (!targetUserId) {
        return null;
    }

    const roleName = await resolveRoleName(metadata.roleId);

    return {
        targetUserId,
        preferenceKey: 'roleAssignedInApp',
        type: 'role',
        severity: 'info',
        title: 'Role assigned',
        message: roleName
            ? `${formatActorName(entry.user)} assigned you the ${roleName} role.`
            : `${formatActorName(entry.user)} assigned a new role to your account.`,
        link: '/dashboard',
        metadata: {
            roleId: metadata.roleId || null,
            roleName,
        },
    };
}

async function buildPolicyChangedNotification(entry) {
    if (!entry.userId) {
        return null;
    }

    const metadata = asObject(entry.metadata);
    const policyId = metadata.policyId || entry.resourceId || null;
    const policyName = metadata.policyName || await resolvePolicyName(policyId);

    const verb = entry.action === 'POLICY_CREATED'
        ? 'created'
        : entry.action === 'POLICY_UPDATED'
            ? 'updated'
            : entry.action === 'POLICY_DELETED'
                ? 'deleted'
                : entry.action === 'POLICY_ATTACHED'
                    ? 'attached to a role'
                    : 'detached from a role';

    return {
        targetUserId: entry.userId,
        preferenceKey: 'policyChangedInApp',
        type: 'system',
        severity: 'info',
        title: 'Policy updated',
        message: policyName
            ? `Policy ${policyName} was ${verb}.`
            : `A policy was ${verb}.`,
        link: '/dashboard/policies',
        metadata: {
            policyId,
            policyName,
        },
    };
}

function buildSessionRevokedNotification(entry) {
    if (!entry.userId) {
        return null;
    }

    return {
        targetUserId: entry.userId,
        preferenceKey: 'sessionRevokedInApp',
        type: 'security',
        severity: 'warning',
        title: 'Session revoked',
        message: 'An active session was revoked from your account.',
        link: '/settings/sessions',
    };
}

function buildAllOtherSessionsRevokedNotification(entry) {
    if (!entry.userId) {
        return null;
    }

    const metadata = asObject(entry.metadata);
    const revokedCount = Number(metadata.revokedCount || 0);

    return {
        targetUserId: entry.userId,
        preferenceKey: 'sessionRevokedInApp',
        type: 'security',
        severity: 'warning',
        title: 'Other sessions signed out',
        message: revokedCount > 0
            ? `${revokedCount} other session${revokedCount === 1 ? '' : 's'} were signed out from your account.`
            : 'Other active sessions were signed out from your account.',
        link: '/settings/sessions',
    };
}

function buildAllSessionsRevokedNotification(entry) {
    const metadata = asObject(entry.metadata);
    const targetUserId = metadata.revokedBy ? (entry.resourceId || null) : entry.userId;

    if (!targetUserId) {
        return null;
    }

    const isAdminAction = Boolean(metadata.revokedBy) && targetUserId !== entry.userId;

    return {
        targetUserId,
        preferenceKey: 'sessionRevokedInApp',
        type: 'security',
        severity: 'warning',
        title: 'All sessions signed out',
        message: isAdminAction
            ? `${formatActorName(entry.user)} signed out all of your active sessions.`
            : 'All of your active sessions were signed out.',
        link: '/settings/sessions',
    };
}

function buildDataExportedNotification(entry) {
    if (!entry.userId) {
        return null;
    }

    const metadata = asObject(entry.metadata);
    const auditLogs = Number(metadata.auditLogs || 0);

    return {
        targetUserId: entry.userId,
        preferenceKey: 'auditExportInApp',
        type: 'system',
        severity: 'warning',
        title: 'Audit export completed',
        message: auditLogs > 0
            ? `A data export was generated with ${auditLogs} audit log entries.`
            : 'A data export was generated for your organization.',
        link: '/settings/organization',
    };
}

async function buildApiKeyCreatedNotification(entry) {
    if (!entry.userId) {
        return null;
    }

    const tokenName = await resolveApiTokenName(entry.resourceId || null);

    return {
        targetUserId: entry.userId,
        preferenceKey: 'accessChangedInApp',
        type: 'access',
        severity: 'warning',
        title: 'API token created',
        message: tokenName
            ? `A new API token named ${tokenName} was created.`
            : 'A new API token was created for your account.',
        link: '/settings/api-keys',
        metadata: { tokenName },
    };
}

async function buildApiKeyRevokedNotification(entry) {
    if (!entry.userId) {
        return null;
    }

    const tokenName = await resolveApiTokenName(entry.resourceId || null);

    return {
        targetUserId: entry.userId,
        preferenceKey: 'accessChangedInApp',
        type: 'access',
        severity: 'info',
        title: 'API token revoked',
        message: tokenName
            ? `API token ${tokenName} was revoked.`
            : 'An API token was revoked from your account.',
        link: '/settings/api-keys',
        metadata: { tokenName },
    };
}

function buildConnectedAppRevokedNotification(entry) {
    if (!entry.userId) {
        return null;
    }

    const metadata = asObject(entry.metadata);
    const appName = metadata.appName || 'a connected app';

    return {
        targetUserId: entry.userId,
        preferenceKey: 'accessChangedInApp',
        type: 'access',
        severity: 'warning',
        title: 'Connected app access revoked',
        message: `Access for ${appName} was revoked.`,
        link: '/dashboard/security?tab=connected-apps',
        metadata: { appName },
    };
}

function buildTrustedDeviceRevokedNotification(entry) {
    if (!entry.userId) {
        return null;
    }

    return {
        targetUserId: entry.userId,
        preferenceKey: 'accessChangedInApp',
        type: 'access',
        severity: 'warning',
        title: 'Trusted device removed',
        message: 'A trusted device was removed from your account.',
        link: '/dashboard/security?tab=devices',
    };
}

function buildAllTrustedDevicesRevokedNotification(entry) {
    if (!entry.userId) {
        return null;
    }

    return {
        targetUserId: entry.userId,
        preferenceKey: 'accessChangedInApp',
        type: 'access',
        severity: 'warning',
        title: 'Trusted devices cleared',
        message: 'All trusted devices were removed from your account.',
        link: '/dashboard/security?tab=devices',
    };
}

const NOTIFICATION_BUILDERS = {
    LOGIN: buildNewLoginNotification,
    PASSWORD_CHANGED: buildPasswordChangedNotification,
    MFA_DISABLED: buildMfaDisabledNotification,
    ACCOUNT_LOCKED: buildAccountLockedNotification,
    USER_STATUS_CHANGED: buildUserStatusChangedNotification,
    USER_CREATED: buildUserCreatedNotification,
    ROLE_ASSIGNED: buildRoleAssignedNotification,
    POLICY_CREATED: buildPolicyChangedNotification,
    POLICY_UPDATED: buildPolicyChangedNotification,
    POLICY_DELETED: buildPolicyChangedNotification,
    POLICY_ATTACHED: buildPolicyChangedNotification,
    POLICY_DETACHED: buildPolicyChangedNotification,
    SESSION_REVOKED: buildSessionRevokedNotification,
    ALL_OTHER_SESSIONS_REVOKED: buildAllOtherSessionsRevokedNotification,
    ALL_SESSIONS_REVOKED: buildAllSessionsRevokedNotification,
    DATA_EXPORTED: buildDataExportedNotification,
    API_KEY_CREATED: buildApiKeyCreatedNotification,
    API_KEY_REVOKED: buildApiKeyRevokedNotification,
    CONNECTED_APP_REVOKED: buildConnectedAppRevokedNotification,
    TRUSTED_DEVICE_REVOKED: buildTrustedDeviceRevokedNotification,
    ALL_TRUSTED_DEVICES_REVOKED: buildAllTrustedDevicesRevokedNotification,
};

async function createNotificationFromAudit(entry) {
    if (!entry?.action) {
        return null;
    }

    const builder = NOTIFICATION_BUILDERS[entry.action];
    if (!builder) {
        return null;
    }

    try {
        const notification = await builder(entry);
        if (!notification?.targetUserId || !notification.preferenceKey) {
            return null;
        }

        const targetUser = await prisma.user.findUnique({
            where: { id: notification.targetUserId },
            select: { notificationPreferences: true },
        });

        if (!targetUser) {
            return null;
        }

        const preferences = mergeNotificationPreferences(targetUser.notificationPreferences);
        if (!preferences[notification.preferenceKey]) {
            return null;
        }

        return prisma.notificationLog.create({
            data: {
                userId: notification.targetUserId,
                type: notification.type || 'system',
                title: String(notification.title || 'Activity update').trim().slice(0, 120),
                message: normalizeMessage(notification.message || 'An important account event occurred.'),
                link: notification.link || null,
                metadata: {
                    ...(asObject(notification.metadata)),
                    auditId: entry.id,
                    action: entry.action,
                    severity: notification.severity || 'info',
                },
            },
        });
    } catch (error) {
        logger.warn('Notification creation skipped', {
            action: entry.action,
            auditId: entry.id,
            error: error.message,
        });
        return null;
    }
}

module.exports = {
    createNotificationFromAudit,
};