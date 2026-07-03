import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  //ArrowBack as ArrowBackIcon,
  Cancel as CancelIcon,
  Close as CloseIcon,
  //ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import Alert from './Alert';
import ExpandableText from './ExpandableText';
import { eventApi, bookingApi, layoutApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/contexts/DialogContext';
import useNavigate from '@/hooks/useNavigate';
import { useToast } from '@/contexts/ToastContext';
import { useSetup } from '@/contexts/SetupContext';
import { EventWithDetails, EventPerformance } from '@ticketuno/shared/types/event';
import { LayoutJSON } from '@ticketuno/shared/types/layout';
import { generateSeats } from '@ticketuno/shared/utils/layoutToSeats';
import { SeatWithStatus } from '@ticketuno/shared/types/layout';
import { SeatStatus, SpecialCondition } from '@ticketuno/shared/types/seat';
import { SeatData, PerformanceSeatsResponse } from '@ticketuno/shared/types/performance';
import LayoutPreviewSVG from './LayoutPreviewSVG';
import LayoutLegend from './LayoutLegend';
import { localizedDate } from '@/utils/misc';
import { sharedConfig as config } from '@ticketuno/shared';
import { getErrorMessage } from '@ticketuno/shared/utils/misc';

const PerformanceBooking: React.FC = () => {
  const { t } = useTranslation();
  const { eventId, performanceId } = useParams<{ eventId: string; performanceId: string }>();
  const { user, isAuthenticated, loading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const theme = useTheme();
  const setup = useSetup();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const showDialog = useDialog();
  const [forceLoadPerformance, setForceLoadPerformance] = useState(false);

  // Raw state
  const [performance, setPerformance] = useState<EventPerformance | null>(null);
  //const [event, setEvent] = useState<Event | null>(null);
  const [event, setEvent] = useState<EventWithDetails | null>(null);
  //const [theater, setTheater] = useState<Theater | null>(null);
  const [layout, setLayout] = useState<LayoutJSON | null>(null);
  const [seatStatusMap, setSeatStatusMap] = useState<Map<string, SeatData>>(new Map());
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Helper: flatten seats from API response
  const flattenSeatsData = useCallback((data: PerformanceSeatsResponse): SeatData[] => {
    const allSeats: SeatData[] = [];
    Object.values(data).forEach(section => {
      Object.values(section).forEach(rowArray => {
        allSeats.push(...rowArray);
      });
    });
    return allSeats;
  }, []);

  // Load performance, event, layout, and seat statuses
  const loadPerformance = useCallback(async () => {
    if (!eventId || !performanceId) {
      setError(t('Missing event or performance ID'));
      //setLoading(false);
      return;
    }

    try {
      //setLoading(true);
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
    } catch (error) {
      setError(t('Failed to load performance: {{error}}', getErrorMessage(error)));
    // } finally {
    //   setLoading(false);
    }
  }, [eventId, performanceId, t, flattenSeatsData, forceLoadPerformance]);

  useEffect(() => {
    if (eventId && performanceId) loadPerformance();
  }, [eventId, performanceId, loadPerformance]);

  // Step 1: generate all seats from layout and filter out absent ones
  const generatedSeats = useMemo(() => {
    if (!layout) return [];
    const raw = generateSeats(layout);
    const conditions = layout.seatConditions || {};

    // Filter out seats that are marked as 'absent'
    //return raw.filter(seat => conditions[seat.seatId] !== 'absent').map(seat => ({
    return raw.map(seat => ({
      ...seat,
      specialCondition: conditions[seat.seatId] as SpecialCondition | undefined,
    }));
  }, [layout]);

  // Map seatId to human-readable label (section-row-seatNumber)
  const seatLabelById = useMemo(() => {
    const map = new Map<string, string>();
    generatedSeats.forEach(seat => {
      map.set(seat.seatId, `${seat.sectionName}-${seat.rowId}-${seat.seatNumber}`);
    });
    return map;
  }, [generatedSeats]);

  // Step 2: merge with live booking statuses from API
  const seats: SeatWithStatus[] = useMemo(() => {
    return generatedSeats.map(seat => {
      const statusData = seatStatusMap.get(seat.seatId);
      return {
        ...seat,
        status: (statusData?.status as SeatStatus) || 'available',
      };
    });
  }, [generatedSeats, seatStatusMap]);

  // Seat interaction
  const handleSeatClick = useCallback(async (seatId: string, currentStatus?: SeatStatus) => {
    if (!isAuthenticated) {
      const currentPath = location.pathname + location.search + location.hash;
      localStorage.setItem('redirectAfterLogin', currentPath);
      await showDialog({
        title: t('Login Required'),
        content: t('You need to login to book seats. Please login or register to continue.'),
        onConfirm: () => navigate(`${location.pathname}?login=true`),
        cancelText: 'Cancel',
        confirmText: 'Login',
        shrinkToContent: true,
        mode: 'warning',
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
    if (seat.status === 'booked' || seat.status === 'reserved') return 'booked';
    if (selectedSeats.has(seat.seatId)) return 'selected';
    return 'available';
  }, [selectedSeats]);

  // Derived data
  const totalPrice = useMemo(() =>
    selectedSeats.size * (event?.baseTicketPrice || 0),
    [selectedSeats.size, event?.baseTicketPrice]
  );

  const activeConditions = useMemo(() => {
    const found = new Set<SpecialCondition>();
    seats.forEach(seat => { if (seat.specialCondition) found.add(seat.specialCondition); });
    return [...found];
  }, [seats]);

  // Booking logic
  const confirmBooking = async () => {
    if (!eventId || !performanceId) {
      toast.error(t('Missing event or performance ID'));
      return;
    }
    try {
      // await eventApi.bookPerformance(eventId, performanceId, Array.from(selectedSeats));
      const response = await bookingApi.create(performanceId, Array.from(selectedSeats));
      const { paymentMethod, paymentStatus, checkoutUrl, bookingRefs } = response.data;

      let message = null;
      switch (paymentMethod) {
        case 'stripe':
          console.log('***** paymentStatus:', paymentStatus);
          console.log('***** bookingRefs:', bookingRefs);
          if (!checkoutUrl) {
            throw new Error(t('Stripe checkout page not available!'));
          } else { // checkout url present: redirect to Stripe checkout page
            window.location.href = checkoutUrl;
          }
          break;
        case 'free':
          message = t('You will soon receive an email with booking confirmation') + '.\n\n' +
            (config.app.reservations.ticketing.useQrcode ? t('The email will have attached the real ticket with a QR code: show it at the theater.') : '') + '.\n\n' +
            t('There is nothing to pay, event is free') + '.'
          ;
          // falls through
        case 'cash':
          message = t('You will soon receive an email with booking confirmation') + '.\n\n' +
            (config.app.reservations.ticketing.useQrcode ? t('The email will have attached the real ticket with a QR code: show it at the theater.') : '') + '.\n\n' +
            t('You will pay your ticket at the theater\'s cashes') + '.\n\n' +
            t('Total amount is') + ' ' + totalPrice.toFixed(2) + ' ' + setup.app.currency + '.'
          ;
          
          await showDialog({
            title: '🏁' + ' ' + t('Successfully booked {{count}} seats', { count: selectedSeats.size }),
            content: message,
            onConfirm: () => navigate('/'),
            confirmText: 'Ok',
            mode: 'success',
          });
          break;
        default: // This should not happen
          throw new Error(t('Internal error: unforeseen payment method {{paymentMethod}}', { paymentMethod }));
      }

      

      setSelectedSeats(new Set());
    } catch (error: any) {
      //console.error('Booking error:', error);
      if (error.originalError && error.originalError.unavailableSeats?.length > 0) {
        await showDialog({
          title: t('Attention'),
          content:
            t('These seats are not available anymore:\n') +
            error.originalError.unavailableSeats
              .map((seatId: string) => seatLabelById.get(seatId) ?? seatId)
              .join(', '),
          confirmText: 'Ok',
        });
        setSelectedSeats(new Set());
        setForceLoadPerformance(true);
        return;
      }
      toast.error(getErrorMessage(error));
    }
  };

  const handleConfirmBooking = () => {
    const selectedLabels = Array.from(selectedSeats)
      .map(seatId => seatLabelById.get(seatId) ?? seatId)
      .sort();

    showDialog({
      title: t('Confirm Booking'),
      content: (
        <Box>
          <Typography>
            {t('You are about to book {{count}} seats', { count: selectedSeats.size })}
            &nbsp;{t('for')} {localizedDate({ dateString: performance?.performanceDate, locale: user!.language })}:
          </Typography>
          <Box sx={{ maxHeight: '40vh', overflowY: 'auto', mt: 1 }}>
            <Paper sx={{ p: 1, my: 2 }}>
              {selectedLabels.join('\n')}
            </Paper>
          </Box>
          {setup.payments.gateway === 'stripe' && (
          <Typography variant="h6" color="primary">
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {t('You will be redirected to Stripe to complete the payment')}
              {t('Total amount')}: {totalPrice.toFixed(2)} {setup.app.currency}
            </Typography>
          </Typography>
        )}
          {setup.payments.gateway === 'free' && (
             <Typography variant="h6">
              {t('Nothing to pay, event is free')}
            </Typography>
          )}
          {setup.payments.gateway === 'cash' && (
             <Typography variant="h6">
              {t('Total amount')}: {totalPrice.toFixed(2)} {setup.app.currency}.
              {t('The money will be collected at the theater\'s cash')}
            </Typography>
          )}
          {setup.payments.gateway !== 'free' && (
            <Typography variant="h6">
              {t('Total amount')}: {totalPrice.toFixed(2)} {setup.app.currency}
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

  if (loading) {
    return;
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
              alignItems: 'flex-start'
            }}
          >
            <Box>
              <Typography variant={isMobile ? 'h5' : 'h4'} gutterBottom>
                {t('Select Your Seats')}
              </Typography>
              {event && (
                <Box>
                  <Typography variant="body1" color="text.secondary" component="div">
                    {t('Theater')} {event.theater?.name}
                    {event.theater?.description ? ' - ' : ''} {event.theater?.description}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" component="div">
                    {t('Event')}: {event.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" component="div">
                    {event.description && (
                        <ExpandableText text={t('Description') + ':' + ' ' + event.description} variant="body1" maxLength={120} lessText={t('show less')} />
                      )
                    }
                  </Typography>
                  {performance && (
                    <Typography variant="body1" color="text.secondary" component="div">
                      {t('Performance on')} {new Date(performance.performanceDate).toLocaleDateString()}
                      {performance.startTime && ' ' + t('since') + ' ' + performance.startTime}
                      {' '}
                      {performance.endTime && t('to') + ' ' + performance.endTime}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
            <IconButton
              onClick={() => navigate(-1)}
              aria-label="close"
              size="large"
              sx={{ mt: -1, mr: -1 }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          {error ? (
            <Box sx={{ mt: 2 }}>
              <Alert
                severity="error"
                // action={
                //   <Button color="inherit" sx={{backgroundColor: 'secondary.main'}} size="small" onClick={() => navigate(-1)}>
                //     <ArrowBackIcon />
                //   </Button>
                // }
              >
                {error}
              </Alert>
            </Box>
          ) : (
            <Box sx={{
              width: '100%', mb: 4,
              overflowX: 'auto', overflowY: 'hidden',
              bgcolor: '#f5f5f5', borderRadius: 2,
            }}>
              <Box sx={{ minWidth: 600, height: '100%' }}>
                {layout && (
                  <LayoutPreviewSVG
                    layout={layout}
                    seats={seats}
                    interactive={true}
                    bookingView={true}
                    onSeatClick={handleSeatClick}
                    getSeatStatus={getSeatStatus}
                  />
                )}
                <LayoutLegend
                  conditions={activeConditions}
                  showStatusLegend={true}
                  isEditView={false}
                />
              </Box>
            </Box>
          )}

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
