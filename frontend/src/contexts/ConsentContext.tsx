  import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
  import { userApi } from '@/services/api';
  import useNavigate from '@/hooks/useNavigate';
  import { useAuth } from './AuthContext';
  import { FullConsent } from '@ticketuno/shared/types/consent';
  import { usePushNotifications, subscribeResultToBool } from '@/hooks/usePushNotifications';
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

    const { status: pushStatus, subscribe, unsubscribe } = usePushNotifications();

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
      const pushResult = config.app.consent.communication.pushNotifications
        ? await subscribe()
        : false;
      const pushOk = subscribeResultToBool(pushResult);

      setAnalytics(true);
      setMarketing(true);
      setMarketingEmails(true);
      setPushNotifications(pushOk); // Only true if browser actually granted it

      const newConsent: FullConsent = {
        version,
        timestamp: new Date().toISOString(),
        cookies: {
          necessary: true,
          analytics: config.app.consent.cookies.analytics ?? false,
          marketing: config.app.consent.cookies.marketing ?? false,
        },
        communication: {
          marketingEmails: config.app.consent.communication.marketingEmails ?? false,
          pushNotifications: pushOk,
        },
      };
      setConsent(newConsent);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(newConsent));
      await syncToServer(newConsent);
      closeDialog();
    };
    // const acceptAll = async () => {
    //   setAnalytics(true);
    //   setMarketing(true);
    //   setMarketingEmails(true);
    //   setPushNotifications(true);

    //   const newConsent = buildConsent();
    //   setConsent(newConsent);
    //   localStorage.setItem(LOCAL_KEY, JSON.stringify(newConsent));
    //   await syncToServer(newConsent);
    //   closeDialog();
    // };

    const rejectAll = async () => {
      await unsubscribe(); // safe even if not subscribed — checks internally

      setAnalytics(false);
      setMarketing(false);
      setMarketingEmails(false);
      setPushNotifications(false);

      const newConsent: FullConsent = {
        version,
        timestamp: new Date().toISOString(),
        cookies: { necessary: true, analytics: false, marketing: false },
        communication: { marketingEmails: false, pushNotifications: false },
      };
      setConsent(newConsent);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(newConsent));
      await syncToServer(newConsent);
      closeDialog();
    };
    // const rejectAll = async () => {
    //   setAnalytics(false);
    //   setMarketing(false);
    //   setMarketingEmails(false);
    //   setPushNotifications(false);

    //   const newConsent = buildConsent();
    //   setConsent(newConsent);
    //   localStorage.setItem(LOCAL_KEY, JSON.stringify(newConsent));
    //   await syncToServer(newConsent);
    //   closeDialog();
    // };

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
              // Mobile: stretch with margins; larger screens: center with transform
              left: { xs: 1, sm: '50%' },
              right: { xs: 1, sm: 'auto' },
              transform: { xs: 'none', sm: 'translateX(-50%)' },
              width: { xs: 'auto', sm: undefined }, // let maxWidth handle sm+
              p: 2,
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
              <Typography variant="body2" sx={{ maxHeight: { xs: '25vh', sm: '20vh' }, overflow: 'auto', py: 1 }} >
                {t(
                  //'We use cookies and communication tools to improve your experience. You can accept all, reject all, or manage your preferences.'
                  'We use cookies and similar technologies to ensure our theater events booking platform works properly, enhance your experience, and provide you with relevant information about upcoming shows. Strictly necessary cookies are always active as they are essential for the website to function. With your consent, we would also like to use analytics cookies to understand how visitors use our site and improve our services, as well as marketing cookies to personalize content and offers. In addition, you can choose to receive marketing emails and push notifications about new events, special promotions, and booking reminders. You can manage your preferences at any time. By clicking “Accept All,” you agree to the use of all cookies and communications. You may “Reject All” non-essential cookies and opt out of communications, or customize your settings below.'
                )}
              </Typography>
            ) : (
              <Box>
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
                          checked={pushStatus === 'subscribed'}
                          disabled={pushStatus === 'unsupported' || pushStatus === 'denied'}
                          onChange={async (e) => {
                            if (e.target.checked) {
                              const result = await subscribe();
                              setPushNotifications(subscribeResultToBool(result));
                            } else {
                              const ok = await unsubscribe();
                              if (ok) setPushNotifications(false);
                            }
                          }}
                        />
                      }
                      label={
                        <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {t('Push notifications')}
                          {pushStatus === 'denied' && (
                            <Typography variant="caption" color="error">
                              {t('Blocked in browser — reset in browser settings')}
                            </Typography>
                          )}
                          {pushStatus === 'unsupported' && (
                            <Typography variant="caption" color="text.secondary">
                              {t('Not supported on this device')}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  )}
                  {/* {config.app.consent.communication.pushNotifications && (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={pushNotifications}
                          onChange={(e) => setPushNotifications(e.target.checked)}
                        />
                      }
                      label={t('Push notifications')}
                    />
                  )} */}
                </Box>
              </Box>
            )}
          </DialogContent>

          <DialogActions sx={{ justifyContent: 'flex-end', pt: 3}}>
            {!setup ? (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button onClick={() => acceptAll()} variant="contained" sx={{ px: 4 }}>
                    {t('Accept All')}
                  </Button>
                  <Button onClick={() => rejectAll()} variant="outlined">
                    {t('Reject All')}
                  </Button>
                </Box>
                <Box sx={{ width: { xs: '100%', sm: 'auto' }, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button onClick={() => openConsentDialog()} variant="outlined">
                    {t('Preferences')}
                  </Button>
                </Box>
              </Box>
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
