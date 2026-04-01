const tokenService = require('../services/token.service');
const prisma = require('../config/database');
const { createError } = require('../utils/errors');
const { authenticateApiKeyToken } = require('./apiKeyAuth');
const { enforceOrgPolicyForRequest } = require('./orgPolicy');
const { decryptText } = require('../utils/crypto');

function derivePrimaryRole(user) {
    const roleNames = (user.userRoles || []).map((ur) => ur.role?.name).filter(Boolean);
    if (roleNames.includes('SuperAdmin')) return 'SuperAdmin';
    return roleNames[0] || null;
}

/**
 * Authentication middleware
 * Extracts and verifies JWT from Authorization header or cookies
 */
async function authenticate(req, res, next) {
    try {
        let token = null;

        // Check Authorization header first
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }

        // Fall back to cookies
        if (!token && req.cookies && req.cookies.accessToken) {
            const rawCookieToken = req.cookies.accessToken;
            token = decryptText(rawCookieToken) || rawCookieToken;
        }

        // EventSource cannot set custom Authorization headers, so allow
        // the audit stream to pass an access token via query string.
        if (!token && req.path === '/stream') {
            token = req.query?.token || req.query?.accessToken || null;
        }

        if (!token) {
            throw createError('AUTH_007');
        }

        // API key authentication path.
        if (token.startsWith('iam_')) {
            const apiUser = await authenticateApiKeyToken(req, token);

            if (apiUser?.scopeError) {
                return res.status(403).json({
                    success: false,
                    error: {
                        code: 'RBAC_001',
                        message: 'API key scope does not allow this operation',
                    },
                });
            }

            if (!apiUser) {
                throw createError('AUTH_007');
            }

            if (apiUser.status !== 'ACTIVE') {
                throw createError('AUTH_008');
            }

            await enforceOrgPolicyForRequest(req, apiUser);
            req.user = apiUser;
            return next();
        }

        // Verify token
        const payload = tokenService.verifyAccessToken(token);
        if (!payload) {
            throw createError('AUTH_006');
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: payload.sub },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                status: true,
                emailVerified: true,
                mfaEnabled: true,
                createdAt: true,
                updatedAt: true,
                userRoles: {
                    include: {
                        role: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            throw createError('AUTH_007');
        }

        if (user.status !== 'ACTIVE') {
            throw createError('AUTH_008');
        }

        const sessionId = payload.sessionId || null;
        if (sessionId) {
            await prisma.session.updateMany({
                where: { id: sessionId, userId: user.id },
                data: { lastActiveAt: new Date() },
            });
        }

        const authUser = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            status: user.status,
            emailVerified: user.emailVerified,
            mfaEnabled: user.mfaEnabled,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            role: derivePrimaryRole(user),
            sessionId,
            authType: 'jwt',
        };

        await enforceOrgPolicyForRequest(req, authUser);

        req.user = authUser;
        next();
    } catch (error) {
        if (error.errorCode) {
            return res.status(error.statusCode).json({
                success: false,
                error: {
                    code: error.errorCode,
                    message: error.message,
                },
            });
        }
        return res.status(401).json({
            success: false,
            error: {
                code: 'AUTH_007',
                message: 'Token invalid',
            },
        });
    }
}

module.exports = { authenticate };
