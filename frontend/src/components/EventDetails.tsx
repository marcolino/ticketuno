import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Chip,
  Card,
  CardContent,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  TheaterComedy as TheaterIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  Edit as EditIcon,
  EventSeat as SeatIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { eventApi } from '../services/api';
import { EventWithDetails, EventPerformance } from '../types/event';
import { useAuth } from '../contexts/AuthContext';

const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isAuthenticated } = useAuth();
  
  const [event, setEvent] = useState<EventWithDetails | null>(null);
  const [performances, setPerformances] = useState<EventPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  //const loadEvent = async () => {
  const loadEvent = useCallback(async () => {
    try {
      setLoading(true);
      const response = await eventApi.getEventById(id!);
      setEvent(response.data);
      
      const perfResponse = await eventApi.getPerformances(id!);
      // Filter to event only upcoming performances for non-admin users
      const filteredPerfs = isAdmin 
        ? perfResponse.data 
        : perfResponse.data.filter(p => 
            new Date(p.performanceDate) >= new Date() && p.status === 'scheduled'
          );
      setPerformances(filteredPerfs);
      
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load event details');
    } finally {
      setLoading(false);
    }
  }, [id, isAdmin]);

  useEffect(() => {
    if (id) {
      loadEvent();
    }
  }, [id, loadEvent]);

  const handleBookPerformance = (performanceId: string) => {
    if (!isAuthenticated) {
      // This will be handled by the Design's login dialog
      //return; // not authenticated users will be asked to authenticate when they want to book
    }
    navigate(`/performance/${id}/${performanceId}`);
  };

  const handleEditEvent = () => {
    navigate(`/event/edit/${id}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'primary';
      case 'in_progress': return 'success';
      case 'completed': return 'default';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !event) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error || 'Event not found'}</Alert>
        <Button onClick={() => navigate('/')} sx={{ mt: 2 }}>
          Back to Events
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header Section */}
      <Paper elevation={3} sx={{ p: 4, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="h3" component="h1">
                {event.title}
              </Typography>
              <Chip
                label={event.status}
                color={getStatusColor(event.status)}
              />
            </Box>
            {event.genre && (
              <Chip label={event.genre} sx={{ mr: 1 }} />
            )}
            {event.rating && (
              <Chip label={event.rating} variant="outlined" />
            )}
          </Box>
          {isAdmin && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={handleEditEvent}
            >
              Edit Event
            </Button>
          )}
        </Box>

        {event.description && (
          <Typography variant="body1" paragraph sx={{ mt: 3 }}>
            {event.description}
          </Typography>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Event Information Grid */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <List dense>
              {event.theater && (
                <ListItem>
                  <TheaterIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText
                    primary="Venue"
                    secondary={event.theater.name}
                  />
                </ListItem>
              )}
              
              {event.durationMinutes && (
                <ListItem>
                  <TimeIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText
                    primary="Duration"
                    secondary={`${event.durationMinutes} minutes${event.intermissionCount ? ` (${event.intermissionCount} intermission${event.intermissionCount > 1 ? 's' : ''})` : ''}`}
                  />
                </ListItem>
              )}

              {(event.openingDate || event.closingDate) && (
                <ListItem>
                  <CalendarIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText
                    primary="Run"
                    secondary={`${event.openingDate ? formatDate(event.openingDate) : 'TBA'} - ${event.closingDate ? formatDate(event.closingDate) : 'TBA'}`}
                  />
                </ListItem>
              )}

              <ListItem>
                <MoneyIcon sx={{ mr: 2, color: 'text.secondary' }} />
                <ListItemText
                  primary="Ticket Price"
                  secondary={`From ${event.currency} ${event.baseTicketPrice.toFixed(2)}`}
                />
              </ListItem>
            </List>
          </Grid>

          <Grid item xs={12} md={6}>
            <List dense>
              {event.director && (
                <ListItem>
                  <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText
                    primary="Director"
                    secondary={event.director}
                  />
                </ListItem>
              )}

              {event.playwright && (
                <ListItem>
                  <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText
                    primary="Playwright"
                    secondary={event.playwright}
                  />
                </ListItem>
              )}

              {event.musicalDirector && (
                <ListItem>
                  <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText
                    primary="Musical Director"
                    secondary={event.musicalDirector}
                  />
                </ListItem>
              )}

              {event.language && (
                <ListItem>
                  <ListItemText
                    primary="Language"
                    secondary={event.language}
                  />
                </ListItem>
              )}
            </List>
          </Grid>
        </Grid>

        {/* Warnings and Requirements */}
        {(event.contentWarnings || event.minimumAge || event.specialRequirements) && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box>
              {event.minimumAge && event.minimumAge > 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Minimum age: {event.minimumAge} years
                </Alert>
              )}
              {event.contentWarnings && (
                <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
                  <strong>Content Warning:</strong> {event.contentWarnings}
                </Alert>
              )}
              {event.specialRequirements && (
                <Alert severity="info">
                  <strong>Special Requirements:</strong> {event.specialRequirements}
                </Alert>
              )}
            </Box>
          </>
        )}
      </Paper>

      {/* Performances Section */}
      <Typography variant="h4" gutterBottom>
        Available Performances
      </Typography>

      {performances.length === 0 ? (
        <Alert severity="info">
          No upcoming performances scheduled at this time. Please check back later.
        </Alert>
      ) : (
        <Grid container spacing={3}>
          {performances.map((performance) => (
            <Grid item xs={12} sm={6} md={4} key={performance.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                    <Typography variant="h6" component="div">
                      {formatDate(performance.performanceDate)}
                    </Typography>
                    <Chip
                      label={performance.status}
                      color={getStatusColor(performance.status)}
                      size="small"
                    />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TimeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {formatTime(performance.startTime)}
                      {performance.endTime && ` - ${formatTime(performance.endTime)}`}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <SeatIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {performance.availableSeats} / {performance.availableSeats + performance.bookedSeats} seats available
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    <Typography
                      variant="body2"
                      color={performance.availableSeats > 0 ? 'success.main' : 'error.main'}
                      fontWeight="bold"
                    >
                      {performance.availableSeats > 0 
                        ? `${performance.availableSeats} seats left` 
                        : 'Sold Out'}
                    </Typography>
                  </Box>
                </CardContent>

                <CardActions sx={{ p: 2, pt: 0 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handleBookPerformance(performance.id)}
                    disabled={performance.availableSeats === 0 || performance.status !== 'scheduled'}
                  >
                    {performance.availableSeats === 0 ? 'Sold Out' : 'Select Seats'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Additional Information */}
      {(event.websiteUrl || event.trailerUrl) && (
        <Paper elevation={1} sx={{ p: 3, mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            More Information
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {event.websiteUrl && (
              <Button
                variant="outlined"
                href={event.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Official Website
              </Button>
            )}
            {event.trailerUrl && (
              <Button
                variant="outlined"
                href={event.trailerUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Watch Trailer
              </Button>
            )}
          </Box>
        </Paper>
      )}
    </Container>
  );
};

export default EventDetails;
