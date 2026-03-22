/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);
const AUTH_EXPIRED_EVENT = 'iam:auth-expired';

export function AuthProvider({ children }) {
    const queryClient = useQueryClient();
    const [user, setUser] = useState(null);
    const [accessToken, setAccessToken] = useState(() => localStorage.getItem('accessToken'));
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const refreshTimerRef = useRef(null);
    const refreshTokenFnRef = useRef(null);

    // Decode JWT to get expiry
    const getTokenExpiry = useCallback((token) => {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp * 1000; // Convert to milliseconds
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
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        setAccessToken(null);
        setUser(null);
        setIsAuthenticated(false);
        clearRefreshTimer();
    }, [clearRefreshTimer]);

    // Schedule token refresh 1 minute before expiry
    const scheduleRefresh = useCallback((token) => {
        clearRefreshTimer();

        if (!token) {
            return;
        }

        const expiry = getTokenExpiry(token);
        if (!expiry) return;

        const timeUntilRefresh = expiry - Date.now() - 60000; // 1 minute before
        if (timeUntilRefresh <= 0) {
            // Token is about to expire, refresh now
            refreshTokenFnRef.current?.();
            return;
        }

        refreshTimerRef.current = setTimeout(() => {
            refreshTokenFnRef.current?.();
        }, timeUntilRefresh);
    }, [clearRefreshTimer, getTokenExpiry]);

    // Load user profile
    const loadProfile = useCallback(async () => {
        try {
            const { data } = await authAPI.getProfile();
            setUser(data.data);
            setIsAuthenticated(true);
        } catch {
            clearAuthState();
        } finally {
            setIsLoading(false);
        }
    }, [clearAuthState]);

    // Login
    const login = useCallback(async (credentials) => {
        const { data } = await authAPI.login(credentials);
        const { accessToken: token, refreshToken: refresh, user: userData } = data.data;

        if (token) {
            localStorage.setItem('accessToken', token);
            setAccessToken(token);
            scheduleRefresh(token);
        }

        if (refresh) {
            localStorage.setItem('refreshToken', refresh);
        }

        setUser(userData);
        setIsAuthenticated(true);

        return data;
    }, [scheduleRefresh]);

    // Logout
    const logout = useCallback(async () => {
        try {
            await authAPI.logout();
        } catch {
            // Continue logout even if API fails
        } finally {
            clearAuthState();
            queryClient.clear();
            setIsLoading(false);
        }
    }, [clearAuthState, queryClient]);

    // Refresh token
    const refreshToken = useCallback(async () => {
        try {
            const { data } = await authAPI.refreshToken();
            const { accessToken: newToken, refreshToken: newRefresh } = data.data;

            if (newToken) {
                localStorage.setItem('accessToken', newToken);
                setAccessToken(newToken);
                scheduleRefresh(newToken);
            }

            if (newRefresh) {
                localStorage.setItem('refreshToken', newRefresh);
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

    // Update user in state
    const updateUser = useCallback((updates) => {
        setUser((prev) => (prev ? { ...prev, ...updates } : null));
    }, []);

    // Initialize auth state
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('accessToken');
            const storedRefreshToken = localStorage.getItem('refreshToken');

            if (!token && !storedRefreshToken) {
                setUser(null);
                setIsAuthenticated(false);
                setIsLoading(false);
                return;
            }

            if (token) {
                setAccessToken(token);
                scheduleRefresh(token);
            }

            try {
                if (!token && storedRefreshToken) {
                    await refreshToken();
                }

                await loadProfile();
            } catch {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                setUser(null);
                setIsAuthenticated(false);
                setIsLoading(false);
            }
        };

        checkAuth();

        return () => {
            clearRefreshTimer();
        };
    }, [clearRefreshTimer, loadProfile, refreshToken, scheduleRefresh]);

    useEffect(() => {
        const handleAuthExpired = () => {
            clearAuthState();
            setIsLoading(false);
        };

        window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
        return () => {
            window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
        };
    }, [clearAuthState]);

    const value = {
        user,
        accessToken,
        isAuthenticated,
        isLoading,
        loading: isLoading,
        login,
        logout,
        refreshToken,
        updateUser,
        loadProfile,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}


