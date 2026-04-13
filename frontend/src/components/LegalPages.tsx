import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Divider,
  Link,
  Typography,
} from '@mui/material';
import config from '../../../shared/config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LegalNamespace = 'privacy' | 'terms';

interface SectionDef {
  /** i18next key inside sections.* */
  key: string;
  /** Render the operator contact block after all paragraphs? */
  isContact?: true;
}

interface LegalPagesProps {
  ns: LegalNamespace;
  sections: SectionDef[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Manually interpolate {{varName}} tokens inside a string.
 * This is a safe fallback for cases where i18next returnObjects
 * does not interpolate nested array strings automatically.
 */
function interpolate(text: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    //(s, [k, v]) => s.replaceAll(`{{${k}}}`, v),
    (s, [k, v]) => s.split(`{{${k}}}`).join(v),
    text,
  );
}

// ---------------------------------------------------------------------------
// LegalPages
// ---------------------------------------------------------------------------

export default function LegalPages({ ns, sections }: LegalPagesProps) {
  const { t } = useTranslation(ns);
  const { name: appName, baseUrlProduction, holder } = config.app;

  const vars: Record<string, string> = {
    appName,
    appUrl: baseUrlProduction,
    holderName: holder.name,
    holderEmail: holder.email,
  };

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 4 }, zoom: { xs: 0.9, sm: 1 } }} >
      {/* ── Header ── */}
      <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
        {t('title')}
      </Typography>

      <Typography variant="body2" color="text.secondary">
        {t('lastUpdatedLabel')}: {t('lastUpdatedDate')}
      </Typography>

      <Divider sx={{ my: 4 }} />

      {/* ── Sections ── */}
      {sections.map(({ key, isContact }) => {
        const rawParagraphs = t(`sections.${key}.paragraphs`, {
          returnObjects: true,
        }) as string[];

        const paragraphs = Array.isArray(rawParagraphs)
          ? rawParagraphs.map((p) => interpolate(p, vars))
          : [];

        return (
          <Box key={key} component="section" sx={{ mb: 5 }}>
            <Typography
              variant="h6"
              component="h2"
              fontWeight={600}
              gutterBottom
            >
              {t(`sections.${key}.title`)}
            </Typography>

            {paragraphs.map((paragraph, i) => (
              <Typography
                key={i}
                variant="body1"
                paragraph
                sx={{ lineHeight: 1.8, color: 'text.primary' }}
              >
                {paragraph}
              </Typography>
            ))}

            {/* Contact block — rendered from config to get a real mailto link */}
            {isContact && (
              <Box
                sx={{
                  mt: 1,
                  pl: 2,
                  borderLeft: 3,
                  borderColor: 'divider',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                }}
              >
                <Typography variant="body1" fontWeight={600}>
                  {holder.name}
                </Typography>
                <Typography variant="body1">
                  {t(`sections.${key}.emailLabel`)}:{' '}
                  <Link href={`mailto:${holder.email}`}>
                    {holder.email}
                  </Link>
                </Typography>
              </Box>
            )}
          </Box>
        );
      })}
    </Container>
  );
}
