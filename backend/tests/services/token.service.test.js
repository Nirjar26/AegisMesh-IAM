'use strict';

// Mock heavy dependencies before requiring the module under test
jest.mock('../../src/config/database', () => ({
    session: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
    },
}));

jest.mock('../../src/utils/auditLog', () => ({
    auditSession: {
        revoked: jest.fn(),
    },
}));

jest.mock('../../src/services/organizationSettings.service', () => ({
    getOrganizationSettings: jest.fn().mockResolvedValue({ sessionTimeoutMinutes: 60 }),
}));

const jwt = require('jsonwebtoken');
const tokenService = require('../../src/services/token.service');
const prisma = require('../../src/config/database');

const MOCK_USER = { id: 'user-1', email: 'test@example.com' };

describe('generateAccessToken', () => {
    it('returns a string', () => {
        expect(typeof tokenService.generateAccessToken(MOCK_USER)).toBe('string');
    });

    it('encodes the user id and email in the payload', () => {
        const token = tokenService.generateAccessToken(MOCK_USER);
        const payload = jwt.decode(token);
        expect(payload.sub).toBe(MOCK_USER.id);
        expect(payload.email).toBe(MOCK_USER.email);
        expect(payload.type).toBe('access');
    });

    it('includes sessionId when provided', () => {
        const token = tokenService.generateAccessToken(MOCK_USER, 'sess-abc');
        const payload = jwt.decode(token);
        expect(payload.sessionId).toBe('sess-abc');
    });

    it('omits sessionId when not provided', () => {
        const token = tokenService.generateAccessToken(MOCK_USER);
        const payload = jwt.decode(token);
        expect(payload.sessionId).toBeUndefined();
    });
});

describe('generateRefreshToken', () => {
    it('returns a string', () => {
        expect(typeof tokenService.generateRefreshToken(MOCK_USER)).toBe('string');
    });

    it('encodes sub and type refresh', () => {
        const token = tokenService.generateRefreshToken(MOCK_USER);
        const payload = jwt.decode(token);
        expect(payload.sub).toBe(MOCK_USER.id);
        expect(payload.type).toBe('refresh');
    });

    it('includes a unique jti per call', () => {
        const t1 = tokenService.generateRefreshToken(MOCK_USER);
        const t2 = tokenService.generateRefreshToken(MOCK_USER);
        const p1 = jwt.decode(t1);
        const p2 = jwt.decode(t2);
        expect(p1.jti).not.toBe(p2.jti);
    });
});

describe('verifyAccessToken', () => {
    it('returns the payload for a valid token', () => {
        const token = tokenService.generateAccessToken(MOCK_USER);
        const payload = tokenService.verifyAccessToken(token);
        expect(payload).not.toBeNull();
        expect(payload.sub).toBe(MOCK_USER.id);
    });

    it('returns null for an invalid token', () => {
        expect(tokenService.verifyAccessToken('bad.token.here')).toBeNull();
    });

    it('returns null for an empty string', () => {
        expect(tokenService.verifyAccessToken('')).toBeNull();
    });

    it('returns null for a refresh token used as access token', () => {
        const refresh = tokenService.generateRefreshToken(MOCK_USER);
        // Signed with different secret, so verification should fail
        expect(tokenService.verifyAccessToken(refresh)).toBeNull();
    });
});

describe('verifyRefreshToken', () => {
    it('returns the payload for a valid refresh token', () => {
        const token = tokenService.generateRefreshToken(MOCK_USER);
        const payload = tokenService.verifyRefreshToken(token);
        expect(payload).not.toBeNull();
        expect(payload.sub).toBe(MOCK_USER.id);
    });

    it('returns null for a malformed token', () => {
        expect(tokenService.verifyRefreshToken('not-a-token')).toBeNull();
    });

    it('returns null for an access token used as refresh token', () => {
        const access = tokenService.generateAccessToken(MOCK_USER);
        expect(tokenService.verifyRefreshToken(access)).toBeNull();
    });
});

describe('deleteSession', () => {
    afterEach(() => jest.clearAllMocks());

    it('returns true when deletion succeeds', async () => {
        prisma.session.delete.mockResolvedValue({});
        const result = await tokenService.deleteSession('tok');
        expect(result).toBe(true);
        expect(prisma.session.delete).toHaveBeenCalledWith({ where: { refreshToken: 'tok' } });
    });

    it('returns false when deletion throws', async () => {
        prisma.session.delete.mockRejectedValue(new Error('DB error'));
        const result = await tokenService.deleteSession('tok');
        expect(result).toBe(false);
    });
});

describe('getUserSessions', () => {
    afterEach(() => jest.clearAllMocks());

    it('delegates to prisma with correct query', async () => {
        const mockSessions = [{ id: 's1' }];
        prisma.session.findMany.mockResolvedValue(mockSessions);

        const result = await tokenService.getUserSessions('user-1');
        expect(result).toEqual(mockSessions);
        expect(prisma.session.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { userId: 'user-1' } })
        );
    });
});

describe('revokeAllOtherSessions', () => {
    afterEach(() => jest.clearAllMocks());

    it('excludes the current session from deletion', async () => {
        prisma.session.deleteMany.mockResolvedValue({ count: 2 });
        const count = await tokenService.revokeAllOtherSessions('u1', 'current-sess');
        expect(count).toBe(2);
        expect(prisma.session.deleteMany).toHaveBeenCalledWith({
            where: { userId: 'u1', id: { not: 'current-sess' } },
        });
    });

    it('deletes all sessions when no current session is given', async () => {
        prisma.session.deleteMany.mockResolvedValue({ count: 3 });
        await tokenService.revokeAllOtherSessions('u1', null);
        expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    });
});
