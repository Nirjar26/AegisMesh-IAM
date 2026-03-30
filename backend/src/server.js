require('dotenv').config();

const app = require('./app');
const logger = require('./utils/logger');
const { scheduleCleanup } = require('./utils/auditCleanup');

// ═══════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    logger.info(`🚀 IAM Auth Server running on port ${PORT}`);
    logger.info(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🌐 Frontend URL: ${process.env.FRONTEND_URL}`);
    scheduleCleanup();
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
    });
});

module.exports = server;
