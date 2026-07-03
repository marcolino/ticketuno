import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/contexts/DialogContext';

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
  const showDialog = useDialog();
  const [warningShown, setWarningShown] = useState(false);

  if (loading) {
    return null;
  }

  useEffect(() => {
    if (!isAuthenticated && !warningShown) {
      setWarningShown(true);
      showDialog({
        title: t('Access Denied'),
        content: t('You must be logged in to access this page'),
        buttons: [
          {
            text: 'Login',
            onClick: () => navigate('/?authMode=login'),
            variant: 'contained',
          },
          {
            text: 'Go home',
            onClick: () => navigate('/'),
            variant: 'contained',
          },
        ],
        mode: 'error',
      });
    }
  }, [isAuthenticated, warningShown, navigate, t]);

  useEffect(() => {
    if (isAuthenticated && requireAdmin && !isAdmin && !warningShown) {
      navigate('/');
      // setWarningShown(true);
      // showDialog({
      //   title: t('Insufficient Permissions'),
      //   content: t('Admin role is required to access this page'),
      //   buttons: [
      //     {
      //       text: 'Login',
      //       onClick: () => navigate('/?authMode=login'),
      //       variant: 'contained',
      //     },
      //     {
      //       text: 'Go home',
      //       onClick: () => navigate('/'),
      //       variant: 'contained',
      //     },
      //   ],
      //   mode: 'error',
      // });
    }
  }, [isAuthenticated, requireAdmin, isAdmin, warningShown, navigate, t]);

  useEffect(() => {
    if (isAuthenticated && requireOperator && !isOperator && !warningShown) {
      navigate('/');
      // setWarningShown(true);
      // showDialog({
      //   title: t('Insufficient Permissions'),
      //   content: t('Operator role is required to access this page'),
      //   buttons: [
      //     {
      //       text: 'Login',
      //       onClick: () => navigate('/?authMode=login'),
      //       variant: 'contained',
      //     },
      //     {
      //       text: 'Go home',
      //       onClick: () => navigate('/'),
      //       variant: 'contained',
      //     },
      //   ],
      //   mode: 'error',
      // });
    }
  }, [isAuthenticated, requireOperator, isOperator, warningShown, navigate, t]);

  // While any error condition is true, render nothing (or a fallback)
  if (!isAuthenticated) return null;
  if (requireAdmin && !isAdmin) return null;

  return <>{children}</>;
};

export { ProtectedRoute };
