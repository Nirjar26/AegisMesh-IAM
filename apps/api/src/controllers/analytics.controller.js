const prisma = require('../config/database');
const logger = require('../utils/logger');

const VALID_RANGES = new Set(['24h', '30d', '1y']);

function timeBucketExpr(range) {
    if (range === '24h') return 'date_trunc(\'hour\', a."createdAt")';
    if (range === '30d') return 'date_trunc(\'day\', a."createdAt")';
    return 'date_trunc(\'month\', a."createdAt")';
}

function bucketFormat(range, labelExpr) {
    if (range === '24h') return `to_char(${labelExpr}, 'HH24:MI')`;
    if (range === '30d') return `to_char(${labelExpr}, 'Mon DD')`;
    return `to_char(${labelExpr}, 'Mon')`;
}

function validateRange(range) {
    if (range && !VALID_RANGES.has(range)) range = '1y';
    return range || '1y';
}

/** @returns {{ total: number, mfa: number, locked: number }} */
async function getUserStats(now) {
    const [totalUsers, mfaUsers, lockedUsers] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { mfaEnabled: true } }),
        prisma.user.count({ where: { status: 'LOCKED' } }),
    ]);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const recentPasswordChangeCount = await prisma.user.count({
        where: {
            OR: [
                { passwordChangedAt: { gte: ninetyDaysAgo } },
                { createdAt: { gte: ninetyDaysAgo } },
            ],
        },
    });
    return { total: totalUsers, mfa: mfaUsers, locked: lockedUsers, recentPasswordChangeCount };
}

function getRangeStart(now, range) {
    if (range === '24h') return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    if (range === '30d') return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
}

/**
 * GET /api/analytics/overview
 * Aggregates high-depth metrics for the 'War Room' dashboard over various timeframes (24h, 30d, 1y).
 */
exports.getOverviewMetrics = async (req, res, next) => {
    try {
        const now = new Date();
        const range = validateRange(req.query.range || '1y');

        const userStats = await getUserStats(now);
        const {
            total: totalUsers,
            mfa: mfaUsers,
            locked: lockedUsers,
            recentPasswordChangeCount,
        } = userStats;

        const rangeStart = getRangeStart(now, range);

        const bucketExpr = timeBucketExpr(range);
        const fmtExpr = bucketFormat(range, bucketExpr);

        const timeBuckets = await prisma.$queryRawUnsafe(
            `
            SELECT ${fmtExpr} AS label,
                   COUNT(*)::int AS requests,
                   AVG(COALESCE((a.metadata->>'risk_score')::numeric, 0.1)) AS avg_risk,
                   COUNT(*) FILTER (WHERE a.result = 'BLOCKED'
                     OR a.action ILIKE '%DENY%' OR a.action ILIKE '%BLOCK%')::int AS denies,
                   COUNT(*) FILTER (WHERE a.action IN ('SESSION_REVOKED','ALL_OTHER_SESSIONS_REVOKED','SESSION_REVOKE_ALL'))::int AS revocations
            FROM "AuditLog" a
            WHERE a."createdAt" >= $1
            GROUP BY ${bucketExpr}
            ORDER BY ${bucketExpr}
        `,
            rangeStart,
        );

        const buckets = timeBuckets.map((b) => ({
            label: b.label,
            requests: Number(b.requests),
            avgRisk: b.avg_risk ? Math.round(Number(b.avg_risk) * 100) / 100 : 0,
            denies: Number(b.denies),
            revocations: Number(b.revocations),
        }));

        const pulse = buckets.map((b) => ({
            timestamp: b.label,
            requests: b.requests,
            avgRisk: b.avgRisk,
        }));
        const denyTrends = buckets.map((b) => ({ timestamp: b.label, denies: b.denies }));
        const revocationTrends = buckets.map((b) => ({
            timestamp: b.label,
            revocations: b.revocations,
        }));

        // Geo distribution (SQL aggregation instead of JS)
        const ipAgg = await prisma.$queryRawUnsafe(
            `
            SELECT COALESCE(a."ipAddress", 'Unknown') AS "ipAddress",
                   COUNT(*) FILTER (WHERE a.result = 'BLOCKED')::int AS blocked,
                   COUNT(*) FILTER (WHERE a.result != 'BLOCKED')::int AS success,
                   COUNT(*)::int AS total
            FROM "AuditLog" a
            WHERE a."createdAt" >= $1
            GROUP BY a."ipAddress"
            ORDER BY total DESC
            LIMIT 5
        `,
            rangeStart,
        );

        const geoDist = ipAgg.map((r) => ({
            ipAddress: r.ipAddress,
            blocked: Number(r.blocked),
            success: Number(r.success),
            total: Number(r.total),
        }));

        // Aggregated counts for stats
        const aggCounts = await prisma.$queryRawUnsafe(
            `
            SELECT
              COUNT(*)::int AS total_events,
              COUNT(*) FILTER (WHERE a.result IN ('FAILURE','BLOCKED','ERROR'))::int AS anomaly_events,
              COUNT(*) FILTER (WHERE a.result = 'BLOCKED' AND a."createdAt" >= $2)::int AS threats_24h,
              COUNT(*) FILTER (WHERE a.result = 'BLOCKED' AND a."createdAt" >= $3)::int AS threats_30d
            FROM "AuditLog" a
            WHERE a."createdAt" >= $1
        `,
            rangeStart,
            new Date(now.getTime() - 24 * 60 * 60 * 1000),
            new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        );
        const aggs = aggCounts[0];
        const totalEvents = Number(aggs.total_events);
        const anomalyEvents = Number(aggs.anomaly_events);
        const threatsLast24h = Number(aggs.threats_24h);
        const threatsLast30d = Number(aggs.threats_30d);

        // Critical incidents (targeted query, no full scan)
        const criticalIncidents = await prisma.auditLog.findMany({
            where: {
                createdAt: { gte: rangeStart },
                OR: [{ result: 'BLOCKED' }, { action: 'ACCOUNT_LOCKED' }],
            },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                createdAt: true,
                metadata: true,
                ipAddress: true,
                result: true,
                action: true,
                category: true,
                user: { select: { email: true } },
            },
        });

        // 3. Security Radar Axes & Trends
        const [totalRoles, wildcardPolicies] = await Promise.all([
            prisma.role.count(),
            prisma.policy.count({
                where: {
                    OR: [{ actions: { has: '*' } }, { resources: { has: '*' } }],
                },
            }),
        ]);

        const [activeSessionsCount, inactiveActiveSessions] = await Promise.all([
            prisma.session.count({ where: { expiresAt: { gte: now } } }),
            prisma.session.count({
                where: {
                    expiresAt: { gte: now },
                    lastActiveAt: { lt: new Date(now.getTime() - 4 * 60 * 60 * 1000) },
                },
            }),
        ]);

        const mfaPercentage = totalUsers ? Math.round((mfaUsers / totalUsers) * 100) : 0;
        const activeUsersPct = totalUsers
            ? Math.round(((totalUsers - lockedUsers) / totalUsers) * 100)
            : 100;
        const pwdHygienePct = totalUsers
            ? Math.round((recentPasswordChangeCount / totalUsers) * 100)
            : 100;

        const credentialHealth = Math.round((mfaPercentage + activeUsersPct + pwdHygienePct) / 3);
        const sessionHygiene = activeSessionsCount
            ? Math.round(
                  ((activeSessionsCount - inactiveActiveSessions) / activeSessionsCount) * 100,
              )
            : 100;
        const anomalyIndex = totalEvents
            ? Math.round(((totalEvents - anomalyEvents) / totalEvents) * 100)
            : 100;

        const radarData = [
            { axis: 'MFA Coverage', value: mfaPercentage },
            {
                axis: 'Least Privilege',
                value: totalRoles
                    ? Math.round(((totalRoles - wildcardPolicies) / totalRoles) * 100)
                    : 100,
            },
            { axis: 'Credential Health', value: credentialHealth },
            { axis: 'Session Hygiene', value: sessionHygiene },
            { axis: 'Anomaly Index', value: anomalyIndex },
        ];

        // 5. Overprivileged Roles & Wildcard Policies Alerts
        const wildcardPolicyIds =
            wildcardPolicies > 0
                ? await prisma.policy
                      .findMany({
                          where: { OR: [{ actions: { has: '*' } }, { resources: { has: '*' } }] },
                          select: { id: true },
                      })
                      .then((r) => r.map((p) => p.id))
                : [];

        const [overprivilegedRolesCount, overprivilegedUsersCount] =
            wildcardPolicyIds.length > 0
                ? await Promise.all([
                      prisma.rolePolicy.count({ where: { policyId: { in: wildcardPolicyIds } } }),
                      prisma.userRole
                          .findMany({
                              where: {
                                  role: {
                                      rolePolicies: {
                                          some: { policyId: { in: wildcardPolicyIds } },
                                      },
                                  },
                              },
                              select: { userId: true },
                          })
                          .then((r) => new Set(r.map((ur) => ur.userId)).size),
                  ])
                : [0, 0];

        // 7. Authentication Type Distribution
        const [oauthGoogleCount, oauthGithubCount, localMfaCount, localNoMfaCount] =
            await Promise.all([
                prisma.user.count({ where: { oauthAccounts: { some: { provider: 'google' } } } }),
                prisma.user.count({ where: { oauthAccounts: { some: { provider: 'github' } } } }),
                prisma.user.count({ where: { passwordHash: { not: null }, mfaEnabled: true } }),
                prisma.user.count({ where: { passwordHash: { not: null }, mfaEnabled: false } }),
            ]);

        const authDist = [
            { name: 'Google OAuth', value: oauthGoogleCount },
            { name: 'GitHub OAuth', value: oauthGithubCount },
            { name: 'Local + TOTP', value: localMfaCount },
            { name: 'Local (No MFA)', value: localNoMfaCount },
        ].filter((item) => item.value > 0);

        if (authDist.length === 0) {
            authDist.push({ name: 'Local (No MFA)', value: 1 });
        }

        // 8. Trend Calculations (compare current status with past reference timeframes)
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const [users30dAgo, mfaUsers30d] = await Promise.all([
            prisma.user.count({ where: { createdAt: { lte: monthAgo } } }),
            prisma.user.count({ where: { mfaEnabled: true, createdAt: { lte: monthAgo } } }),
        ]);
        const activeIdentitiesTrend = users30dAgo
            ? Math.round(((totalUsers - users30dAgo) / users30dAgo) * 100)
            : 0;
        const mfaPercentage30d = users30dAgo ? Math.round((mfaUsers30d / users30dAgo) * 100) : 0;
        const mfaAdoptionTrend = mfaPercentage - mfaPercentage30d;

        const [sessionsLast12h, sessionsPrior12h] = await Promise.all([
            prisma.session.count({
                where: { lastActiveAt: { gte: new Date(now.getTime() - 12 * 60 * 60 * 1000) } },
            }),
            prisma.session.count({
                where: {
                    lastActiveAt: {
                        gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
                        lt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
                    },
                },
            }),
        ]);
        let activeSessionsTrend = 0;
        if (sessionsPrior12h) {
            activeSessionsTrend = Math.round(
                ((sessionsLast12h - sessionsPrior12h) / sessionsPrior12h) * 100,
            );
        } else if (sessionsLast12h > 0) {
            activeSessionsTrend = 100;
        }

        const threatsPrior30d = await prisma.auditLog.count({
            where: {
                createdAt: {
                    gte: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
                    lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
                },
                result: 'BLOCKED',
            },
        });
        let blockedThreatsTrend = 0;
        if (threatsPrior30d) {
            blockedThreatsTrend = Math.round(
                ((threatsLast30d - threatsPrior30d) / threatsPrior30d) * 100,
            );
        } else if (threatsLast30d > 0) {
            blockedThreatsTrend = 100;
        }

        // System Load Evaluation (24h request rate)
        const requestsLast24h = await prisma.auditLog.count({
            where: { createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
        });
        let systemLoad = 'Stable';
        if (requestsLast24h > 10) {
            systemLoad = 'Peak Load';
        } else if (requestsLast24h > 3) {
            systemLoad = 'Moderate';
        }

        res.json({
            success: true,
            data: {
                pulse,
                radar: radarData,
                geoDist,
                triage: criticalIncidents,
                denyTrends,
                revocationTrends,
                authDist,
                warnings: {
                    wildcardPolicies: wildcardPolicyIds.length,
                    overprivilegedRoles: overprivilegedRolesCount,
                    overprivilegedUsers: overprivilegedUsersCount,
                },
                stats: {
                    totalUsers,
                    mfaPercentage,
                    activeSessions: activeSessionsCount,
                    blockedThreats: threatsLast24h,
                    anomalyIndex,
                    systemLoad,
                    trends: {
                        activeIdentities: activeIdentitiesTrend,
                        mfaAdoption: mfaAdoptionTrend,
                        activeSessions: activeSessionsTrend,
                        blockedThreats: blockedThreatsTrend,
                    },
                },
            },
        });
    } catch (error) {
        logger.error('Failed to fetch analytics overview', { error: error.message });
        next(error);
    }
};
