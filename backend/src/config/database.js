require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const logger = require('../utils/logger');

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to initialize Prisma');
}

// Reuse a global instance in non-production to avoid multiple clients during reloads/tests
const globalForPrisma = global;
const globalForPg = global;

const pool = globalForPg.pgPool || new Pool({
    connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);

const prisma = globalForPrisma.prisma || new PrismaClient({
    adapter,
    log: [{ emit: 'event', level: 'error' }],
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
    globalForPg.pgPool = pool;
}

prisma.$on('error', (e) => {
    logger.error('Prisma error', { message: e.message });
});

module.exports = prisma;
