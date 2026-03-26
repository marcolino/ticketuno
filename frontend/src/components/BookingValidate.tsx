/**
 * BookingValidate.tsx
 *
 * Shows a running log of all validations.
 * "Show only changes" means: if the same QR code is scanned again
 * immediately (consecutive duplicate), the existing entry just gets
 * a re-scan counter bump instead of a new row — avoiding visual noise
 * when someone accidentally double-scans the same ticket.
 * Every genuinely different code always gets its own row.
 */

import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import DoNotDisturbOnIcon from '@mui/icons-material/DoNotDisturbOn';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { TicketValidationStatus, TicketValidationResult, TicketScanEntry } from '@/shared/types/ticket';
import { QrCodeScanner, playSuccessSound, playFailureSound } from './QrCodeScanner';
import useNavigate from '@/hooks/useNavigate';
import { ticketApi } from '@/services/api';
import { useDialog } from '@/contexts/DialogContext';
import { getErrorMessage } from '@/utils/misc';
// ─── Fake API (replace with your real fetch) ──────────────────────────────────

async function validateTicket(code: string): Promise<TicketValidationResult> {
  const encodedCode = encodeURIComponent(code);
  try {
    const response = await ticketApi.validateTicket(encodedCode);
    return response.data;
  } catch (error) {
    return {
      status: 'error',
      label: getErrorMessage(error),
    };
  }

}

// ─── Status helpers ───────────────────────────────────────────────────────────
const STATUS_META: Record<TicketValidationStatus, {
  color: 'success' | 'error' | 'warning' | 'default';
  icon: React.ReactElement;
  bg: (theme: Theme) => string;
}> = {
  valid: {
    color: 'success',
    icon: <CheckCircleIcon fontSize="small" />,
    bg: (t) => alpha(t.palette.success.main, 0.08)
  },
  already_used: {
    color: 'warning',
    icon: <DoNotDisturbOnIcon fontSize="small" />,
    bg: (t) => alpha(t.palette.warning.main, 0.08)
  },
  invalid: {
    color: 'error',
    icon: <CancelIcon fontSize="small" />,
    bg: (t) => alpha(t.palette.error.main, 0.08)
  },
  error: {
    color: 'error',
    icon: <CancelIcon fontSize="small" />,
    bg: (t) => alpha(t.palette.error.main, 0.08)
  },
};

function statusLabel(entry: TicketScanEntry, t: (k: string) => string): string {
  const base = entry.pending ? t('Validating…') : entry.label;
  return entry.duplicateCount > 1 ? `${base} (×${entry.duplicateCount})` : base;
}

// ─── Single log row ───────────────────────────────────────────────────────────

const ScanRow: React.FC<{ entry: TicketScanEntry; isNew: boolean }> = ({ entry, isNew }) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const meta = STATUS_META[entry.status];

  return (
    <Collapse in appear timeout={300}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.25,
          backgroundColor: isNew
            ? meta.bg(theme)
            : 'transparent',
          transition: 'background-color 1.5s ease',
          '&:hover': { backgroundColor: alpha(theme.palette.action.hover, 0.5) },
        }}
      >
        {/* Status icon / spinner */}
        <Box sx={{ color: `${meta.color}.main`, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          {entry.pending
            ? <CircularProgress size={16} color="inherit" />
            : meta.icon}
        </Box>

        {/* Code + label */}
        <Stack flex={1} spacing={0} minWidth={0}>
         <Typography
            variant="body2"
            fontWeight={600}
            sx={{
              fontFamily: 'monospace',
              letterSpacing: 0.5,
              wordBreak: 'break-all',   // ← breaks anywhere in a long code
              overflowWrap: 'anywhere', // ← fallback for older engines
            }}
          >
            {/*entry.code*/}{entry.ref}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {statusLabel(entry, t)}
          </Typography>
        </Stack>

        {/* Duplicate badge */}
        {entry.duplicateCount > 1 && !entry.pending && (
          <Tooltip title={t('Same code scanned {{n}} times in a row', { n: entry.duplicateCount })}>
            <Chip
              size="small"
              label={`× ${entry.duplicateCount}`}
              color={meta.color as any}
              variant="outlined"
              sx={{ height: 20, fontSize: 11, cursor: 'default' }}
            />
          </Tooltip>
        )}

        {/* Time */}
        <Typography variant="caption" color="text.disabled" flexShrink={0} sx={{ fontSize: 11 }}>
          {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </Typography>
      </Box>
    </Collapse>
  );
};

// ─── Main page component ──────────────────────────────────────────────────────

export const BookingValidate: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const showDialog = useDialog();
  
  const [scannerOpen, setScannerOpen] = useState(true);
  const [entries, setEntries] = useState<TicketScanEntry[]>([]);
  const [newEntryId, setNewEntryId] = useState<string | null>(null);
  const newEntryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived counters
  const total = entries.reduce((n, e) => n + e.duplicateCount, 0);
  const valid = entries.filter((e) => e.status === 'valid').reduce((n, e) => n + e.duplicateCount, 0);
  const invalid = total - valid;

  // ── Mark entry as "new" (highlighted) for 1.5 s ──────────────────────────
  const markNew = (id: string) => {
    if (newEntryTimer.current) clearTimeout(newEntryTimer.current);
    setNewEntryId(id);
    newEntryTimer.current = setTimeout(() => setNewEntryId(null), 1500);
  };

  // ── onScan handler ────────────────────────────────────────────────────────
  const handleScan = useCallback(async (code: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const now = new Date();

    setEntries((prev) => {
      const last = prev[0]; // newest is at index 0

      // ── Consecutive duplicate: bump count, don't add a row ──
      if (last && last.code === code && !last.pending) {
        return [
          { ...last, duplicateCount: last.duplicateCount + 1, timestamp: now },
          ...prev.slice(1),
        ];
      }

      // ── New code: add a pending row at the top ──
      const newEntry: TicketScanEntry = {
        id,
        code,
        status: 'valid', // Placeholder; overwritten after fetch
        label: '',
        timestamp: now,
        duplicateCount: 1,
        pending: true,
      };
      return [newEntry, ...prev];
    });

    markNew(id);

    // ── Server validation ─────────────────────────────────────────────────
    try {
      const result = await validateTicket(code);

      setEntries((prev) => {
        const idx = prev.findIndex((e) => e.id === id);
        if (idx === -1) return prev;    // was cleared in the meantime

        // If this entry got a duplicate bump while the request was in flight,
        // keep the updated count but resolve the status.
        const updated: TicketScanEntry = {
          ...prev[idx],
          status: result.status,
          label: result.label,
          ref: result.ref,
          pending: false,
        };
        return [...prev.slice(0, idx), updated, ...prev.slice(idx + 1)];
      });

      if (result.status === 'valid')
        playSuccessSound();
      else {
        playFailureSound();
        showDialog({
          title: t('Invalid ticket'),
          content: t('This ticket is invalid: {{reason}}', { reason: result.label}),
          //cancelText: t('Cancel'),
          confirmText: t('Close'),
          onConfirm: () => { },
        });
      }
    } catch {
      setEntries((prev) => {
        const idx = prev.findIndex((e) => e.id === id);
        if (idx === -1) return prev;
        const updated: TicketScanEntry = {
          ...prev[idx],
          status: 'error',
          label: t('Server error: could not validate'),
          pending: false,
        };
        return [...prev.slice(0, idx), updated, ...prev.slice(idx + 1)];
      });
      playFailureSound();
    }
  }, [t]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <Stack spacing={2} sx={{ p: { xs: 2, sm: 3 }, maxWidth: 560, mx: 'auto' }}>

      {/* ── Toolbar ── */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Button
          variant="contained"
          startIcon={<QrCodeScannerIcon />}
          onClick={() => setScannerOpen(true)}
          //sx={{ borderRadius: 2 }}
        >
          {t('Scan tickets')}
        </Button>
        <Button
          variant="outlined"
          //startIcon={<QrCodeScannerIcon />}
          onClick={() => navigate(-1)}
          //sx={{ borderRadius: 2 }}
          //size="small"
        >
          {t('Cancel')}
        </Button>

        {entries.length > 0 && (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2, mb: 1}}>
            {/* Summary chips */}
            <Chip
              icon={<CheckCircleIcon />}
              label={valid}
              color="success"
              size="small"
              variant="outlined"
            />
            <Chip
              icon={<CancelIcon />}
              label={invalid}
              color="error"
              size="small"
              variant="outlined"
            />
            <Chip
              label={t('{{n}} total', { n: total })}
              size="small"
              variant="outlined"
            />
            <Tooltip title={t('Clear log')}>
              <Button
                size="small"
                color="inherit"
                startIcon={<DeleteSweepIcon />}
                onClick={() => setEntries([])}
                sx={{ borderRadius: 2, color: 'text.secondary' }}
              >
                {t('Clear')}
              </Button>
            </Tooltip>
          </Stack>
        )}
      </Stack>

      {/* ── Log panel ── */}
      {entries.length === 0 ? (
        null
        // <Fade in>
        //   <Alert severity="info" sx={{ borderRadius: 2 }}>
        //     {t('No scans yet. Open the scanner to begin.')}
        //   </Alert>
        // </Fade>
      ) : (
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 1,
            //overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              overflow: 'auto',
              flex: 1,
              maxHeight: { xs: '56vh', sm: '70vh' },
              minHeight: '120px',
            }}
          >
            {entries.map((entry, idx) => (
              <React.Fragment key={entry.id}>
                {idx > 0 && <Divider />}
                <ScanRow entry={entry} isNew={entry.id === newEntryId} />
              </React.Fragment>
            ))}
          </Box>
        </Paper>
      )}

      {/* ── Scanner dialog ── */}
      <QrCodeScanner
        open={scannerOpen}
        onScan={handleScan}
        onClose={() => setScannerOpen(false)}
        scanCooldown={1500}
        enableSounds={false}   // we play sounds ourselves after validation
      />
    </Stack>
  );
};

export default BookingValidate;