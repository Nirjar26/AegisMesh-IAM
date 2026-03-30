require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prismaClientOptions = {
    ...(process.env.DATABASE_URL
        ? { datasourceUrl: process.env.DATABASE_URL }
        : {}),
    log: [{ emit: 'event', level: 'error' }],
};

// Reuse a global instance in non-production to avoid multiple clients during reloads/tests
const globalForPrisma = global;
const prisma = globalForPrisma.prisma || new PrismaClient(prismaClientOptions);

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

prisma.$on('error', (e) => {
    logger.error('Prisma error', { message: e.message });
});

module.exports = prisma;
