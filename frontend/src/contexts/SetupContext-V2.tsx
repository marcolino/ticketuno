import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { setupApi } from "@/services/api";
import { SetupStatus } from "@/shared/types/generalSetup";

interface SetupContextType {
  setup: SetupStatus | null;
  refresh: () => Promise<void>;
}

const SetupContext = createContext<SetupContextType | undefined>(undefined);

export const SetupProvider = ({ children }: { children: ReactNode }) => {
  const [setup, setSetup] = useState<SetupStatus | null>(null);

  const loadSetup = useCallback(async () => {
    const response = await setupApi.load();
    setSetup(response.data);
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

export const useSetup = () => {
  const ctx = useContext(SetupContext);
  if (!ctx) throw new Error("useSetup must be used inside SetupProvider");
  return ctx.setup;
};

export const useSetupRefresh = () => {
  const ctx = useContext(SetupContext);
  if (!ctx) throw new Error("useSetupRefresh must be used inside SetupProvider");
  return ctx.refresh;
};
