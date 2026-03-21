const crypto = require('crypto');
const net = require('net');
const prisma = require('../config/database');

const DEFAULT_NOTIFICATION_PREFERENCES = {
    newLoginEmail: true,
    newLoginInApp: true,
    passwordChangedEmail: true,
    passwordChangedInApp: true,
    mfaDisabledEmail: true,
    mfaDisabledInApp: true,
    userCreatedEmail: true,
    userCreatedInApp: true,
    roleAssignedEmail: true,
    roleAssignedInApp: true,
    policyChangedEmail: true,
    policyChangedInApp: true,
    failedLoginEmail: true,
    failedLoginInApp: true,
    sessionRevokedEmail: true,
    sessionRevokedInApp: true,
    accessChangedEmail: true,
    accessChangedInApp: true,
    auditExportEmail: true,
    auditExportInApp: true,
};

const ALLOWED_LANGUAGES = ['en', 'es', 'fr', 'de', 'ja', 'zh'];

function normalizeIp(ipAddress) {
    if (!ipAddress) return '';
    if (ipAddress === '::1') return '127.0.0.1';
    if (ipAddress.startsWith('::ffff:')) return ipAddress.replace('::ffff:', '');
    return ipAddress;
}

function isValidTimezone(timezone) {
    try {
        Intl.DateTimeFormat('en-US', { timeZone: timezone });
        return true;
    } catch {
        return false;
    }
}

function buildDefaultOrganizationSettings() {
    return {
        orgName: process.env.ORG_NAME || 'Acme IAM',
        accountId: `org_${crypto.randomBytes(6).toString('hex')}`,
        plan: process.env.ORG_PLAN || 'free',
        region: process.env.ORG_REGION || 'us-east-1',
        minPasswordLength: 8,
        requireUppercase: true,
        requireNumber: true,
        requireSymbol: true,
        passwordExpiryDays: null,
        maxFailedAttempts: 5,
        sessionTimeoutMinutes: 480,
        requireMfaForAll: false,
        allowOAuthLogin: true,
        ipAllowlist: [],
    };
}

async function ensureOrganizationSettings() {
    let settings = await prisma.organizationSettings.findFirst();

    if (!settings) {
        settings = await prisma.organizationSettings.create({
            data: buildDefaultOrganizationSettings(),
        });
    }

    return settings;
}

async function getOrganizationSettings() {
    return ensureOrganizationSettings();
}

function passwordPolicyErrors(password, settings) {
    const errors = [];

    if (!password || typeof password !== 'string') {
        errors.push('Password is required');
        return errors;
    }

    if (password.length < settings.minPasswordLength) {
        errors.push(`Password must be at least ${settings.minPasswordLength} characters`);
    }

    if (settings.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }

    if (settings.requireNumber && !/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }

    if (settings.requireSymbol && !/[^A-Za-z\d\s]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }

    return errors;
}

async function validatePasswordAgainstPolicy(password) {
    const settings = await getOrganizationSettings();
    return passwordPolicyErrors(password, settings);
}

function isValidIpOrCidr(value) {
    if (!value || typeof value !== 'string') return false;

    const trimmed = value.trim();
    if (!trimmed) return false;

    if (net.isIP(trimmed)) {
        return true;
    }

    const parts = trimmed.split('/');
    if (parts.length !== 2) return false;

    const base = parts[0];
    const prefix = Number(parts[1]);
    const type = net.isIP(base);

    if (!type || Number.isNaN(prefix)) return false;
    if (type === 4 && (prefix < 0 || prefix > 32)) return false;
    if (type === 6 && (prefix < 0 || prefix > 128)) return false;

    return true;
}

function matchesAllowlist(ipAddress, allowlist = []) {
    if (!allowlist || allowlist.length === 0) return true;

    const normalizedIp = normalizeIp(ipAddress);
    const ipType = net.isIP(normalizedIp);
    if (!ipType) return false;

    for (const entry of allowlist) {
        const rule = String(entry || '').trim();
        if (!rule) continue;

        const normalizedRule = normalizeIp(rule);
        if (net.isIP(normalizedRule) && normalizedRule === normalizedIp) {
            return true;
        }

        const parts = rule.split('/');
        if (parts.length !== 2) continue;

        const base = normalizeIp(parts[0]);
        const prefix = Number(parts[1]);
        const baseType = net.isIP(base);
        if (!baseType || baseType !== ipType || Number.isNaN(prefix)) continue;

        try {
            const blockList = new net.BlockList();
            blockList.addSubnet(base, prefix, baseType === 4 ? 'ipv4' : 'ipv6');
            if (blockList.check(normalizedIp, ipType === 4 ? 'ipv4' : 'ipv6')) {
                return true;
            }
        } catch {
            // Ignore malformed entries; callers run validation before save.
        }
    }

    return false;
}

function mergeNotificationPreferences(currentPrefs) {
    return {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...(currentPrefs || {}),
    };
}

module.exports = {
    ALLOWED_LANGUAGES,
    DEFAULT_NOTIFICATION_PREFERENCES,
    ensureOrganizationSettings,
    getOrganizationSettings,
    isValidIpOrCidr,
    isValidTimezone,
    matchesAllowlist,
    mergeNotificationPreferences,
    normalizeIp,
    passwordPolicyErrors,
    validatePasswordAgainstPolicy,
};
