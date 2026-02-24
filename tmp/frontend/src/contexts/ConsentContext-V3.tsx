import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  //useCallback,
} from "react";
import { useTranslation } from "react-i18next";
import {
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
} from "@mui/material";
import { userApi } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { FullConsent } from "../shared/types/consent";
import config from "../shared/config";
import { useDialog } from "@/contexts/DialogContext";

const LOCAL_KEY = "consent";

interface ConsentContextType {
  consent: FullConsent | null;
  canUseAnalytics: boolean;
  canUseMarketingCookies: boolean;
  updateConsent: (c: FullConsent) => void;
}

const ConsentContext = createContext<ConsentContextType>(
  {} as ConsentContextType
);

export const useConsent = () => useContext(ConsentContext);

interface Props {
  children: React.ReactNode;
}

export const ConsentProvider: React.FC<Props> = ({
  children,
}) => {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const showDialog = useDialog();

  const [consent, setConsent] = useState<FullConsent | null>(null);

  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);

  const version = config.app.consent.version;

  const syncToServer = async (updates: FullConsent) => {
    if (!user) {
      return;
    }
    await userApi.updateConsent(user.id, updates);
  };

  const loadTogglesFromConsent = (c: FullConsent | null) => {
    setAnalytics(!!c?.cookies.analytics);
    setMarketing(!!c?.cookies.marketing);
    setMarketingEmails(!!c?.communication.marketingEmails);
    setPushNotifications(!!c?.communication.pushNotifications);
  };

  const requestPushPermission = async () => {
    if ("Notification" in window) {
      await Notification.requestPermission();
    }
  };

  const saveConsent = async () => {
    const newConsent: FullConsent = {
      version,
      timestamp: new Date().toISOString(),
      cookies: {
        necessary: true,
        analytics:
          config.app.consent.cookies.analytics
            ? analytics
            : false,
        marketing:
          config.app.consent.cookies.marketing
            ? marketing
            : false,
      },
      communication: {
        marketingEmails:
          config.app.consent.communication
            .marketingEmails
            ? marketingEmails
            : false,
        pushNotifications:
          config.app.consent.communication
            .pushNotifications
            ? pushNotifications
            : false,
      },
    };

    localStorage.setItem(
      LOCAL_KEY,
      JSON.stringify(newConsent)
    );
    setConsent(newConsent);

    if (user) {
      await syncToServer(newConsent);
    }

    if (newConsent.communication.pushNotifications) {
      requestPushPermission();
    }
  };

  const updateConsent = async (updates: FullConsent) => {
    localStorage.setItem(
      LOCAL_KEY,
      JSON.stringify(updates)
    );
    setConsent(updates);
    if (user) {
      await syncToServer(updates);
    }
  };

  const openConsentDialog = async () => {
    await showDialog({
      title: t("consent.title"),
      content: () => (
        <Box>
          <Typography variant="body2" gutterBottom>
            {t("consent.description")}
          </Typography>

          <Box mt={2}>
            <Typography variant="subtitle2">
              {t("consent.cookies")}
            </Typography>

            <FormControlLabel
              control={<Checkbox checked disabled />}
              label={t("consent.necessary")}
            />

            {config.app.consent.cookies.analytics && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={analytics}
                    onChange={(e) =>
                      setAnalytics(e.target.checked)
                    }
                  />
                }
                label={t("consent.analytics")}
              />
            )}

            {config.app.consent.cookies.marketing && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={marketing}
                    onChange={(e) =>
                      setMarketing(e.target.checked)
                    }
                  />
                }
                label={t("consent.marketing")}
              />
            )}
          </Box>

          <Box mt={2}>
            <Typography variant="subtitle2">
              {t("consent.communication")}
            </Typography>

            {config.app.consent.communication
              .marketingEmails && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={marketingEmails}
                      onChange={(e) =>
                        setMarketingEmails(
                          e.target.checked
                        )
                      }
                    />
                  }
                  label={t("consent.marketingEmails")}
                />
              )}

            {config.app.consent.communication
              .pushNotifications && (
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={pushNotifications}
                      onChange={(e) =>
                        setPushNotifications(
                          e.target.checked
                        )
                      }
                    />
                  }
                  label={t("consent.pushNotifications")}
                />
              )}
          </Box>
        </Box>
      ),
      confirmText: t("consent.accept"),
      cancelText: t("consent.reject"),
      onConfirm: saveConsent,
      onCancel: async () => {
        await saveConsent(); // Save with toggles default false
      },
      showCloseIcon: false,
    });
  };
   
  useEffect(() => {
    if (loading) {
      return;
    }

    // Consent already resolved for this version
    if (consent?.version === version) {
      return;
    }

    const local = localStorage.getItem(LOCAL_KEY);

    // Server has valid consent
    if (user?.consent?.version === version) {
      setConsent(user.consent);
      loadTogglesFromConsent(user.consent);
      return;
    }

    // Local has valid consent
    if (local) {
      const parsed: FullConsent = JSON.parse(local);

      if (parsed.version === version) {
        setConsent(parsed);
        loadTogglesFromConsent(parsed);
        
        if (user && !user.consent) {
          syncToServer(parsed);
        }

        return;
      }
    }

    // Nothing valid, open dialog (also handles version change)
    openConsentDialog();
  }, [user, loading, consent, version]);

  if (loading) {
    return null;
  }

  return (
    <ConsentContext.Provider
      value={{
        consent,
        canUseAnalytics:
          !!consent?.cookies.analytics,
        canUseMarketingCookies:
          !!consent?.cookies.marketing,
        updateConsent,
      }}
    >
      {children}
    </ConsentContext.Provider>
  );
};
