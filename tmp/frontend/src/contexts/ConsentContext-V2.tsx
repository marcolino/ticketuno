import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { useTranslation } from "react-i18next";
import { Checkbox, FormControlLabel, Box, Typography } from "@mui/material";
import { useDialog } from "@/contexts/DialogContext";
import { useAuth } from "@/contexts/AuthContext";
import config from "@/config";

type ConsentState = {
  version: string;
  cookies: {
    necessary: true;
    analytics: boolean;
    marketing: boolean;
  };
  communication: {
    marketingEmails: boolean;
    pushNotifications: boolean;
  };
};

type ConsentContextType = {
  consent: ConsentState | null;
  canUseAnalytics: boolean;
  canUseMarketingCookies: boolean;
  updateConsent: (consent: ConsentState) => void;
};

const ConsentContext = createContext<ConsentContextType | null>(null);

const CONSENT_VERSION = config.app.consent.version;
const STORAGE_KEY = "consent";

export const ConsentProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { t } = useTranslation();
  const showDialog = useDialog();
  const { user } = useAuth();

  const [consent, setConsent] = useState<ConsentState | null>(null);

  // Load stored consent
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      openConsentDialog();
      return;
    }

    const parsed: ConsentState = JSON.parse(stored);

    if (parsed.version !== CONSENT_VERSION) {
      openConsentDialog(); // Auto reopen on version change
      return;
    }

    setConsent(parsed);
  }, []);

  const updateConsent = useCallback(
    (newConsent: ConsentState) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConsent));
      setConsent(newConsent);

      // Optional: sync to server if logged in
      if (user) {
        // call API here
      }
    },
    [user]
  );

  const openConsentDialog = useCallback(async () => {
    let analytics = false;
    let marketing = false;
    let marketingEmails = false;
    let pushNotifications = false;

    await showDialog({
      title: t("consent.title"),
      content: (
        <Box>
          <Typography variant="body2" gutterBottom>
            {t("consent.description")}
          </Typography>

          {/* Cookies */}
          <Box mt={2}>
            <Typography variant="subtitle2">
              {t("consent.cookiesTitle")}
            </Typography>

            <FormControlLabel
              control={<Checkbox checked disabled />}
              label={t("consent.necessaryCookies")}
            />

            {config.app.consent.cookies.analytics && (
              <FormControlLabel
                control={
                  <Checkbox
                    onChange={(e) => (analytics = e.target.checked)}
                  />
                }
                label={t("consent.analyticsCookies")}
              />
            )}

            {config.app.consent.cookies.marketing && (
              <FormControlLabel
                control={
                  <Checkbox
                    onChange={(e) => (marketing = e.target.checked)}
                  />
                }
                label={t("consent.marketingCookies")}
              />
            )}
          </Box>

          {/* Communication */}
          <Box mt={2}>
            <Typography variant="subtitle2">
              {t("consent.communicationTitle")}
            </Typography>

            {config.app.consent.communication.marketingEmails && (
              <FormControlLabel
                control={
                  <Checkbox
                    onChange={(e) =>
                      (marketingEmails = e.target.checked)
                    }
                  />
                }
                label={t("consent.marketingEmails")}
              />
            )}

            {config.app.consent.communication.pushNotifications && (
              <FormControlLabel
                control={
                  <Checkbox
                    onChange={(e) =>
                      (pushNotifications = e.target.checked)
                    }
                  />
                }
                label={t("consent.pushNotifications")}
              />
            )}
          </Box>
        </Box>
      ),
      confirmText: t("consent.acceptSelected"),
      cancelText: t("consent.rejectNonEssential"),
      onConfirm: () => {
        updateConsent({
          version: CONSENT_VERSION,
          cookies: {
            necessary: true,
            analytics,
            marketing,
          },
          communication: {
            marketingEmails,
            pushNotifications,
          },
        });
      },
      onCancel: () => {
        updateConsent({
          version: CONSENT_VERSION,
          cookies: {
            necessary: true,
            analytics: false,
            marketing: false,
          },
          communication: {
            marketingEmails: false,
            pushNotifications: false,
          },
        });
      },
      showCloseIcon: false,
      shrinkToContent: false,
    });
  }, [showDialog, t, updateConsent]);

  return (
    <ConsentContext.Provider
      value={{
        consent,
        canUseAnalytics: !!consent?.cookies.analytics,
        canUseMarketingCookies: !!consent?.cookies.marketing,
        updateConsent,
      }}
    >
      {children}
    </ConsentContext.Provider>
  );
};

export const useConsent = () => {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error("useConsent must be used inside ConsentProvider");
  }
  return ctx;
};
