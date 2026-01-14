import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLoading } from '../contexts/LoadingContext';
import { useAuth } from '../contexts/AuthContext'; 
import { useToast } from '../contexts/ToastContext';
import { ReactNode, useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, isAdmin, isLoading: authLoading } = useAuth(); 
  //const { isLoading } = useLoading();
  const { t } = useTranslation();
  const toast = useToast();
  const [shouldRedirect, setShouldRedirect] = useState(false);
  //const [redirectReason, setRedirectReason] = useState<'unauthorized' | 'not-admin' | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      console.log("user:", user);
      toast.warning(t("You must be logged in to access this page"));
      //setRedirectReason('unauthorized');
      setShouldRedirect(true);
      return;
    }
    if (!authLoading && requireAdmin && !isAdmin) {
      toast.warning(t("To access this route you need administrator access"));
      //setRedirectReason('not-admin');
      setShouldRedirect(true);
      return;
    }
  }, [authLoading, user, isAdmin, requireAdmin, toast, t]);
  
  if (shouldRedirect) {
    return <Navigate to="/" replace />; // TODO: navigate to login route (currently it's a dialog...)
  }
  
  // These conditions handle initial render before useEffect runs
  if (!user) { // If user is required but user is not logged in
    return null;
  }
  if (requireAdmin && !isAdmin) { // If admin is required but user is not admin
    return null;
  }
  
  return <>{children}</>;
};
