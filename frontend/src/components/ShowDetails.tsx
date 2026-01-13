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
import { showApi } from '../services/api';
import { ShowWithDetails, ShowPerformance } from '../types/show';
import { useAuth } from '../contexts/AuthContext';

const ShowDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isAuthenticated } = useAuth();
  
  const [show, setShow] = useState<ShowWithDetails | null>(null);
  const [performances, setPerformances] = useState<ShowPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  //const loadShow = async () => {
  const loadShow = useCallback(async () => {
    try {
      setLoading(true);
      const response = await showApi.getShowById(id!);
      setShow(response.data);
      
      const perfResponse = await showApi.getPerformances(id!);
      // Filter to show only upcoming performances for non-admin users
      const filteredPerfs = isAdmin 
        ? perfResponse.data 
        : perfResponse.data.filter(p => 
            new Date(p.performanceDate) >= new Date() && p.status === 'scheduled'
          );
      setPerformances(filteredPerfs);
      
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load show details');
    } finally {
      setLoading(false);
    }
  }, [id, isAdmin]);

  useEffect(() => {
    if (id) {
      loadShow();
    }
  }, [id, loadShow]);

  const handleBookPerformance = (performanceId: string) => {
    if (!isAuthenticated) {
      // This will be handled by the Layout's login dialog
      //return; // not authenticated users will be asked to authenticate when they want to book
    }
    navigate(`/performance/${id}/${performanceId}`);
  };

  const handleEditShow = () => {
    navigate(`/show/edit/${id}`);
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

  if (error || !show) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error || 'Show not found'}</Alert>
        <Button onClick={() => navigate('/')} sx={{ mt: 2 }}>
          Back to Shows
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
                {show.title}
              </Typography>
              <Chip
                label={show.status}
                color={getStatusColor(show.status)}
              />
            </Box>
            {show.genre && (
              <Chip label={show.genre} sx={{ mr: 1 }} />
            )}
            {show.rating && (
              <Chip label={show.rating} variant="outlined" />
            )}
          </Box>
          {isAdmin && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={handleEditShow}
            >
              Edit Show
            </Button>
          )}
        </Box>

        {show.description && (
          <Typography variant="body1" paragraph sx={{ mt: 3 }}>
            {show.description}
          </Typography>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Show Information Grid */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <List dense>
              {show.theater && (
                <ListItem>
                  <TheaterIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText
                    primary="Venue"
                    secondary={show.theater.name}
                  />
                </ListItem>
              )}
              
              {show.durationMinutes && (
                <ListItem>
                  <TimeIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText
                    primary="Duration"
                    secondary={`${show.durationMinutes} minutes${show.intermissionCount ? ` (${show.intermissionCount} intermission${show.intermissionCount > 1 ? 's' : ''})` : ''}`}
                  />
                </ListItem>
              )}

              {(show.openingDate || show.closingDate) && (
                <ListItem>
                  <CalendarIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText
                    primary="Run"
                    secondary={`${show.openingDate ? formatDate(show.openingDate) : 'TBA'} - ${show.closingDate ? formatDate(show.closingDate) : 'TBA'}`}
                  />
                </ListItem>
              )}

              <ListItem>
                <MoneyIcon sx={{ mr: 2, color: 'text.secondary' }} />
                <ListItemText
                  primary="Ticket Price"
                  secondary={`From ${show.currency} ${show.baseTicketPrice.toFixed(2)}`}
                />
              </ListItem>
            </List>
          </Grid>

          <Grid item xs={12} md={6}>
            <List dense>
              {show.director && (
                <ListItem>
                  <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText
                    primary="Director"
                    secondary={show.director}
                  />
                </ListItem>
              )}

              {show.playwright && (
                <ListItem>
                  <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText
                    primary="Playwright"
                    secondary={show.playwright}
                  />
                </ListItem>
              )}

              {show.musicalDirector && (
                <ListItem>
                  <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
                  <ListItemText
                    primary="Musical Director"
                    secondary={show.musicalDirector}
                  />
                </ListItem>
              )}

              {show.language && (
                <ListItem>
                  <ListItemText
                    primary="Language"
                    secondary={show.language}
                  />
                </ListItem>
              )}
            </List>
          </Grid>
        </Grid>

        {/* Warnings and Requirements */}
        {(show.contentWarnings || show.minimumAge || show.specialRequirements) && (
          <>
            <Divider sx={{ my: 3 }} />
            <Box>
              {show.minimumAge && show.minimumAge > 0 && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Minimum age: {show.minimumAge} years
                </Alert>
              )}
              {show.contentWarnings && (
                <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
                  <strong>Content Warning:</strong> {show.contentWarnings}
                </Alert>
              )}
              {show.specialRequirements && (
                <Alert severity="info">
                  <strong>Special Requirements:</strong> {show.specialRequirements}
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
      {(show.websiteUrl || show.trailerUrl) && (
        <Paper elevation={1} sx={{ p: 3, mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            More Information
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {show.websiteUrl && (
              <Button
                variant="outlined"
                href={show.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Official Website
              </Button>
            )}
            {show.trailerUrl && (
              <Button
                variant="outlined"
                href={show.trailerUrl}
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

export default ShowDetails;
