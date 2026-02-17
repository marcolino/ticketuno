import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  //Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Event as EventIcon,
  CalendarToday as CalendarIcon,
  TheaterComedy as TheaterIcon,
  //AttachMoney as MoneyIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
} from '@mui/icons-material';
import useNavigate from '@/hooks/useNavigate';
import { eventApi } from '@/services/api';
import { EventStats } from '@/shared/types/event';
import { useAuth } from '@/contexts/AuthContext';
import config, { CurrencyCode } from '@/config';
//import { __test } from '@/shared/config';

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
      console.log('EVENTS:', events);
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

  const handleDeleteEvent = (id: string, e: React.MouseEvent) => {
    // TODO: ask for confirmation...
    e.stopPropagation();
    navigate(`/event/delete/${id}`);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'primary';
      case 'in progress': return 'success';
      case 'completed': return 'default';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        {t('Current Events')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!error && events.length === 0 && (
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
            {t('Add Event')}
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
        {events.map(event => {
          //const posterImageUrl = event.posterImage ? `/images/${event.posterImage}` : null; // TODO: '/images' to config
          //const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';
          // const API_BASE = import.meta.env.VITE_API_BASE_URL || window.location.origin;
          // const posterImageUrl1 = event.posterImage ? `${API_BASE}/images/${event.posterImage}` : null;
          // console.log(posterImageUrl1);
          const posterImageUrl = event.posterImage ?
            `/uploads/${event.posterImage}` :
            null
          ;
          
          return (
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
                    // Change to a more squared aspect ratio (e.g., 1:1 or 4:3)
                    pt: '100%', // For 1:1 (square) - use 100%, or for 4:3 aspect ratio: pt: '75%' (3/4 = 0.75)
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
                      p: 4, // padding inside
                    }}
                  >
                    {posterImageUrl ? (
                      <Box
                        component="img"
                        src={posterImageUrl}
                        alt="Poster"
                        sx={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain', // Show entire image without cropping
                          maxWidth: '100%',
                          maxHeight: '100%',
                          //backgroundColor: 'transparent',
                        }}
                      />
                    ) : (
                      <TheaterIcon sx={{ fontSize: 80, color: 'white', opacity: 0.5 }} />
                    )}
                  </Box>
                </CardMedia>
                {/* <CardMedia
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
                    {posterImageUrl &&
                      <Avatar
                        src={posterImageUrl}
                        variant="square"
                        //onClick={() => previewUrl && setPreviewOpen(true)}
                        sx={{
                          // width: textFieldHeight,
                          // height: textFieldHeight,
                          // bgcolor: 'transparent',
                        }}
                      >
                      </Avatar>
                    }
                    {!posterImageUrl &&
                      <TheaterIcon sx={{ fontSize: 80, color: 'white', opacity: 0.5 }} />
                    }
                  </Box>
                </CardMedia> */}
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                    <Chip
                      label={t(event.status)}
                      color={getStatusColor(event.status)}
                      size="small"
                    />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
                    <Typography variant="h5" component="div">
                      {event.title}
                    </Typography>
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
                          ? t('Next performance') + ':' + formatDate(event.nextPerformanceDate)
                          : t('No upcoming performances')
                        }
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <ConfirmationNumberIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {t('From')} {config.app.currencies[event.currency as CurrencyCode]?.symbol} {event.baseTicketPrice}
                      </Typography>
                    </Box>

                    {(event.availablePerformances > 0) && (
                      <Typography variant="body2" color="success.main">
                        {t('{{count}} performances available', { count: event.availablePerformances })}
                      </Typography>
                    )}
                  </Box>
                </CardContent>
                <CardActions sx={{
                  p: 2,
                  pt: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end', // Align buttons to right
                  gap: 1,
                  width: '100%'
                }}>
                  {isAdmin && (
                    <Button
                      variant="outlined"
                      startIcon={<DeleteIcon />}
                      onClick={(e) => handleDeleteEvent(event.id, e)}
                      sx={{
                        width: { xs: '100%', sm: 'auto' },
                      }}
                    >
                      {t('Delete')}
                    </Button>
                  )}
                  {isAdmin && (
                    <Button
                      variant="contained"
                      startIcon={<EditIcon />}
                      onClick={(e) => handleEditEvent(event.id, e)}
                      sx={{
                        width: { xs: '100%', sm: 'auto' },
                      }}
                    >
                      {t('Edit')}
                    </Button>
                  )}
                  <Button
                    variant="contained"
                    startIcon={<EventIcon />}
                    onClick={() => handleViewEvent(event.id) }
                    disabled={!isAdmin && event.availablePerformances === 0}
                    sx={{
                      width: { xs: '100%', sm: 'auto' }, // Full width on mobile, auto on desktop
                      //minWidth: 200 // Minimum width for better appearance
                    }}
                  >
                    {t('Performances')}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          )
        })}
      </Grid>
    </Container>
  );
};

export default EventList;
