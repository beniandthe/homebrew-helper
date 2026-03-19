import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

type AppStateContextValue = {
    session: Session | null;
    userId: string | null;
    isSignedIn: boolean;
    isPro: boolean;
    savedProjectCount: number;
    loading: boolean;
    refreshAppState: () => Promise<void>;
};

const AppStateContext = createContext<AppStateContextValue | undefined>(undefined);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [isPro, setIsPro] = useState(false);
    const [savedProjectCount, setSavedProjectCount] = useState(0);
    const [loading, setLoading] = useState(true);

    const refreshAppState = useCallback(async () => {
        if (!supabase) {
            setSession(null);
            setIsPro(false);
            setSavedProjectCount(0);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

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
                    .select('is_pro')
                    .eq('id', nextUserId)
                    .maybeSingle(),
                supabase
                    .from('saved_projects')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', nextUserId),
            ]);

            setIsPro(Boolean(profileData?.is_pro));
            setSavedProjectCount(count ?? 0);
        } finally {
            setLoading(false);
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