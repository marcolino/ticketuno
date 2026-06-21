import { useState, useEffect, useCallback} from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import useNavigate from '@/hooks/useNavigate';
import { globalApi } from '@/services/api';
import { useTheme } from '@mui/material/styles';
import { sharedConfig as config } from '@ticketuno/shared';

const Maintenance = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState(false);

  const retry = useCallback(async () => {
    setRetrying(true);
    setError(false);
    try {
      await fetch(`${config.app.api.prefix}/${config.app.api.version}/health`);
      await globalApi.health();
      window.location.href = '/'; // back to app home if healthy
    } catch {
      setError(true);
    } finally {
      setRetrying(false);
    }
  }, []);

  // Retry automatically when tab regains focus or comes online
  useEffect(() => {
    document.addEventListener('visibilitychange', retry);
    window.addEventListener('online', retry);
    return () => {
      document.removeEventListener('visibilitychange', retry);
      window.removeEventListener('online', retry);
    };
  }, [retry]);

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
        <Typography variant="h4" sx={{ mb: 2, fontWeight: 600 }}>
          {t('App is under maintenance')}
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
          {t('Sorry, we\'ll be back shortly...')}
        </Typography>

        {error && (
          <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
            {t('Still unavailable, please try again later.')}
          </Typography>
        )}
        
        <Box
          component="img"
          src="/images/maintenance.png"
          alt={t('Under maintenance')}
          sx={{
            display: 'block',
            width: '100%',
            maxWidth: 300,
            height: 'auto',
            mb: 4,
            mx: 'auto',
            opacity: 0.8,
          }}
        />
        
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            size="large"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/')}
            sx={{ minWidth: 180 }}
            disabled={retrying}
          >
            {t('Retry now')}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Maintenance;
