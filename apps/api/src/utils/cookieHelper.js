const crypto = require('node:crypto');

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function isSecureRequest(req) {
    if (process.env.COOKIE_SECURE === 'true') return true;
    if (process.env.COOKIE_SECURE === 'false') return false;
    return req.secure || req.headers['x-forwarded-proto'] === 'https';
}

function getCookieOptions(req) {
    const secure = isSecureRequest(req);

    return {
        accessToken: {
            httpOnly: true,
            secure,
            sameSite: secure ? 'strict' : 'lax',
            maxAge: ACCESS_TOKEN_MAX_AGE,
        },
        refreshToken: {
            httpOnly: true,
            secure,
            sameSite: secure ? 'strict' : 'lax',
            path: '/api/auth/refresh-token',
            maxAge: REFRESH_TOKEN_MAX_AGE,
        },
    };
}

function randomHex(bytes = 32) {
    return crypto.randomBytes(bytes).toString('hex');
}

module.exports = { isSecureRequest, getCookieOptions, randomHex };
