import React, { createContext, useContext, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
  Tooltip,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import { userApi } from "../services/api";
import { useAuth } from "./AuthContext";
import { FullConsent } from "../shared/types/consent";
import config from "../shared/config";

interface ConsentContextType {
  consent: FullConsent | null;
  canUseAnalytics: boolean;
  canUseMarketingCookies: boolean;
  updateConsent: (c: FullConsent) => void;
  openConsentDialog: () => void;
  setup: boolean;
  setSetup: (value: boolean) => void;
}

const ConsentContext = createContext<ConsentContextType>({} as ConsentContextType);
export const useConsent = () => useContext(ConsentContext);

const LOCAL_KEY = "consent";

interface Props { children: React.ReactNode }

export const ConsentProvider: React.FC<Props> = ({ children }) => {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  const [consent, setConsent] = useState<FullConsent | null>(null);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);

  const [openDialog, setOpenDialog] = useState(false);
  const [setup, setSetup] = useState(false);

  const version = config.app.consent.version;

  const syncToServer = async (updates: FullConsent) => {
    if (!user) return;
    await userApi.updateConsent(user.id, updates);
  };

  const requestPushPermission = async () => {
    if ("Notification" in window) await Notification.requestPermission();
  };

  const loadTogglesFromConsent = (c: FullConsent | null) => {
    setAnalytics(!!c?.cookies.analytics);
    setMarketing(!!c?.cookies.marketing);
    setMarketingEmails(!!c?.communication.marketingEmails);
    setPushNotifications(!!c?.communication.pushNotifications);
  };

  const saveConsent = async () => {
    const newConsent: FullConsent = {
      version,
      timestamp: new Date().toISOString(),
      cookies: {
        necessary: true,
        analytics: config.app.consent.cookies.analytics ? analytics : false,
        marketing: config.app.consent.cookies.marketing ? marketing : false,
      },
      communication: {
        marketingEmails: config.app.consent.communication.marketingEmails ? marketingEmails : false,
        pushNotifications: config.app.consent.communication.pushNotifications ? pushNotifications : false,
      },
    };

    setConsent(newConsent);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(newConsent));

    if (user) await syncToServer(newConsent);
    if (newConsent.communication.pushNotifications) await requestPushPermission();

    setOpenDialog(false);
  };

  const rejectConsent = async () => {
    const newConsent: FullConsent = {
      version,
      timestamp: new Date().toISOString(),
      cookies: { necessary: true, analytics: false, marketing: false },
      communication: { marketingEmails: false, pushNotifications: false },
    };

    setConsent(newConsent);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(newConsent));

    if (user) await syncToServer(newConsent);

    setOpenDialog(false);
  };

  const acceptAll = async () => {
    setAnalytics(true);
    setMarketing(true);
    setMarketingEmails(true);
    setPushNotifications(true);
    setSetup(true); // open full modal to confirm
    setOpenDialog(true);
  };

  const rejectAll = async () => {
    setAnalytics(false);
    setMarketing(false);
    setMarketingEmails(false);
    setPushNotifications(false);
    setSetup(true);
    setOpenDialog(true);
  };

  const openConsentDialog = () => {
    setSetup(true);
    setOpenDialog(true);
  };

  useEffect(() => {
    if (loading) return;
    const local = localStorage.getItem(LOCAL_KEY);

    if (user?.consent?.version === version) {
      setConsent(user.consent);
      loadTogglesFromConsent(user.consent);
      return;
    }

    if (local) {
      const parsed: FullConsent = JSON.parse(local);
      if (parsed.version === version) {
        setConsent(parsed);
        loadTogglesFromConsent(parsed);
        if (user && !user.consent) syncToServer(parsed);
        return;
      }
    }

    setSetup(false); // show banner by default
    setOpenDialog(false);
  }, [user, loading, version]);

  if (loading) return null;

  return (
    <ConsentContext.Provider
      value={{
        consent,
        canUseAnalytics: !!consent?.cookies.analytics,
        canUseMarketingCookies: !!consent?.cookies.marketing,
        updateConsent: saveConsent,
        openConsentDialog,
        setup,
        setSetup,
      }}
    >
      {children}

      {/* Single Dialog handling both banner & full modal */}
      <Dialog
        open={!setup ? true : openDialog} // banner = open if setup=false, modal open if setup=true
        onClose={!setup ? rejectConsent : () => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            width: "auto",
            maxWidth: { xs: "90%", sm: "600px" },
            borderRadius: setup ? 1 : 3,
            p: setup ? 0 : 2,
          },
        }}
      >
        {!setup ? (
          // Banner style
          <Box>
            <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
              Your privacy is very important to us. We use technical and third-party cookies to improve your browsing experience. You can also consent to profiling cookies to receive personalized advertising. Selecting "Reject All" or closing this banner will proceed with only technical cookies.
            </Typography>

            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 1,
                mt: 2,
                flexWrap: "nowrap",
                overflowX: "auto",
              }}
            >
              <Button variant="contained" color="primary" sx={{ whiteSpace: "nowrap" }} onClick={acceptAll}>
                Accept All
              </Button>
              <Button variant="outlined" color="secondary" sx={{ whiteSpace: "nowrap" }} onClick={rejectAll}>
                Reject All
              </Button>
              <Button
                variant="text"
                color="inherit"
                sx={{ whiteSpace: "nowrap" }}
                onClick={() => setOpenDialog(true)}
              >
                Handle Preferences
              </Button>
            </Box>
          </Box>
        ) : (
          // Full modal style
          <>
            <DialogTitle
              sx={{
                backgroundColor: "primary.main",
                color: "primary.contrastText",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                pr: 1,
                mb: 3,
              }}
            >
              {t("Consents Handling")}
              <IconButton size="small" onClick={() => setOpenDialog(false)} sx={{ color: "primary.contrastText" }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>

            <DialogContent>
              <Box mt={2}>
                <Typography variant="subtitle2">{t("Cookies")}</Typography>
                {config.app.consent.cookies.technical && (
                  <Tooltip title={t("Technical cookies are necessary and cannot be dismissed")}>
                    <FormControlLabel
                      control={<Checkbox checked disabled />}
                      label={<Typography sx={{ fontSize: "0.9rem" }}>{t("Technical cookies")}</Typography>}
                    />
                  </Tooltip>
                )}
                {config.app.consent.cookies.analytics && (
                  <FormControlLabel
                    control={<Checkbox checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />}
                    label={t("Analytics cookies")}
                  />
                )}
                {config.app.consent.cookies.marketing && (
                  <FormControlLabel
                    control={<Checkbox checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />}
                    label={t("Marketing cookies")}
                  />
                )}
              </Box>

              <Box mt={2}>
                <Typography variant="subtitle2">{t("Communication")}</Typography>
                {config.app.consent.communication.marketingEmails && (
                  <FormControlLabel
                    control={<Checkbox checked={marketingEmails} onChange={(e) => setMarketingEmails(e.target.checked)} />}
                    label={t("Consent for marketing emails")}
                  />
                )}
                {config.app.consent.communication.pushNotifications && (
                  <FormControlLabel
                    control={<Checkbox checked={pushNotifications} onChange={(e) => setPushNotifications(e.target.checked)} />}
                    label={t("Consent for push notifications")}
                  />
                )}
              </Box>
            </DialogContent>

            <DialogActions>
              <Button onClick={rejectConsent} color="secondary">
                {t("Cancel")}
              </Button>
              <Button onClick={saveConsent} variant="contained" color="primary">
                {t("Accept")}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </ConsentContext.Provider>
  );
};
