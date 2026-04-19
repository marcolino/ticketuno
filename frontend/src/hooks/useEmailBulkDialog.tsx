import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import EmailBulkDialog from '../components/EmailBulkDialog';
import { useDialog } from '@/contexts/DialogContext';

export function useEmailBulkDialog() {
  const showDialog = useDialog();
  const { t } = useTranslation();

  return useCallback((recipients) => {
    showDialog({
      title: t('Send email to {{count}} users', { count: recipients.length }),
      content: (close) => (
        <EmailBulkDialog recipients={recipients} onClose={close} />
      ),
      showCloseIcon: true,
      paperSx: { maxWidth: 720 },
    });
  }, [showDialog]);
}
