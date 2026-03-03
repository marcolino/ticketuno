// contexts/ConsentContext.tsx
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress, FormGroup, FormControlLabel, Switch, Typography } from '@mui/material';
import { t } from 'i18next';
import { userApi } from '@/services/api';

interface ConsentDialogOptions {
  token?: string;
  type?: string; // e.g. 'marketing_unsubscribe' or other consent types
}

interface ConsentContextType {
  openConsentDialog: (options?: ConsentDialogOptions) => void;
  closeConsentDialog: () => void;
}

const ConsentContext = createContext<ConsentContextType | undefined>(undefined);

export const ConsentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogOptions, setDialogOptions] = useState<ConsentDialogOptions | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [consentState, setConsentState] = useState<{ marketingEmails?: boolean }>({});

  // Open dialog with optional token/type
  const openConsentDialog = (options?: ConsentDialogOptions) => {
    setDialogOptions(options);

    // Pre-select marketingEmails if token type is marketing_unsubscribe
    if (options?.type === 'marketing_unsubscribe') {
      setConsentState({ marketingEmails: false });
    } else {
      setConsentState({});
    }

    setDialogOpen(true);
  };

  const closeConsentDialog = () => {
    setDialogOpen(false);
    setDialogOptions(undefined);
    setConsentState({});
    setLoading(false);
  };

  const handleSaveConsent = async () => {
    if (!dialogOptions?.token) return;
    setLoading(true);

    try {
      await userApi.submitConsent({
        token: dialogOptions.token,
        consent: consentState,
      });
      closeConsentDialog();
    } catch (error: unknown) {
      console.error('Consent submission failed', error);
      // Optional: show toast or alert
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConsentContext.Provider value={{ openConsentDialog, closeConsentDialog }}>
      {children}

      {/* Consent Dialog */}
      <Dialog open={dialogOpen} onClose={closeConsentDialog}>
        <DialogTitle>{t('Manage Your Consents')}</DialogTitle>
        <DialogContent>
          <FormGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={consentState.marketingEmails ?? true}
                  onChange={(e) => setConsentState({ marketingEmails: e.target.checked })}
                />
              }
              label={t('Receive marketing emails')}
            />
          </FormGroup>

          <Typography variant="body2" sx={{ mt: 2 }}>
            {t('You can update your preferences here.')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeConsentDialog} disabled={loading}>{t('Cancel')}</Button>
          <Button onClick={handleSaveConsent} disabled={loading} variant="contained" color="primary">
            {loading ? <CircularProgress size={20} /> : t('Save')}
          </Button>
        </DialogActions>
      </Dialog>
    </ConsentContext.Provider>
  );
};

export const useConsent = (): ConsentContextType => {
  const context = useContext(ConsentContext);
  if (!context) throw new Error('useConsent must be used within ConsentProvider');
  return context;
};
