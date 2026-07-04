const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { recordApiKeyEvent } = require('../utils/metrics');

const SCOPE_MAP = [
    { prefix: '/api/users', read: 'read:users', write: 'write:users' },
    { prefix: '/api/roles', read: 'read:roles', write: 'write:roles' },
    { prefix: '/api/policies', read: 'read:policies', write: 'write:policies' },
    { prefix: '/api/groups', read: 'write:groups', write: 'write:groups' },
    { prefix: '/api/audit-logs', read: 'read:audit', write: 'read:audit' },
    { prefix: '/api/settings', read: 'read:settings', write: 'write:settings' },
    { prefix: '/api/notifications', read: 'read:notifications', write: 'write:notifications' },
    { prefix: '/api/analytics', read: 'read:analytics', write: 'write:analytics' },
];

function getRequiredScope(method, fullPath) {
    const path = (fullPath || '').toLowerCase();
    const verb = (method || 'GET').toUpperCase();
    const entry = SCOPE_MAP.find(s => path.startsWith(s.prefix));
    return entry ? (verb === 'GET' ? entry.read : entry.write) : null;
}

function derivePrimaryRole(user) {
    const names = (user.userRoles || []).map((ur) => ur.role?.name).filter(Boolean);
    if (names.includes('SuperAdmin')) return 'SuperAdmin';
    return names[0] || null;
}

async function matchToken(token, req, rawToken) {
    const isMatch = await bcrypt.compare(rawToken, token.tokenHash);
    if (!isMatch) return null;

    if (token.expiresAt && token.expiresAt < new Date()) {
        await prisma.apiToken.update({
            where: { id: token.id },
            data: { isActive: false, revokedAt: token.expiresAt },
        });
        recordApiKeyEvent('API_KEY_EXPIRED', 'BLOCKED');
        return null;
    }

    const requiredScope = getRequiredScope(req.method, req.originalUrl || req.path || '');
    if (requiredScope && !token.scopes.includes(requiredScope) && !token.scopes.includes('*')) {
        recordApiKeyEvent('API_KEY_DENIED', 'BLOCKED');
        return { scopeError: true };
    }

    await prisma.apiToken.update({
        where: { id: token.id },
        data: { lastUsedAt: new Date() },
    });

    if (!token.user) return null;

    recordApiKeyEvent('API_KEY_USED', 'SUCCESS');

    return {
        id: token.user.id,
        email: token.user.email,
        firstName: token.user.firstName,
        lastName: token.user.lastName,
        status: token.user.status,
        emailVerified: token.user.emailVerified,
        mfaEnabled: token.user.mfaEnabled,
        role: derivePrimaryRole(token.user),
        createdAt: token.user.createdAt,
        updatedAt: token.user.updatedAt,
        authType: 'apiKey',
        apiTokenId: token.id,
        apiTokenScopes: token.scopes,
        sessionId: null,
    };
}

async function authenticateApiKeyToken(req, rawToken) {
    if (typeof rawToken !== 'string' || rawToken.length < 16 || rawToken.length > 4096 || !rawToken.startsWith('iam_')) {
        return null;
    }

    const candidates = await prisma.apiToken.findMany({
        where: {
            tokenPrefix: rawToken.substring(0, 12),
            isActive: true,
            revokedAt: null,
        },
        include: {
            user: {
                include: {
                    userRoles: {
                        include: {
                            role: {
                                select: { name: true },
                            },
                        },
                    },
                },
            },
        },
        take: 20,
    });

    for (const token of candidates) {
        const result = await matchToken(token, req, rawToken);
        if (result) return result;
    }

    return null;
}

module.exports = {
    authenticateApiKeyToken,
    getRequiredScope,
};
