import React, { createContext, useContext, useEffect, useState } from 'react';
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
  updateConsent: (c: FullConsent) => void;
  openConsentDialog: () => void;
}

const ConsentContext = createContext<ConsentContextType>({} as ConsentContextType);
export const useConsent = () => useContext(ConsentContext);

const LOCAL_KEY = 'consent';

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
  const [setup, setSetup] = useState(false); // false = banner, true = full modal

  const version = config.app.consent.version;

  const syncToServer = async (updates: FullConsent) => {
    if (!user) return;
    await userApi.updateConsent(user.id, updates);
  };

  const requestPushPermission = async () => {
    if ('Notification' in window) await Notification.requestPermission();
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

    setSetup(false);
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

    setSetup(false);
    setOpenDialog(false);
  };

  const acceptAll = async () => {
    const newConsent: FullConsent = {
      version,
      timestamp: new Date().toISOString(),
      cookies: {
        necessary: true,
        analytics: config.app.consent.cookies.analytics ? true : false,
        marketing: config.app.consent.cookies.marketing ? true : false,
      },
      communication: {
        marketingEmails: config.app.consent.communication.marketingEmails ? true : false,
        pushNotifications: config.app.consent.communication.pushNotifications ? true : false,
      },
    };

    setConsent(newConsent);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(newConsent));

    if (user) await syncToServer(newConsent);
    if (newConsent.communication.pushNotifications) await requestPushPermission();

    setSetup(false);
    setOpenDialog(false);
  };

  const rejectAll = async () => {
    await rejectConsent();
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

    // no valid consent → show banner
    setSetup(false);
    setOpenDialog(true);
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
      }}
    >
      {children}

      <Dialog
        open={openDialog}
        onClose={!setup ? rejectConsent : () => setOpenDialog(false)}
        //maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            width: 'auto',
            //maxWidth: { xs: 'calc(100% - 16px)', sm: 600 }, // full width minus padding on mobile
            borderRadius: 1,
            p: 2,
            px: { xs: 1, sm: 2 },
            // bottom: !setup ? 16 : 'auto',
            position: !setup ? 'fixed' : 'relative',
            left: !setup ? '50%' : 'auto',
            transform: !setup ? 'translateX(-50%)' : 'none',
            margin: 0, // remove default dialog margin
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {!setup ? t('Privacy Notice') : t('Consent Handling')}
          {/* {setup && (
            <IconButton size="small" onClick={() => setOpenDialog(false)}>
              <CloseIcon fontSize="small" />
            </IconButton>
          )} */}
        </DialogTitle>

        <DialogContent
          //dividers
          sx={{
            maxHeight: { xs: '10vh', sm: '50vh' },
            overflowY: 'auto',
            pr: 2, // space for scrollbar
          }}
        >
          {!setup ? (
            <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
              {t('Your privacy is very important to us. We use technical and third-party cookies to improve your browsing experience. You can also consent to profiling cookies to receive personalized advertising. Selecting "Reject All" or closing this banner will proceed with only technical cookies.')}
            </Typography>
          ) : (
            <>
              <Box mt={2}>
                <Typography variant="subtitle2">{t('Cookies')}</Typography>
                {config.app.consent.cookies.technical && (
                  <Tooltip title={t('Technical cookies are necessary and cannot be dismissed')}>
                    <FormControlLabel
                      control={<Checkbox checked disabled />}
                      label={t('Technical cookies')}
                    />
                  </Tooltip>
                )}
                {config.app.consent.cookies.analytics && (
                  <FormControlLabel
                    control={<Checkbox checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />}
                    label={t('Analytics cookies')}
                  />
                )}
                {config.app.consent.cookies.marketing && (
                  <FormControlLabel
                    control={<Checkbox checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />}
                    label={t('Marketing cookies')}
                  />
                )}
              </Box>

              <Box mt={2}>
                <Typography variant="subtitle2">{t('Communication')}</Typography>
                {config.app.consent.communication.marketingEmails && (
                  <FormControlLabel
                    control={<Checkbox checked={marketingEmails} onChange={(e) => setMarketingEmails(e.target.checked)} />}
                    label={t('Consent for marketing emails')}
                  />
                )}
                {config.app.consent.communication.pushNotifications && (
                  <FormControlLabel
                    control={<Checkbox checked={pushNotifications} onChange={(e) => setPushNotifications(e.target.checked)} />}
                    label={t('Consent for push notifications')}
                  />
                )}
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            justifyContent: 'flex-end',
            flexWrap: { xs: 'wrap', sm: 'nowrap' },
            gap: 1,
          }}
        >
          {!setup ? (
            <>
              <Button
                variant="contained"
                color="primary"
                sx={{ whiteSpace: 'nowrap', flexGrow: 0 }}
                onClick={acceptAll}
              >
                {t('Accept All')}
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                sx={{ whiteSpace: 'nowrap', flexGrow: 0 }}
                onClick={rejectAll}
              >
                {t('Reject All')}
              </Button>
              <Button
                variant="outlined"
                color="inherit"
                sx={{ whiteSpace: 'nowrap', flexGrow: 0 }}
                onClick={openConsentDialog}
              >
                {t('Handle Preferences')}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={rejectConsent} color="secondary">{t('Cancel')}</Button>
              <Button variant="contained" color="primary" onClick={saveConsent}>{t('Accept')}</Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </ConsentContext.Provider>
  );
};
