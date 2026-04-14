/**
 * Use this component inside a showDialog:
 * 
 *   const confirmed = await showDialog(
 *     <EmailBulkDialog recipients={selectedUsers} onDone={() => {}} />,
 *     { title: 'Send bulk email', maxWidth: 'md' }
 *   );
 *
 * or
 * 
 * use the hook `useEmailBulkDialog`
 */

import React, { useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Chip,
  //CircularProgress,
  Divider,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Alert,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Edit as EditIcon,
  Visibility as VisibilityIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/contexts/DialogContext';
import { emailApi } from '@/services/api';
import { getErrorMessage } from '@/shared/utils/misc';
import { getEmailBulkVariables } from '@/shared/utils/emailBulkVariables';
import { t } from 'i18next';
import config from '@/shared/config';

// ── Types ───────────────────────────────────────────────────────────────────

export interface EmailBulkRecipient {
  id: string;
  name: string;
  surname: string;
  email: string;
}

interface EmailBulkDialogProps {
  recipients: EmailBulkRecipient[];
  /** Called after a successful send (or skipped on cancel). */
  onDone?: (result: { sent: number; failed: number } | null) => void;
  /** If your showDialog() passes a close callback, wire it here. */
  onClose?: () => void;
}

// ── API call ─────────────────────────────────────────────────────────────────

async function sendEmailBulk(payload: { // TODO: remove payload here, in services/api and in backend/routes/email
  recipients: EmailBulkRecipient[];
  subject: string;
  body: string;
}): Promise<{ sent: number; total: number; failed: { email: string; reason: string }[] }> {
  const response = await emailApi.sendBulk({
    recipients: payload.recipients,
    subject: payload.subject,
    body: payload.body,
  });
  return response.data;
}

// ── Helper: insert text at the cursor position of a textarea ─────────────────

function insertAtCursor(
  ref: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>,
  insertion: string,
  getValue: () => string,
  setValue: (v: string) => void,
) {
  if (!ref) {
    setValue(getValue() + insertion);
    return;
  }
  const el = ref.current;
  if (!el) {
    setValue(getValue() + insertion);
    return;
  }
  const start = el.selectionStart ?? getValue().length;
  const end = el.selectionEnd ?? getValue().length;
  const current = getValue();
  const next = current.slice(0, start) + insertion + current.slice(end);
  setValue(next);
  // Restore cursor after React re-render
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(start + insertion.length, start + insertion.length);
  });
}

// ── Preview: replace {{Var}} with example values ─────────────────────────────

const PREVIEW_VALS: Record<string, string> = {
  UserName: config.app.email.bulk.preview.UserName,
  UserSurname: config.app.email.bulk.preview.UserSurname,
  UserEmail: config.app.email.bulk.preview.UserEmail,
  AppName: config.app.name,
  // UserName: 'Alice',
  // UserSurname: 'Bianchi',
  // UserEmail: 'alice.bianchi@mail.com',
  // AppName: 'TicketUno',
};

function renderPreview(text: string): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => PREVIEW_VALS[key] ?? match);
}

// ── Component ────────────────────────────────────────────────────────────────

export default function EmailBulkDialog({
  recipients,
  onDone,
  onClose,
}: EmailBulkDialogProps) {
  const { t } = useTranslation();
  const { loading } = useAuth();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ sent: number; failed: number } | null>(null);

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Track which field was last focused so variable chips know where to insert
  const lastFocused = useRef<'subject' | 'body'>('body');

  const handleInsertVariable = useCallback((key: string) => {
    const token = `{{${key}}}`;
    if (lastFocused.current === 'subject') {
      insertAtCursor(subjectRef, token, () => subject, setSubject);
    } else {
      insertAtCursor(bodyRef, token, () => body, setBody);
    }
  }, [subject, body]);

  const handleSend = async () => {
    setError(null);
    if (!subject.trim()) { setError(t('Subject is required')); return; }
    if (!body.trim()) { setError(t('Body is required')); return; }
    //setLoading(true);
    try {
      const result = await sendEmailBulk({ recipients, subject, body });
      setSuccess({ sent: result.sent, failed: result.failed.length });
      onDone?.({ sent: result.sent, failed: result.failed.length });
    } catch (error) {
      setError(getErrorMessage(error));
    // } finally {
    // setLoading(false);
    }
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <Box sx={{ p: 1 }}>
        <Alert severity={success.failed > 0 ? 'warning' : 'success'} sx={{ mb: 2 }}>
          {t('{{count}} emails sent successfully', { count: success.sent })}
          {success.failed > 0 && (
            t('{{count}} emails send failed', { count: success.failed })
          )}
        </Alert>
        <Button variant="contained" onClick={onClose}>{t('Close')}</Button>
      </Box>
    );
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 1 }}>

      {/* Variable chip toolbar */}
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
          {t('Click a variable to insert it at the cursor (works in Subject and Body)')}:
        </Typography>
        <Stack direction="row" flexWrap="wrap" gap={0.75}>
          {getEmailBulkVariables.map(({ key, label, description }) => (
            <Tooltip key={key} title={description} placement="top" arrow>
              <Chip
                label={`{{${label}}}`}
                size="small"
                variant="outlined"
                color="primary"
                clickable
                onClick={() => handleInsertVariable(key)}
                sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
              />
            </Tooltip>
          ))}
        </Stack>
      </Box>

      <Divider />

      {/* Subject */}
      <TextField
        label={t('Subject')}
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        onFocus={() => { lastFocused.current = 'subject' }}
        inputRef={subjectRef}
        fullWidth
        size="small"
        disabled={loading}
        placeholder={
          t('Hello') + ' ' + '{{UserName}}' + ', ' + t('here\'s an update!')
        }
        inputProps={{ spellCheck: true }}
      />

      {/* Edit / Preview toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <ToggleButtonGroup
          value={mode}
          exclusive
          onChange={(_, v) => v && setMode(v)}
          size="small"
        >
          <ToggleButton value="edit">
            <EditIcon fontSize="small" sx={{ mr: 0.5 }} />
            {t('Edit')}
          </ToggleButton>
          <ToggleButton value="preview">
            <VisibilityIcon fontSize="small" sx={{ mr: 0.5 }} />
            {t('Preview')}
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Body — edit mode */}
      {mode === 'edit' && (
        <TextField
          label="Body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onFocus={() => { lastFocused.current = 'body'; }}
          inputRef={bodyRef}
          multiline
          minRows={8}
          maxRows={20}
          fullWidth
          disabled={loading}
          placeholder={
            t('Dear') + ' ' + '{{UserName}}' + ',\n\n' +
            t('Write your message here...') + '\n\n' +
            t('Best regards') + ',\n' +
            t('The Team')
          }
          inputProps={{
            spellCheck: true,
            style: { fontFamily: 'monospace', fontSize: '0.875rem', lineHeight: 1.6 },
          }}
        />
      )}

      {/* Body — preview mode */}
      {mode === 'preview' && (
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
            {t('Preview shown for a sample user')}
          </Typography>
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 2,
              minHeight: 200,
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
              fontSize: '0.9rem',
              lineHeight: 1.7,
              bgcolor: 'background.default',
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {t('Subject')}: {renderPreview(subject) || <em>{t('empty')}</em>}
            </Typography>
            <Divider sx={{ my: 1 }} />
            <Typography component="div" sx={{ whiteSpace: 'pre-wrap' }}>
              {renderPreview(body) || <Typography color="text.secondary"><em>{t('empty')}</em></Typography>}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Error */}
      {error && <Alert severity="error">{error}</Alert>}

      {/* Actions */}
      <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ pt: 1 }}>
        <Button onClick={onClose} disabled={loading}>
          {t('Cancel')}
        </Button>
        <Button
          variant="contained"
          // startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
          startIcon={<SendIcon />}
          onClick={handleSend}
          disabled={loading || !subject.trim() || !body.trim()}
        >
          {loading ? t('Sending…') : t('Send to {{count}} recipients', { count: recipients.length})}
        </Button>
      </Stack>
    </Box>
  );
}


// ── Convenience hook ──────────────────────────────────────────────────────────
 
export function useEmailBulkDialog() {
  const showDialog = useDialog();
 
  return useCallback(
    (recipients: EmailBulkRecipient[]) => {
      showDialog({
        title: t('Send email to {{count}} users', { count: recipients.length }),
        content: (close) => (
          <EmailBulkDialog recipients={recipients} onClose={close} />
        ),
        showCloseIcon: true,
        paperSx: { maxWidth: 720 },
      });
    },
    [showDialog],
  );
}
 

// ── Convenience hook ──────────────────────────────────────────────────────────
/**
 * Returns an `openEmailBulkDialog(recipients)` function.
 *
 * Example:
 *   const openEmailBulk = useEmailBulkDialog();
 *   <Button onClick={() => openEmailBulk(selectedUsers)}>Email selected</Button>
 */
// export function useEmailBulkDialog() {
//   const showDialog = useDialog();

//   return useCallback(
//     (recipients: EmailBulkRecipient[]) => {
//       /*
//       showDialog({
//         title: t('Send email to {{count}} users', { count: recipients.length }),
//         maxWidth: 'md',
//         fullWidth: true,
//         ({ onClose }) => (
//           <EmailBulkDialog
//             recipients={recipients}
//             onClose={onClose}
//             onDone={onClose}
//           />
//         ),
//       });
//       */
//       showDialog({
//         title: t('Send email to {{count}} users', { count: recipients.length }),
//         content: <EmailBulkDialog
//           recipients={recipients}
//           onClose={onClose}
//           onDone={onClose}
//         />,
//         cancelText: t('Cancel'),
//         confirmText: t('Delete'),
//         onConfirm: async () => {
//           const response = await eventApi.deleteEvent(id);
//           const { success, wasBlocked } = await handleGuardResult(response.data, 'deleted', 'event', showDialog, toast, t);
//           if (wasBlocked) {
//             setNavigateTo('/bookings');
//             return;
//           }
//           if (!success) return;
//           // success path continues here
//           toast.success(t('Event deleted successfully'));
//           await loadEvents();
//         },
        
//       });
//     },
//     [showDialog],
//   );
// }
