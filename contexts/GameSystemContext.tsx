import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  DEFAULT_GAME_SYSTEM_ID,
  GAME_SYSTEM_STORAGE_KEY,
  getGameSystem,
  resolveGameSystemId,
  type GameSystemDefinition,
  type GameSystemId,
} from '@/lib/gameSystems';

type GameSystemContextValue = {
  activeSystemId: GameSystemId;
  activeSystem: GameSystemDefinition;
  hydrated: boolean;
  setActiveSystemId: (nextSystemId: GameSystemId) => void;
};

const GameSystemContext = createContext<GameSystemContextValue | undefined>(undefined);

export function GameSystemProvider({ children }: { children: React.ReactNode }) {
  const [activeSystemId, setActiveSystemIdState] = useState<GameSystemId>(DEFAULT_GAME_SYSTEM_ID);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadStoredSystem() {
      try {
        const storedSystemId = await AsyncStorage.getItem(GAME_SYSTEM_STORAGE_KEY);

        if (!cancelled && storedSystemId) {
          setActiveSystemIdState(resolveGameSystemId(storedSystemId));
        }
      } catch {
        // Fall back to the default ruleset if storage is unavailable.
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    }

    void loadStoredSystem();

    return () => {
      cancelled = true;
    };
  }, []);

  const setActiveSystemId = useCallback((nextSystemId: GameSystemId) => {
    setActiveSystemIdState((currentSystemId) => {
      if (currentSystemId === nextSystemId) {
        return currentSystemId;
      }

      return nextSystemId;
    });
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    void AsyncStorage.setItem(GAME_SYSTEM_STORAGE_KEY, activeSystemId);
  }, [activeSystemId, hydrated]);

  const value = useMemo(
    () => ({
      activeSystemId,
      activeSystem: getGameSystem(activeSystemId),
      hydrated,
      setActiveSystemId,
    }),
    [activeSystemId, hydrated, setActiveSystemId]
  );

  return <GameSystemContext.Provider value={value}>{children}</GameSystemContext.Provider>;
}

export function useGameSystem() {
  const context = useContext(GameSystemContext);

  if (!context) {
    throw new Error('useGameSystem must be used within a GameSystemProvider');
  }

  return context;
}
