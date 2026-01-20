import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Grid,
  Box,
  //CircularProgress,
  Alert,
  Chip,
  CardActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  CalendarToday as CalendarIcon,
  TheaterComedy as TheaterIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { eventApi } from '../services/api';
import { EventStats } from '../types/event';
import { useAuth } from '../contexts/AuthContext';

const EventList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [events, setEvents] = useState<EventStats[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const response = await eventApi.getAllEvents();
      setEvents(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load events');
      console.error(err);
    } finally {
    }
  };

  const handleViewEvent = (id: string) => {
    navigate(`/event/${id}`);
  };

  const handleEditEvent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/event/edit/${id}`);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
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

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Current Events
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {events.length === 0 && (
        <Alert severity="info">{t('No events available')}</Alert>
      )}
      
      {isAdmin && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/event/new')}
            sx={{ mt: 2, mr: 2 }}
          >
            Add Event
          </Button>
        </Box>
      )}

       {/* {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : events.length === 0 ? (
        <Alert severity="info">No events available</Alert>
      ) : ( */}

      <Grid container spacing={3}>
        {events.map((event) => (
          <Grid item xs={12} sm={6} md={4} key={event.id}>
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
              <CardMedia
                component="div"
                sx={{
                  pt: '56.25%',
                  bgcolor: 'primary.main',
                  position: 'relative',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TheaterIcon sx={{ fontSize: 80, color: 'white', opacity: 0.5 }} />
                </Box>
              </CardMedia>
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                  <Typography variant="h5" component="div">
                    {event.title}
                  </Typography>
                  <Chip
                    label={event.status}
                    color={getStatusColor(event.status)}
                    size="small"
                  />
                </Box>

                {event.genre && (
                  <Chip label={event.genre} size="small" sx={{ mb: 1 }} />
                )}

                <Box sx={{ mt: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <TheaterIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {event.theaterName}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CalendarIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {event.nextPerformanceDate 
                        ? `Next: ${formatDate(event.nextPerformanceDate)}`
                        : 'No upcoming performances'}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <MoneyIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      From {event.currency} {event.baseTicketPrice}
                    </Typography>
                  </Box>

                  <Typography variant="body2" color="success.main">
                    {event.availablePerformances} performance{event.availablePerformances !== 1 ? 's' : ''} available
                  </Typography>
                </Box>
              </CardContent>
              <CardActions sx={{ p: 2, pt: 0 }}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => handleViewEvent(event.id)}
                  disabled={event.availablePerformances === 0}
                >
                  View Performances
                </Button>
                {(true || isAdmin) && (
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={(e) => handleEditEvent(event.id, e)}
                    sx={{ ml: 1 }}
                  >
                    Edit
                  </Button>
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default EventList;
