const prisma = require('../config/database');
const permissionService = require('../services/permission.service');
const { auditRole } = require('../utils/auditLog');

exports.getUserRoles = async (req, res, next) => {
    try {
        const userRoles = await prisma.userRole.findMany({
            where: { userId: req.params.id },
            include: { role: true }
        });
        res.json({ success: true, data: userRoles.map(ur => ur.role) });
    } catch (error) { next(error); }
};

exports.assignRole = async (req, res, next) => {
    try {
        const { roleId } = req.body;
        const userId = req.params.id;

        const existing = await prisma.userRole.findUnique({
            where: { userId_roleId: { userId, roleId } }
        });
        if (existing) return res.status(400).json({ success: false, error: 'Role already assigned' });

        await prisma.userRole.create({
            data: { userId, roleId, assignedBy: req.user.id }
        });

        await auditRole.assigned(req, roleId, userId);
        res.status(201).json({ success: true, message: 'Role assigned' });
    } catch (error) { next(error); }
};

exports.removeRole = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const { roleId } = req.params;
        const ur = await prisma.userRole.findUnique({
            where: { userId_roleId: { userId, roleId } }
        });

        if (!ur) return res.status(404).json({ success: false, error: 'Role assignment not found' });

        await prisma.userRole.delete({ where: { userId_roleId: { userId, roleId } } });
        await auditRole.removed(req, roleId, userId);

        res.json({ success: true, message: 'Role removed' });
    } catch (error) { next(error); }
};

exports.getUserPermissions = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const effectivePermissions = await permissionService.getEffectivePermissions(userId);
        res.json({ success: true, data: { userId, effectivePermissions } });
    } catch (error) { next(error); }
};

exports.getUserGroups = async (req, res, next) => {
    try {
        const userGroups = await prisma.userGroup.findMany({
            where: { userId: req.params.id },
            include: { group: true }
        });
        res.json({ success: true, data: userGroups.map(ug => ug.group) });
    } catch (error) { next(error); }
};
