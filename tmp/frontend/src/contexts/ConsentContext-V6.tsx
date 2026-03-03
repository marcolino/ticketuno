import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { t } from 'i18next';
import { userApi } from '@/services/api';
import PageHeader from '@/components/PageHeader';

const Unsubscribe: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alreadyUnsubscribed, setAlreadyUnsubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // 🔎 Initial token validation + status check
  useEffect(() => {
    const checkToken = async () => {
      if (!token) {
        setError(t('Invalid unsubscribe link.'));
        setInitialLoading(false);
        return;
      }

      try {
        //const response = await userApi.checkUnsubscribeToken(token);
        const response = await userApi.verifyConsentToken(token, 'marketing_unsubscribe');
        if (!response.valid) {
          setError(t('The unsubscribe link is invalid or expired.'));
        } else if (response.alreadyUnsubscribed) {
          setAlreadyUnsubscribed(true);
        }
      } catch {
        setError(t('The unsubscribe link cannot be verified.'));
      } finally {
        setInitialLoading(false);
      }
    };

    checkToken();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      await userApi.unsubscribe(token);

      setSuccess(true);
    } catch {
      setError(t('The unsubscribe link is invalid or expired.'));
    } finally {
      setLoading(false);
      setConfirmOpen(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <PageHeader title={t('Unsubscribe from Marketing Emails')} />

      {/* Initial loader */}
      {initialLoading && (
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!initialLoading && error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!initialLoading && alreadyUnsubscribed && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {t('You are already unsubscribed from marketing emails.')}
        </Alert>
      )}

      {!initialLoading && success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {t('You have been successfully unsubscribed from marketing emails.')}
        </Alert>
      )}

      {/* Confirmation block */}
      {!initialLoading &&
        !success &&
        !error &&
        !alreadyUnsubscribed && (
          <Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {t(
                'We are sorry to see you go. If you unsubscribe, you will stop receiving marketing emails from us.'
              )}
            </Typography>

            <Typography variant="body1" sx={{ mb: 3 }}>
              {t('Are you sure you want to continue?')}
            </Typography>

            <Button
              variant="contained"
              color="primary"
              onClick={() => setConfirmOpen(true)}
              disabled={loading}
            >
              {t('Unsubscribe')}
            </Button>
          </Box>
        )}

      {/* Post-success message */}
      {!initialLoading && (success || alreadyUnsubscribed) && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="body1">
            {t(
              'If this was a mistake, you can subscribe again anytime from your account settings.'
            )}
          </Typography>

          <Typography variant="body2" sx={{ mt: 2 }}>
            {t('You may now close this page.')}
          </Typography>
        </Box>
      )}

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
      >
        <DialogTitle>
          {t('Confirm Unsubscription')}
        </DialogTitle>

        <DialogContent>
          <DialogContentText>
            {t(
              'Are you absolutely sure you want to stop receiving marketing emails?'
            )}
          </DialogContentText>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => setConfirmOpen(false)}
            disabled={loading}
          >
            {t('Cancel')}
          </Button>

          <Button
            color="error"
            variant="contained"
            onClick={handleUnsubscribe}
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={20} />
            ) : (
              t('Yes, Unsubscribe Me')
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Unsubscribe;
