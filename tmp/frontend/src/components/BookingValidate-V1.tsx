import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Button,
  Box,
  Typography,
} from '@mui/material';
import {
  Cancel,
  QrCode as QrCodeIcon,
} from '@mui/icons-material';
import useNavigate from '@/hooks/useNavigate';
import PageHeader from "@/components/PageHeader";
import QrCodeScanner from '@/components/QrCodeScanner';
import { useAuth } from '@/contexts/AuthContext';
//import { useDialog } from '@/contexts/DialogContext';
//import { toast } from '@/contexts/ToastContext';

interface BookingValidateProps {
  userId?: string; // undefined = editing self
}

const BookingValidate: React.FC<BookingValidateProps> = () => {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [validatedTickets, setValidatedTickets] = useState<string[]>([]);
  const [openQrCodeScanner, setOpenQrCodeScanner] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(-1);
    }
  }, [isAuthenticated, navigate]);

  const handleScan = async (scanResult: string) => {
    // TODO...
    console.log("SCAN RESULT:", scanResult);
    //if (true) { // TODO: if validation is passed...
      setValidatedTickets(prev => [...prev, scanResult]);
    //}
  }

  return (
    <Container
      maxWidth="md"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,          // ← CHANGE from height: '100%'
        minHeight: 0,     // ← ADD (belt-and-suspenders)
        py: 1,
      }}
    >
      <PageHeader title={t('Validate Bookings')} />

      <QrCodeScanner
        onScan={handleScan}
        onClose={() => setOpenQrCodeScanner(false)}
        open={openQrCodeScanner}
      />

      <Box sx={{
        flexGrow: 1,
        overflowY: 'auto',
        mt: 2,
        minHeight: 0,
        maxHeight: 'calc(100vh - 350px)', // 64px header + toolbar + py + pageheader + buttons
      }}>
        <Typography>
          {validatedTickets.join('\n')} {/* TODO: ... */}
        </Typography>
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
