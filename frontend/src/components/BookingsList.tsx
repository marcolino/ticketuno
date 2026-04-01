/**
 * BookingValidate.tsx
 *
 * Shows all bookings.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Stack,
} from '@mui/material';
import PageHeader from './PageHeader';
//import useNavigate from '@/hooks/useNavigate';
//import { useDialog } from '@/contexts/DialogContext';
//import { getErrorMessage } from '@/utils/misc';

export const BookingsList: React.FC = () => {
  const { t } = useTranslation();
  //const navigate = useNavigate();
  //const showDialog = useDialog();

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <PageHeader
        title={t('Bookings')}
      />
      <Stack spacing={2}>
        {t('Work in progress...')}
      </Stack>
    </Container>
  );
};

export default BookingsList;