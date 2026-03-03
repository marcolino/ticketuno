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
import { useAuth } from "../contexts/AuthContext";
import { FullConsent } from "../shared/types/consent";
import config from "../shared/config";

const LOCAL_KEY = "consent";

interface ConsentContextType {
  consent: FullConsent | null;
  canUseAnalytics: boolean;
  canUseMarketingCookies: boolean;
  updateConsent: (c: FullConsent) => void;
  openConsentDialog: () => void;
}

const ConsentContext = createContext<ConsentContextType>({} as ConsentContextType);

export const useConsent = () => useContext(ConsentContext);

interface Props {
  children: React.ReactNode;
}

export const ConsentProvider: React.FC<Props> = ({ children }) => {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  const [consent, setConsent] = useState<FullConsent | null>(null);

  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);

  const [openDialog, setOpenDialog] = useState(false);

  const version = config.app.consent.version;

  const syncToServer = async (updates: FullConsent) => {
    if (!user) return;
    await userApi.updateConsent(user.id, updates);
  };

  const requestPushPermission = async () => {
    if ("Notification" in window) {
      await Notification.requestPermission();
    }
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
      cookies: {
        necessary: true,
        analytics: false,
        marketing: false,
      },
      communication: {
        marketingEmails: false,
        pushNotifications: false,
      },
    };

    setConsent(newConsent);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(newConsent));

    if (user) await syncToServer(newConsent);

    setOpenDialog(false);
  };

  useEffect(() => {
    if (loading) return;

    const local = localStorage.getItem(LOCAL_KEY);

    // Server consent valid
    if (user?.consent?.version === version) {
      setConsent(user.consent);
      loadTogglesFromConsent(user.consent);
      return;
    }

    // Local consent valid
    if (local) {
      const parsed: FullConsent = JSON.parse(local);
      if (parsed.version === version) {
        setConsent(parsed);
        loadTogglesFromConsent(parsed);
        if (user && !user.consent) syncToServer(parsed);
        return;
      }
    }

    // No valid consent → open dialog
    setOpenDialog(true);
  }, [user, loading, version]);

  const openConsentDialog = () => {
    setOpenDialog(true);
  };

  if (loading) return null;

  return (
    <ConsentContext.Provider
      value={{
        consent,
        canUseAnalytics: !!consent?.cookies.analytics,
        canUseMarketingCookies: !!consent?.cookies.marketing,
        updateConsent: saveConsent,
        openConsentDialog,
      }}
    >
      {children}

      <Dialog
        open={openDialog}
        onClose={rejectConsent}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            width: "auto",
            maxWidth: {
              xs: 'none',
              sm: '80%',
              md: '66%',
              lg: '50%',
              xl: '45%',
            }
          }
        }}
      >
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
          <IconButton size="small" onClick={rejectConsent} sx={{ color: "primary.contrastText" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          {/* <Typography variant="body1" gutterBottom sx={{pt: 2, pb: 4}}>
            {t('Authorizations for technical cookies, analytics cookies, marketing cookies, marketing emails and notifications')}
          </Typography> */}

          <Box mt={2}>
            <Typography variant="subtitle2">{t("Cookies")}</Typography>
            
            {config.app.consent.cookies.technical && (
              <Tooltip title={t('Technical cookies are necessary for app functionality, and cannot be dismissed')}>
                <FormControlLabel
                control={<Checkbox checked={true} disabled />}
                label={
                  <Typography sx={{ fontSize: '0.9rem' }}>
                    {t('Technical cookies')}
                  </Typography>
                }
              />
              </Tooltip>
            )}
            {config.app.consent.cookies.analytics && (
              <Tooltip title={t('Analytics cookies help us understand how visitors use our site')}>
                <FormControlLabel
                  control={<Checkbox checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />}
                  label={
                    <Typography sx={{ fontSize: '0.9rem' }}>
                      {t('Analytics cookies')}
                    </Typography>
                  }
                />
              </Tooltip>
            )}
            {config.app.consent.cookies.marketing && (
              <Tooltip title={t('Marketing cookies are used to track visitors across websites')}>
                <FormControlLabel
                  control={<Checkbox checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />}
                  label={
                    <Typography sx={{ fontSize: '0.9rem' }}>
                      {t('Marketing cookies')}
                    </Typography>
                  }
                />
              </Tooltip>
            )}
          </Box>

          <Box mt={2}>
            <Typography variant="subtitle2">{t("Communication")}</Typography>
            {config.app.consent.communication.marketingEmails && (
              <Tooltip title={t('Marketing emails consent to receive news, updates, and special offers')}>
                <FormControlLabel
                  control={<Checkbox checked={marketingEmails} onChange={(e) => setMarketingEmails(e.target.checked)} />}
                  label={
                    <Typography sx={{ fontSize: '0.9rem' }}>
                      {t('Consent for marketing emails')}
                    </Typography>
                  }
                />
              </Tooltip>
            )}
            {config.app.consent.communication.pushNotifications && (
              <Tooltip title={t('Get instant alerts and updates on your device.')}>
                <FormControlLabel
                  control={<Checkbox checked={pushNotifications} onChange={(e) => setPushNotifications(e.target.checked)} />}
                  label={
                    <Typography sx={{ fontSize: '0.9rem' }}>
                      {t('Consent for push notifications')}
                    </Typography>
                  }
                />
              </Tooltip>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={rejectConsent} color="secondary">
            {t('Cancel')}
          </Button>
          <Button onClick={saveConsent} variant="contained" color="primary">
            {t('Accept')}
          </Button>
        </DialogActions>
      </Dialog>
    </ConsentContext.Provider>
  );
};
