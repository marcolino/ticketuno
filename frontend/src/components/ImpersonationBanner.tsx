import React from 'react';
import { Alert, Button } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import useNavigate from '@/hooks/useNavigate';

/**
 * Sticky warning shown whenever the current session is an admin impersonation.
 * Lets the admin return to their own account in one click.
 */
const ImpersonationBanner: React.FC = () => {
  const { t } = useTranslation();
  const { isImpersonating, endImpersonation, user } = useAuth();
  const navigate = useNavigate();

  if (!isImpersonating) return null;

  const handleEnd = async () => {
    await endImpersonation();
    navigate('/users');
  };

  const name = user ? `${user.firstName} ${user.lastName}` : t('another user');

  return (
    <Alert
      severity="warning"
      square
      sx={{
        position: 'sticky',
        top: 70, // TODO: toolbar height
        zIndex: (theme) => theme.zIndex.appBar + 1,
        borderRadius: 0,
      }}
      action={
        <Button color="inherit" size="small" onClick={handleEnd}>
          {t('Back to your account')}
        </Button>
      }
    >
      {t('Impersonation session active — you are acting as {{name}}', { name })}
    </Alert>
  );
};

export default ImpersonationBanner;
