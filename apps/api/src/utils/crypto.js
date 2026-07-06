const crypto = require('node:crypto');
const logger = require('./logger');

const ALGO = 'aes-256-gcm';
const LEGACY_SALT = 'aegismesh-mfa-key-v1';

const COOKIE_ENCRYPTION_KEY = process.env.COOKIE_ENCRYPTION_KEY || process.env.MFA_SECRET_ENCRYPTION_KEY;

if (process.env.NODE_ENV === 'production' && process.env.COOKIE_ENCRYPTION_KEY && process.env.COOKIE_ENCRYPTION_KEY === process.env.MFA_SECRET_ENCRYPTION_KEY) {
    console.warn('[crypto] COOKIE_ENCRYPTION_KEY and MFA_SECRET_ENCRYPTION_KEY are identical. Use separate keys in production.');
}

let mfaFallbackKey;
function buildKey(salt) {
    let seed = process.env.MFA_SECRET_ENCRYPTION_KEY;
    if (!seed) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('MFA_SECRET_ENCRYPTION_KEY must be configured');
        }
        if (!mfaFallbackKey) {
            mfaFallbackKey = crypto.randomBytes(32).toString('hex');
        }
        seed = mfaFallbackKey;
    }
    return crypto.pbkdf2Sync(seed, salt || LEGACY_SALT, 100000, 32, 'sha512');
}

function encryptText(plainText) {
    if (!plainText) return null;

    const salt = crypto.randomBytes(16).toString('hex');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, buildKey(salt), iv);
    const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `${salt}:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptText(payload) {
    if (!payload) return null;

    const text = String(payload);
    const parts = text.split(':');

    try {
        // New format (4 parts): salt:iv:authTag:ciphertext
        // Legacy format (3 parts): iv:authTag:ciphertext
        const salt = parts.length === 4 ? parts[0] : LEGACY_SALT;
        const ivHex = parts.length === 4 ? parts[1] : parts[0];
        const tagHex = parts.length === 4 ? parts[2] : parts[1];
        const encryptedHex = parts.length === 4 ? parts[3] : parts[2];

        const decipher = crypto.createDecipheriv(
            ALGO,
            buildKey(salt),
            Buffer.from(ivHex, 'hex')
        );
        decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(encryptedHex, 'hex')),
            decipher.final(),
        ]);

        return decrypted.toString('utf8');
    } catch (err) {
        logger.warn('Decryption failed', { error: err.message });
        return null;
    }
}

module.exports = {
    encryptText,
    decryptText,
    COOKIE_ENCRYPTION_KEY,
};
