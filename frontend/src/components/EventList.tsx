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
  Chip,
  CardActions,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Event as EventIcon,
  CalendarToday as CalendarIcon,
  TheaterComedy as TheaterIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
} from '@mui/icons-material';
import useNavigate from '@/hooks/useNavigate';
import { eventApi } from '@/services/api';
import { EventStats } from '@/shared/types/event';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/contexts/DialogContext';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/shared/utils/misc';
import { handleGuardResult } from '@/utils/guardHandler';
import Alert from './Alert';
import PageHeader from './PageHeader';
import config from '@/config';

const EventList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isOperator, loading } = useAuth();
  const toast = useToast();
  const showDialog = useDialog();
  const [events, setEvents] = useState<EventStats[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [navigateTo, setNavigateTo] = useState<string | null>(null);

  useEffect(() => {
    //if (isOperator) {
    loadEvents();
    //} else {
    //  toast.error(t('You must have at least \'operator\' role to access this page'));
    //}
  }, [isOperator]);

  const loadEvents = async () => {
    try {
      const options = isOperator ? { pastToo: true, canceledToo: true } : {};
      const response = await eventApi.getAllEvents(options);
      //console.log('EVENTS:', response.data);
      if (Array.isArray(response.data)) {
        setEvents(response.data);
      } else {
        setError(t('Invalid events received'));
      }
      setEvents(response.data);
      // if (response.data.length === 0) {
      //   toast.info(t('No events available'));
      // }
      //setError(null);
    } catch (error) {
      setError(getErrorMessage(error));
      //const msg = getErrorMessage(error);
      //toast.error(getErrorMessage(error));
      //setError(t('Failed to load events: {{err}}', { err: msg }));
      //console.error(err);
    }
  };

  useEffect(() => {
    if (navigateTo) {
      navigate(navigateTo);
      setNavigateTo(null);
    }
  }, [navigateTo]);
  
  const handleViewEvent = (id: string) => {
    navigate(`/event/${id}`);
  };

  const handleEditEvent = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/event/edit/${id}`);
  };

  // const handleDeleteEvent = async (id: string, e: React.MouseEvent) => {
  //   e.stopPropagation();

  //   showDialog({
  //     title: t('Delete an event'),
  //     content: t('Are you sure you want to delete this event?'),
  //     cancelText: t('Cancel'),
  //     confirmText: t('Delete'),
  //     onConfirm: async () => {
  //       try {
  //         await eventApi.deleteEvent(id);
  //         const newEvents = events.filter(event => event.id !== id);
  //         setEvents(newEvents);
  //       } catch (error) {
  //         // Show the actual server error message
  //         toast.error(getErrorMessage(error));
  //       }
  //       navigate(`/events`);
  //     }
  //   });
  // };
  const handleDeleteEvent = async (id: string, e: React.MouseEvent) => { 
    e.stopPropagation();
    showDialog({
      title: t('Delete an event'),
      content: t('Are you sure you want to delete this event?'),
      cancelText: t('Cancel'),
      confirmText: t('Delete'),
      onConfirm: async () => {
        const response = await eventApi.deleteEvent(id);
        const { success, wasBlocked } = await handleGuardResult(response.data, 'deleted', 'event', showDialog, toast, t);
        if (wasBlocked) {
          setNavigateTo('/bookings');
          return;
        }
        if (!success) return;
        // success path continues here
        toast.success(t('Event deleted successfully'));
        await loadEvents();
      }
    });
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
      case 'canceled': return 'error';
      default: return 'default';
    }
  };

  // if (error) {
  //   return (
  //     <Alert severity="error">
  //       {error}
  //     </Alert>
  //   );
  // }

  // if (loading) {
  //   return null;
  // }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* <Typography variant="h4" gutterBottom>
        {t('Current Events')}
      </Typography> */}
      <PageHeader
        title={t('Events')}
        showAdd={isOperator}
        addLabel={t('Add Event')}
        onAdd={() => navigate('/event/new')}
      />

      {error && (
        <Alert severity="error">
          {error}
        </Alert>
      )}

      {!loading && !error && events && events.length === 0 && (
        <Alert severity="info">
          {t('No events available')}
        </Alert>
      )}

      <Grid container spacing={3}>
        {events && events.map(event => {
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

                  {event.genres && event.genres.map((genre, index) =>
                    <Chip key={index} label={genre} size="small" sx={{ mb: 1 }} />
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
                          ? t('Next performance') + ': ' + formatDate(event.nextPerformanceDate)
                          : t('No upcoming performances')
                        }
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <ConfirmationNumberIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {t('From')} {config.app.currencies[event.currency]?.symbol} {event.baseTicketPrice}
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
                  {isOperator && (
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
                  {isOperator && (
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
                    //disabled={!(event.availablePerformances > 0)}
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
