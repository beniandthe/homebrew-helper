import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import {
    BILLING_RETURN_SYNC_RETRY_MS,
    BILLING_RETURN_SYNC_WINDOW_MS,
    clearPendingBillingReturn,
    getPendingBillingReturn,
    hasActiveProAccess,
} from '@/lib/billing';
import { supabase } from '@/lib/supabase';

type AppStateContextValue = {
    session: Session | null;
    userId: string | null;
    isSignedIn: boolean;
    isPro: boolean;
    savedProjectCount: number;
    loading: boolean;
    refreshAppState: (options?: { silent?: boolean }) => Promise<void>;
};

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [isPro, setIsPro] = useState(false);
    const [savedProjectCount, setSavedProjectCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const refreshInFlightRef = useRef<Promise<void> | null>(null);
    const refreshQueuedRef = useRef(false);
    const billingReturnSyncRef = useRef<Promise<void> | null>(null);

    const refreshAppState = useCallback(async (options?: { silent?: boolean }) => {
        if (refreshInFlightRef.current) {
            refreshQueuedRef.current = true;
            await refreshInFlightRef.current;
            return;
        }

        const runSingleRefresh = async () => {
            if (!supabase) {
                setSession(null);
                setIsPro(false);
                setSavedProjectCount(0);
                setLoading(false);
                return;
            }

            try {
                if (!options?.silent) {
                    setLoading(true);
                }

                const {
                    data: { session: nextSession },
                } = await supabase.auth.getSession();

                setSession(nextSession ?? null);

                const nextUserId = nextSession?.user?.id ?? null;

                if (!nextUserId) {
                    setIsPro(false);
                    setSavedProjectCount(0);
                    return;
                }

                const [{ data: profileData, error: profileError }, { count, error: countError }] = await Promise.all([
                    supabase
                        .from('profiles')
                        .select('is_pro, cancel_at_period_end, current_period_end, canceled_at')
                        .eq('id', nextUserId)
                        .maybeSingle(),
                    supabase
                        .from('saved_projects')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', nextUserId),
                ]);

                if (profileError) {
                    throw profileError;
                }

                if (countError) {
                    throw countError;
                }

                setIsPro(hasActiveProAccess(profileData));
                setSavedProjectCount(count ?? 0);
            } finally {
                setLoading(false);
            }
        };

        const runRefreshLoop = async () => {
            do {
                refreshQueuedRef.current = false;
                await runSingleRefresh();
            } while (refreshQueuedRef.current);
        };

        refreshInFlightRef.current = runRefreshLoop();

        try {
            await refreshInFlightRef.current;
        } finally {
            refreshInFlightRef.current = null;
        }
    }, []);

    const syncPendingBillingReturn = useCallback(async () => {
        if (Platform.OS !== 'web' || typeof window === 'undefined') {
            return;
        }

        const pending = getPendingBillingReturn();
        if (!pending) {
            return;
        }

        if (billingReturnSyncRef.current) {
            await billingReturnSyncRef.current;
            return;
        }

        const runSync = async () => {
            const deadlineMs = pending.startedAt + BILLING_RETURN_SYNC_WINDOW_MS;

            try {
                while (Date.now() <= deadlineMs) {
                    await refreshAppState({ silent: true });

                    if (Date.now() >= deadlineMs) {
                        break;
                    }

                    await new Promise((resolve) => {
                        window.setTimeout(resolve, BILLING_RETURN_SYNC_RETRY_MS);
                    });
                }
            } finally {
                clearPendingBillingReturn();
            }
        };

        billingReturnSyncRef.current = runSync();

        try {
            await billingReturnSyncRef.current;
        } finally {
            billingReturnSyncRef.current = null;
        }
    }, [refreshAppState]);

    useEffect(() => {
        void refreshAppState();
        void syncPendingBillingReturn();

        if (!supabase) return;

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(() => {
            void refreshAppState();
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [refreshAppState, syncPendingBillingReturn]);

    useEffect(() => {
        if (!supabase || !session?.user?.id) return;

        const client = supabase;
        const userId = session.user.id;
        const channel = client
            .channel(`app-state-${userId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'saved_projects', filter: `user_id=eq.${userId}` },
                () => {
                    void refreshAppState({ silent: true });
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
                () => {
                    void refreshAppState({ silent: true });
                }
            )
            .subscribe();

        return () => {
            client.removeChannel(channel);
        };
    }, [session?.user?.id, refreshAppState]);

    useEffect(() => {
        const appStateSubscription = AppState.addEventListener('change', (nextState) => {
            if (nextState === 'active') {
                void refreshAppState({ silent: true });
                void syncPendingBillingReturn();
            }
        });

        if (Platform.OS !== 'web' || typeof window === 'undefined') {
            return () => {
                appStateSubscription.remove();
            };
        }

        const onFocus = () => {
            void refreshAppState({ silent: true });
            void syncPendingBillingReturn();
        };
        const onPageShow = () => {
            void refreshAppState({ silent: true });
            void syncPendingBillingReturn();
        };
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                void refreshAppState({ silent: true });
                void syncPendingBillingReturn();
            }
        };
        const onStorage = (event: StorageEvent) => {
            if (!event.key || !event.key.includes('supabase.auth')) return;
            void refreshAppState({ silent: true });
        };

        window.addEventListener('focus', onFocus);
        window.addEventListener('pageshow', onPageShow);
        window.addEventListener('storage', onStorage);
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            window.removeEventListener('focus', onFocus);
            window.removeEventListener('pageshow', onPageShow);
            window.removeEventListener('storage', onStorage);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            appStateSubscription.remove();
        };
    }, [refreshAppState, syncPendingBillingReturn]);

    const value = useMemo(
        () => ({
            session,
            userId: session?.user?.id ?? null,
            isSignedIn: Boolean(session?.user?.id),
            isPro,
            savedProjectCount,
            loading,
            refreshAppState,
        }),
        [session, isPro, savedProjectCount, loading, refreshAppState]
    );

    return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
    const context = useContext(AppStateContext);

    if (!context) {
        throw new Error('useAppState must be used within an AppStateProvider');
    }

    return context;
}
