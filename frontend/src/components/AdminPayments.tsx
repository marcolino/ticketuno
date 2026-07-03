import React from 'react';
import { useTranslation } from 'react-i18next';
import { Typography, Button, Container, Paper } from '@mui/material';
import useNavigate from '@/hooks/useNavigate';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTheme } from '@mui/material/styles';

const AdminPayments: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();

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
          {t('Admin Payments page')}
        </Typography>
        
        <Button
          variant="outlined"
          size="large"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          sx={{ minWidth: 180 }}
        >
          {t('Go Home')}
        </Button>
      </Paper>
    </Container>
  );
};

export default AdminPayments;
