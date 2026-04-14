import emailService from './emailService';
import { getErrorMessage } from '../shared/utils/misc';
import config from '../config';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BulkEmailRecipient {
  id: string;
  name: string;
  surname: string;
  email: string;
  [key: string]: string; // allow extra fields for future variables
}

export interface BulkEmailPayload {
  recipients: BulkEmailRecipient[];
  subject: string;
  body: string; // plain HTML or text with {{Variable}} placeholders
}

export interface BulkEmailResult {
  total: number;
  sent: number;
  failed: { email: string; reason: string }[];
}

// ─── Variable interpolation ───────────────────────────────────────────────────

/**
 * Replaces {{VarName}} tokens in `text` with values from `vars`.
 * Unknown tokens are left as-is so you can spot missing mappings.
 */
export function interpolateVariables(
  text: string,
  vars: Record<string, string>,
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match;
  });
}

function buildVarsForRecipient(
  recipient: BulkEmailRecipient,
): Record<string, string> {
  return {
    UserName: recipient.name,
    UserSurname: recipient.surname,
    UserEmail: recipient.email,
    AppName: config.app.name,
    // extend as needed
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;') // must be the first one
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function plaintextToHtml(text: string): string {
  return escapeHtml(text).replace(/\n/g, '<br>');
}

// ─── Main service function ────────────────────────────────────────────────────

export async function sendBulkEmail(
  payload: BulkEmailPayload,
): Promise<BulkEmailResult> {
  const { recipients, subject, body } = payload;
  const htmlBody = plaintextToHtml(body);
  const result: BulkEmailResult = { total: recipients.length, sent: 0, failed: [] };

  // Fire sends concurrently but cap parallelism at 5 to avoid rate-limiting.
  const CHUNK = 5;
  for (let i = 0; i < recipients.length; i += CHUNK) {
    const chunk = recipients.slice(i, i + CHUNK);
    await Promise.all(
      chunk.map(async (recipient) => {
        const vars = buildVarsForRecipient(recipient);
        const personalizedSubject = interpolateVariables(subject, vars);
        const personalizedBody = interpolateVariables(htmlBody, vars);

        try {
          await emailService.send({
            to: recipient.email,
            subject: personalizedSubject,
            template: 'bulk',
            variables: {
              body: personalizedBody,
              appName: config.app.name,
            },
            isMarketing: true,
          });
          result.sent++;
        } catch (err) {
          result.failed.push({
            email: recipient.email,
            reason: getErrorMessage(err),
          });
        }
      }),
    );
  }

  return result;
}
