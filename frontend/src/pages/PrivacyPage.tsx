import LegalPage, { type LegalNamespace } from '@/components/LegalPages';

const NS: LegalNamespace = 'privacy';

/**
 * Section order must match the keys in
 * frontend/public/locales/{lng}/privacy.json → sections.*
 */
const SECTIONS = [
  { key: 'intro' },
  { key: 'dataCollected' },
  { key: 'dataUse' },
  { key: 'legalBasis' },
  { key: 'dataSharing' },
  { key: 'dataRetention' },
  { key: 'yourRights' },
  { key: 'cookies' },
  { key: 'childrens' },
  { key: 'changes' },
  { key: 'contact', isContact: true as const },
] satisfies React.ComponentProps<typeof LegalPage>['sections'];

export default function PrivacyPage() {
  return <LegalPage ns={NS} sections={SECTIONS} />;
}
