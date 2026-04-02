// components/ProtectedRoute.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { Box, AlertTitle, Button/*, CircularProgress*/ } from '@mui/material';
import Alert from './Alert';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireOperator?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false,
  requireOperator = false,
}) => {
  const { isAuthenticated, isAdmin, isOperator, loading } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (loading) {
    return null;
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <Alert severity="error">
        <AlertTitle>{t('Access Denied')}</AlertTitle>
        {t('You must be logged in to access this page.')}
        <Box mt={2}>
          <Button variant="contained" color="warning" onClick={() => navigate('/?authMode=login')}>
            {t('Login')}
          </Button>
        </Box>
      </Alert>
    );
  }

  // Admin required but user is not admin
  if (requireAdmin && !isAdmin) {
    return (
      <Alert severity="error">
        <AlertTitle>{t('Insufficient Permissions')}</AlertTitle>
          {t('Admin role is required to access this page.')}
        <Box mt={2}>
          <Button variant="contained" onClick={() => navigate('/')}>
            {t('Go to home')}
          </Button>
        </Box>
      </Alert>
    );
  }

  // Operator required but user is not operator
  if (requireOperator && !isOperator) {
    return (
      <Alert severity="error">
        <AlertTitle>{t('Insufficient Permissions')}</AlertTitle>
        {t('Operator role required to access this page.')}
        <Box mt={2}>
          <Button variant="contained" onClick={() => navigate('/')}>
            {t('Go to home')}
          </Button>
        </Box>
      </Alert>
    );
  }

  return <>{children}</>;
};

export { ProtectedRoute };
