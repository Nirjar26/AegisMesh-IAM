const express = require('express');
const crypto = require('node:crypto');
const passport = require('passport');
const authController = require('../controllers/auth.controller');
const mfaController = require('../controllers/mfa.controller');
const { authenticate } = require('../middleware/authenticate');
const { requireReauth, SENSITIVE_ACTIONS } = require('../middleware/requireReauth');
const { validate } = require('../middleware/validate');
const { loginLimiter, registerLimiter, passwordResetLimiter, mfaSetupLimiter, tokenRefreshLimiter, sessionRevokeLimiter, verifyEmailLimiter } = require('../middleware/rateLimiter');
const schemas = require('../config/validationSchemas');
const tokenService = require('../services/token.service');
const { auditAuth } = require('../utils/auditLog');
const { getOrganizationSettings } = require('../services/organizationSettings.service');
const { encryptText } = require('../utils/crypto');
const { getCookieOptions, randomHex } = require('../utils/cookieHelper');
const logger = require('../utils/logger');

const router = express.Router();

function setAuthCookies(req, res, accessToken, refreshToken) {
    const options = getCookieOptions(req);

    res.cookie('accessToken', encryptText(accessToken), {
        ...options.accessToken,
    });

    res.cookie('refreshToken', encryptText(refreshToken), {
        ...options.refreshToken,
    });
}

function handleOAuthCallback(providerName, auditProviderName) {
    return async (req, res) => {
        try {
            const user = req.user;
            const refreshToken = tokenService.generateRefreshToken(user);

            const session = await tokenService.createSession(
                user.id,
                refreshToken,
                req.headers['user-agent'],
                req.ip
            );

            const accessToken = tokenService.generateAccessToken(user, session.id);
            await auditAuth.oauthLogin(req, user.id, auditProviderName, session.id);

            setAuthCookies(req, res, accessToken, refreshToken);
            return res.redirect(`${getFrontendUrl()}/oauth/callback`);
        } catch (error) {
            logger.warn(`${providerName} OAuth callback failed`, { message: error.message });
            return res.redirect(getOAuthFailureUrl());
        }
    };
}

function getFrontendUrl() {
    return process.env.FRONTEND_URL || 'http://localhost:3000';
}

function getOAuthFailureUrl() {
    return `${getFrontendUrl()}/login?error=oauth_failed`;
}

const OAUTH_STATE_SECRET = process.env.OAUTH_STATE_SECRET;
if (!OAUTH_STATE_SECRET) {
    throw new Error('OAUTH_STATE_SECRET environment variable must be set');
}

function generateOAuthState() {
    const state = randomHex(16);
    const hmac = crypto.createHmac('sha256', OAUTH_STATE_SECRET).update(state).digest('hex');
    return `${state}.${hmac}`;
}

function validateOAuthState(token) {
    if (!token || typeof token !== 'string') return false;
    const parts = token.split('.');
    if (parts.length !== 2) return false;
    const [state, hmac] = parts;
    const expectedHmac = crypto.createHmac('sha256', OAUTH_STATE_SECRET).update(state).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac));
}

async function enforceOAuthAllowed(req, res, next) {
    try {
        const settings = await getOrganizationSettings();
        if (!settings.allowOAuthLogin) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'OAUTH_DISABLED',
                    message: 'OAuth login is disabled by organization policy',
                },
            });
        }
        return next();
    } catch (error) {
        return next(error);
    }
}

// ═══════════════════════════════════════
// AUTH ROUTES
// ═══════════════════════════════════════

// Register
router.post(
    '/register',
    registerLimiter,
    validate(schemas.register),
    authController.register
);

// Login
router.post(
    '/login',
    loginLimiter,
    validate(schemas.login),
    authController.login
);

// Logout (protected)
router.post(
    '/logout',
    authenticate,
    authController.logout
);

// Refresh token
router.post(
    '/refresh-token',
    tokenRefreshLimiter,
    validate(schemas.refreshToken),
    authController.refreshToken
);

// Forgot password
router.post(
    '/forgot-password',
    passwordResetLimiter,
    validate(schemas.forgotPassword),
    authController.forgotPassword
);

// Reset password
router.post(
    '/reset-password',
    verifyEmailLimiter,
    validate(schemas.resetPassword),
    authController.resetPassword
);

// Verify email
router.post(
    '/verify-email',
    verifyEmailLimiter,
    validate(schemas.verifyEmail),
    authController.verifyEmail
);

// Get current user profile (protected)
router.get(
    '/me',
    authenticate,
    authController.getProfile
);

// Get sessions (protected)
router.get(
    '/sessions',
    authenticate,
    authController.getSessions
);

// Revoke session (protected)
router.delete(
    '/sessions/:sessionId',
    sessionRevokeLimiter,
    authenticate,
    authController.revokeSession
);

// ═══════════════════════════════════════
// MFA ROUTES
// ═══════════════════════════════════════

// Setup MFA (protected)
router.post(
    '/mfa/setup',
    mfaSetupLimiter,
    authenticate,
    requireReauth(SENSITIVE_ACTIONS.SETUP_MFA),
    mfaController.setupMFA
);

// Verify MFA setup (protected)
router.post(
    '/mfa/verify-setup',
    mfaSetupLimiter,
    authenticate,
    validate(schemas.mfaVerifySetup),
    mfaController.verifySetup
);

// Disable MFA (protected)
router.post(
    '/mfa/disable',
    mfaSetupLimiter,
    authenticate,
    validate(schemas.mfaDisable),
    mfaController.disableMFA
);

// ═══════════════════════════════════════
// OAUTH ROUTES
// ═══════════════════════════════════════

// Google OAuth
router.get(
    '/oauth/google',
    enforceOAuthAllowed,
    (req, res, next) => {
        passport.authenticate('google', {
            scope: ['profile', 'email'],
            state: generateOAuthState(),
        })(req, res, next);
    }
);

router.get(
    '/oauth/google/callback',
    (req, res, next) => {
        if (!validateOAuthState(req.query?.state)) {
            return res.redirect(getOAuthFailureUrl());
        }
        next();
    },
    passport.authenticate('google', {
        session: false,
        failureRedirect: getOAuthFailureUrl(),
    }),
    handleOAuthCallback('Google', 'google')
);

// GitHub OAuth
router.get(
    '/oauth/github',
    enforceOAuthAllowed,
    (req, res, next) => {
        passport.authenticate('github', {
            scope: ['user:email'],
            state: generateOAuthState(),
        })(req, res, next);
    }
);

router.get(
    '/oauth/github/callback',
    (req, res, next) => {
        if (!validateOAuthState(req.query?.state)) {
            return res.redirect(getOAuthFailureUrl());
        }
        next();
    },
    passport.authenticate('github', {
        session: false,
        failureRedirect: getOAuthFailureUrl(),
    }),
    handleOAuthCallback('GitHub', 'github')
);

module.exports = router;
