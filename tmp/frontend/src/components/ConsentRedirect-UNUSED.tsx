import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useConsent } from '@/contexts/ConsentContext';
import useNavigate from '@/hooks/useNavigate';
import { toast } from '@/contexts/ToastContext';
import { userApi } from '@/services/api';
import { UserProfile } from '@/shared/types/user';
import { t } from 'i18next';

const ConsentRedirect: React.FC = () => {
  const { token, type } = useParams<{ token: string; type?: string }>();
  const { openConsentDialog } = useConsent();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;

    (async () => {
      try {
        // Verify token with backend
        const response = await userApi.verifyConsentToken(token, type);
        const profile: UserProfile = response.data;
        const verified = !!profile.id;

        // Always redirect to home first
        navigate('/', { replace: true });

        // Open dialog with pre-selected consent type if valid
        if (verified) {
          openConsentDialog({ token, type });
        } else {
          toast.error(t('The consent link is invalid or expired. Please authenticate and manage your consents in Privacy settings.'));
        }
      } catch (error: unknown) {
        navigate('/', { replace: true });
        toast.error(t('The consent link cannot be verified: {{err}}', {
          err: (error as any)?.message ?? '',
        }));
      }
    })();
  }, [token, type, navigate, openConsentDialog]);

  return null; // nothing rendered
};

export default ConsentRedirect;
