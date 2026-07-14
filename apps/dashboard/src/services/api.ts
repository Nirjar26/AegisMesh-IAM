import axios from 'axios';
import { logger } from '../utils/logger';
import type { QueryParams } from './types';
import type { ApiResponse, PaginatedResponse, User } from '@bastion/types';

interface InterceptorError {
    config?: Record<string, unknown> & {
        _retry?: boolean;
        url?: string;
        headers?: Record<string, string>;
    };
    response?: { status?: number; data?: { code?: string; error?: { code?: string } } };
}

const AUTH_EXPIRED_EVENT = 'iam:auth-expired';
const REAUTH_HEADER = 'x-reauth-token';
const CSRF_TOKEN_HEADER = 'x-csrf-token';

const PUBLIC_AUTH_PATHS = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/verify-email',
    '/auth/logout',
];

let csrfToken: string | null = null;
let csrfPromise: Promise<string | null> | null = null;
let _reauthToken: string | null = null;

const api = axios.create({
    baseURL: '/api',
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const fetchCsrfToken = async (): Promise<string | null> => {
    if (csrfPromise) return csrfPromise;

    csrfPromise = (async () => {
        try {
            const { data } = await axios.get('/api/csrf-token', { withCredentials: true });
            csrfToken = data.data.csrfToken;
            api.defaults.headers.common[CSRF_TOKEN_HEADER] = csrfToken;
            return csrfToken;
        } catch (error) {
            logger.error('Failed to fetch CSRF token', error);
            return null;
        } finally {
            csrfPromise = null;
        }
    })();

    return csrfPromise;
};

const getStoredReauthToken = (): string | null => _reauthToken;

const storeReauthToken = (token: string | null): void => {
    _reauthToken = token || null;
};

const clearStoredReauthToken = (): void => {
    _reauthToken = null;
};

export const setReauthToken = (token: string | null): void => {
    storeReauthToken(token);
};

const notifyAuthExpired = (): void => {
    if (typeof globalThis !== 'undefined') {
        globalThis.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
    }
};

const redirectToLoginIfNeeded = (): void => {
    if (typeof globalThis !== 'undefined' && globalThis.location.pathname !== '/login') {
        globalThis.location.href = '/login';
    }
};

const isRefreshRequest = (url = ''): boolean => url.includes('/auth/refresh-token');
const isPublicAuthRequest = (url = ''): boolean =>
    PUBLIC_AUTH_PATHS.some((path) => url.includes(path));

api.interceptors.request.use(
    async (config) => {
        const method = config.method?.toUpperCase() ?? '';
        const isMutating = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);
        if (isMutating && !csrfToken && config.url !== '/csrf-token') {
            await fetchCsrfToken();
        }

        if (csrfToken) {
            config.headers[CSRF_TOKEN_HEADER] = csrfToken;
        }

        const reauthToken = getStoredReauthToken();
        if (reauthToken && !isPublicAuthRequest(config.url || '')) {
            config.headers[REAUTH_HEADER] = reauthToken;
        }

        return config;
    },
    (error) => {
        throw error;
    },
);

let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: unknown) => void;
    reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: unknown = null): void => {
    const queue = failedQueue;
    failedQueue = [];
    queue.forEach((prom) => {
        if (error) prom.reject(error);
        else prom.resolve(token);
    });
};

api.interceptors.response.use(
    (response) => {
        const reauthToken: string | undefined = response.headers?.[REAUTH_HEADER];
        if (reauthToken) storeReauthToken(reauthToken);
        return response;
    },
    async (error: InterceptorError) => {
        const originalRequest = error.config;
        const responseCode = error.response?.data?.code || error.response?.data?.error?.code;

        if (responseCode === 'REAUTH_REQUIRED') {
            clearStoredReauthToken();
            throw error;
        }

        if (
            error.response?.status === 403 &&
            (responseCode === 'EBADCSRFTOKEN' || responseCode === 'CSRF_ERROR') &&
            originalRequest
        ) {
            await fetchCsrfToken();
            if (originalRequest.headers && csrfToken) {
                originalRequest.headers[CSRF_TOKEN_HEADER] = csrfToken;
            }
            return api(originalRequest as any);
        }

        const shouldRetry =
            error.response?.status === 401 &&
            originalRequest &&
            !originalRequest._retry &&
            !isRefreshRequest(originalRequest.url || '') &&
            !isPublicAuthRequest(originalRequest.url || '');

        if (shouldRetry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    if (failedQueue.length < 100) failedQueue.push({ resolve, reject });
                    else reject(new Error('Too many queued requests'));
                }).then(() => api(originalRequest));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                await axios.post('/api/auth/refresh-token', {}, { withCredentials: true });
                processQueue(null);
                return await api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError);
                notifyAuthExpired();
                redirectToLoginIfNeeded();
                throw refreshError;
            } finally {
                isRefreshing = false;
            }
        }

        throw error;
    },
);

interface AuthAPI {
    register: (data: Record<string, unknown>) => Promise<unknown>;
    login: (credentials: { email: string; password: string; mfaCode?: string }) => Promise<unknown>;
    logout: () => Promise<unknown>;
    refreshToken: () => Promise<unknown>;
    forgotPassword: (data: Record<string, unknown>) => Promise<unknown>;
    resetPassword: (data: Record<string, unknown>) => Promise<unknown>;
    verifyEmail: (token: string) => Promise<unknown>;
    getProfile: () => Promise<unknown>;
    getSessions: () => Promise<unknown>;
    revokeSession: (sessionId: string) => Promise<unknown>;
    setupMFA: () => Promise<unknown>;
    verifyMFASetup: (totpCode: string) => Promise<unknown>;
    disableMFA: (data: Record<string, unknown>) => Promise<unknown>;
}

export const authAPI: AuthAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    logout: () => api.post('/auth/logout', {}),
    refreshToken: () => api.post('/auth/refresh-token', {}),
    forgotPassword: (data) => api.post('/auth/forgot-password', data),
    resetPassword: (data) => api.post('/auth/reset-password', data),
    verifyEmail: (token) => api.post('/auth/verify-email', { token }),
    getProfile: () => api.get('/auth/me'),
    getSessions: () => api.get('/auth/sessions'),
    revokeSession: (sessionId) => api.delete(`/auth/sessions/${sessionId}`),

    setupMFA: () => api.post('/auth/mfa/setup'),
    verifyMFASetup: (totpCode) => api.post('/auth/mfa/verify-setup', { totpCode }),
    disableMFA: (data) => api.post('/auth/mfa/disable', data),
};

interface RBACAPI {
    getRoles: (params?: QueryParams) => Promise<unknown>;
    getRole: (id: string) => Promise<unknown>;
    createRole: (data: Record<string, unknown>) => Promise<unknown>;
    updateRole: (id: string, data: Record<string, unknown>) => Promise<unknown>;
    deleteRole: (id: string) => Promise<unknown>;
    attachPolicyToRole: (roleId: string, policyId: string) => Promise<unknown>;
    detachPolicyFromRole: (roleId: string, policyId: string) => Promise<unknown>;
    getRoleUsers: (id: string) => Promise<unknown>;
    getPolicies: (params?: QueryParams) => Promise<unknown>;
    getPolicy: (id: string) => Promise<unknown>;
    createPolicy: (data: Record<string, unknown>) => Promise<unknown>;
    updatePolicy: (id: string, data: Record<string, unknown>) => Promise<unknown>;
    deletePolicy: (id: string) => Promise<unknown>;
    simulatePolicy: (data: Record<string, unknown>) => Promise<unknown>;
    getGroups: () => Promise<unknown>;
    getGroup: (id: string) => Promise<unknown>;
    createGroup: (data: Record<string, unknown>) => Promise<unknown>;
    updateGroup: (id: string, data: Record<string, unknown>) => Promise<unknown>;
    deleteGroup: (id: string) => Promise<unknown>;
    addGroupMember: (groupId: string, userId: string) => Promise<unknown>;
    removeGroupMember: (groupId: string, userId: string) => Promise<unknown>;
    attachRoleToGroup: (groupId: string, roleId: string) => Promise<unknown>;
    detachRoleFromGroup: (groupId: string, roleId: string) => Promise<unknown>;
    getUserRoles: (userId: string) => Promise<unknown>;
    assignUserRole: (userId: string, roleId: string) => Promise<unknown>;
    removeUserRole: (userId: string, roleId: string) => Promise<unknown>;
    getUserPermissions: (userId: string) => Promise<unknown>;
    getUserGroups: (userId: string) => Promise<unknown>;
}

export const rbacAPI: RBACAPI = {
    getRoles: (params) => api.get('/roles', { params }),
    getRole: (id) => api.get(`/roles/${id}`),
    createRole: (data) => api.post('/roles', data),
    updateRole: (id, data) => api.put(`/roles/${id}`, data),
    deleteRole: (id) => api.delete(`/roles/${id}`),
    attachPolicyToRole: (roleId, policyId) => api.post(`/roles/${roleId}/policies`, { policyId }),
    detachPolicyFromRole: (roleId, policyId) => api.delete(`/roles/${roleId}/policies/${policyId}`),
    getRoleUsers: (id) => api.get(`/roles/${id}/users`),
    getPolicies: (params) => api.get('/policies', { params }),
    getPolicy: (id) => api.get(`/policies/${id}`),
    createPolicy: (data) => api.post('/policies', data),
    updatePolicy: (id, data) => api.put(`/policies/${id}`, data),
    deletePolicy: (id) => api.delete(`/policies/${id}`),
    simulatePolicy: (data) => api.post('/policies/simulate', data),
    getGroups: () => api.get('/groups'),
    getGroup: (id) => api.get(`/groups/${id}`),
    createGroup: (data) => api.post('/groups', data),
    updateGroup: (id, data) => api.put(`/groups/${id}`, data),
    deleteGroup: (id) => api.delete(`/groups/${id}`),
    addGroupMember: (groupId, userId) => api.post(`/groups/${groupId}/members`, { userId }),
    removeGroupMember: (groupId, userId) => api.delete(`/groups/${groupId}/members/${userId}`),
    attachRoleToGroup: (groupId, roleId) => api.post(`/groups/${groupId}/roles`, { roleId }),
    detachRoleFromGroup: (groupId, roleId) => api.delete(`/groups/${groupId}/roles/${roleId}`),
    getUserRoles: (userId) => api.get(`/users/${userId}/roles`),
    assignUserRole: (userId, roleId) => api.post(`/users/${userId}/roles`, { roleId }),
    removeUserRole: (userId, roleId) => api.delete(`/users/${userId}/roles/${roleId}`),
    getUserPermissions: (userId) => api.get(`/users/${userId}/permissions`),
    getUserGroups: (userId) => api.get(`/users/${userId}/groups`),
};

interface AuditAPI {
    getLogs: (params?: QueryParams) => Promise<unknown>;
    getLog: (id: string) => Promise<unknown>;
    getUserLogs: (userId: string, params?: QueryParams) => Promise<unknown>;
    getStats: () => Promise<unknown>;
    getSecurityAlerts: () => Promise<unknown>;
    exportCSV: (filters: Record<string, unknown>) => Promise<unknown>;
    cleanup: (data: Record<string, unknown>) => Promise<unknown>;
}

export const auditAPI: AuditAPI = {
    getLogs: (params) => api.get('/audit-logs', { params }),
    getLog: (id) => api.get(`/audit-logs/${id}`),
    getUserLogs: (userId, params) => api.get(`/audit-logs/user/${userId}`, { params }),
    getStats: () => api.get('/audit-logs/stats'),
    getSecurityAlerts: () => api.get('/audit-logs/security-alerts'),
    exportCSV: (filters) => api.post('/audit-logs/export', filters, { responseType: 'blob' }),
    cleanup: (data) => api.delete('/audit-logs/cleanup', { data }),
};

interface NotificationsAPI {
    getAll: (params?: QueryParams) => Promise<unknown>;
    markRead: (id: string, read?: boolean) => Promise<unknown>;
    markAllRead: () => Promise<unknown>;
    delete: (id: string) => Promise<unknown>;
}

export const notificationsAPI: NotificationsAPI = {
    getAll: (params) => api.get('/notifications', { params }),
    markRead: (id, read = true) => api.patch(`/notifications/${id}/read`, { read }),
    markAllRead: () => api.post('/notifications/mark-all-read'),
    delete: (id) => api.delete(`/notifications/${id}`),
};

interface BulkUsersAPI {
    updateStatus: (data: Record<string, unknown>) => Promise<unknown>;
    assignRoles: (data: Record<string, unknown>) => Promise<unknown>;
    assignGroups: (data: Record<string, unknown>) => Promise<unknown>;
    delete: (data: Record<string, unknown>) => Promise<unknown>;
    export: (data: Record<string, unknown>) => Promise<unknown>;
}

export const bulkUsers: BulkUsersAPI = {
    updateStatus: (data) => api.post('/users/bulk/status', data),
    assignRoles: (data) => api.post('/users/bulk/roles', data),
    assignGroups: (data) => api.post('/users/bulk/groups', data),
    delete: (data) => api.post('/users/bulk/delete', data),
    export: (data) =>
        api.post('/users/bulk/export', data, {
            responseType: 'text',
        }),
};

interface RoleTemplatesAPI {
    getAll: () => Promise<unknown>;
    apply: (templateId: string, data: Record<string, unknown>) => Promise<unknown>;
}

export const roleTemplates: RoleTemplatesAPI = {
    getAll: () => api.get('/roles/templates'),
    apply: (templateId, data) => api.post(`/roles/templates/${templateId}/apply`, data),
};

interface UserAPI {
    getUsers: (params?: QueryParams) => Promise<unknown>;
    getUser: (id: string) => Promise<unknown>;
    createUser: (data: Record<string, unknown>) => Promise<unknown>;
    updateUser: (id: string, data: Record<string, unknown>) => Promise<unknown>;
    updateStatus: (id: string, status: string) => Promise<unknown>;
    verifyEmail: (id: string) => Promise<unknown>;
    deleteUser: (id: string, credentials?: Record<string, unknown>) => Promise<unknown>;
    getUserSessions: (id: string) => Promise<unknown>;
    revokeSession: (id: string, sessionId: string) => Promise<unknown>;
    revokeAllSessions: (id: string) => Promise<unknown>;
}

export const userAPI: UserAPI = {
    getUsers: (params) => api.get<PaginatedResponse<User>>('/users', { params }),
    getUser: (id) => api.get<ApiResponse<User>>(`/users/${id}`),
    createUser: (data) => api.post('/users', data),
    updateUser: (id, data) => api.put(`/users/${id}`, data),
    updateStatus: (id, status) => api.put(`/users/${id}/status`, { status }),
    verifyEmail: (id) => api.put(`/users/${id}/verify-email`),
    deleteUser: (id, credentials = {}) => api.delete(`/users/${id}`, { data: credentials }),
    getUserSessions: (id) => api.get(`/users/${id}/sessions`),
    revokeSession: (id, sessionId) => api.delete(`/users/${id}/sessions/${sessionId}`),
    revokeAllSessions: (id) => api.delete(`/users/${id}/sessions`),
};

interface ConnectedAppsAPI {
    getAll: () => Promise<unknown>;
    revoke: (appId: string) => Promise<unknown>;
}

export const connectedAppsAPI: ConnectedAppsAPI = {
    getAll: () => api.get('/settings/connected-apps'),
    revoke: (appId) => api.delete(`/settings/connected-apps/${appId}`),
};

interface SettingsAPI {
    ensureDefaults: () => Promise<unknown>;

    getProfile: () => Promise<unknown>;
    updateProfile: (data: Record<string, unknown>) => Promise<unknown>;
    uploadAvatar: (file: File) => Promise<unknown>;
    deleteAvatar: () => Promise<unknown>;

    changePassword: (data: Record<string, unknown>) => Promise<unknown>;
    getMfaSetup: () => Promise<unknown>;
    verifyMfa: (data: Record<string, unknown>) => Promise<unknown>;
    disableMfa: (credentials?: Record<string, unknown>) => Promise<unknown>;
    regenerateBackupCodes: (credentials?: Record<string, unknown>) => Promise<unknown>;
    getLoginHistory: () => Promise<unknown>;
    getTrustedDevices: () => Promise<unknown>;
    revokeTrustedDevice: (deviceId: string) => Promise<unknown>;
    revokeAllTrustedDevices: () => Promise<unknown>;

    getSessions: () => Promise<unknown>;
    revokeSession: (sessionId: string) => Promise<unknown>;
    revokeAllOtherSessions: (credentials?: Record<string, unknown>) => Promise<unknown>;

    getNotifications: () => Promise<unknown>;
    updateNotifications: (data: Record<string, unknown>) => Promise<unknown>;

    getOrganization: () => Promise<unknown>;
    updateOrganization: (data: Record<string, unknown>) => Promise<unknown>;
    exportOrganizationData: (credentials?: Record<string, unknown>) => Promise<unknown>;
    resetOrganizationPolicies: (credentials?: Record<string, unknown>) => Promise<unknown>;

    getApiKeys: () => Promise<unknown>;
    createApiKey: (
        data: Record<string, unknown>,
        credentials?: Record<string, unknown>,
    ) => Promise<unknown>;
    revokeApiKey: (tokenId: string) => Promise<unknown>;
}

export const settingsAPI: SettingsAPI = {
    ensureDefaults: () => api.get('/settings/profile'),

    getProfile: () => api.get('/settings/profile'),
    updateProfile: (data) => api.patch('/settings/profile', data),
    uploadAvatar: (file) => {
        const formData = new FormData();
        formData.append('avatar', file);
        return api.post('/settings/profile/avatar', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    deleteAvatar: () => api.delete('/settings/profile/avatar'),

    changePassword: (data) => api.post('/settings/security/change-password', data),
    getMfaSetup: () => api.get('/settings/security/mfa/setup'),
    verifyMfa: (data) => api.post('/settings/security/mfa/verify', data),
    disableMfa: (credentials = {}) => api.delete('/settings/security/mfa', { data: credentials }),
    regenerateBackupCodes: (credentials = {}) =>
        api.post('/settings/security/mfa/backup-codes/regenerate', credentials),
    getLoginHistory: () => api.get('/settings/security/login-history'),
    getTrustedDevices: () => api.get('/settings/security/trusted-devices'),
    revokeTrustedDevice: (deviceId) => api.delete(`/settings/security/trusted-devices/${deviceId}`),
    revokeAllTrustedDevices: () => api.delete('/settings/security/trusted-devices'),

    getSessions: () => api.get('/settings/sessions'),
    revokeSession: (sessionId) => api.delete(`/settings/sessions/${sessionId}`),
    revokeAllOtherSessions: (credentials = {}) =>
        api.delete('/settings/sessions', { data: credentials }),

    getNotifications: () => api.get('/settings/notifications'),
    updateNotifications: (data) => api.patch('/settings/notifications', data),

    getOrganization: () => api.get('/settings/organization'),
    updateOrganization: (data) => api.patch('/settings/organization', data),
    exportOrganizationData: (credentials = {}) =>
        api.post('/settings/organization/export', credentials, { responseType: 'blob' }),
    resetOrganizationPolicies: (credentials = {}) =>
        api.post('/settings/organization/reset-policies', credentials),

    getApiKeys: () => api.get('/settings/api-keys'),
    createApiKey: (data, credentials = {}) =>
        api.post('/settings/api-keys', { ...data, ...credentials }),
    revokeApiKey: (tokenId) => api.delete(`/settings/api-keys/${tokenId}`),
};

export default api;
