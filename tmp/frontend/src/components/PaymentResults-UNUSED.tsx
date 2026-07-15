import React from 'react';
import { useTranslation } from 'react-i18next';
import { Typography, Button, Container, Paper } from '@mui/material';
import useNavigate from '@/hooks/useNavigate';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTheme } from '@mui/material/styles';

type PaymentResultsProps = {
  mode?: 'success' | 'cancel';
};

const PaymentResults: React.FC<PaymentResultsProps> = ({ mode }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();

  console.log("StripeConnect - mode:", mode); // TODO: handle action ('success' / 'canceled')

  return (
    <Container maxWidth="md">
      <Paper
        elevation={3}
        sx={{
          mt: 8,
          p: 6,
          borderRadius: 2,
          textAlign: 'center',
          backgroundColor: theme.palette.background.paper,
        }}
      >
        <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
          {t('Payment Results Page')}
        </Typography>

        <Typography variant="h4" sx={{ mb: 2, fontWeight: 800 }}>
          {/* TODO... */}

          {mode ?? '—'}
          
          <p>🏁 Payment Successful!</p>
          <p>Your booking has been confirmed.</p>
          
          <p>⚠ Payment Cancelled</p>
          <p>You can try booking again.</p>
          
        </Typography>
        
        <Button
          variant="outlined"
          size="large"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/bookings/my')}
          sx={{ minWidth: 180 }}
        >
          {t('Go to my bookings')}
        </Button>
      </Paper>
    </Container>
  );
};

export default PaymentResults;
