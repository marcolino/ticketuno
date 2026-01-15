import React, { useEffect } from 'react';
import { useNavigate, useLocation  } from 'react-router-dom';
import { setAuthToken } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import i18n from '../i18n';

// Component to handle OAuth callback
const OAuthHandler: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const googleToken = params.get('google_token');
    const error = params.get('error');
    
    if (googleToken) {
      // Set token and reload to trigger auth context
      setAuthToken(googleToken);
      toast.success(i18n.t('Google login successful'));
      // Clean URL and reload
      window.location.href = '/';
    } else if (error === 'google_auth_failed') {
      toast.error(i18n.t('Google login failed. Please try again.'));
      navigate('/', { replace: true });
    }
  }, [location, navigate]);

  return null;
};

export default OAuthHandler;
