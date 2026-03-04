import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { setupApi } from "@/services/api";

// Setyp interface
export interface Setup {
  language: string;
  darkMode: boolean;
  notifications: boolean;
}

// Context only exposes setup and refresh
interface SetupContextType {
  setup: Setup | null;
  refresh: () => Promise<void>;
}

const SetupContext = createContext<SetupContextType | undefined>(undefined);

export const SetupProvider = ({ children }: { children: ReactNode }) => {
  const [setup, setSetup] = useState<Setup | null>(null);

  const loadSetup = useCallback(async () => {
    const data = await setupApi.get(); // GET backend
    setSetup(data);
  }, []);

  useEffect(() => {
    loadSetup();
  }, [loadSetup]);

  return (
    <SetupContext.Provider value={{ setup, refresh: loadSetup }}>
      {children}
    </SetupContext.Provider>
  );
};

// Hook to only read setup
export const useSetup = () => {
  const context = useContext(SetupContext);
  if (!context) {
    throw new Error("useSetup must be used inside SetupProvider");
  }
  return context.setup;
};

// Internal hook for refresh
export const useSetupRefresh = () => {
  const context = useContext(SetupContext);
  if (!context) {
    throw new Error("useSetupRefresh must be used inside SetupProvider");
  }
  return context.refresh;
};
