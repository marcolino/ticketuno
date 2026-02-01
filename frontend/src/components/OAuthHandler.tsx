import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation  } from 'react-router-dom';
import { setAuthToken } from '../services/api';
import { toast } from '../contexts/ToastContext';
//import { i18n } from '../i18n';

// Component to handle OAuth callback
const OAuthHandler: React.FC = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const navigate = useNavigate();
  //const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const googleToken = params.get('google_token');
    const error = params.get('error');
    
    if (googleToken) {
      // Set token and reload to trigger auth context
      setAuthToken(googleToken);
      toast.success(t('Google login successful'));
      // Clean URL and reload
      window.location.href = '/';
    } else if (error === 'google_auth_failed') {
      toast.error(t('Google login failed. Please try again.'));
      navigate('/', { replace: true });
    }
  }, [location, navigate, t]);

  return null;
};

export default OAuthHandler;
