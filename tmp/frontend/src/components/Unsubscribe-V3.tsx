import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Alert,
  Box,
  Typography,
  Button,
  CircularProgress,
  Paper,
} from '@mui/material';
import { emailApi } from '@/services/api'; // adjust import path

const Unsubscribe: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError(t('No token provided'));
      setVerifying(false);
      setLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const userData = await emailApi.verifyUnsubscribeToken(token);
        setUser(userData);
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.error || t('Invalid or expired token'));
      } finally {
        setVerifying(false);
        setLoading(false);
      }
    };
    verifyToken();
  }, [token, t]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setLoading(true);
    try {
      await emailApi.unsubscribe(token);
      setSuccess(true);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || t('Failed to unsubscribe'));
    } finally {
      setLoading(false);
    }
  };

  if (loading || verifying) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          {t('Unsubscribe from Marketing Emails')}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {t('You have been successfully unsubscribed from marketing emails.')}
          </Alert>
        )}

        {user && !success && (
          <Box>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {t('Hello {{firstName}} {{lastName}}', {
                firstName: user.firstName,
                lastName: user.lastName,
              })}
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              {t('Click the button below to stop receiving marketing emails from us.')}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={handleUnsubscribe}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : t('Unsubscribe')}
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Unsubscribe;
