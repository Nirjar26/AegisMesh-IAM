export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  mfaEnabled: boolean;
  roles: string[];
}

export interface LoginCredentials {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<unknown>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
  updateUser: (updates: Partial<AuthUser>) => void;
  loadProfile: () => Promise<void>;
}
