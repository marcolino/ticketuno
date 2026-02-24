import React, { createContext, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
} from "@mui/material";
import { userApi } from '../services/api';
import { useAuth } from "../contexts/AuthContext";
import { FullConsent } from '../shared/types/consent';
import config from "../shared/config";

const LOCAL_KEY = "consent";

// type User =
//   | {
//       id: string;
//       consent?: FullConsent | null;
//     }
//   | null
// ;

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

export const ConsentProvider: React.FC<Props> = ({ children }) => {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [consent, setConsent] = useState<FullConsent | null>(null);

  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);

  // INITIAL CHECK
  useEffect(() => {
    const local = localStorage.getItem(LOCAL_KEY);
    const version = config.app.consent.version;

    if (user?.consent?.version === version) {
      setConsent(user.consent);
      return;
    }

    if (local) {
      const parsed: FullConsent = JSON.parse(local);

      if (parsed.version === version) {
        setConsent(parsed);

        // Sync to DB if logged user without consent stored
        if (user && !user.consent) {
          syncToServer(parsed);
        }

        return;
      }
    }

    setOpen(true);
  }, [user]);

  const syncToServer = async (updates: FullConsent) => {
    if (!user) {
      return;
    }
    //const updates = JSON.stringify(c);
    await userApi.updateConsent(user.id, updates);
    // await fetch("/api/consent", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(c),
    // });
  };

  const saveConsent = async () => {
    const newConsent: FullConsent = {
      version: config.app.consent.version,
      timestamp: new Date().toISOString(),
      cookies: {
        necessary: true,
        analytics:
          config.app.consent.cookies.analytics ? analytics : false,
        marketing:
          config.app.consent.cookies.marketing ? marketing : false,
      },
      communication: {
        marketingEmails:
          config.app.consent.communication.marketingEmails
            ? marketingEmails
            : false,
        pushNotifications:
          config.app.consent.communication.pushNotifications
            ? pushNotifications
            : false,
      },
    };

    localStorage.setItem(LOCAL_KEY, JSON.stringify(newConsent));
    setConsent(newConsent);

    if (user) {
      await syncToServer(newConsent);
    }

    // Trigger push permission if enabled
    if (newConsent.communication.pushNotifications) {
      requestPushPermission();
    }

    setOpen(false);
  };

  const requestPushPermission = async () => {
    if ("Notification" in window) {
      await Notification.requestPermission();
    }
  };

  const updateConsent = async (updates: FullConsent) => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(updates));
    setConsent(updates);
    if (user) {
      await syncToServer(updates);
    }
  };

  if (loading) {
    return null;
  }

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

      <Dialog open={open}>
        <DialogTitle>{t("consent.title")}</DialogTitle>

        <DialogContent>
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
                    onChange={(e) => setAnalytics(e.target.checked)}
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
                    onChange={(e) => setMarketing(e.target.checked)}
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

            {config.app.consent.communication.marketingEmails && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={marketingEmails}
                    onChange={(e) =>
                      setMarketingEmails(e.target.checked)
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
                    checked={pushNotifications}
                    onChange={(e) =>
                      setPushNotifications(e.target.checked)
                    }
                  />
                }
                label={t("consent.pushNotifications")}
              />
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)}>
            {t("consent.reject")}
          </Button>
          <Button variant="contained" onClick={saveConsent}>
            {t("consent.accept")}
          </Button>
        </DialogActions>
      </Dialog>
    </ConsentContext.Provider>
  );
};
