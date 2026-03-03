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
//import { CommunicationPreferences } from '../shared/types/consent';
//import useNavigate from '@/hooks/useNavigate';
//import { useDialog } from '@/contexts/DialogContext';

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
        await emailApi.verifyMarketingUnsubscribeToken(token);
        setTokenVerified(true);
      } catch (error: any) {
        (
          t('Failed to verify unsubscribe token: {{err}}', {
            err: error.response?.data?.error,
          })
        );
      }
    })();
  }, []);

   useEffect(() => {
    if (!tokenVerified) {
      return;
    }
    (async () => {
      try {
        const response = await userApi.getUserByToken(token);
        const user = response.data;
        setUser(user);
      } catch (error: any) {
        console.error(
          t('Failed to find user by token: {{err}}', {
            err: error.response?.data?.error,
          })
        );
      }
    })();
  }, [tokenVerified]);

   useEffect(() => {
    if (!user) {
      return;
    }
    (async () => {
      const updatedConsent = user.consent!;
      updatedConsent.communication.marketingEmails = false;
      try {
        const response = await userApi.updateConsent(user.id, updatedConsent);
        console.log('updateConsent response:', response);
        setConsentUpdated(true);
      } catch (error: any) {
        console.error(
          t('Failed toupdate consent: {{err}}', {
            err: error.response?.data?.error,
          })
        );
      }
    })();
  }, [user]);

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <PageHeader
        title={t('Unsubscribe')}
        //showAdd={false}
        //addLabel={t('Add Event')}
        //onAdd={() => navigate('/event/new')}
      />

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
