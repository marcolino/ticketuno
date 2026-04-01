import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Alert,
  // CircularProgress,
  // Dialog,
  // DialogTitle,
  // DialogContent,
  // DialogContentText,
  // DialogActions,
} from '@mui/material';
import { t } from 'i18next';
import { userApi } from '@/services/api';
import { UserProfile } from '@/shared/types/user';
import PageHeader from '@/components/PageHeader';
import { getErrorMessage } from '@/shared/utils/misc';
import config from '@/config';

const Unsubscribe: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [alreadyUnsubscribed, setAlreadyUnsubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  //const [confirmOpen, setConfirmOpen] = useState(false);

  // Initial token validation + status check
  useEffect(() => {
    (async () => {
      if (!token) {
        if (!error) {
          setError(t('Invalid unsubscribe link'));
        }
        setInitialLoading(false);
        return;
      }

      try {
        //const response = await userApi.getProfile(token);
        const response = await userApi.getUserByToken(token);
        const profile: UserProfile = response.data;
        if (!profile) {
          setError(t('The unsubscribe link is invalid or expired'));
        } else {
          setProfile(profile);
          if (profile.consent?.communication.marketingEmails === false) {
            setAlreadyUnsubscribed(true);
          }
        }
      } catch (error) {
        setError(t('The unsubscribe link cannot be verified: {{err}}', { err: getErrorMessage(error) }));
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) {
      setError(t('We can\'t find the  token to identify you, sorry. Possibly it is expired.'));
      return;
    }
    if (!profile?.consent) {
      setError(t('No profile, sorry.'));
      return;
    }
    try {
      setLoading(true);
      setError(null);

      // const newConsent = {
      //   ...profile.consent,
      //   communication: {
      //     ...profile.consent.communication,
      //     marketingEmails: false,setError
      //   },
      //   updatedAt: new Date().toISOString(),
      // };

      const response = await userApi.unsubscribe(token);
      console.log("UNSUBSCRIBE RESPONSE:", response);

      setSuccess(true);
    } catch (error) {
      setError(t('The unsubscribe link cannot be processed: {{err}}', { err: getErrorMessage(error) }));
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return null;
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <PageHeader title={t('Unsubscribe from Marketing Emails')} />

      {!initialLoading && error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}.
          <br /><br />
          {t('To unsubscribe please authenticate in the app ({{url}}), and then open "Privacy" menu item in the main menu, then choose "Consent"', {url: config.app.baseUrl})}.
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
          <Box
            component="img"
            src="/images/sad.png"
            alt="unsubscribe"
            sx={{
              display: 'block',
              width: '100%',
              maxWidth: 300,
              height: 'auto',
              mb: 4,
              mx: 'auto',
              opacity: 0.8,
            }}
            // onError={(e) => {
            //   // If image doesn't exist, hide it
            //   e.currentTarget.style.display = 'none';
            // }}
          />
            <Typography variant="body1" sx={{ mb: 2 }}>
              {t('We are sorry to see you go. If you unsubscribe, you will stop receiving marketing emails from us.')}
            </Typography>

            <Typography variant="body1" sx={{ mb: 3 }}>
              {t('Are you sure you want to continue?')}
            </Typography>

            <Button
              variant="contained"
              color="primary"
              //onClick={() => setConfirmOpen(true)}
              onClick={handleUnsubscribe}
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
    </Container>
  );
};

export default Unsubscribe;
