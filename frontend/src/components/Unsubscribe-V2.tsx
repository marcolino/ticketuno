import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { t } from 'i18next';
import {
  Container,
  Alert,
  Box,
  Typography,
} from '@mui/material';
import PageHeader from "./PageHeader";
import { userApi, emailApi } from '@/services/api';
import { User } from '@/shared/types/user';

const Unsubscribe: React.FC = () => {
  const { token } = useParams<{ token }>();
  //const navigate = useNavigate();

  // Responsive breakpoints
  //const showDialog = useDialog();
  const [tokenVerified, setTokenVerified] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [consentUpdated, setConsentUpdated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('no token!');
      return;
    }
    (async () => {
      try {
        const response = await emailApi.verifyMarketingUnsubscribeToken(token);
        setTokenVerified(true);
      } catch (error: any) {
        t('Failed to verify unsubscribe token: {{err}}', {
          err: error.response?.data?.error,
        })
      }
    })();
  }, []);

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <PageHeader title={t('Unsubscribe')} />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {consentUpdated && (
        <Box>
          <Typography>
           {t('Consent updated!')}
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default Unsubscribe;
