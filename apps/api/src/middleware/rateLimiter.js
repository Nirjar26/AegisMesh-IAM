const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');
const { auditSecurity } = require('../utils/auditLog');

const WINDOW_15MIN = 15 * 60 * 1000;
const WINDOW_1HR = 60 * 60 * 1000;
const onAuditFail = (err) => logger.warn('Audit log failed', { error: err.message });

const prodMax = (n) => process.env.NODE_ENV === 'production' ? n : 1000;

function createLimiter(windowMs, max, message, auditPath) {
    return rateLimit({
        windowMs,
        max,
        message: { success: false, error: { code: 'RATE_LIMIT', message } },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res, _next, options) => {
            logger.warn(`Rate limit exceeded for ${auditPath}`, { ip: req.ip, path: req.path });
            auditSecurity.rateLimitExceeded(req, auditPath).catch(onAuditFail);
            res.status(429).json(options.message);
        },
    });
}

const loginLimiter = createLimiter(WINDOW_15MIN, prodMax(50), 'Too many login attempts. Please try again in 15 minutes.', 'auth/login');
const registerLimiter = createLimiter(WINDOW_1HR, prodMax(20), 'Too many registration attempts. Please try again later.', 'auth/register');
const generalLimiter = createLimiter(WINDOW_15MIN, prodMax(1000), 'Too many requests. Please try again later.', '');
const passwordResetLimiter = createLimiter(WINDOW_1HR, prodMax(3), 'Too many password reset attempts. Please try again later.', 'auth/forgot-password');
const mfaSetupLimiter = createLimiter(WINDOW_15MIN, prodMax(10), 'Too many MFA attempts. Please try again later.', 'auth/mfa');
const tokenRefreshLimiter = createLimiter(WINDOW_15MIN, prodMax(30), 'Too many token refresh attempts. Please try again later.', 'auth/refresh-token');
const verifyEmailLimiter = createLimiter(WINDOW_15MIN, prodMax(10), 'Too many verification attempts. Please try again in 15 minutes.', 'auth/verify-email');
const sessionRevokeLimiter = createLimiter(WINDOW_15MIN, prodMax(20), 'Too many session revocation attempts. Please try again later.', 'auth/sessions');

module.exports = { loginLimiter, registerLimiter, generalLimiter, passwordResetLimiter, mfaSetupLimiter, tokenRefreshLimiter, verifyEmailLimiter, sessionRevokeLimiter };

