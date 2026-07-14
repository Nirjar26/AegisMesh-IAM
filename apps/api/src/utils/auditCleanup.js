const cron = require('node-cron');
const fs = require('node:fs');
const path = require('node:path');
const prisma = require('../config/database');
const tokenService = require('../services/token.service');
const logger = require('./logger');
const { audit } = require('./auditLog');

const RETENTION_DAYS = Number.parseInt(process.env.AUDIT_LOG_RETENTION_DAYS, 10) || 90;
const SECURITY_RETENTION_DAYS =
    Number.parseInt(process.env.AUDIT_SECURITY_LOG_RETENTION_DAYS, 10) || 365;

const ARCHIVE_BATCH = 5000;

async function archiveExpiredLogs(cutoff, categoryFilter) {
    const archiveDir = path.join(__dirname, '../../../logs');
    if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const filePath = path.join(archiveDir, `audit-archive-${dateStr}.jsonl`);
    const stream = fs.createWriteStream(filePath, { flags: 'a' });
    let total = 0;

    try {
        let cursor;
        let hasMore = true;
        while (hasMore) {
            const batch = await prisma.auditLog.findMany({
                take: ARCHIVE_BATCH + 1,
                where: { ...categoryFilter, createdAt: { lt: cutoff } },
                orderBy: { id: 'asc' },
                cursor: cursor ? { id: cursor } : undefined,
                skip: cursor ? 1 : 0,
            });

            hasMore = batch.length > ARCHIVE_BATCH;
            if (hasMore) batch.pop();

            for (const log of batch) {
                stream.write(JSON.stringify(log) + '\n');
            }

            total += batch.length;
            if (hasMore) cursor = batch[batch.length - 1].id;
        }
    } finally {
        stream.end();
    }

    return total;
}

async function runCleanup() {
    try {
        const now = new Date();

        // 1. Audit log cleanup
        // Security logs: longer retention
        const securityCutoff = new Date(now);
        securityCutoff.setDate(securityCutoff.getDate() - SECURITY_RETENTION_DAYS);

        await archiveExpiredLogs(securityCutoff, { category: 'SECURITY' });

        const securityDeleted = await prisma.auditLog.deleteMany({
            where: { category: 'SECURITY', createdAt: { lt: securityCutoff } },
        });

        // All other logs: standard retention
        const generalCutoff = new Date(now);
        generalCutoff.setDate(generalCutoff.getDate() - RETENTION_DAYS);

        await archiveExpiredLogs(generalCutoff, { category: { not: 'SECURITY' } });

        const generalDeleted = await prisma.auditLog.deleteMany({
            where: { category: { not: 'SECURITY' }, createdAt: { lt: generalCutoff } },
        });

        // 2. Revoked token cleanup
        const tokensDeleted = await tokenService.cleanupRevokedTokens();

        const totalDeleted = securityDeleted.count + generalDeleted.count;
        const totalKept = await prisma.auditLog.count();

        logger.info('Audit log cleanup completed', {
            securityDeleted: securityDeleted.count,
            generalDeleted: generalDeleted.count,
            tokensDeleted,
            totalDeleted,
            totalKept,
            securityCutoff,
            generalCutoff,
        });

        // Log the cleanup itself
        await audit({
            action: 'AUDIT_CLEANUP_SCHEDULED',
            category: 'SYSTEM',
            resource: 'audit-logs',
            result: 'SUCCESS',
            metadata: {
                securityDeleted: securityDeleted.count,
                generalDeleted: generalDeleted.count,
                totalDeleted,
                totalKept,
                retentionDays: RETENTION_DAYS,
                securityRetentionDays: SECURITY_RETENTION_DAYS,
            },
        });

        return { totalDeleted, totalKept };
    } catch (error) {
        logger.error('Audit log cleanup failed:', { error: error.message });
        return null;
    }
}

function scheduleCleanup() {
    // Run daily at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
        logger.info('Running scheduled audit log cleanup...');
        await runCleanup();
    });

    logger.info(
        `Audit log cleanup scheduled: daily at 2 AM (retain ${RETENTION_DAYS}d general, ${SECURITY_RETENTION_DAYS}d security)`,
    );
}

module.exports = { scheduleCleanup, runCleanup };
