import { useCallback, useRef, useState } from 'react';

interface PendingPromise<T = unknown> {
    resolve: ((value: T | PromiseLike<T>) => void) | null;
    reject: ((reason: unknown) => void) | null;
}

interface ReauthModalState {
    isOpen: boolean;
    pendingCall: ((credentials: Record<string, unknown>) => Promise<unknown>) | null;
    action: string | null;
    requiresMfa: boolean;
    actionLabel: string;
}

interface UseReauthReturn {
    withReauth: <T>(
        apiCall: (credentials: Record<string, unknown>) => Promise<T>,
        actionLabel?: string,
    ) => Promise<T>;
    reauthModal: ReauthModalState;
    handleReauthSuccess: (credentials: Record<string, unknown>) => Promise<unknown> | undefined;
    handleReauthClose: () => void;
}

const INITIAL_STATE: ReauthModalState = {
    isOpen: false,
    pendingCall: null,
    action: null,
    requiresMfa: false,
    actionLabel: '',
};

interface ErrorWithResponse {
    response?: {
        data?: {
            code?: string;
            error?: {
                code?: string;
                action?: string;
                requiresMfa?: boolean;
            };
            action?: string;
            requiresMfa?: boolean;
        };
    };
}

function getErrorCode(error: ErrorWithResponse): string | null {
    return error?.response?.data?.code || error?.response?.data?.error?.code || null;
}

export function useReauth(): UseReauthReturn {
    const [reauthModal, setReauthModal] = useState<ReauthModalState>(INITIAL_STATE);
    const pendingPromiseRef = useRef<PendingPromise<unknown>>({ resolve: null, reject: null });

    const resetState = useCallback(() => {
        setReauthModal(INITIAL_STATE);
        pendingPromiseRef.current = { resolve: null, reject: null };
    }, []);

    const withReauth = useCallback(
        async <T>(
            apiCall: (credentials: Record<string, unknown>) => Promise<T>,
            actionLabel: string = '',
        ): Promise<T> => {
            try {
                return await apiCall({});
            } catch (error) {
                const err = error as ErrorWithResponse;
                const code = getErrorCode(err);
                const data = err?.response?.data;
                const errorData = data?.error || {};

                if (code !== 'REAUTH_REQUIRED') {
                    throw error;
                }

                return new Promise<T>((resolve, reject) => {
                    pendingPromiseRef.current = { resolve: resolve as (value: unknown) => void, reject };

                    setReauthModal({
                        isOpen: true,
                        pendingCall: async (credentials: Record<string, unknown>) => {
                            try {
                                const result = await apiCall(credentials);
                                resetState();
                                resolve(result);
                                return result;
                            } catch (retryError) {
                                const retryErr = retryError as ErrorWithResponse;
                                const retryCode = getErrorCode(retryErr);
                                if (
                                    [
                                        'INVALID_PASSWORD',
                                        'INVALID_MFA_TOKEN',
                                        'NO_PASSWORD',
                                        'MFA_NOT_ENABLED',
                                    ].includes(retryCode as string)
                                ) {
                                    throw retryError;
                                }

                                resetState();
                                reject(retryError);
                                throw retryError;
                            }
                        },
                        action: data?.action || (errorData as { action?: string }).action || null,
                        requiresMfa: Boolean(
                            data?.requiresMfa ?? (errorData as { requiresMfa?: boolean }).requiresMfa,
                        ),
                        actionLabel,
                    });
                });
            }
        },
        [resetState],
    );

    const pendingCall = reauthModal.pendingCall;

    const handleReauthSuccess = useCallback(
        (credentials: Record<string, unknown>): Promise<unknown> | undefined => {
            return pendingCall?.(credentials);
        },
        [pendingCall],
    );

    const handleReauthClose = useCallback(() => {
        pendingPromiseRef.current.reject?.(new Error('Re-authentication cancelled'));
        resetState();
    }, [resetState]);

    return {
        withReauth,
        reauthModal,
        handleReauthSuccess,
        handleReauthClose,
    };
}
