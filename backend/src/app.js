require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { generalLimiter } = require('./middleware/rateLimiter');
const { initializePassport } = require('./config/passport');
const authRoutes = require('./routes/auth.routes');
const rolesRoutes = require('./routes/roles.routes');
const policiesRoutes = require('./routes/policies.routes');
const groupsRoutes = require('./routes/groups.routes');
const usersRoutes = require('./routes/users.routes');
const auditLogRoutes = require('./routes/auditLog.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const settingsRoutes = require('./routes/settings.routes');
const logger = require('./utils/logger');
const { scheduleCleanup } = require('./utils/auditCleanup');
const path = require('path');

const app = express();

// ═══════════════════════════════════════
// SECURITY MIDDLEWARE
// ═══════════════════════════════════════
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ═══════════════════════════════════════
// PARSING MIDDLEWARE
// ═══════════════════════════════════════
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ═══════════════════════════════════════
// RATE LIMITING
// ═══════════════════════════════════════
app.use('/api/', generalLimiter);

// ═══════════════════════════════════════
// PASSPORT
// ═══════════════════════════════════════
app.use(passport.initialize());
initializePassport();

// ═══════════════════════════════════════
// REQUEST LOGGING
// ═══════════════════════════════════════
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.headers['user-agent']?.substring(0, 100),
    });
    next();
});

// ═══════════════════════════════════════
// ROUTES
// ═══════════════════════════════════════
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
        },
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/policies', policiesRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')));

// ═══════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
