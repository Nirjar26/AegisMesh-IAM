export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    total: number;
    perPage: number;
    totalPages: number;
  };
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'LOCKED' | 'PENDING';
  mfaEnabled: boolean;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  type: 'BUILT_IN' | 'CUSTOM';
  policies: string[];
  userCount: number;
  createdAt: string;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  statements: PolicyStatement[];
  isAttached: boolean;
}

export interface PolicyStatement {
  sid: string;
  effect: 'Allow' | 'Deny';
  actions: string[];
  resources: string[];
  conditions?: Record<string, unknown>;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  roleCount: number;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: { id: string; email: string };
  action: string;
  resource: string;
  target: string;
  status: 'SUCCESS' | 'FAILURE' | 'DENIED';
  metadata: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  mfaEnabled: boolean;
  roles: string[];
}
