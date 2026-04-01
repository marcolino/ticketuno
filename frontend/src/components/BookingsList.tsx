/**
 * BookingValidate.tsx
 *
 * Shows all bookings - 
 */

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Stack,
} from '@mui/material';
import PageHeader from './PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
//import useNavigate from '@/hooks/useNavigate';
//import { useDialog } from '@/contexts/DialogContext';
//import { getErrorMessage } from '@/shared/utils/misc';

export const BookingsList: React.FC = () => {
  const { t } = useTranslation();
  const { user, isOperator } = useAuth();
  //const navigate = useNavigate();
  //const showDialog = useDialog();
  const toast = useToast();

  if (!user) {
    toast.error(t('You must be logged in to access this page')); // TODO: make these warnings more uniform...
    return;
  }

  const loadBookings = (user) => {
    console.log(user); // TODO ...
  }
  
  useEffect(() => {
    if (isOperator) {
      loadBookings(null); // Load all bookings
    } else {
      loadBookings(user); // Load only current user's bookings
    }
  }, [isOperator, loadBookings]);

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <PageHeader
        title={t('Bookings')}
      />
      <Stack spacing={2}>
        {t('Work in progress...')} {/* TODO... */}
      </Stack>
    </Container>
  );
};

export default BookingsList;
