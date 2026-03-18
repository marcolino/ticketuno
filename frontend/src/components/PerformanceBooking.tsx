import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  //EventSeat as EventSeatIcon,
  CheckCircle as CheckCircleIcon,
  ArrowBack as ArrowBackIcon,
  Cancel as CancelIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { eventApi, layoutApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/contexts/DialogContext';
//import { useSetup } from '@/contexts/SetupContext';
import useNavigate from '@/hooks/useNavigate';
import { useToast } from '@/contexts/ToastContext';
import { Event, EventPerformance } from '@/shared/types/event';
import { LayoutJSON } from '@/shared/types/layout';
import {
  generateSeats,
  SeatStatus,
  SpecialCondition,
  applyDisplayNumbers
} from '@/shared/types/layoutToSeats';
import { SeatData, PerformanceSeatsResponse } from '@/shared/types/performance'
import LayoutPreviewSVG, { SeatWithStatus } from './LayoutPreviewSVG';
import LayoutLegend from './LayoutLegend';
import { localizedDate } from '@/utils/misc';
import config from '@/shared/config';

const PerformanceBooking: React.FC = () => {
  const { t } = useTranslation();
  const { eventId, performanceId } = useParams<{ eventId: string; performanceId: string }>();
  const { user, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const showDialog = useDialog();
  const [forceLoadPerformance, setForceLoadPerformance] = useState(false);
  //const setup = useSetup();

  // ── Raw state — set by loadPerformance only ──────────────────────────────
  const [performance, setPerformance] = useState<EventPerformance | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [layout, setLayout] = useState<LayoutJSON | null>(null);
  const [seatStatusMap, setSeatStatusMap] = useState<Map<string, SeatData>>(new Map());
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Helper ───────────────────────────────────────────────────────────────
  const flattenSeatsData = useCallback((data: PerformanceSeatsResponse): SeatData[] => {
    const allSeats: SeatData[] = [];
    Object.values(data).forEach(section => {
      Object.values(section).forEach(rowArray => {
        allSeats.push(...rowArray);
      });
    });
    return allSeats;
  }, []);

  // ── Load — only sets raw state, no seat derivation here ─────────────────
  const loadPerformance = useCallback(async () => {
    if (!eventId || !performanceId) {
      setError(t('Missing event or performance ID'));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const perfResponse = await eventApi.getPerformance(eventId, performanceId);
      setPerformance(perfResponse.data);

      const eventResponse = await eventApi.getEventById(eventId);
      const eventData = eventResponse.data;
      setEvent(eventData);

      if (!eventData.theater?.currentLayoutId) {
        throw new Error('Theater layout not found');
      }

      const layoutResponse = await layoutApi.getLayoutById(eventData.theater.currentLayoutId);
      const layoutData: LayoutJSON = JSON.parse(layoutResponse.data.json);
      setLayout(layoutData);

      const seatsResponse = await eventApi.getPerformanceSeats(eventId, performanceId);
      const allSeatsData = flattenSeatsData(seatsResponse.data);
      setSeatStatusMap(new Map(allSeatsData.map(s => [s.seatId, s])));

      setError(null);
    } catch (err: any) {
      console.error('Error loading performance:', err);
      setError(err.response?.data?.error || err.message || t('Failed to load performance'));
    } finally {
      setLoading(false);
    }
  }, [eventId, performanceId, t, flattenSeatsData, forceLoadPerformance]);

  useEffect(() => {
    if (eventId && performanceId) loadPerformance();
  }, [eventId, performanceId, loadPerformance]);

  // ── Step 1: merge layout positions + specialConditions ───────────────────
  const generatedSeats = useMemo(() => {
    if (!layout) return [];
    const raw = generateSeats(layout);
    const conditions = layout.seatConditions || {};
    // return raw.map(seat => ({
    //   ...seat,
    //   specialCondition: conditions[seat.seatId] as SpecialCondition | undefined,
    // }));
    return applyDisplayNumbers(raw, conditions).map(seat => ({
      ...seat,
      specialCondition: conditions[seat.seatId] as SpecialCondition | undefined,
    }));
  }, [layout]);

  // ── Step 2: merge with live booking statuses from API ────────────────────
  const seats: SeatWithStatus[] = useMemo(() => {
    return generatedSeats.map(seat => {
      const statusData = seatStatusMap.get(seat.seatId);
      return {
        ...seat,
        status: (statusData?.status as SeatStatus) || 'available',
      };
    });
  }, [generatedSeats, seatStatusMap]);

  // ── Seat interaction ─────────────────────────────────────────────────────
  const handleSeatClick = useCallback(async (seatId: string, currentStatus?: SeatStatus) => {
    if (!isAuthenticated) {
      await showDialog({
        title: t('Login Required'),
        content: t('You need to login to book seats. Please login or register to continue.'),
        onConfirm: () => navigate(`${location.pathname}?login=true`),
        cancelText: 'Cancel',
        confirmText: 'Login',
        shrinkToContent: true,
      });
      return;
    }

    if (currentStatus === 'booked' || currentStatus === 'reserved') {
      toast.error(t('This seat is not available'));
      return;
    }

    setSelectedSeats(prev => {
      const next = new Set(prev);
      if (next.has(seatId)) next.delete(seatId);
      else next.add(seatId);
      return next;
    });
  }, [isAuthenticated, t, toast, navigate, showDialog]);

  const getSeatStatus = useCallback((seat: SeatWithStatus): SeatStatus => {
    //if (seat.status === 'booked' || seat.status === 'reserved') return seat.status;
    // Important: we do show users the 'reserved' (by other users) seats as 'booked', to reduce confusion...
    if (seat.status === 'booked' || seat.status === 'reserved') return 'booked'; 
    if (selectedSeats.has(seat.seatId)) return 'selected';
    return 'available';
  }, [selectedSeats]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const totalPrice = useMemo(() =>
    selectedSeats.size * (event?.baseTicketPrice || 0),
    [selectedSeats.size, event?.baseTicketPrice]
  );

  const activeConditions = useMemo(() => {
    const found = new Set<SpecialCondition>();
    seats.forEach(seat => { if (seat.specialCondition) found.add(seat.specialCondition); });
    return [...found];
  }, [seats]);

  // ── Booking ──────────────────────────────────────────────────────────────
  const confirmBooking = async () => {
    if (!eventId || !performanceId) {
      toast.error(t('Missing event or performance ID'));
      return;
    }
    try {
      const responseBooking = await eventApi.bookPerformance(eventId, performanceId, Array.from(selectedSeats));
      const booking = responseBooking.data;
      console.log("****************** BOOKING:", booking);

      await showDialog({
        title: '🏁' + ' ' + t('Successfully booked {{count}} seats', { count: selectedSeats.size }),
        content:
          t('You will soon receive an email with booking confirmation.', { count: selectedSeats.size }) + '\n\n' +
          (config.app.reservations.ticketing.useQrcode ? t('The email will have attached the real ticket with a QR code: feel free to print it or show it at the theater on your mobile device.') : '')
        ,
        onConfirm: () => navigate('/'),
        confirmText: 'Ok',
        //shrinkToContent: false,
      });

      //audit('booking', 'success', ...);

      setSelectedSeats(new Set());
      //await loadPerformance();
    } catch (err: any) {
      console.error('Booking error:', err);
      if (err.originalError && err.originalError.unavailableSeats?.length > 0) {
        await showDialog({
          title: t('Attention'),
          content:
            t('These seats are not available anymore:\n') +
            JSON.stringify(err.originalError.unavailableSeats)
          ,
          //onConfirm: () => navigate('/'),
          //cancelText: 'Cancel',
          confirmText: 'Ok',
          //shrinkToContent: true,
        });
        // toast.warning(t('These seats are not available anymore: ' +
        //   JSON.stringify(err.originalError.unavailableSeats))
        // );
        // Reset all reserved seats
        setSelectedSeats(new Set());

        // Reload seats to reflect current booking situation
        setForceLoadPerformance(true);

        return;
      }
      toast.error(err.response?.data?.error || err.message || t('Booking failed'));

      //audit('booking', 'error', ...);
    }
  };

  const handleConfirmBooking = () => {
    showDialog({
      title: t('Confirm Booking'),
      content: (
        <Box>
          <Typography>
            {t('You are about to book {{count}} seats', { count: selectedSeats.size })}
            &nbsp;{t('for')} {localizedDate({ dateString: performance?.performanceDate, locale: user!.language })}:
          </Typography>
          <Paper sx={{ p: 1, bgcolor: 'grey.100', my: 2 }}>
            {Array.from(selectedSeats).join(', ')}
          </Paper>
          {config.app.reservations.purchases.gateway !== 'free' && (
            <Typography variant="h6">
              {t('Total amount')}: ${totalPrice.toFixed(2)}
            </Typography>
          )}
        </Box>
      ),
      cancelText: t('Cancel'),
      confirmText: t('Confirm Booking'),
      onConfirm: confirmBooking,
      showCloseIcon: true,
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────
  //const whiteSeatIcon = <EventSeatIcon sx={{ color: 'white', fill: 'white', stroke: 'white' }} />;

  if (loading) return null;

  if (error || !layout || !performance) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error || t('Performance not found')}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(`/event/${eventId}`)} sx={{ mt: 2 }}>
          {t('Back to Event')}
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="xl" sx={{ px: { xs: 0, sm: 4 }, mt: { xs: 2, sm: 4 }, mb: { xs: 2, sm: 4 } }}>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 } }}>

          {/* Header */}
          <Box
            sx={{
              mb: { xs: 2, sm: 4 },
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start' // aligns icon to top
            }}
          >
            <Box>
              <Typography variant={isMobile ? 'h5' : 'h4'} gutterBottom>
                {t('Select Your Seats')}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {t('Performance on')} {new Date(performance.performanceDate).toLocaleDateString()} {performance.startTime}
              </Typography>
            </Box>
            <IconButton 
              onClick={() => navigate(-1)}
              aria-label="close"
              size="large"
              sx={{ mt: -1, mr: -1 }} // optional fine‑tuning to align with paper edge
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Layout */}
          <Box sx={{
            width: '100%', mb: 4,
            overflowX: 'auto', overflowY: 'hidden',
            bgcolor: '#f5f5f5', borderRadius: 2,
          }}>
            <Box sx={{ minWidth: 600, height: '100%' }}>
              <LayoutPreviewSVG
                layout={layout}
                seats={seats}
                interactive={true}
                bookingView={true}
                onSeatClick={handleSeatClick}
                getSeatStatus={getSeatStatus}
              />
              <LayoutLegend
                conditions={activeConditions}
                showStatusLegend={true}
                isEditView={false}
              />
            </Box>
          </Box>

          {/* Booking summary */}
          {selectedSeats.size > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
              <Button
                variant="outlined" color="inherit"
                onClick={() => { setSelectedSeats(new Set()); navigate(-1); }}
                startIcon={<CancelIcon />}
                sx={{ mx: 2 }}
              >
                {t('Cancel')}
              </Button>
              <Button
                variant="contained"
                onClick={handleConfirmBooking}
                startIcon={<CheckCircleIcon />}
              >
                {t('Book {{ count }} seats', { count: selectedSeats.size })}
              </Button>
            </Box>
          )}

        </Paper>
      </Container>
    </Box>
  );
};

export default PerformanceBooking;
