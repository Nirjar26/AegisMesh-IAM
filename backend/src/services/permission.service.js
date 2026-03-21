const prisma = require('../config/database');

// Helper for wildcard matching
function matchPattern(pattern, value) {
    if (pattern === '*') return true;

    // Convert wildcard pattern to regex
    // Escape regex characters except '*' which becomes '.*'
    const regexStr = '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$';
    const regex = new RegExp(regexStr);
    return regex.test(value);
}

/**
 * 1. Get all roles directly assigned to user (UserRole)
 * 2. Get all groups user belongs to (UserGroup)
 * 3. Get all roles assigned to those groups (GroupRole)
 * 4. Merge all roles (deduplicate)
 * 5. Get all policies attached to all roles (RolePolicy)
 * 6. Return flat list of { effect, actions, resources }
 */
async function getUserPermissions(userId) {
    // 1. Direct roles
    const userRoles = await prisma.userRole.findMany({
        where: { userId },
        include: {
            role: {
                include: {
                    rolePolicies: {
                        include: { policy: true }
                    }
                }
            }
        }
    });

    // 2 & 3. Group roles
    const userGroups = await prisma.userGroup.findMany({
        where: { userId },
        include: {
            group: {
                include: {
                    groupRoles: {
                        include: {
                            role: {
                                include: {
                                    rolePolicies: {
                                        include: { policy: true }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    // Extract all unique roles
    const roleMap = new Map();

    userRoles.forEach(ur => {
        if (ur.role) roleMap.set(ur.role.id, ur.role);
    });

    userGroups.forEach(ug => {
        if (ug.group && ug.group.groupRoles) {
            ug.group.groupRoles.forEach(gr => {
                if (gr.role) roleMap.set(gr.role.id, gr.role);
            });
        }
    });

    // 4 & 5. Get all policies attached to all roles
    const policyMap = new Map();
    roleMap.forEach(role => {
        if (role.rolePolicies) {
            role.rolePolicies.forEach(rp => {
                if (rp.policy) {
                    policyMap.set(rp.policy.id, rp.policy);
                }
            });
        }
    });

    // 6. Return flat list
    return Array.from(policyMap.values()).map(p => ({
        id: p.id,
        name: p.name,
        effect: p.effect,
        actions: p.actions,
        resources: p.resources
    }));
}

/**
 * 1. Get all user permissions
 * 2. Separate into ALLOW and DENY policies
 * 3. Check if action matches any policy actions
 * 4. Check if resource matches any policy resources
 * 5. DENY always wins over ALLOW
 * 6. Return: { allowed: boolean, reason: string }
 */
async function checkPermission(userId, action, resource) {
    // SuperAdmin Bypass Check
    const userRoles = await prisma.userRole.findMany({
        where: { userId },
        include: { role: true }
    });
    const userGroups = await prisma.userGroup.findMany({
        where: { userId },
        include: { group: { include: { groupRoles: { include: { role: true } } } } }
    });

    let isSuperAdmin = userRoles.some(ur => ur.role.name === 'SuperAdmin');
    if (!isSuperAdmin) {
        isSuperAdmin = userGroups.some(ug =>
            ug.group.groupRoles.some(gr => gr.role.name === 'SuperAdmin')
        );
    }

    if (isSuperAdmin) {
        return {
            allowed: true,
            reason: 'SuperAdmin',
            matchedPolicies: [],
            deniedBy: null
        };
    }

    const policies = await getUserPermissions(userId);

    const allowPolicies = [];
    const denyPolicies = [];

    policies.forEach(p => {
        if (p.effect === 'ALLOW') allowPolicies.push(p);
        else if (p.effect === 'DENY') denyPolicies.push(p);
    });

    const matchesPolicy = (policy) => {
        const actionMatch = policy.actions.some(pAction => matchPattern(pAction, action));
        const resourceMatch = policy.resources.some(pResource => matchPattern(pResource, resource));
        return actionMatch && resourceMatch;
    };

    // Evaluate DENY policies first (DENY always wins over ALLOW)
    for (const policy of denyPolicies) {
        if (matchesPolicy(policy)) {
            return {
                allowed: false,
                reason: `Explicitly denied by policy: ${policy.name}`,
                matchedPolicies: [policy],
                deniedBy: policy
            };
        }
    }

    // Evaluate ALLOW policies
    const matchedAllowPolicies = [];
    for (const policy of allowPolicies) {
        if (matchesPolicy(policy)) {
            matchedAllowPolicies.push(policy);
        }
    }

    if (matchedAllowPolicies.length > 0) {
        return {
            allowed: true,
            reason: 'Allowed by policy',
            matchedPolicies: matchedAllowPolicies,
            deniedBy: null
        };
    }

    // Implicit deny
    return {
        allowed: false,
        reason: 'No matching policy',
        matchedPolicies: [],
        deniedBy: null
    };
}

/**
 * Returns a summary of all actions a user can perform
 */
async function getUserEffectivePermissions(userId) {
    const userRoles = await prisma.userRole.findMany({
        where: { userId },
        include: { role: true }
    });

    const userGroups = await prisma.userGroup.findMany({
        where: { userId },
        include: {
            group: {
                include: {
                    groupRoles: {
                        include: { role: true }
                    }
                }
            }
        }
    });

    const directRoles = userRoles.map(ur => ur.role);
    const groups = userGroups.map(ug => ({
        ...ug.group,
        roles: ug.group.groupRoles.map(gr => gr.role)
    }));

    const policies = await getUserPermissions(userId);

    const allowed = new Set();
    const denied = new Set();

    policies.forEach(p => {
        if (p.effect === 'DENY') {
            p.actions.forEach(a => denied.add(a));
        } else {
            p.actions.forEach(a => allowed.add(a));
        }
    });

    return {
        roles: directRoles,
        groups: groups,
        policies: policies,
        effectivePermissions: {
            allowed: Array.from(allowed),
            denied: Array.from(denied)
        }
    };
}

module.exports = {
    getUserPermissions,
    checkPermission,
    getUserEffectivePermissions
};
