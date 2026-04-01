'use strict';

// Mock prisma before the module is loaded
jest.mock('../../src/config/database', () => ({
    userRole: { findMany: jest.fn() },
    userGroup: { findMany: jest.fn() },
}));

const prisma = require('../../src/config/database');
const {
    matchesAllowlist,
    normalizeIp,
    isValidIpOrCidr,
    isValidTimezone,
    passwordPolicyErrors,
    mergeNotificationPreferences,
    DEFAULT_NOTIFICATION_PREFERENCES,
    ALLOWED_LANGUAGES,
} = require('../../src/services/organizationSettings.service');

// ---------------------------------------------------------------------------
// normalizeIp
// ---------------------------------------------------------------------------
describe('normalizeIp', () => {
    it('returns empty string for falsy input', () => {
        expect(normalizeIp('')).toBe('');
        expect(normalizeIp(null)).toBe('');
        expect(normalizeIp(undefined)).toBe('');
    });

    it('converts ::1 (IPv6 loopback) to 127.0.0.1', () => {
        expect(normalizeIp('::1')).toBe('127.0.0.1');
    });

    it('strips ::ffff: IPv4-mapped prefix', () => {
        expect(normalizeIp('::ffff:192.168.1.1')).toBe('192.168.1.1');
    });

    it('returns plain IPv4 unchanged', () => {
        expect(normalizeIp('10.0.0.1')).toBe('10.0.0.1');
    });

    it('returns plain IPv6 unchanged', () => {
        const ipv6 = '2001:db8::1';
        expect(normalizeIp(ipv6)).toBe(ipv6);
    });
});

// ---------------------------------------------------------------------------
// isValidIpOrCidr
// ---------------------------------------------------------------------------
describe('isValidIpOrCidr', () => {
    it('returns false for falsy / empty input', () => {
        expect(isValidIpOrCidr(null)).toBe(false);
        expect(isValidIpOrCidr(undefined)).toBe(false);
        expect(isValidIpOrCidr('')).toBe(false);
        expect(isValidIpOrCidr('   ')).toBe(false);
    });

    it('accepts valid IPv4 addresses', () => {
        expect(isValidIpOrCidr('192.168.1.1')).toBe(true);
        expect(isValidIpOrCidr('0.0.0.0')).toBe(true);
        expect(isValidIpOrCidr('255.255.255.255')).toBe(true);
    });

    it('accepts valid IPv6 addresses', () => {
        expect(isValidIpOrCidr('::1')).toBe(true);
        expect(isValidIpOrCidr('2001:db8::1')).toBe(true);
    });

    it('accepts valid CIDR notation (IPv4)', () => {
        expect(isValidIpOrCidr('10.0.0.0/8')).toBe(true);
        expect(isValidIpOrCidr('192.168.0.0/24')).toBe(true);
        expect(isValidIpOrCidr('0.0.0.0/0')).toBe(true);
    });

    it('accepts valid CIDR notation (IPv6)', () => {
        expect(isValidIpOrCidr('2001:db8::/32')).toBe(true);
    });

    it('rejects out-of-range CIDR prefix (IPv4)', () => {
        expect(isValidIpOrCidr('10.0.0.0/33')).toBe(false);
        expect(isValidIpOrCidr('10.0.0.0/-1')).toBe(false);
    });

    it('rejects malformed values', () => {
        expect(isValidIpOrCidr('not-an-ip')).toBe(false);
        expect(isValidIpOrCidr('999.999.999.999')).toBe(false);
        expect(isValidIpOrCidr('10.0.0.0/24/extra')).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// isValidTimezone
// ---------------------------------------------------------------------------
describe('isValidTimezone', () => {
    it('accepts valid IANA timezones', () => {
        expect(isValidTimezone('America/New_York')).toBe(true);
        expect(isValidTimezone('UTC')).toBe(true);
        expect(isValidTimezone('Europe/London')).toBe(true);
    });

    it('rejects invalid timezones', () => {
        expect(isValidTimezone('Fake/Timezone')).toBe(false);
        expect(isValidTimezone('')).toBe(false);
        expect(isValidTimezone('not-a-tz')).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// passwordPolicyErrors
// ---------------------------------------------------------------------------
describe('passwordPolicyErrors', () => {
    const strictSettings = {
        minPasswordLength: 8,
        requireUppercase: true,
        requireNumber: true,
        requireSymbol: true,
    };

    it('returns no errors for a valid password', () => {
        expect(passwordPolicyErrors('Passw0rd!', strictSettings)).toHaveLength(0);
    });

    it('requires the password to be present', () => {
        const errors = passwordPolicyErrors(null, strictSettings);
        expect(errors).toContain('Password is required');
    });

    it('requires minimum length', () => {
        const errors = passwordPolicyErrors('Ab1!', strictSettings);
        expect(errors.some((e) => e.includes('at least 8 characters'))).toBe(true);
    });

    it('requires uppercase when enabled', () => {
        const errors = passwordPolicyErrors('passw0rd!', strictSettings);
        expect(errors.some((e) => e.includes('uppercase'))).toBe(true);
    });

    it('requires a number when enabled', () => {
        const errors = passwordPolicyErrors('Password!', strictSettings);
        expect(errors.some((e) => e.includes('number'))).toBe(true);
    });

    it('requires a symbol when enabled', () => {
        const errors = passwordPolicyErrors('Password1', strictSettings);
        expect(errors.some((e) => e.includes('special character'))).toBe(true);
    });

    it('accumulates multiple errors at once', () => {
        const errors = passwordPolicyErrors('short', strictSettings);
        expect(errors.length).toBeGreaterThan(1);
    });

    it('skips checks that are disabled', () => {
        const lenientSettings = {
            minPasswordLength: 4,
            requireUppercase: false,
            requireNumber: false,
            requireSymbol: false,
        };
        expect(passwordPolicyErrors('aaaa', lenientSettings)).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// matchesAllowlist
// ---------------------------------------------------------------------------
describe('matchesAllowlist', () => {
    it('returns true when allowlist is empty (no restriction)', () => {
        expect(matchesAllowlist('1.2.3.4', [])).toBe(true);
        expect(matchesAllowlist('1.2.3.4', null)).toBe(true);
    });

    it('matches an exact IPv4 entry', () => {
        expect(matchesAllowlist('192.168.1.10', ['192.168.1.10'])).toBe(true);
    });

    it('rejects an IP not in the allowlist', () => {
        expect(matchesAllowlist('10.0.0.1', ['192.168.1.10'])).toBe(false);
    });

    it('matches an IP inside a CIDR range', () => {
        expect(matchesAllowlist('10.0.0.50', ['10.0.0.0/24'])).toBe(true);
    });

    it('rejects an IP outside a CIDR range', () => {
        expect(matchesAllowlist('10.0.1.1', ['10.0.0.0/24'])).toBe(false);
    });

    it('normalizes ::1 to 127.0.0.1 before matching', () => {
        expect(matchesAllowlist('::1', ['127.0.0.1'])).toBe(true);
    });

    it('returns false for an invalid IP string', () => {
        expect(matchesAllowlist('not-an-ip', ['10.0.0.0/8'])).toBe(false);
    });

    it('accepts multiple entries, matches any', () => {
        const list = ['192.168.2.0/24', '10.0.0.1'];
        expect(matchesAllowlist('192.168.2.5', list)).toBe(true);
        expect(matchesAllowlist('10.0.0.1', list)).toBe(true);
        expect(matchesAllowlist('172.16.0.1', list)).toBe(false);
    });

    it('skips blank/whitespace entries gracefully', () => {
        expect(matchesAllowlist('10.0.0.1', ['', '  ', '10.0.0.1'])).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// mergeNotificationPreferences
// ---------------------------------------------------------------------------
describe('mergeNotificationPreferences', () => {
    it('returns the defaults when called with null', () => {
        const result = mergeNotificationPreferences(null);
        expect(result).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    });

    it('overrides defaults with provided values', () => {
        const custom = { newLoginEmail: false };
        const result = mergeNotificationPreferences(custom);
        expect(result.newLoginEmail).toBe(false);
        // Other defaults remain intact
        expect(result.newLoginInApp).toBe(true);
    });

    it('fills in missing keys from defaults', () => {
        const result = mergeNotificationPreferences({ policyChangedEmail: false });
        const keys = Object.keys(DEFAULT_NOTIFICATION_PREFERENCES);
        keys.forEach((k) => expect(result).toHaveProperty(k));
    });
});

// ---------------------------------------------------------------------------
// ALLOWED_LANGUAGES constant
// ---------------------------------------------------------------------------
describe('ALLOWED_LANGUAGES', () => {
    it('includes English', () => {
        expect(ALLOWED_LANGUAGES).toContain('en');
    });

    it('is an array of strings', () => {
        expect(Array.isArray(ALLOWED_LANGUAGES)).toBe(true);
        ALLOWED_LANGUAGES.forEach((l) => expect(typeof l).toBe('string'));
    });
});
