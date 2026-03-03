import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from 'react';
import { useTranslation } from 'react-i18next';
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
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { userApi } from '../services/api';
import { useAuth } from './AuthContext';
import { FullConsent } from '../shared/types/consent';
import config from '../shared/config';

interface ConsentContextType {
  consent: FullConsent | null;
  canUseAnalytics: boolean;
  canUseMarketingCookies: boolean;
  openConsentDialog: () => void;
  saveConsent: () => Promise<void>;
  setMarketingEmailsDirect: (value: boolean) => Promise<void>; // for token unsubscribe
}

const ConsentContext = createContext<ConsentContextType>({} as ConsentContextType);
export const useConsent = () => useContext(ConsentContext);

const LOCAL_KEY = 'consent';

export const ConsentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const version = config.app.consent.version;

  const initialized = useRef(false);

  const [consent, setConsent] = useState<FullConsent | null>(null);

  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);

  const [openDialog, setOpenDialog] = useState(false);
  const [setup, setSetup] = useState(false);

  // ------------------------
  // Utilities
  // ------------------------

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

  // ------------------------
  // Save consent
  // ------------------------

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

  const saveConsent = async () => {
    const newConsent = buildConsent();

    setConsent(newConsent);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(newConsent));

    await syncToServer(newConsent);

    setSetup(false);
    setOpenDialog(false);
  };

  const acceptAll = async () => {
    setAnalytics(true);
    setMarketing(true);
    setMarketingEmails(true);
    setPushNotifications(true);
    await saveConsent();
  };

  const rejectAll = async () => {
    setAnalytics(false);
    setMarketing(false);
    setMarketingEmails(false);
    setPushNotifications(false);
    await saveConsent();
  };

  const openConsentDialog = () => {
    setSetup(true);
    setOpenDialog(true);
  };

  // Used by token flow (unsubscribe email link)
  const setMarketingEmailsDirect = async (value: boolean) => {
    setMarketingEmails(value);
    const updated = buildConsent();
    setConsent(updated);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
    await syncToServer(updated);
  };

  // ------------------------
  // INITIALIZATION (SAFE)
  // ------------------------

  useEffect(() => {
    if (loading || initialized.current) return;

    initialized.current = true;

    const local = localStorage.getItem(LOCAL_KEY);

    // Priority 1: server consent
    if (user?.consent?.version === version) {
      setConsent(user.consent);
      loadTogglesFromConsent(user.consent);
      return;
    }

    // Priority 2: local storage
    if (local) {
      const parsed: FullConsent = JSON.parse(local);
      if (parsed.version === version) {
        setConsent(parsed);
        loadTogglesFromConsent(parsed);
        return;
      }
    }

    // No consent → show banner
    setSetup(false);
    setOpenDialog(true);

  }, [loading]); // 🔥 ONLY loading

  if (loading) return null;

  // ------------------------
  // UI
  // ------------------------

  return (
    <ConsentContext.Provider
      value={{
        consent,
        canUseAnalytics: !!consent?.cookies.analytics,
        canUseMarketingCookies: !!consent?.cookies.marketing,
        openConsentDialog,
        saveConsent,
        setMarketingEmailsDirect,
      }}
    >
      {children}

      <Dialog
        open={openDialog}
        onClose={!setup ? rejectAll : () => setOpenDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {!setup ? t('Privacy Notice') : t('Manage Your Consents')}
          {setup && (
            <IconButton size="small" onClick={() => setOpenDialog(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )}
        </DialogTitle>

        <DialogContent dividers>
          {!setup ? (
            <Typography variant="body2">
              {t('We use cookies and communication tools to improve your experience.')}
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
                        onChange={(e) =>
                          setPushNotifications(e.target.checked)
                        }
                      />
                    }
                    label={t('Push notifications')}
                  />
                )}
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions>
          {!setup ? (
            <>
              <Button onClick={acceptAll} variant="contained">
                {t('Accept All')}
              </Button>
              <Button onClick={rejectAll} variant="outlined">
                {t('Reject All')}
              </Button>
              <Button onClick={openConsentDialog}>
                {t('Manage Preferences')}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setOpenDialog(false)}>
                {t('Cancel')}
              </Button>
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
