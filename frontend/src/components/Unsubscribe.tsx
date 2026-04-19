import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Typography,
} from '@mui/material';
import { userApi } from '@/services/api';

const Unsubscribe: React.FC = () => {
  const { token } = useParams<{ token: string; type: string }>();
  const { t } = useTranslation();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    // One silent API call — no login, no dialog
    userApi.unsubscribe(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <Container maxWidth="sm" sx={{ mt: 8, textAlign: 'center' }}>
      {status === 'loading' && <Typography>{t('Processing...')}</Typography>}
      {status === 'success' && (
        <Typography variant="h6">
          {t('You have been unsubscribed from marketing emails.')}
        </Typography>
      )}
      {status === 'error' && (
        <Typography color="error">
          {t('This link is invalid or has expired.')}
        </Typography>
      )}
    </Container>
  );
};

export default Unsubscribe;
