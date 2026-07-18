import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Paper,
  Box,
  Button,
  IconButton,
  Chip,
  //Divider,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ArrowBack,
  Cancel,
  Close,
  ConfirmationNumber,
  QrCodeScanner,
} from '@mui/icons-material';
import useNavigate from '@/hooks/useNavigate';
import Title from '@/components/Title';
import Alert from './Alert';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/contexts/DialogContext';
import { toast } from '@/contexts/ToastContext';
import { useSetup } from '@/contexts/SetupContext';
import { bookingApi, userApi } from '@/services/api';
import { getErrorMessage, formatInstant, formatWallClock, formatMoney } from '@ticketuno/shared/utils/misc';
import { BookingDetail, BookingStatus } from '@ticketuno/shared/types/bookings';
import config from '@/config';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<BookingStatus, 'success' | 'error' | 'warning' | 'default'> = {
  confirmed: 'success',
  canceled: 'error',
  refunded: 'warning',
  pending_payment: 'warning',
};

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
}
const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
  <Box sx={{ display: 'flex', gap: 2, py: 0.1, alignItems: 'flex-start' }}>
    <Typography variant="body2" color="text.secondary" sx={{ minWidth: { xs: 80, sm: 150 }, flexShrink: 0 }}>
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
  <Paper variant="outlined" sx={{ px: 2, py: 1 }}>
    <Typography variant="overline" sx={{ display: 'block', color: 'primary.contrastText', bgcolor: 'primary.light', px: 2, mb: 0.5, fontStyle: 'oblique', borderRadius: 0.5 }}>
      {title}
    </Typography>
    <Box sx={{ px: 2 }}>
      {children}
    </Box>
  </Paper>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const BookingEdit: React.FC = () => {
  const { id: bookingId } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { user, isOperator } = useAuth();
  const navigate = useNavigate();
  const showDialog = useDialog();
  const theme = useTheme();
  const setup = useSetup();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [scannedBy, setScannedBy] = useState<string | null>(null);
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

  useEffect(() => {
    if (!booking || !booking.scannedBy) return;
    (async () => {
      try {
        const response = await userApi.getProfile(booking.scannedBy ?? undefined);
        const user = response.data;
        setScannedBy(`${user.firstName} ${user.lastName}`);
      } catch (err) {
        setError(getErrorMessage(err));
      }
    })();
  }, [booking?.scannedBy]);

  // -------------------------------------------------------------------------
  // Cancel
  // -------------------------------------------------------------------------

  const handleCancel = () => {
    if (!booking) return;

    showDialog({
      title: t('Cancel ticket'),
      // TODO: remove the following refund note when refunds will be handled...
      content: t('\
Are you sure to cancel ticket {{ref}} for event "{{event}}" at teather "{{theaterName}}" \
for seat "{{seatSectionName}} {{seatRowId}}-{{seatNumber}}" on {{date}} ?\n\n\
The seat will be released and made available again.\n\n\
Note that refund is not handled yet.\n\
',
        {
          ref: booking.bookingRef,
          event: booking.eventTitle,
          theaterName: booking.theaterName,
          date: formatWallClock(booking.performanceDate, user!.language),
          seatSectionName: booking.seat!.sectionName,
          seatRowId: booking.seat!.rowId,
          seatNumber: booking.seat!.seatNumber,
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

  const handleMarkUsed = () => {
    if (!booking) return;

    showDialog({
      title: t('Mark as used'),
      content: t(
        'Manually mark ticket {{ref}} as used? Only do this when the QR scanner cannot be used.',
        { ref: booking.bookingRef }
      ),
      confirmText: t('Mark as used'),
      cancelText: t('Cancel'),
      mode: 'warning',
      onConfirm: async () => {
        setSaving(true);
        try {
          await bookingApi.markScanned(booking.id);
          setBooking((prev) =>
            prev
              ? { ...prev, scannedAt: new Date().toISOString(), scannedBy }
              : null
          );
          toast.success(t('Ticket marked as used'));
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

  if (!booking) return;
  // if (!booking) {
  //   return (
  //     <Container maxWidth="sm" sx={{ mt: 4 }}>
  //       <Alert severity="info">{t('Loading…')}</Alert>
  //     </Container>
  //   );
  // }

  const isConfirmed = booking.status === 'confirmed';
  const isScanned = !!booking.scannedAt;
  const language = user?.language ?? config.app.defaultLanguage;
  const currency = booking.seat!.eventCurrency ?? config.app.defaultCurrency;
  const price = booking.seat!.price != null ? booking.seat!.price : booking.seat!.eventPrice;

  // -------------------------------------------------------------------------
  // Render — main
  // -------------------------------------------------------------------------

  console.log("BOOKING:", booking);

  return (
    <Container maxWidth="sm" sx={{ mt: 4, mb: 4, px: { xs: 0, sm: 2 } }}>
      <Paper elevation={3} sx={{ p: isXs ? 2 : 4 }}>

        {/* ── Header ── */}
        <Box sx={{
          display: 'flex', alignItems: 'flex-start',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2,
        }}>
          <Title icon={<ConfirmationNumber />}>{t('Ticket')}</Title>
          <IconButton
            onClick={() => navigate(-1)}
            disabled={saving}
            aria-label={t('Close')}
            size="small"
            sx={{ color: 'text.primary' }}
          >
            <Close />
          </IconButton>
        </Box>

        {/* Ticket ref pill + status chip */}
        <Box sx={{
          mb: 3, display: 'flex', flexWrap: 'wrap',
          alignItems: 'center', rowGap: 1, columnGap: 2,
        }}>
          <Box sx={{
            px: 2, py: 1, borderRadius: 1,
            bgcolor: 'action.hover', display: 'flex', alignItems: 'center', gap: 1,
          }}>
            <Typography variant="body2" color="info">{t('Ref.')}:</Typography>
            <Typography variant="body1" sx={{ fontFamily: 'monospace', fontWeight: 500, letterSpacing: 1.5 }}>
              {booking.bookingRef}
            </Typography>
          </Box>
          <Chip
            label={t(booking.status)}
            color={STATUS_COLORS[booking.status] ?? 'default'}
            sx={{ ml: 'auto' }}
          />
        </Box>

        {/* Scanned banner */}
        {isScanned && (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {!isOperator && (
                <>
                  {t('Used on {{time}}', {
                    time: formatInstant(booking.scannedAt ?? '', user!.language ?? config.app.defaultLanguage, setup.app.timezone),
                  })}
                </>
              )}
              {isOperator && (
                <>
                  {t('Scanned on {{time}} by {{by}}', {
                    time: formatInstant(booking.scannedAt ?? '', user!.language ?? config.app.defaultLanguage, setup.app.timezone),
                  })}
                </>
              )}
            </Box>
          </Alert>
        )}

        <Stack spacing={1}>

          {/* ── Customer ── */}
          {isOperator && (
            <SectionCard title={t('Customer')}>
              <InfoRow label={t('Name')} value={`${booking.userFirstName} ${booking.userLastName}`} />
              <InfoRow label={t('Email')} value={booking.userEmail} />
              {booking.userPhone && (
                <InfoRow label={t('Phone')} value={booking.userPhone} />
              )}
            </SectionCard>
          )}

          {/* ── Event / Performance ── */}
          <SectionCard title={t('Event & Performance')}>
            <InfoRow label={t('Event')} value={booking.eventTitle} />
            <InfoRow label={t('Theater')} value={booking.theaterName} />
            <InfoRow label={t('Date')} value={formatWallClock(booking.performanceDate, user!.language)} />
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
                value={price != null ? formatMoney(price, language, currency) : '—'}
                  // booking.seat.price != null
                  //   ? `${booking.currency} ${booking.seat.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                  //   : '—'
              />
            </SectionCard>
          )}

          {/* ── Dates ── */}
          <SectionCard title={t('Dates')}>
            <InfoRow label={t('Booked at')} value={formatInstant(booking.bookedAt, user?.language ?? config.app.defaultLanguage, setup.app.timezone)} />
            {booking.canceledAt && (
              <InfoRow label={t('Canceled at')} value={formatInstant(booking.canceledAt, user?.language ?? config.app.defaultLanguage, setup.app.timezone)} />
            )}
            {booking.updatedAt && (booking.updatedAt.slice(0, 16) !== booking.bookedAt.slice(0, 16)) && (
              <InfoRow label={t('Updated at')} value={formatInstant(booking.updatedAt, user?.language ?? config.app.defaultLanguage, setup.app.timezone)} />
            )}
          </SectionCard>

          {/* <Divider sx={{ pt: 2, pb: 4 }} /> */}

          {/* ── Action buttons ── */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', pt: 3 }}>

            {/* Manual scan override — only if operator, and ticket is confirmed and not yet scanned */}
            {isOperator && isConfirmed && !isScanned && (
              <Button
                variant="contained"
                color="info"
                startIcon={<QrCodeScanner />}
                onClick={handleMarkUsed}
                disabled={saving}
              >
                {t('Mark as used')}
              </Button>
            )}

            {/* Cancel — only if still confirmed */}
            {isOperator && isConfirmed && (
              <Button
                variant="contained"
                color="error"
                startIcon={<Cancel />}
                onClick={handleCancel}
                disabled={saving}
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
