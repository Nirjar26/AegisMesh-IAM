const CATEGORY_CONFIG = {
    AUTHENTICATION: { label: 'Authentication', color: 'var(--ds-color-info)', icon: '🔐' },
    AUTHORIZATION: { label: 'Authorization', color: 'var(--ds-color-danger)', icon: '🛡️' },
    USER_MANAGEMENT: { label: 'User Mgmt', color: 'var(--ds-color-accent-soft)', icon: '👤' },
    ROLE_MANAGEMENT: { label: 'Role Mgmt', color: 'var(--ds-color-warning)', icon: '🏷️' },
    POLICY_MANAGEMENT: { label: 'Policy Mgmt', color: 'var(--ds-color-success)', icon: '📋' },
    GROUP_MANAGEMENT: { label: 'Group Mgmt', color: 'var(--ds-color-info)', icon: '👥' },
    SESSION_MANAGEMENT: { label: 'Session Mgmt', color: 'var(--ds-color-danger)', icon: '🔑' },
    MFA: { label: 'MFA', color: 'var(--ds-color-success)', icon: '📱' },
    SECURITY: { label: 'Security', color: 'var(--ds-color-danger)', icon: '🚨' },
    SYSTEM: { label: 'System', color: 'var(--ds-color-text-muted)', icon: '⚙️' },
    DATA_ACCESS: { label: 'Data Access', color: 'var(--ds-color-accent-soft)', icon: '📊' },
};

const RESULT_CONFIG = {
    SUCCESS: { label: 'Success', color: 'var(--ds-color-success)', bg: 'rgb(var(--ds-rgb-success) / 0.15)' },
    FAILURE: { label: 'Failure', color: 'var(--ds-color-danger)', bg: 'rgb(var(--ds-rgb-danger) / 0.15)' },
    ERROR: { label: 'Error', color: 'var(--ds-color-accent-soft)', bg: 'rgb(var(--ds-rgb-accent-soft) / 0.15)' },
    BLOCKED: { label: 'Blocked', color: 'var(--ds-color-warning)', bg: 'rgb(var(--ds-rgb-warning) / 0.15)' },
};

const SEVERITY_CONFIG = {
    CRITICAL: { color: 'var(--ds-color-danger)', bg: 'rgb(var(--ds-rgb-danger) / 0.15)', icon: '🔴' },
    HIGH: { color: 'var(--ds-color-warning)', bg: 'rgb(var(--ds-rgb-warning) / 0.15)', icon: '🟠' },
    MEDIUM: { color: 'var(--ds-color-warning)', bg: 'rgb(var(--ds-rgb-warning) / 0.15)', icon: '🟡' },
    LOW: { color: 'var(--ds-color-success)', bg: 'rgb(var(--ds-rgb-success) / 0.15)', icon: '🟢' },
};

export { CATEGORY_CONFIG, RESULT_CONFIG, SEVERITY_CONFIG };
