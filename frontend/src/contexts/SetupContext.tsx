import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { setupApi } from '@/services/api';
import { 
  GeneralSetupType, 
  defaultGeneralSetup,
} from '@ticketuno/shared';
import type { DeepPartial } from '@ticketuno/shared';

// Re-export for convenience
export { defaultGeneralSetup as defaultSetup };

// DeepPartial is a type, so we re-export it as a type
export type { DeepPartial };

interface SetupContextType {
  setup: GeneralSetupType;
  refresh: () => Promise<void>;
}

const SetupContext = createContext<SetupContextType | undefined>(undefined);

// Simple deep merge
export const deepMerge = <T extends object>(base: T, override: Partial<T>): T => {
  const result = { ...base };
  for (const key of Object.keys(override) as (keyof T)[]) {
    const b = base[key], o = override[key];
    if (o !== undefined) {
      result[key] =
        b !== null && o !== null && typeof b === 'object' && typeof o === 'object' && !Array.isArray(b)
          ? deepMerge(b as object, o as object) as T[typeof key]
          : o as T[typeof key];
    }
  }
  return result;
};

export const SetupProvider = ({ children }: { children: ReactNode }) => {
  const [setup, setSetup] = useState<GeneralSetupType>(defaultGeneralSetup);

  const loadSetup = useCallback(async () => {
    try {
      const response = await setupApi.load();
      const merged = deepMerge(defaultGeneralSetup, response.data || {});
      setSetup(merged);
    } catch (error) {
      console.error('Failed to load setup:', error);
      setSetup(defaultGeneralSetup);
    }
  }, []);

  useEffect(() => { loadSetup(); }, [loadSetup]);

  return (
    <SetupContext.Provider value={{ setup, refresh: loadSetup }}>
      {children}
    </SetupContext.Provider>
  );
};

export const useSetup = () => {
  const ctx = useContext(SetupContext);
  if (!ctx) throw new Error('useSetup must be used inside SetupProvider');
  return ctx.setup;
};

export const useSetupRefresh = () => {
  const ctx = useContext(SetupContext);
  if (!ctx) throw new Error('useSetupRefresh must be used inside SetupProvider');
  return ctx.refresh;
};
