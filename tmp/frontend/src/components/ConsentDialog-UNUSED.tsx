import { useEffect, useState } from 'react';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormGroup,
  FormControlLabel,
  Switch,
} from '@mui/material';
import { t } from 'i18next';
import { userApi } from '@/services/api';

interface ConsentDialogProps {
  open: boolean;
  options?: { token?: string; type?: string };
  onClose: () => void;
}

const ConsentDialog: React.FC<ConsentDialogProps> = ({ open, options, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [consentState, setConsentState] = useState<{ marketingEmails?: boolean }>({});

  useEffect(() => {
    if (!options) return;

    // Pre-select marketingEmails if type is unsubscribe
    if (options.type === 'communication.marketingEmails') {
      setConsentState({ marketingEmails: false });
    }
  }, [options]);

  const handleSave = async () => {
    if (!options?.token) return;
    setLoading(true);
    try {
      await userApi.submitConsent({ token: options.token, consent: consentState }); // TODOOOOOO!!!
      onClose();
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{t('Manage your consents')}</DialogTitle>
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('Cancel')}</Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : t('Save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConsentDialog;

