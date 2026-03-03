import { useEffect } from 'react';
import useNavigate from '@/hooks/useNavigate';
import { useConsent } from "@/contexts/ConsentContext";

const ConsentEntry: React.FC = () => {
  const { openConsentDialog } = useConsent();
  const navigate = useNavigate();
  
  useEffect(() => {
    openConsentDialog(true); // Redirect after close
    navigate('/', { replace: true }); // Immediately redirect to /
  }, []);

  return null;
};

export default ConsentEntry;
