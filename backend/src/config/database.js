const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

// Singleton PrismaClient to prevent multiple instances
const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? [{ emit: 'event', level: 'error' }]
        : [{ emit: 'event', level: 'error' }],
});

prisma.$on('error', (e) => {
    logger.error('Prisma error', { message: e.message });
});

module.exports = prisma;
