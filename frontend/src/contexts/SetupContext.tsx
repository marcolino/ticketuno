import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { setupApi } from '@/services/api';
import { GeneralSetupType } from '@ticketuno/shared/types/generalSetup';
import { sharedConfig as config } from '@ticketuno/shared';

export const defaultSetup: GeneralSetupType = {
  app: {
    currency: config.app.defaultCurrency,
    timeout: 10,
  },
  preferences: {
    enableNotifications: true,
    launchDate: null,
    time: null,
  },
  security: {
    apiKey: '',
  },
  payments: {
    enabled: false,
    gateway: null,
    stripePublicKey: '',
    stripeSecretKey: '',
    revolutApiKey: '',
  },
};

interface SetupContextType {
  setup: GeneralSetupType;
  refresh: () => Promise<void>;
}

const SetupContext = createContext<SetupContextType | undefined>(undefined);

export const SetupProvider = ({ children }: { children: ReactNode }) => {
  const [setup, setSetup] = useState<GeneralSetupType>(defaultSetup);

  const loadSetup = useCallback(async () => {
    const response = await setupApi.load();
    // Deep merge: backend may not have all keys if schema evolved
    setSetup(deepMerge(defaultSetup, response.data));
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

// Simple deep merge (plain objects only — fine for setup shapes)
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
