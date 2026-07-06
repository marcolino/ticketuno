import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { configApi } from '@/services/api';

interface AppConfig {
  stripeMode: 'test' | 'live';
}

const ConfigContext = createContext<AppConfig | undefined>(undefined);

export const ConfigProvider = ({ children }: { children: ReactNode }) => {
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    configApi.load()
      .then(res => setConfig(res.data))
      .catch(() => setConfig({ stripeMode: 'test' })); // safe fallback
  }, []);

  if (!config) return null;

  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
};

export const useConfig = () => {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error('useConfig must be used inside ConfigProvider');
  return ctx;
};
