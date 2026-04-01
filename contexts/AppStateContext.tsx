import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';

import { hasActiveProAccess } from '@/lib/billing';
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

    const refreshAppState = useCallback(async (options?: { silent?: boolean }) => {
        if (refreshInFlightRef.current) {
            await refreshInFlightRef.current;
            return;
        }

        const runRefresh = async () => {
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

                const [{ data: profileData }, { count }] = await Promise.all([
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

                setIsPro(hasActiveProAccess(profileData));
                setSavedProjectCount(count ?? 0);
            } finally {
                setLoading(false);
            }
        };

        refreshInFlightRef.current = runRefresh();

        try {
            await refreshInFlightRef.current;
        } finally {
            refreshInFlightRef.current = null;
        }
    }, []);

    useEffect(() => {
        refreshAppState();

        if (!supabase) return;

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(() => {
            refreshAppState();
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [refreshAppState]);

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
                    refreshAppState({ silent: true });
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
                () => {
                    refreshAppState({ silent: true });
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
                refreshAppState({ silent: true });
            }
        });

        if (Platform.OS !== 'web' || typeof window === 'undefined') {
            return () => {
                appStateSubscription.remove();
            };
        }

        const onFocus = () => {
            refreshAppState({ silent: true });
        };
        const onPageShow = () => {
            refreshAppState({ silent: true });
        };
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                refreshAppState({ silent: true });
            }
        };
        const onStorage = (event: StorageEvent) => {
            if (!event.key || !event.key.includes('supabase.auth')) return;
            refreshAppState({ silent: true });
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
    }, [refreshAppState]);

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
