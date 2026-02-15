// components/ProtectedRoute.tsx
import React, { useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/contexts/ToastContext';
//import { CircularProgress, Box } from '@mui/material'; // Optional: for loading spinner

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false 
}) => {
  // You need to expose loading from AuthContext
  // For now, let's assume you can access it
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const { t } = useTranslation();
  const hasShownToast = useRef(false);
  
  useEffect(() => {
    if (!loading && !isAuthenticated && !hasShownToast.current) {
      toast.error('You must be logged in to access this page');
      hasShownToast.current = true;
    }
    if (!loading && !requireAdmin && !isAdmin && !hasShownToast.current) {
      toast.error(t('Admin privileges required to access this page'));
    }
  }, [loading, isAuthenticated, requireAdmin, isAdmin, t]);

  if (loading) {
    return null;
  }
  // // Show loading spinner while checking auth
  // if (loading) {
  //   return (
  //     <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
  //       <CircularProgress />
  //     </Box>
  //   );
  // }
  
  if (!isAuthenticated) {
    // You might want to redirect to login or show a message
    //toast.error(t('You must be logged in to access this page')); // TODO: better toast here or move it to the caller, reading `message` ?
    return <Navigate to="/" replace state={{ 
      message: 'You must be logged in to access this page' 
    }} />;
  }

  if (requireAdmin && !isAdmin) {
    //toast.error(t("Admin privileges required to access this page"));
    return <Navigate to="/" replace state={{ 
      message: t("Admin privileges required to access this page")
    }} />;
  }

  return <>{children}</>;
};

export { ProtectedRoute };
