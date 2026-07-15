import {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
    useMemo,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authAPI, fetchCsrfToken } from '../services/api';
import type { AuthUser, LoginCredentials, AuthContextValue } from './types';
import type { ApiResponse } from '@bastion/types';

interface AuthProviderProps {
    children: React.ReactNode;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_EXPIRED_EVENT = 'iam:auth-expired';

export function AuthProvider({ children }: AuthProviderProps) {
    const queryClient = useQueryClient();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const refreshTokenFnRef = useRef<(() => Promise<string | null>) | null>(null);

    const getTokenExpiry = useCallback((token: string | null) => {
        try {
            if (!token) return null;
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp * 1000;
        } catch {
            return null;
        }
    }, []);

    const clearRefreshTimer = useCallback(() => {
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }
    }, []);

    const clearAuthState = useCallback(() => {
        setAccessToken(null);
        setUser(null);
        setIsAuthenticated(false);
        clearRefreshTimer();
    }, [clearRefreshTimer]);

    const scheduleRefresh = useCallback(
        (token: string | null) => {
            clearRefreshTimer();

            if (!token) return;

            const expiry = getTokenExpiry(token);
            if (!expiry) return;

            const timeUntilRefresh = expiry - Date.now() - 60000;
            if (timeUntilRefresh <= 0) {
                refreshTokenFnRef.current?.();
                return;
            }

            refreshTimerRef.current = setTimeout(() => {
                refreshTokenFnRef.current?.();
            }, timeUntilRefresh);
        },
        [clearRefreshTimer, getTokenExpiry],
    );

    const loadProfile = useCallback(async () => {
        try {
            const response = await authAPI.getProfile() as { data: ApiResponse<AuthUser> };
            setUser(response.data.data);
            setIsAuthenticated(true);
        } catch {
            clearAuthState();
        } finally {
            setIsLoading(false);
        }
    }, [clearAuthState]);

    const login = useCallback(
        async (credentials: LoginCredentials) => {
            const response = await authAPI.login(credentials) as { data: ApiResponse<{ accessToken: string; user: AuthUser }> };
            const { accessToken: token, user: userData } = response.data.data;

            if (token) {
                setAccessToken(token);
                scheduleRefresh(token);
            }

            setUser(userData);
            setIsAuthenticated(true);

            return response.data;
        },
        [scheduleRefresh],
    );

    const logout = useCallback(async () => {
        try {
            await authAPI.logout();
        } catch {
            // Ignore failure
        } finally {
            clearAuthState();
            queryClient.clear();
            setIsLoading(false);
        }
    }, [clearAuthState, queryClient]);

    const refreshToken = useCallback(async () => {
        try {
            const response = await authAPI.refreshToken() as { data: ApiResponse<{ accessToken: string }> };
            const { accessToken: newToken } = response.data.data;

            if (newToken) {
                setAccessToken(newToken);
                scheduleRefresh(newToken);
            }

            return newToken;
        } catch (error) {
            clearAuthState();
            throw error;
        }
    }, [clearAuthState, scheduleRefresh]);

    useEffect(() => {
        refreshTokenFnRef.current = refreshToken;
    }, [refreshToken]);

    const updateUser = useCallback((updates: Partial<AuthUser>) => {
        setUser((prev) =>
            prev
                ? {
                      ...prev,
                      ...Object.fromEntries(
                          Object.entries(updates).filter(
                              ([k]) =>
                                  k !== '__proto__' && k !== 'constructor' && k !== 'prototype',
                          ),
                      ),
                  }
                : null,
        );
    }, []);

    useEffect(() => {
        const initAuth = async () => {
            try {
                await fetchCsrfToken();

                const token = await refreshToken();

                if (token) {
                    await loadProfile();
                } else {
                    setIsLoading(false);
                }
            } catch {
                setIsLoading(false);
                clearAuthState();
            }
        };

        initAuth();

        return () => {
            clearRefreshTimer();
        };
    }, [clearRefreshTimer, loadProfile, refreshToken, clearAuthState]);

    useEffect(() => {
        const handleAuthExpired = () => {
            clearAuthState();
            setIsLoading(false);
        };

        globalThis.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
        return () => {
            globalThis.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
        };
    }, [clearAuthState]);

    const value = useMemo(
        () => ({
            user,
            accessToken,
            isAuthenticated,
            isLoading,
            login,
            logout,
            refreshToken,
            updateUser,
            loadProfile,
        }),
        [
            user,
            accessToken,
            isAuthenticated,
            isLoading,
            login,
            logout,
            refreshToken,
            updateUser,
            loadProfile,
        ],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
