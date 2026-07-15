import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Paper,
  Box,
  Button,
  Chip,
  Divider,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ArrowBack,
  Cancel,
  ConfirmationNumber,
  QrCodeScanner,
} from '@mui/icons-material';
import useNavigate from '@/hooks/useNavigate';
import Title from '@/components/Title';
import Alert from './Alert';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/contexts/DialogContext';
import { toast } from '@/contexts/ToastContext';
import { bookingApi } from '@/services/api';
import { getErrorMessage, formatFullDate } from '@ticketuno/shared/utils/misc';
import { BookingDetail, BookingStatus } from '@ticketuno/shared/types/bookings';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<BookingStatus, 'success' | 'error' | 'warning' | 'default'> = {
  confirmed: 'success',
  canceled: 'error',
  refunded: 'warning',
  pending_payment: 'warning',
};

// function fmtDate(iso: string | null | undefined): string {
//   if (!iso) return '—';
//   return new Date(iso).toLocaleDateString(undefined, {
//     year: 'numeric', month: 'long', day: 'numeric',
//   });
// }

// function fmtDateTime(iso: string | null | undefined): string {
//   if (!iso) return '—';
//   return new Date(iso).toLocaleString(undefined, {
//     year: 'numeric', month: 'short', day: 'numeric',
//     hour: '2-digit', minute: '2-digit',
//   });
// }

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
}
const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
  <Box sx={{ display: 'flex', gap: 2, py: 0.75, alignItems: 'flex-start' }}>
    <Typography variant="body2" color="text.secondary" sx={{ minWidth: { xs: 90, sm: 200 }, flexShrink: 0 }}>
      {label}
    </Typography>
    <Typography variant="body2" sx={{
      fontWeight: 500,
      overflowWrap: 'break-word',
      wordBreak: 'break-word',
      maxWidth: '100%',
    }}>
      {value ?? '—'}
    </Typography>
  </Box>
);

interface SectionCardProps {
  title: string;
  children: React.ReactNode;
}
const SectionCard: React.FC<SectionCardProps> = ({ title, children }) => (
  <Paper variant="outlined" sx={{ p: 2 }}>
    <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
      {title}
    </Typography>
    {children}
  </Paper>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const BookingEdit: React.FC = () => {
  const { id: bookingId } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const showDialog = useDialog();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // -------------------------------------------------------------------------
  // Load
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!bookingId) return;
    (async () => {
      try {
        const response = await bookingApi.getById(bookingId);
        setBooking(response.data);
      } catch (err) {
        setError(getErrorMessage(err));
      }
    })();
  }, [bookingId]);

  // -------------------------------------------------------------------------
  // Cancel
  // -------------------------------------------------------------------------

  const handleCancel = () => {
    if (!booking) return;

    showDialog({
      title: t('Cancel ticket'),
      content: t(
        'Cancel ticket {{ref}} for "{{event}}" on {{date}}? The seat will be released and made available again.',
        {
          ref: booking.bookingRef,
          event: booking.eventTitle,
          //date: fmtDate(booking.performanceDate),
          date: formatFullDate(booking.performanceDate, user!.language),
        }
      ),
      confirmText: t('Cancel ticket'),
      cancelText: t('Back'),
      mode: 'warning',
      onConfirm: async () => {
        setSaving(true);
        try {
          await bookingApi.cancel(booking.id);
          setBooking((prev) =>
            prev ? { ...prev, status: 'canceled', canceledAt: new Date().toISOString() } : null
          );
          toast.success(t('Ticket canceled successfully'));
        } catch (err) {
          toast.error(getErrorMessage(err));
        } finally {
          setSaving(false);
        }
      },
    });
  };

  // -------------------------------------------------------------------------
  // Mark as scanned (manual operator override)
  // -------------------------------------------------------------------------

  const handleMarkScanned = () => {
    if (!booking) return;

    showDialog({
      title: t('Mark as scanned'),
      content: t(
        'Manually mark ticket {{ref}} as used? Only do this when the QR scanner cannot be used.',
        { ref: booking.bookingRef }
      ),
      confirmText: t('Mark as scanned'),
      cancelText: t('Cancel'),
      mode: 'warning',
      onConfirm: async () => {
        setSaving(true);
        try {
          await bookingApi.markScanned(booking.id);
          setBooking((prev) =>
            prev
              ? { ...prev, scannedAt: new Date().toISOString(), scannedBy: 'operator' }
              : null
          );
          toast.success(t('Ticket marked as scanned'));
        } catch (err) {
          toast.error(getErrorMessage(err));
        } finally {
          setSaving(false);
        }
      },
    });
  };

  // -------------------------------------------------------------------------
  // Render — error / loading states
  // -------------------------------------------------------------------------

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mt: 2 }}>
          {t('Back')}
        </Button>
      </Container>
    );
  }

  if (!booking) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Alert severity="info">{t('Loading…')}</Alert>
      </Container>
    );
  }

  const isConfirmed = booking.status === 'confirmed';
  const isScanned   = !!booking.scannedAt;

  // -------------------------------------------------------------------------
  // Render — main
  // -------------------------------------------------------------------------

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4, px: { xs: 0, sm: 2 } }}>
      <Paper elevation={3} sx={{ p: isXs ? 2 : 4 }}>

        {/* ── Header ── */}
        <Box sx={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2,
        }}>
          <Title icon={<ConfirmationNumber />}>{t('Ticket')}</Title>
          <Chip
            label={t(booking.status)}
            color={STATUS_COLORS[booking.status] ?? 'default'}
          />
        </Box>

        {/* Ticket ref — prominent pill */}
        <Box sx={{
          mb: 3, px: 2, py: 1.5, borderRadius: 1,
          bgcolor: 'action.hover', display: 'inline-flex', alignItems: 'center', gap: 2,
        }}>
          <Typography variant="body2" color="text.secondary">{t('Reference')}:</Typography>
          <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 500, letterSpacing: 2 }}>
            {booking.bookingRef}
          </Typography>
        </Box>

        {/* Scanned banner */}
        {isScanned && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* <CheckCircleOutline fontSize="small" /> */}
              {t('Scanned on {{time}} by {{by}}', {
                //time: fmtDateTime(booking.scannedAt),
                time: formatFullDate(booking.scannedAt ?? '', user!.language, { hour: '2-digit', minute: '2-digit' }),
                by: booking.scannedBy ?? t('unknown'),
              })}
            </Box>
          </Alert>
        )}

        <Stack spacing={2}>

          {/* ── Event / Performance ── */}
          <SectionCard title={t('Event & Performance')}>
            <InfoRow label={t('Event')} value={booking.eventTitle} />
            <InfoRow label={t('Theater')} value={booking.theaterName} />
            <InfoRow label={t('Date')} value={formatFullDate(booking.performanceDate, user!.language)} />
            <InfoRow label={t('Start time')} value={booking.startTime} />
            {booking.endTime && (
              <InfoRow label={t('End time')} value={booking.endTime} />
            )}
          </SectionCard>

          {/* ── Seat ── */}
          {booking.seat && (
            <SectionCard title={t('Seat')}>
              <InfoRow label={t('Section')} value={booking.seat.sectionName} />
              <InfoRow label={t('Row')} value={booking.seat.rowId} />
              <InfoRow label={t('Seat')} value={booking.seat.seatNumber} />
              <InfoRow
                label={t('Price')}
                value={
                  booking.seat.price != null
                    ? `${booking.currency} ${booking.seat.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                    : '—'
                }
              />
            </SectionCard>
          )}

          {/* ── Customer ── */}
          <SectionCard title={t('Customer')}>
            <InfoRow label={t('Name')} value={`${booking.userFirstName} ${booking.userLastName}`} />
            <InfoRow label={t('Email')} value={booking.userEmail} />
            {booking.userPhone && (
              <InfoRow label={t('Phone')} value={booking.userPhone} />
            )}
          </SectionCard>

          {/* ── Dates ── */}
          <SectionCard title={t('Dates')}>
            <InfoRow label={t('Booked at')} value={formatFullDate(booking.bookedAt, user!.language, { hour: '2-digit', minute: '2-digit' })} />
            {booking.canceledAt && (
              <InfoRow label={t('Canceled at')} value={formatFullDate(booking.canceledAt, user!.language, { hour: '2-digit', minute: '2-digit' })} />
            )}
            {booking.updatedAt && booking.updatedAt !== booking.bookedAt && (
              <InfoRow label={t('Updated at')} value={formatFullDate(booking.updatedAt, user!.language, { hour: '2-digit', minute: '2-digit' })} />
            )}
          </SectionCard>

          <Divider />

          {/* ── Action buttons ── */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>

            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => navigate(-1)}
              disabled={saving}
              sx={{ ml: 'auto' }}
            >
              {t('Back')}
            </Button>

            {/* Manual scan override — only if confirmed and not yet scanned */}
            {isConfirmed && !isScanned && (
              <Button
                variant="outlined"
                color="info"
                startIcon={<QrCodeScanner />}
                onClick={handleMarkScanned}
                disabled={saving}
                sx={{ ml: 'auto' }}
              >
                {t('Mark as scanned')}
              </Button>
            )}

            {/* Cancel — only if still confirmed, pushed right */}
            {isConfirmed && (
              <Button
                variant="contained"
                color="error"
                startIcon={<Cancel />}
                onClick={handleCancel}
                disabled={saving}
                sx={{ ml: 'auto' }}
              >
                {saving ? t('Canceling…') : t('Cancel ticket')}
              </Button>
            )}

          </Box>

        </Stack>
      </Paper>
    </Container>
  );
};

export default BookingEdit;
