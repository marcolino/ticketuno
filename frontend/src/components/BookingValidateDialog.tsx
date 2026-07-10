/**
 * Shows a running log of all validations.
 * "Show only changes" means: if the same QR code is scanned again
 * immediately (consecutive duplicate), the existing entry just gets
 * a re-scan counter bump instead of a new row — avoiding visual noise
 * when someone accidentally double-scans the same ticket.
 * Every genuinely different code always gets its own row.
 */

import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { alpha } from '@mui/material/styles';
import type { Theme } from '@mui/material/styles';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  DoNotDisturb as DoNotDisturbOnIcon,
  // QrCodeScanner as QrCodeScannerIcon,
  // DeleteSweep as DeleteSweepIcon,
} from '@mui/icons-material';
//import useNavigate from '@/hooks/useNavigate';
import { TicketValidationStatus, TicketValidationResult, TicketScanEntry } from '@ticketuno/shared/types/ticket';
import { QrCodeScanner, playSuccessSound, playFailureSound } from './QrCodeScanner';
import { ticketApi } from '@/services/api';
import { useDialog } from '@/contexts/DialogContext';
import { getErrorMessage } from '@ticketuno/shared/utils/misc';

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

// // ─── Status helpers ───────────────────────────────────────────────────────────
// const STATUS_META: Record<TicketValidationStatus, {
//   color: 'success' | 'error' | 'warning' | 'default';
//   icon: React.ReactElement;
//   bg: (theme: Theme) => string;
// }> = {
//   valid: {
//     color: 'success',
//     icon: <CheckCircleIcon fontSize="small" />,
//     bg: (t) => alpha(t.palette.success.main, 0.08)
//   },
//   already_used: {
//     color: 'warning',
//     icon: <DoNotDisturbOnIcon fontSize="small" />,
//     bg: (t) => alpha(t.palette.warning.main, 0.08)
//   },
//   invalid: {
//     color: 'error',
//     icon: <CancelIcon fontSize="small" />,
//     bg: (t) => alpha(t.palette.error.main, 0.08)
//   },
//   error: {
//     color: 'error',
//     icon: <CancelIcon fontSize="small" />,
//     bg: (t) => alpha(t.palette.error.main, 0.08)
//   },
// };

// function statusLabel(entry: TicketScanEntry, t: (k: string) => string): string {
//   const base = entry.pending ? t('Validating…') : entry.label;
//   return entry.duplicateCount > 1 ? `${base} (×${entry.duplicateCount})` : base;
// }

// ─── Props ────────────────────────────────────────────────────────────────────

interface BookingValidateProps {
  open: boolean;
  onClose: () => void;
}

// ─── Main dialog component ────────────────────────────────────────────────────

export const BookingValidateDialog: React.FC<BookingValidateProps> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const showDialog = useDialog();
  
  const [scannerOpen, setScannerOpen] = useState(true);
  const [entries, setEntries] = useState<TicketScanEntry[]>([]);
  //const [newEntryId, setNewEntryId] = useState<string | null>(null); // TODO: never read...
  const newEntryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived counters
  // const total = entries.reduce((n, e) => n + e.duplicateCount, 0);
  // const valid = entries.filter((e) => e.status === 'valid').reduce((n, e) => n + e.duplicateCount, 0);
  //const invalid = total - valid;

  // Re-open the inner scanner whenever the outer dialog opens
  React.useEffect(() => {
    if (open) setScannerOpen(true);
  }, [open]);

  // ── Mark entry as "new" (highlighted) for 1.5 s ──────────────────────────
  const markNew = (id: string) => {
    if (newEntryTimer.current) clearTimeout(newEntryTimer.current);
    // setNewEntryId(id);
    // newEntryTimer.current = setTimeout(() => setNewEntryId(null), 1500);
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
          content: t('This ticket is invalid: {{reason}}', { reason: result.label }),
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

  console.log("Entries:", entries); // TODO: how do we use entries?
  
  return (
    <QrCodeScanner
      open={scannerOpen}
      onScan={handleScan}
      //onClose={() => setScannerOpen(false)}
      onClose={onClose}
      scanCooldown={1500}
      enableSounds={false} // we play sounds ourselves after validation
    />
  );
};

export default BookingValidateDialog;
