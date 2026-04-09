import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Stack,
} from '@mui/material';
import PageHeader from './PageHeader';
import Alert from './Alert';
import { useAuth } from '@/contexts/AuthContext';
//import { useToast } from '@/contexts/ToastContext';
//import useNavigate from '@/hooks/useNavigate';
//import { useDialog } from '@/contexts/DialogContext';
//import { getErrorMessage } from '@/shared/utils/misc';

/**
 * Shows all bookings
 */
export const BookingsList: React.FC = () => {
  const { t } = useTranslation();
  const { user, isOperator } = useAuth();
  //const navigate = useNavigate();
  //const showDialog = useDialog();
  //const toast = useToast();

  const [error, setError] = useState('');

  // Memoize loadBookings to avoid infinite effect loops
  const loadBookings = useCallback((userParam) => {
    console.log(userParam); // TODO: implement actual loading
  }, []);

  useEffect(() => {
    if (!user) {
      setError(t('You must be logged in to access this page'));
    } else {
      setError(''); // Clear error when user exists
    }
  }, [user, t]);
  
  useEffect(() => {
    if (user) {
      if (isOperator) {
        loadBookings(null); // Load all bookings
      } else {
        loadBookings(user); // Load only current user's bookings
      }
    }
  }, [user, isOperator, loadBookings]);

  if (error) {
    return (
      <Alert severity="error">
        {error}
      </Alert>
    )
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <PageHeader title={t('Bookings')} />
      <Stack spacing={2}>
        {t('Work in progress...')} {/* TODO... */}
      </Stack>
    </Container>
  );
};

export default BookingsList;
