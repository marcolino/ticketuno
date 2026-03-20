import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Button,
  Box,
  Typography,
  Chip,
  Stack,
} from '@mui/material';
import {
  Cancel,
  QrCode as QrCodeIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import useNavigate from '@/hooks/useNavigate';
import PageHeader from "@/components/PageHeader";
import { useAuth } from '@/contexts/AuthContext';
import { QrCodeScanner, playSuccessSound, playFailureSound } from './QrCodeScanner';

interface BookingValidateProps {
  userId?: string; // undefined = editing self
}

type ValidationCodes = 'valid' | 'invalid' | 'already_used';
interface ValidationResult {
  code: string;
  status: ValidationCodes;
  label: string;
}

// TODO: to services/api.ts ...
async function validateTicket(code: string): Promise<ValidationResult> {
  // Replace with your real API call
  // const res = await fetch('/api/tickets/validate', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ code }),
  // });
  // if (!res.ok) throw new Error('Network error');
  // //return res.json();
  return {
    code: code || 'TL-1234567',
    status: 'valid',
    label: 'John Malcovich',
  };
}

const BookingValidate: React.FC<BookingValidateProps> = () => {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  //const [validatedTickets, setValidatedTickets] = useState<string[]>([]);
  const [openQrCodeScanner, setOpenQrCodeScanner] = useState(false);
  const [lastResult, setLastResult] = useState<ValidationResult | null>(null);

  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isAuthenticated) {
      navigate(-1);
    }
  }, [isAuthenticated, navigate]);

  /**
   * Called by QrCodeScanner every time a QR code is decoded.
   *
   * The component already played a "decode" beep.
   * Here we do async validation and play a second sound to confirm
   * whether the ticket was accepted or rejected.
   *
   * The scanner automatically resumes after `scanCooldown` ms regardless
   * of how long this async call takes — fire and forget is intentional.
   */
  const handleScan = async (code: string) => {
    console.log("SCAN RESULT:", code);
    try {
      const result = await validateTicket(code);
      setLastResult(result);
 
      if (result.status === 'valid') {
        playSuccessSound();         // ascending double-beep: ticket OK
      } else {
        playFailureSound();         // descending buzz: already used / invalid
      }
    } catch {
      playFailureSound();           // network / server error
      setLastResult({ code, status: 'invalid', label: 'Server error' });
    }
  };

  return (
    <Container
      maxWidth="md"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        py: 1,
      }}
    >
      <PageHeader title={t('Validate Bookings')} />

      {/* <QrCodeScanner
        onScan={handleScan}
        onClose={() => setOpenQrCodeScanner(false)}
        open={openQrCodeScanner}
      /> */}
      <QrCodeScanner
        open={openQrCodeScanner}
        onScan={handleScan}
        onClose={() => setOpenQrCodeScanner(false)}
        scanCooldown={2 * 1000} // 2 seconds green overlay, then auto-resume
        enableSounds // Internal decode beep on every read
      />

      <Box sx={{
        flexGrow: 1,
        overflowY: 'auto',
        mt: 2,
        minHeight: 0,
        maxHeight: 'calc(100vh - 350px)',
      }}>
        {/* Last scan result badge */}
        {lastResult && (
          <Chip
            icon={lastResult.status === 'valid' ? <CheckCircleIcon /> : <CancelIcon />}
            label={`${lastResult.label} — ${lastResult.code}`}
            color={lastResult.status === 'valid' ? 'success' : 'error'}
            variant="outlined"
          />
        )}
      </Box>

      <Box
        sx={{
          display: 'flex',
          gap: 1,
          pt: 2,
          borderTop: 1,
          borderColor: 'divider',
          mt: 2,
        }}
      >
        <Button variant="outlined" startIcon={<Cancel />} onClick={() => navigate(-1)}>
          {t('Cancel')}
        </Button>
        <Button variant="contained" startIcon={<QrCodeIcon />} onClick={() => setOpenQrCodeScanner(true)}>
          {t('Start QrCode Validation')}
        </Button>
      </Box>
    </Container>
  );
};

export default BookingValidate;
