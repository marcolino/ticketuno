import { t } from 'i18next';

// ─── Available variable definitions (used by both backend & frontend) ─────────
export const EMAIL_BULK_VARIABLES: { key: string; label: string; description: string }[] = [
  { key: 'UserName',    label: 'UserName',    description: t('Recipient\'s first name')    },
  { key: 'UserSurname', label: 'UserSurname', description: t('Recipient\'s last name')     },
  { key: 'UserEmail',   label: 'UserEmail',   description: t('Recipient\'s email address') },
  { key: 'AppName',     label: 'AppName',     description: t('The application name')       },
];
