import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
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
  //Paper,
  Tooltip,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { userApi } from '@/services/api';
import { useAuth } from './AuthContext';
import { FullConsent } from '@/shared/types/consent';
import config from '@/config';

interface ConsentContextType {
  consent: FullConsent | null;
  canUseAnalytics: boolean;
  canUseMarketingCookies: boolean;
  openConsentDialog: (redirectAfterClose?: boolean) => void;
  setMarketingEmailsDirect: (value: boolean) => Promise<void>;
}

const ConsentContext = createContext<ConsentContextType>({} as ConsentContextType);
export const useConsent = () => useContext(ConsentContext);

const LOCAL_KEY = 'consent';

export const ConsentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const version = config.app.consent.version;

  const [consent, setConsent] = useState<FullConsent | null>(null);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);

  const [openDialog, setOpenDialog] = useState(false);
  const [setup, setSetup] = useState(false); // true = full consent, false = initial privacy notice
  const [redirectAfterClose, setRedirectAfterClose] = useState(false);
  const [consentInitialized, setConsentInitialized] = useState(false);

  // -----------------------------
  // Helpers
  // -----------------------------
  const loadTogglesFromConsent = useCallback((c: FullConsent | null) => {
    setAnalytics(!!c?.cookies.analytics);
    setMarketing(!!c?.cookies.marketing);
    setMarketingEmails(!!c?.communication.marketingEmails);
    setPushNotifications(!!c?.communication.pushNotifications);
  }, []);

  const syncToServer = async (updates: FullConsent) => {
    if (!user) return;
    await userApi.updateConsent(user.id, updates);
  };

  const buildConsent = (): FullConsent => ({
    version,
    timestamp: new Date().toISOString(),
    cookies: {
      necessary: true,
      analytics: config.app.consent.cookies.analytics ? analytics : false,
      marketing: config.app.consent.cookies.marketing ? marketing : false,
    },
    communication: {
      marketingEmails: config.app.consent.communication.marketingEmails
        ? marketingEmails
        : false,
      pushNotifications: config.app.consent.communication.pushNotifications
        ? pushNotifications
        : false,
    },
  });

  const closeDialog = () => {
    setOpenDialog(false);
    setSetup(false);

    if (redirectAfterClose) {
      navigate('/', { replace: true });
    }

    setRedirectAfterClose(false);
  };

  // -----------------------------
  // Public API
  // -----------------------------
  const openConsentDialog = (redirect = false) => {
    setRedirectAfterClose(redirect);
    setSetup(true);
    setOpenDialog(true);
  };

  const saveConsent = async () => {
    const newConsent = buildConsent();
    setConsent(newConsent);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(newConsent));

    await syncToServer(newConsent);
    closeDialog();
  };

  const acceptAll = async () => {
    setAnalytics(true);
    setMarketing(true);
    setMarketingEmails(true);
    setPushNotifications(true);

    const newConsent = buildConsent();
    setConsent(newConsent);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(newConsent));
    await syncToServer(newConsent);
    closeDialog();
  };

  const rejectAll = async () => {
    setAnalytics(false);
    setMarketing(false);
    setMarketingEmails(false);
    setPushNotifications(false);

    const newConsent = buildConsent();
    setConsent(newConsent);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(newConsent));
    await syncToServer(newConsent);
    closeDialog();
  };

  const setMarketingEmailsDirect = async (value: boolean) => {
    setMarketingEmails(value);
    const updated = buildConsent();
    setConsent(updated);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
    await syncToServer(updated);
  };

  // -----------------------------
  // Initialization
  // -----------------------------
  useEffect(() => {
    if (loading || consentInitialized) return;

    const local = localStorage.getItem(LOCAL_KEY);

    if (user?.consent?.version === version) {
      setConsent(user.consent);
      loadTogglesFromConsent(user.consent);
      setConsentInitialized(true);
      return;
    }

    if (local) {
      const parsed: FullConsent = JSON.parse(local);
      if (parsed.version === version) {
        setConsent(parsed);
        loadTogglesFromConsent(parsed);
        setConsentInitialized(true);
        return;
      }
    }

    // No consent found → show initial privacy notice
    setSetup(false); // !setup = initial "Privacy Notice"
    setOpenDialog(true);
    setConsentInitialized(true);
  }, [loading, user, version, consentInitialized, loadTogglesFromConsent]);

  // Sync local consent after login
  useEffect(() => {
    if (user && consent) {
      // Only sync if local consent differs from server
      if (JSON.stringify(user.consent) !== JSON.stringify(consent)) {
        syncToServer(consent);
      }
    }
  }, [user, consent]);
  
  if (loading) return null;

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <ConsentContext.Provider
      value={{
        consent,
        canUseAnalytics: !!consent?.cookies.analytics,
        canUseMarketingCookies: !!consent?.cookies.marketing,
        openConsentDialog,
        setMarketingEmailsDirect,
      }}
    >
      {children}

      <Dialog
        open={openDialog}
        onClose={closeDialog}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 2,
            position: 'fixed',
            bottom: 16, // sticky bottom banner style
            left: '50%',
            transform: 'translateX(-50%)',
            p: 3,
            boxShadow: 6,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {!setup ? t('Privacy Notice') : t('Manage Your Consents')}
          {setup && (
            <IconButton size="small" onClick={closeDialog}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </DialogTitle>

        <DialogContent dividers>
          {!setup ? (
            <Typography variant="body2">
              {t(
                'We use cookies and communication tools to improve your experience. You can accept all, reject all, or manage your preferences.'
              )}
            </Typography>
          ) : (
            <>
              <Box mt={2}>
                <Typography variant="subtitle2">{t('Cookies')}</Typography>
                
                  <Tooltip title={t('Technical cookies are necessary and cannot be dismissed')}>
                    <FormControlLabel
                      control={<Checkbox checked disabled />}
                      label={t('Technical cookies')}
                    />
                  </Tooltip>
                  
                {config.app.consent.cookies.analytics && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={analytics}
                        onChange={(e) => setAnalytics(e.target.checked)}
                      />
                    }
                    label={t('Analytics cookies')}
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
                    label={t('Marketing cookies')}
                  />
                )}
              </Box>

              <Box mt={3}>
                <Typography variant="subtitle2">{t('Communication')}</Typography>
                {config.app.consent.communication.marketingEmails && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={marketingEmails}
                        onChange={(e) => setMarketingEmails(e.target.checked)}
                      />
                    }
                    label={t('Marketing emails')}
                  />
                )}
                {config.app.consent.communication.pushNotifications && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={pushNotifications}
                        onChange={(e) => setPushNotifications(e.target.checked)}
                      />
                    }
                    label={t('Push notifications')}
                  />
                )}
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'flex-end', gap: 1 }}>
          {!setup ? (
            <>
              <Button onClick={acceptAll} variant="contained">
                {t('Accept All')}
              </Button>
              <Button onClick={rejectAll} variant="outlined">
                {t('Reject All')}
              </Button>
              <Button onClick={() => openConsentDialog()}>
                {t('Manage Preferences')}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={closeDialog}>{t('Cancel')}</Button>
              <Button onClick={saveConsent} variant="contained">
                {t('Save')}
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </ConsentContext.Provider>
  );
};
