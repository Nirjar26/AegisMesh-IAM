const Redis = require('ioredis');
const logger = require('../utils/logger');

let redis;

if (process.env.NODE_ENV === 'test') {
    // Create an in-memory mock client for Jest testing to avoid connections
    redis = {
        status: 'ready',
        get: async (_key) => null,
        set: async (_key, _val) => 'OK',
        setex: async (_key, _seconds, _val) => 'OK',
        del: async (_key) => 1,
        exists: async (_key) => 0,
        incr: async (_key) => 1,
        on: (_event, _handler) => {},
        quit: async () => 'OK',
    };
    logger.info('Using mock Redis client for testing');
} else {
    const host = process.env.REDIS_HOST || 'localhost';
    const port = Number.parseInt(process.env.REDIS_PORT || '6379', 10);
    const password = process.env.REDIS_PASSWORD || undefined;

    const dbIndex = Number.parseInt(process.env.REDIS_DB || '0', 10);
    const CONNECT_TIMEOUT_MS = 10000;
    const COMMAND_TIMEOUT_MS = 5000;
    const MAX_RETRY_COUNT = 10;
    const RETRY_BASE_MS = 200;
    const RETRY_MAX_MS = 3000;

    redis = new Redis({
        host,
        port,
        password,
        db: dbIndex,
        maxRetriesPerRequest: 3,
        connectTimeout: CONNECT_TIMEOUT_MS,
        commandTimeout: COMMAND_TIMEOUT_MS,
        connectionName: 'bastion-api',
        retryStrategy(times) {
            if (times > MAX_RETRY_COUNT) return null;
            const delay = Math.min(times * RETRY_BASE_MS, RETRY_MAX_MS);
            return delay;
        }
    });

    redis.on('connect', () => {
        logger.info(`Connecting to Redis server at ${host}:${port}...`);
    });

    redis.on('ready', () => {
        logger.info('Redis client connected and ready.');
    });

    redis.on('error', (err) => {
        logger.error('Redis connection error', { error: err.message });
    });
}

module.exports = redis;
