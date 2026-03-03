import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useConsent } from '@/contexts/ConsentContext';
import useNavigate from '@/hooks/useNavigate';
import { toast } from '@/contexts/ToastContext';
import { userApi } from '@/services/api';
import { t } from 'i18next';
//import config from '@/config';

const ConsentRedirect: React.FC = () => {
  const { openConsentDialog } = useConsent();
  const navigate = useNavigate();
  const { token } = useParams();

  useEffect(() => {
    if (token) {
      (async () => {
        console.log('Verifying consent token:', token);

        // Immediately navigate to home, so URL is clean
        navigate('/', { replace: true });

        // Process token via API, but do not forcibly change the dialog state
        try {
          const response = await userApi.verifyConsentToken(token)
          if (response) { // TODO: if (respone) is ok ???
            console.log('Consent token verified successfully');
            openConsentDialog();
          } else {
            toast.error(t('The consent link is invalid or expired'));
          }
        } catch (error: unknown) {
          toast.error(t('The consent link cannot be verified: {{err}}', { err: error!.message ?? '' }));
        }

      })();
    }
  }, [token, navigate/*, openConsentDialog*/]);

  return null; // nothing rendered
};

export default ConsentRedirect;
