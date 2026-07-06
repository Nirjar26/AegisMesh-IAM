const { createError } = require('../utils/errors');
const { auditPermission } = require('../utils/auditLog');
const logger = require('../utils/logger');
const permissionService = require('../services/permission.service');

function authorize(action, resource) {
    return async (req, res, next) => {
        try {
            if (!req.user?.id) {
                return next(createError('AUTH_001'));
            }

            const result = await permissionService.checkPermission(req.user.id, action, resource);
            auditPermission.checked(req, req.user.id, action, resource, result).catch(err => logger.warn('Audit log write failed', { error: err.message }));

            if (result.allowed) {
                return next();
            }

            await auditPermission.denied(req, req.user.id, action, resource, result);
            return res.status(403).json({
                success: false,
                error: {
                    code: 'RBAC_001',
                    message: 'Access denied',
                    required: { action, resource }
                }
            });
        } catch (error) {
            next(error);
        }
    };
}

module.exports = authorize;
