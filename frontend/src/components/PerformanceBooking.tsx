import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  EventSeat as EventSeatIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { eventApi, layoutApi } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { EventPerformance } from '@/shared/types/event';
import { LayoutJSON } from '@/shared/types/layout';
import { generateSeats, SeatStatus } from '@/shared/types/layoutToSeats';
import LayoutPreviewSVG, { SeatWithStatus } from './LayoutPreviewSVG';

interface SeatData {
  seatId: string;
  status: SeatStatus;
  // Add other properties that come from API if needed
  [key: string]: any;
}

interface PerformanceSeatsResponse {
  [section: string]: {
    [row: string]: SeatData[];
  };
}

const PerformanceBooking: React.FC = () => {
  const { t } = useTranslation();    
  const { eventId, performanceId } = useParams<{ eventId: string; performanceId: string }>();
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [performance, setPerformance] = useState<EventPerformance | null>(null);
  const [layout, setLayout] = useState<LayoutJSON | null>(null);
  const [seats, setSeats] = useState<SeatWithStatus[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);

  // Helper function to flatten nested seat data
  const flattenSeatsData = useCallback((data: PerformanceSeatsResponse): SeatData[] => {
    const allSeats: SeatData[] = [];
    
    // Iterate through each section (Galleria, Platea, etc.)
    Object.values(data).forEach(section => {
      // Iterate through each row (A, B, C, etc.)
      Object.values(section).forEach(rowArray => {
        // Add all seats from this row
        allSeats.push(...rowArray);
      });
    });
    
    return allSeats;
  }, []);

  // Load performance and seats
  const loadPerformance = useCallback(async () => {
    if (!eventId || !performanceId) {
      setError(t('Missing event or performance ID'));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Get performance details
      const perfResponse = await eventApi.getPerformance(eventId, performanceId);
      const perf = perfResponse.data;
      setPerformance(perf);
      
      // Get event to access theater
      const eventResponse = await eventApi.getEventById(eventId);
      const event = eventResponse.data;
      
      if (!event.theater?.currentLayoutId) {
        throw new Error('Theater layout not found');
      }
      
      // Get layout
      const layoutResponse = await layoutApi.getLayoutById(event.theater.currentLayoutId);
      const layoutData: LayoutJSON = JSON.parse(layoutResponse.data.json);
      setLayout(layoutData);
      
      // Generate seat positions from layout
      const generatedSeats = generateSeats(layoutData);
      
      // Get seat statuses from backend
      const seatsResponse = await eventApi.getPerformanceSeats(eventId, performanceId);
      
      // Flatten the nested seat data
      const allSeatsData = flattenSeatsData(seatsResponse.data);
      
      // Create a map of seatId to status
      const seatStatuses = new Map(
        allSeatsData.map((seat: SeatData) => [seat.seatId, seat])
      );
      
      // Merge positions with statuses
      const seatsWithStatus: SeatWithStatus[] = generatedSeats.map(seat => {
        const statusData = seatStatuses.get(seat.seatId);
        return {
          ...seat,
          status: (statusData?.status as SeatStatus) || 'available'
        };
      });
      
      setSeats(seatsWithStatus);
      setError(null);
    } catch (err: any) {
      console.error('Error loading performance:', err);
      setError(err.response?.data?.error || err.message || t('Failed to load performance'));
    } finally {
      setLoading(false);
    }
  }, [eventId, performanceId, t, flattenSeatsData]);
  
  useEffect(() => {
    if (eventId && performanceId) {
      loadPerformance();
    }
  }, [eventId, performanceId, loadPerformance]);

  // Handle seat click
  const handleSeatClick = useCallback((seatId: string, currentStatus?: SeatStatus) => {
    if (currentStatus === 'booked' || currentStatus === 'reserved') {
      toast.error(t('This seat is not available'));
      return;
    }

    if (!isAuthenticated) {
      setLoginPromptOpen(true);
      return;
    }

    setSelectedSeats(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(seatId)) {
        newSelected.delete(seatId);
      } else {
        newSelected.add(seatId);
      }
      return newSelected;
    });
  }, [isAuthenticated, t, toast]);

  // Get seat status including selection
  const getSeatStatus = useCallback((seat: SeatWithStatus): SeatStatus => {
    if (seat.status === 'booked' || seat.status === 'reserved') {
      return seat.status;
    }
    if (selectedSeats.has(seat.seatId)) {
      return 'selected';
    }
    return 'available';
   }, [selectedSeats]);
  
  // Calculate total price
  const totalPrice = useMemo(() => {
    return selectedSeats.size * (performance?.baseTicketPrice || 0);
  }, [selectedSeats.size, performance?.baseTicketPrice]);

  // Confirm booking
  const confirmBooking = async () => {
    if (!eventId || !performanceId) return;
    
    try {
      await eventApi.bookPerformance(eventId, performanceId, Array.from(selectedSeats));
      
      toast.success(t('Successfully booked {{count}} seats', { count: selectedSeats.size }));
      setSelectedSeats(new Set());
      setConfirmOpen(false);
      
      // Reload to get updated seat statuses
      await loadPerformance();
    } catch (err: any) {
      console.error('Booking error:', err);
      toast.error(err.response?.data?.error || err.message || t('Booking failed'));
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !layout || !performance) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error || t('Performance not found')}</Alert>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => navigate(`/event/${eventId}`)} 
          sx={{ mt: 2 }}
        >
          {t('Back to Event')}
        </Button>
      </Container>
    );
  }
  
  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(`/event/${eventId}`)}
              sx={{ mb: 2 }}
            >
              {t('Back to Event')}
            </Button>
            <Typography variant="h4" gutterBottom>
              {t('Select Your Seats')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {t('Performance on')} {new Date(performance.performanceDate).toLocaleDateString()} {performance.startTime}
            </Typography>
          </Box>

          {/* Stage Indicator */}
          {/* <Box
            sx={{
              mb: 4,
              background: 'linear-gradient(to bottom, #fbbf24, #f59e0b)',
              borderRadius: '100% 100% 0 0 / 30px 30px 0 0',
              height: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 2,
            }}
          >
            <Typography variant="h6" sx={{ color: 'rgba(0,0,0,0.7)', fontWeight: 'bold' }}>
              {layout.stage.label || t('STAGE')}
            </Typography>
          </Box> */}

          {/* Interactive Layout */}
          <Box sx={{ 
            width: '100%', 
            height: '600px', 
            mb: 4, 
            overflow: 'auto', 
            bgcolor: '#f5f5f5', 
            borderRadius: 2 
          }}>
            <Box
              sx={{
                minWidth: 600, // Force horizontal scroll on small screens
                height: '100%',
              }}
            >
              <LayoutPreviewSVG
                layout={layout}
                seats={seats}
                interactive={true}
                onSeatClick={handleSeatClick}
                getSeatStatus={getSeatStatus}
              />
            </Box>
          </Box>

          {/* Legend */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: 3, 
            mb: 4, 
            flexWrap: 'wrap' 
          }}>
            <Chip 
              icon={<EventSeatIcon />} 
              label={t('Available')} 
              sx={{ bgcolor: '#2E7D32', color: 'white' }} 
            />
            <Chip 
              icon={<EventSeatIcon />} 
              label={t('Selected')} 
              sx={{ bgcolor: '#1976D2', color: 'white' }} 
            />
            <Chip 
              icon={<EventSeatIcon />} 
              label={t('Booked')} 
              sx={{ bgcolor: '#757575', color: 'white' }} 
            />
          </Box>

          {/* Booking Summary */}
          {selectedSeats.size > 0 && (
            <Paper elevation={4} sx={{ 
              p: 3, 
              bgcolor: 'primary.light', 
              position: 'sticky', 
              bottom: 0 
            }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    {t('{{count}} seats selected', { count: selectedSeats.size })}
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {Array.from(selectedSeats).join(', ')}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Typography variant="h4" align="center" fontWeight="bold">
                    ${totalPrice.toFixed(2)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={() => setConfirmOpen(true)}
                    startIcon={<CheckCircleIcon />}
                  >
                    {t('Book Now')}
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          )}
        </Paper>
      </Container>

      {/* Dialogs */}
      <Dialog open={loginPromptOpen} onClose={() => setLoginPromptOpen(false)}>
        <DialogTitle>{t('Login Required')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('You need to login to book seats. Please login or register to continue.')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoginPromptOpen(false)}>{t('Close')}</Button>
          <Button variant="contained" onClick={() => navigate('/login')}>
            {t('Login')}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>{t('Confirm Booking')}</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            {t('You are about to book {{count}} seat(s):', { count: selectedSeats.size })}
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'grey.100', mb: 2, fontFamily: 'monospace' }}>
            {Array.from(selectedSeats).join(', ')}
          </Paper>
          <Divider sx={{ my: 2 }} />
          <Typography variant="h6">
            {t('Total')}: ${totalPrice.toFixed(2)}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button startIcon={<CancelIcon />} onClick={() => setConfirmOpen(false)}>
            {t('Cancel')}
          </Button>
          <Button
            startIcon={<CheckCircleIcon />}
            variant="contained"
            color="success"
            onClick={confirmBooking}
          >
            {t('Confirm Booking')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PerformanceBooking;
