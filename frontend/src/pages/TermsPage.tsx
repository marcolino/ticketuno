import LegalPage, { type LegalNamespace } from '@/components/LegalPages';

const NS: LegalNamespace = 'terms';

/**
 * Section order must match the keys in
 * frontend/public/locales/{lng}/terms.json → sections.*
 */
const SECTIONS = [
  { key: 'acceptance' },
  { key: 'serviceDescription' },
  { key: 'account' },
  { key: 'bookings' },
  { key: 'cancellations' },
  { key: 'conduct' },
  { key: 'intellectualProperty' },
  { key: 'warranties' },
  { key: 'liability' },
  { key: 'indemnification' },
  { key: 'governingLaw' },
  { key: 'changes' },
  { key: 'contact', isContact: true as const },
] satisfies React.ComponentProps<typeof LegalPage>['sections'];

export default function TermsPage() {
  return <LegalPage ns={NS} sections={SECTIONS} />;
}
