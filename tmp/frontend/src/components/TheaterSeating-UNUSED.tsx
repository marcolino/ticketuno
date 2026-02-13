import React, { useEffect, useState, useCallback } from 'react';
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
} from '@mui/material';
import {
  EventSeat as EventSeatIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles'; 
import { eventApi, theaterApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { handleApiError } from '../utils/apiErrorHandler';
import { Theater, Seat } from '../../../shared/types/theater';
import { EventPerformance } from '../../../shared/types/event';

const TheaterSeating: React.FC = () => {
  const { t } = useTranslation();    
  const { id, eventId, performanceId } = useParams<{ id?: string; eventId?: string; performanceId?: string }>();
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const theme = useTheme();
  const navigate = useNavigate();

  const [theater, setTheater] = useState<Theater | null>(null);
  const [performance, setPerformance] = useState<EventPerformance | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
  //const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loginPromptOpen, setLoginPromptOpen] = useState(false);

  const loadPerformance = useCallback(async () => {
    try {
      const response = await eventApi.getPerformance(eventId!, performanceId!);
      const perf = response.data;
      setPerformance(perf);
      
      // Parse seat data from performance
      //const sections = JSON.parse(perf.seatData);
      setTheater({
        id: eventId!,
        name: 'Theater', // Will be updated from event data if needed
        sections: [], // TODO ...
        createdAt: '',
        updatedAt: '',
        status: 'active',
      });
      
      setError(null);
    } catch (err) {
      setError('Failed to load performance');
      console.error(err);
    } finally {
    }
  }, [eventId, performanceId]);
  
  const loadTheater = useCallback(async (theaterId: string) => {
    try {
      //setLoading(true);
      const response = await theaterApi.getTheaterById(theaterId);
      setTheater(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load theater');
      console.error(err);
    } finally {
      //setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (eventId && performanceId) {
      loadPerformance();
    } else if (id) {
      loadTheater(id);
    }
  }, [id, eventId, performanceId, loadPerformance, loadTheater]);

  const getSeatStatus = (seat: Seat): 'available' | 'selected' | 'booked' | 'none' => {
    if (!performance) return 'none';
    if (seat.status === 'booked') return 'booked';
    if (selectedSeats.has(seat.id)) return 'selected';
    return 'available';
  };

  const toggleSeat = (seat: Seat) => {
    toast.success('Seat toggled successfully');
    // eventToast.success('Seat toggled successfully: ' + Math.floor(Math.random() * 5));
    // eventToast.error('Error message 2');
    // // setTimeout(() => eventToast.error('Error message 2'), 100);
    // setTimeout(() => eventToast.warning('Warning message 3'), 200);
    // setTimeout(() => eventToast.info('Info message 4'), 300);
    // eventToast.info('New message received');
    // eventToast.warning('Storage almost full (85%)');
    // eventToast.error('Failed to sync data');
    // setTimeout(() => {
    //   toast.withActions('Download completed. What next?', [
    //     { label: 'Open', onClick: () => console.log('Opening file...') },
    //     { label: 'Delete', onClick: () => console.log('Deleting file...') }
    //   ]);
    // }, 500);
    
    if (seat.status === 'booked') {
      alert(t('Already booked!')); // TODO...
      return;
    }

    if (!isAuthenticated) {
      setLoginPromptOpen(true);
      return;
    }

    const newSelected = new Set(selectedSeats);
    if (newSelected.has(seat.id)) {
      newSelected.delete(seat.id);
    } else {
      newSelected.add(seat.id);
    }
    setSelectedSeats(newSelected);
  };

  const handleBooking = () => {
    setConfirmOpen(true);
  };

  const confirmBooking = async () => {
    // if (!id) {
    //   console.error('Booking error:', 'no id');
    //   return;
    // }

    try {
      if (eventId && performanceId) {
        await eventApi.bookPerformance(performanceId, Array.from(selectedSeats));
      } else if (id) {
        await theaterApi.bookSeats(id, Array.from(selectedSeats));
      } else {
        console.error('No event Id, performanceId, id!'); // TODO: can this happen?
      }
      //await theaterApi.bookSeats(id, Array.from(selectedSeats));

      alert(t('Successfully booked {{count}} seats', { count: selectedSeats.size }));
      setSelectedSeats(new Set());
      setConfirmOpen(false);
      //loadTheater(id);
      
      if (eventId && performanceId) {
        loadPerformance();
      } else if (id) {
        loadTheater(id);
      }
    } catch (err) {
      const apiError = handleApiError(err);
      alert(apiError.message);
      console.error('Booking error:', {
        message: apiError.message,
        code: apiError.code,
        details: apiError.details,
        originalError: err
      });
    }
    
  };

  const getSeatColor = (status: 'available' | 'selected' | 'booked' | 'none') => {
    switch (status) {
      case 'available':
        //return 'success.light';
        return theme.palette.seat.available;
      case 'selected':
        //return 'primary.main';
        return theme.palette.seat.selected;
      case 'booked':
        return theme.palette.seat.booked;
      case 'none':
        return theme.palette.grey[900];
      default:
        return theme.palette.grey[500];
    }
  };

  const totalPrice = selectedSeats.size * 45;

  // if (loading) {
  //   return (
  //     <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
  //       <CircularProgress />
  //     </Box>
  //   );
  // }

  if (error /*|| !theater*/) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error || 'Theater not found'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(performance ? '/events' : '/theaters')} sx={{ mt: 2 }}>
          {t('Back')}{/* TODO: navigate back to theaters if editing theatre, to events if editing performance */}
        </Button>
      </Container>
    );
  }

  if (!theater) {
    return null;
  }
  
  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            {theater.name}
          </Typography>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {t(
              performance ?
                'Select your seats to continue'
              :
                'Theater seats'
            )}
          </Typography>

          {/* Stage */}
          <Box
            sx={{
              mt: 4,
              mb: 6,
              background: 'linear-gradient(to bottom, #fbbf24, #f59e0b)',
              borderRadius: '100% 100% 0 0 / 50px 50px 0 0',
              height: 60,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 2,
            }}
          >
            <Typography variant="h6" sx={{ color: 'rgba(0,0,0,0.7)', fontWeight: 'bold' }}>
              {t('STAGE')}
            </Typography>
          </Box>

          {/* Sections */}
          {theater.sections.map((section, sectionIdx) => (
            <Box key={sectionIdx} sx={{ mb: 6 }}>
              <Typography variant="h5" gutterBottom align="center" sx={{ mb: 3 }}>
                {section.name}
              </Typography>
              {section.rows.map((row) => (
                <Box key={row.id} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 1 }}>
                  {/* <Typography
                    variant="body1"
                    sx={{ width: 40, textAlign: 'center', fontWeight: 'bold', color: 'text.secondary' }}
                  >
                    {row.id}
                  </Typography> */}
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {row.seatStatuses?.map((seat) => {
                      const status = getSeatStatus(seat);
                      return (
                        <Button
                          key={seat.id}
                          variant="contained"
                          onClick={() => toggleSeat(seat)}
                          disabled={status === 'none' || status === 'booked'}
                          sx={{
                            minWidth: 40,
                            height: 40,
                            p: 0,
                            bgcolor: getSeatColor(status),
                            '&.Mui-disabled': {
                              bgcolor: getSeatColor(status), // Override disabled background
                              color: 'white', // Ensure text is visible
                              opacity: 0.8, // Slightly reduce opacity for disabled state
                            },
                            '&:hover': {
                              bgcolor: status === 'available' ? 'success.main' : undefined,
                              transform: status === 'available' ? 'scale(1.1)' : undefined,
                            },
                            transition: 'all 0.2s',
                            fontSize: '0.75rem',
                          }}
                        >
                          {row.id}{seat.number}
                        </Button>
                      );
                    })}
                  </Box>
                  {/* <Typography
                    variant="body1"
                    sx={{ width: 40, textAlign: 'center', fontWeight: 'bold', color: 'text.secondary' }}
                  >
                    {row.id}
                  </Typography> */}
                </Box>
              ))}
            </Box>
          ))}

          {/* Legend */}
          {performance && (
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mt: 4, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Chip label={t('Available seatings')} sx={{ bgcolor: 'success.light' }} />
              <Chip label={t('Selected seatings')} sx={{ bgcolor: 'primary.main', color: 'white' }} />
              <Chip label={t('Booked seatings')} sx={{ bgcolor: 'grey.400' }} />
            </Box>
          )}

          {/* Booking Summary */}
          {performance && selectedSeats.size > 0 && (
            <Paper elevation={2} sx={{ mt: 4, p: 3, bgcolor: 'primary.light' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <EventSeatIcon />
                    <Typography variant="h6">
                      {t('{{count}} seats selected', { count: selectedSeats.size })}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    <strong>{t('Seats')}:</strong> {Array.from(selectedSeats).join(', ')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Typography variant="h5" align="center">
                    ${totalPrice}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={handleBooking}
                    sx={{ bgcolor: 'primary.dark' }}
                  >
                    {t('Proceed to Checkout')}
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          )}
        </Paper>
      </Container>

      <Dialog open={loginPromptOpen} onClose={() => setLoginPromptOpen(false)}>
        <DialogTitle>Login Required</DialogTitle>
        <DialogContent>
          <Typography>
            You need to login to book seats. Please login or register to continue.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoginPromptOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      
      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>{t('Confirm Booking')}</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            {t('You are about to book')} <strong>{selectedSeats.size}</strong> {t('Seats').toLowerCase()}:
          </Typography>
          <Paper sx={{ p: 2, bgcolor: 'grey.100', mb: 2 }}>
            <Typography>{Array.from(selectedSeats).join(', ')}</Typography>
          </Paper>
          <Typography variant="h6">
            {t('Total')}: ${totalPrice}
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
            {t('Confirm')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TheaterSeating;
