  import React, { useEffect, useState, useCallback } from 'react';
  import { useParams } from 'react-router-dom';
  import i18n, { t } from 'i18next';
  import {
    Container,
    Box,
    Typography,
    Button,
    Paper,
    Grid,
    Chip,
    MenuItem,
    IconButton,
    Tooltip,
    Menu,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Stack,
    List,
    Divider,
    ListItem,
    ListItemText,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    useMediaQuery,
    useTheme,
    Card,
    CardContent,
  } from '@mui/material';
  import { DataGrid, GridColDef, GridRowId, GridRowSelectionModel } from '@mui/x-data-grid';
  import {
    Edit as EditIcon,
    Delete as DeleteIcon,
    MoreVert as MoreVertIcon,
    Add as AddIcon,
    Theaters as TheatersIcon,
    AccessTime as TimeIcon,
    CalendarMonth as CalendarIcon,
    Money as MoneyIcon,
    Warning as WarningIcon,
    Person as PersonIcon,
    Language as LanguageIcon,
    Event as EventIcon,
    ExpandMore as ExpandMoreIcon,
    EventSeat as EventSeatIcon,
  } from '@mui/icons-material';
  import { DatePicker } from '@mui/x-date-pickers/DatePicker';
  import { TimePicker } from '@mui/x-date-pickers/TimePicker';
  import dayjs from 'dayjs';
  import type { Dayjs } from 'dayjs';
  import 'dayjs/locale/it';
  import 'dayjs/locale/en';
  import 'dayjs/locale/fr';
  import Alert from './Alert';
  //import { useToast } from '@/contexts/ToastContext';
  //import { useLoading } from '@/contexts/LoadingContext';
  import { eventApi } from '@/services/api';
  import { getErrorMessage } from '@ticketuno/shared/utils/misc';
  import { EventWithDetails, EventPerformance, EventPerformanceWithSeatCounts } from '@ticketuno/shared/types/event';
  import useNavigate from '@/hooks/useNavigate';
  import { useAuth } from '@/contexts/AuthContext';
  import { useDialog } from '@/contexts/DialogContext';
  import { useToast } from '@/contexts/ToastContext';
  import { sharedConfig as config } from '@ticketuno/shared';

  // Form interface for performance with Dayjs
  interface EventPerformanceForm {
    id?: string;
    eventId: string;
    performanceDate: Dayjs | null;
    startTime: Dayjs | null;
    endTime: Dayjs | null;
    availableSeats: number;
    bookedSeats: number;
    seatData: string;
    createdAt?: string;
    updatedAt?: string;
  }

  const PerformanceList: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { isOperator, loading} = useAuth();

    const [event, setEvent] = useState<EventWithDetails | null>(null);
    const [performances, setPerformances] = useState<EventPerformance[] | null>(null);

    //const [error, setError] = useState<string | null>(null);
    const toast = useToast();
    
    // DataGrid v8 selection state
    const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>({
      type: 'include',
      ids: new Set<GridRowId>()
    });
    const [bulkMenuAnchor, setBulkMenuAnchor] = useState<null | HTMLElement>(null);
    
    // Dialog states
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    //const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [performanceToEdit, setPerformanceToEdit] = useState<EventPerformanceForm | null>(null);
    //const [performanceToDelete, setPerformanceToDelete] = useState<string | null>(null);

    // Responsive breakpoints
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md')); // xs and sm for mobile

    const showDialog = useDialog();

    useEffect(() => {
      dayjs.locale(i18n.language.split('-')[0]); // Handles 'it-IT' → 'it'
    }, [i18n.language]);
    
    const loadEvent = useCallback(async () => {
      try {
        const response = await eventApi.getEventById(id!);
        setEvent(response.data);
        
        // Filter to show only upcoming performances for non-admin users
        const filteredPerfs = isOperator ?
          response.data.performances :
          response.data.performances?.filter(p => {
            if (!p.performanceDate) return false;
            const perfDate = dayjs(p.performanceDate);
            const now = dayjs();
            return perfDate.isValid() && perfDate.isAfter(now); // && p.status === 'scheduled';
          })
        ;
        setPerformances(filteredPerfs!);
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    }, [id, isOperator]);

    const reloadEvent = async () => {
      const scrollPosition = window.pageYOffset;
      await loadEvent();
      setTimeout(() => window.scrollTo(0, scrollPosition), 0);
    };

    useEffect(() => {
      if (id) {
        loadEvent();
      }
    }, [id, loadEvent]);

    const performanceToForm = (perf: EventPerformance): EventPerformanceForm => ({
      ...perf,
      performanceDate: perf.performanceDate ? dayjs(perf.performanceDate) : null,
      startTime: perf.startTime ? dayjs(`1970-01-01T${perf.startTime}`) : null,
      endTime: perf.endTime ? dayjs(`1970-01-01T${perf.endTime}`) : null,
      //seatData: perf.seatData || '[]', // Provide a default if missing
      seatData: '[]',
      availableSeats: perf.availableSeats ?? 0, // Also ensure numbers exist
      bookedSeats: perf.bookedSeats ?? 0,
    });

    // Convert EventPerformanceForm to API payload
    const formToPerformance = (form: EventPerformanceForm): Partial<EventPerformance> => ({
      ...form,
      performanceDate: form.performanceDate?.format('YYYY-MM-DD') || '',
      startTime: form.startTime?.format('HH:mm') || '',
      endTime: form.endTime?.format('HH:mm') || '',
    });

    // Handlers
    const handleAddPerformance = () => {
      
      //let nextDay: Dayjs | null = null;
      // By default we st thje first date of the event
      let nextDay: Dayjs | null = event?.openingDate ? dayjs(event.openingDate) : null;
      
      if (performances && performances.length > 0) {
        // Filter out null/undefined dates and convert strings to Dayjs
        const validDates = performances
          .map(p => p.performanceDate) // This returns string | null | undefined
          .filter((date): date is string => date != null) // Filter out null/undefined, keep strings
          .map(dateString => dayjs(dateString)) // Convert string to Dayjs
          .filter(dayjsDate => dayjsDate.isValid()) // Filter out invalid Dayjs dates
        ;
        if (validDates.length > 0) {
          // Find the most recent date
          const mostRecent = validDates.reduce((latest, current) => 
            current.isAfter(latest) ? current : latest
          );
          nextDay = mostRecent.add(1, 'day'); // Add one day
        }
      }

      setPerformanceToEdit({
        id: undefined,
        eventId: id!,
        performanceDate: nextDay,
        startTime: event?.typicalStartTime ? dayjs(`1970-01-01T${event.typicalStartTime}`) : null,
        endTime: event?.typicalEndTime ? dayjs(`1970-01-01T${event.typicalEndTime}`) : null,
        availableSeats: event?.maxCapacity || 0,
        bookedSeats: 0,
        seatData: '[]',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setEditDialogOpen(true);
    };

    const handleEditPerformance = (performance: EventPerformance) => {
      setPerformanceToEdit(performanceToForm(performance));
      setEditDialogOpen(true);
    };

    const handleDeletePerformance = (performanceId: string) => {
      showDialog({
        title: t('Confirm Performance Delete'),
        content: t('Are you sure you want to delete this performance?\nThis action cannot be undone.'),
        cancelText: t('Cancel'),
        confirmText: t('Delete'),
        onConfirm: () => confirmDelete(id!, performanceId),
      });
    };

    const confirmDelete = async (eventId: string, performanceId: string) => {
      try {
        await eventApi.deletePerformance(eventId, performanceId);
        await reloadEvent();
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    };

    const handleSavePerformance = async () => {
      if (!performanceToEdit) return;
      try {
        const payload = formToPerformance(performanceToEdit);
        
        if (performanceToEdit.id) {
          await eventApi.updatePerformance(id!, performanceToEdit.id, payload);
        } else {
          await eventApi.createPerformance(id!, payload);
        }
        await reloadEvent();
        setEditDialogOpen(false);
        setPerformanceToEdit(null);
      } catch (error: any) {
        if (error?.response?.data?.error?.message === 'THEATER_SCHEDULING_CONFLICT') {
          const details = error.response.data.error.details;
          const content = t('A performance on {{date}} from {{startTime}} to {{endTime}} already exists for theater {{theaterName}}', {
            date: details.performanceDate,
            startTime: details.existingPerformanceStartTime,
            endTime: details.existingPerformanceEndTime,
            theaterName: details.theaterName,
          });
          await showDialog({
            title: t('A performance already exists'),
            content,
            confirmText: t('Cancel'),
            shrinkToContent: true,
            mode: 'warning',
          });
        } else {
          //setError(getErrorMessage(error));
          toast.error(getErrorMessage(error));
        }
      }
    };

    const handleBulkAction = async(action: string) => {
      setBulkMenuAnchor(null);
      const selectedIds = Array.from(selectedRows.ids);
      
      switch (action) {
        case 'cancel': // NOTE: implement this method!
          await showDialog({
            title: t('Bulk cancel {{count}} performances', { count: selectedIds.length }),
            content: t('Sorry, this action is not yet implemented...'),
            confirmText: t('Ok'),
            shrinkToContent: true,
            mode: 'warning',
          });
          break;
        case 'delete':
          await showDialog({
            title: t('Bulk delete {{count}} performances', { count: selectedIds.length }),
            content: t('Sorry, this action is not yet implemented...'),
            confirmText: t('Ok'),
            shrinkToContent: true,
            mode: 'warning',
          });
          break;
      }
    };

    // const _handleBookPerformance = (performanceId: string) => { // TODO: REMOVE ME
    //   navigate(`/event/${id}/performance/${performanceId}/book`);
    // };
    const handleCreateBooking = (performanceId: string) => {
      navigate(`/event/${id}/performance/${performanceId}/book`);
      //navigate(`/bookings/${performanceId}/create`);
    };

    // const handleEditEvent = () => {
    //   navigate(`/event/edit/${id}`);
    // };

    // Date/Time handlers for pickers
    const handlePerformanceDateChange = (value: Dayjs | null) => {
      setPerformanceToEdit(prev => prev ? { ...prev, performanceDate: value } : null);
    };

    const handleStartTimeChange = (value: Dayjs | null) => {
      setPerformanceToEdit(prev => prev ? { ...prev, startTime: value } : null);
    };

    const handleEndTimeChange = (value: Dayjs | null) => {
      setPerformanceToEdit(prev => prev ? { ...prev, endTime: value } : null);
    };

    // Utility functions with dayjs
    const formatDate = (dateString: string) => {
      if (!dateString) return t('Not set');
      const date = dayjs(dateString);
      if (!date.isValid()) return t('Invalid date');
      return date.format('L');
    };

    const formatTime = (timeString: string) => {
      if (!timeString) return t('Not set');
      const time = dayjs(`1970-01-01T${timeString}`);
      if (!time.isValid()) return t('Invalid time');
      return time.format('LT');
    };

    // Get total seats (available + booked)
    const getTotalSeats = (performance: EventPerformance) => {
      //return (performance.availableSeats ?? 0) + (performance.bookedSeats ?? 0);
      return (performance as any).totalSeats ?? 0;
    };

    // Create Choose Seats button component to avoid repetition
    const ChooseSeatsButton = ({ performance, size = 'medium' }: { performance: EventPerformance, size?: 'small' | 'medium' }) => {
      const isAvailable = (performance.availableSeats ?? 0) > 0;
      const buttonText = isAvailable ? 
        t('Choose seats') :
        t('Sold Out')
      ;
      const buttonColor = isAvailable ? 'success' : 'error';
      const buttonVariant = 'contained'; // Always contained for consistency

      return (
        <Button
          variant={buttonVariant}
          color={buttonColor}
          //onClick={() => handleBookPerformance(performance.id)} // TODO: REMOVE ME
          onClick={() => handleCreateBooking(performance.id)}
          disabled={!isAvailable}
          size={size}
          sx={{
            fontWeight: 'bold',
            whiteSpace: 'normal',
            textAlign: 'center',
            //minWidth: isMobile ? 70 : 'auto',
            ...(isMobile && {
              //height: isAvailable ? 70 : 'auto',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              py: 1,
              px: 1, // Add horizontal padding for 'Sold Out'
              // Ensure consistent padding for both states
              '&.MuiButton-containedSuccess, &.MuiButton-containedError': {
                py: 1,
              }
            })
          }}
        >
          {buttonText}
        </Button>
      );
    };

    // Create Action Buttons component for admin
    const AdminActionButtons = ({ performance }: { performance: EventPerformance }) => (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Tooltip title={t('Edit')}>
          <IconButton
            size="small"
            onClick={() => handleEditPerformance(performance)}
          >
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('Delete')}>
          <IconButton
            size="small"
            color="error"
            onClick={() => handleDeletePerformance(performance.id || '')}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('Bookings')}>
          <IconButton
            size="small"
            color="success"
            //onClick={() => handleBookPerformance(performance.id || '')} // TODO: REMOVE ME
            onClick={() => handleCreateBooking(performance.id || '')}
          >
            <EventSeatIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    );
    
    // DataGrid columns configuration
    const columns: GridColDef[] = [
      {
        field: 'performanceDate',
        headerName: t('Date'),
        width: 120,
        valueFormatter: (value) => formatDate(value),
      },
      {
        field: 'startTime',
        headerName: t('Start Time'),
        width: 100,
        valueFormatter: (value) => formatTime(value),
      },
      {
        field: 'endTime',
        headerName: t('End Time'),
        width: 100,
        valueFormatter: (value) => formatTime(value || ''),
      },
      {
        field: 'availableSeats',
        headerName: t('Available'),
        width: 100,
        type: 'number',
        valueFormatter: (value, row) => `${value} / ${getTotalSeats(row)}`,
      },
      {
        field: 'bookedSeats',
        headerName: t('Booked'),
        width: 100,
        type: 'number',
      },
      {
        field: 'actions',
        headerName: t('Actions'),
        width: 140,
        sortable: false,
        filterable: false,
        renderCell: (params) => (
          <Box sx={{ 
            height: '100%', 
            display: 'flex', 
            alignItems: 'center' // This centers the content vertically
          }}>
            <>
              {isOperator ? (
                <AdminActionButtons performance={params.row} />
              ) : (
                <ChooseSeatsButton performance={params.row} size="small" />
              )}
            </>
          </Box>
        ),
      },
    ];

    if (loading) {
      return null;
    }
    //   return (
    //     <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
    //       <Typography>{t('Loading...')}</Typography>
    //     </Container>
    //   );
    // }

    const posterImageUrl = event && event.posterImage ? `${config.app.images.uploadFolder}/${event.posterImage}` : null;

    // Performance card component for mobile
    const MobilePerformanceCard = ({ performance }: { performance: EventPerformance }) => (
      <Card key={performance.id} variant="outlined" sx={{ mb: 1 }}>
        <CardContent sx={{ 
          p: 2, 
          '&:last-child': { pb: 2 }
        }}>
          {/* First row: Date and time */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            mb: 0  // No bottom margin
          }}>
            <Box sx={{ flex: 1, mr: 1 }}>
              <Typography variant="body1" fontWeight="medium">
                {formatDate(performance.performanceDate)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25, mb: 1 }}>
                {formatTime(performance.startTime)}
                {performance.endTime && ` - ${formatTime(performance.endTime)}`}
              </Typography>
              
              {/* Seats information moved to be below time, not in separate row */}
              <Typography variant="body2" color="text.secondary">
                {t('Seats available')}: {performance.availableSeats}/{getTotalSeats(performance)}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              {isOperator ? (
                <AdminActionButtons performance={performance} />
              ) : (
                <ChooseSeatsButton performance={performance} />
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
    
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Event Details Header */}
        {!isOperator && (
          <Paper elevation={3} sx={{ p: 4, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
              <Box sx={{
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'column', md: 'row' },
                alignItems: { xs: 'flex-start', md: 'center' },
                gap: 2
              }}>
                {/* Image */}
                {posterImageUrl ? (
                  <Box sx={{
                    order: { xs: 2, sm: 2, md: 1 }
                  }}>
                    <Box
                      component="img"
                      src={posterImageUrl}
                      alt="Poster"
                      sx={{
                        maxWidth: { xs: 100, md: 200 },
                        objectFit: 'cover',
                        borderRadius: '6px'
                      }}
                    />
                  </Box>
                ) : (
                    <EventIcon sx={{ fontSize: { xs: 40, md: 60 } }} />
                )}
              
                {/* Chips */}
                <Box sx={{
                  order: { xs: 1, sm: 1, md: 2 },
                  alignSelf: { xs: 'stretch', md: 'flex-start' },
                }}>
                  <Typography sx={{
                    typography: { xs: 'h5', md: 'h3' }
                  }} component="h1">
                    {event && event.title}
                  </Typography>
                  {event && event.genres && (Array.isArray(event.genres) ? event.genres : [event.genres]).map(genre => (
                    <Chip key={genre} label={t(genre)} sx={{ mr: 1 }} />
                  ))}
                  {event && event.rating && (
                    <Chip label={t(event.rating)} variant="outlined" />
                  )}
                </Box>
              </Box>
              {/* {isOperator && (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={handleEditEvent}
              >
                {t('Edit Event')}
              </Button>
            )} */}
            </Box>

            {/* Description Accordion */}
            {event && event.description && (
              <Accordion defaultExpanded={false} sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" component="h2">
                    <strong>{t('Description')}</strong>
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body1" paragraph>
                    {event.description}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Event Information Accordion */}
            <Accordion defaultExpanded={false}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1" component="h2">
                  <strong>{t('Event Information')}</strong>
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {/* Event Information Grid */}
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <List dense>
                      {event && event.theater && (
                        <ListItem>
                          <TheatersIcon sx={{ mr: 2, color: 'text.secondary' }} />
                          <ListItemText
                            primary={t('Theater')}
                            secondary={event.theater.name}
                          />
                        </ListItem>
                      )}
                      
                      {event && event.durationMinutes && (
                        <ListItem>
                          <TimeIcon sx={{ mr: 2, color: 'text.secondary' }} />
                          <ListItemText
                            primary={t('Duration')}
                            secondary={`${event.durationMinutes} ${t('minutes')}${event.intermissionCount ? ` (${event.intermissionCount} ${t('intermission')}${event.intermissionCount > 1 ? 's' : ''})` : ''}`}
                          />
                        </ListItem>
                      )}

                      {(event && (event.openingDate || event.closingDate)) && (
                        <ListItem>
                          <CalendarIcon sx={{ mr: 2, color: 'text.secondary' }} />
                          <ListItemText
                            primary={t('Run')}
                            secondary={`${event.openingDate ? formatDate(event.openingDate) : t('TBA')} - ${event.closingDate ? formatDate(event.closingDate) : t('TBA')}`}
                          />
                        </ListItem>
                      )}

                      <ListItem>
                        <MoneyIcon sx={{ mr: 2, color: 'text.secondary' }} />
                        <ListItemText
                          primary={t('Ticket Price')}
                          secondary={`${t('From')} ${event && event.currency} ${event && event.baseTicketPrice.toFixed(2)}`}
                        />
                      </ListItem>
                    </List>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <List dense>
                      {event && event.director && (
                        <ListItem>
                          <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
                          <ListItemText
                            primary={t('Director')}
                            secondary={event.director}
                          />
                        </ListItem>
                      )}

                      {event && event.playwright && (
                        <ListItem>
                          <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
                          <ListItemText
                            primary={t('Playwright')}
                            secondary={event.playwright}
                          />
                        </ListItem>
                      )}

                      {event && event.musicalDirector && (
                        <ListItem>
                          <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
                          <ListItemText
                            primary={t('Musical Director')}
                            secondary={event.musicalDirector}
                          />
                        </ListItem>
                      )}

                      {event && event.language && (
                        <ListItem>
                          <LanguageIcon sx={{ mr: 2, color: 'text.secondary' }} />
                          <ListItemText
                            primary={t('Language')}
                            secondary={event.language}
                          />
                        </ListItem>
                      )}
                    </List>
                  </Grid>

                  {/* Warnings and Requirements */}
                  {(event && (event.contentWarnings || event.minimumAge || event.specialRequirements)) && (
                    <Grid item xs={12}>
                      <Divider sx={{ my: 3 }} />
                      <Box>
                        {event.contentWarnings && (
                          <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
                            <strong>{t('Content Warning')}:</strong> {event.contentWarnings}
                          </Alert>
                        )}
                        {event.minimumAge && event.minimumAge > 0 && (
                          <Alert severity="info" sx={{ mb: 2 }}>
                            {t('Minimum age')}: {event.minimumAge} {t('years')}
                          </Alert>
                        )}
                        {event.specialRequirements && (
                          <Alert severity="info">
                            <strong>{t('Special Requirements')}:</strong> {event.specialRequirements}
                          </Alert>
                        )}
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>
          </Paper>
        )}

        {/* Performances Section */}
        <Paper elevation={3} sx={{ 
          p: { xs: 2, sm: 3, md: 4 },
          mb: 3 
        }}>
          <Box>
            {isOperator && (
              <Box sx={{
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 3,
              }}>
                {event && (
                  <Box>
                    {event.theater && (
                      <Typography sx={{ typography: 'h6' }}>
                        {t('Theater')}: {event.theater.name}
                        {event.theater.description ? ' - ' : ''} {event.theater.description}
                      </Typography>
                    )}
                    <Typography sx={{ typography: 'h6' }}>
                      {t('Event')}: {event.title}
                      {event.description ? ' - ' : ''} {event.description}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
            {/* {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )} */}
            {/* {!error && !event && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {t('No events present')}
              </Alert>
            )} */}
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              mb: 3,
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 2, sm: 0 }
            }}>
              <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' } }}>
                {t('Performances')}
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                gap: 2,
                flexWrap: 'wrap',
                justifyContent: { xs: 'center', sm: 'flex-end' }
              }}>
                {isOperator && selectedRows.ids.size > 0 && (
                  <>
                    <Chip
                      label={t('{{count}} selected', { count: selectedRows.ids.size })}
                      color="primary"
                      onDelete={() => setSelectedRows({ type: 'include', ids: new Set() })}
                      size={isMobile ? "small" : "medium"}
                    />
                    <Button
                      variant="outlined"
                      startIcon={<MoreVertIcon />}
                      onClick={(e) => setBulkMenuAnchor(e.currentTarget)}
                      size={isMobile ? "small" : "medium"}
                    >
                      {t('Bulk Actions')}
                    </Button>
                    <Menu
                      anchorEl={bulkMenuAnchor}
                      open={Boolean(bulkMenuAnchor)}
                      onClose={() => setBulkMenuAnchor(null)}
                    >
                      <MenuItem onClick={() => handleBulkAction('cancel')}>
                        {t('Cancel Selected')}
                      </MenuItem>
                      <MenuItem onClick={() => handleBulkAction('delete')}>
                        {t('Delete Selected')}
                      </MenuItem>
                    </Menu>
                  </>
                )}
                {isOperator && (
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddPerformance}
                    size={isMobile ? "small" : "medium"}
                  >
                    {t('Add Performance')}
                  </Button>
                )}
              </Box>
            </Box>
          </Box>

          {performances && performances.length === 0 ? (
            <Alert severity="info">
              {t('No performances available at this time.')}
            </Alert>
          ) : (
            <>
              {/* Mobile card view */}
              <Box sx={{
                display: { xs: 'flex', md: 'none' },
                flexDirection: 'column',
                gap: 1
              }}>
                {performances && performances.map((performance) => {
                  return (
                    <MobilePerformanceCard key={performance.id} performance={performance} />
                  )
                })}
              </Box>

              {/* Desktop DataGrid */}
              {!isMobile && performances && (
                <Box sx={{
                  //display: { xs: 'none', md: 'block' },
                  height: 500,
                  width: '100%',
                }}>
                  <DataGrid
                    rows={performances}
                    columns={columns}
                    checkboxSelection={isOperator}
                    disableRowSelectionOnClick
                    rowSelectionModel={selectedRows}
                    onRowSelectionModelChange={setSelectedRows}
                    pageSizeOptions={[10, 25, 50]}
                    initialState={{
                      pagination: { paginationModel: { pageSize: 10 } },
                      sorting: { sortModel: [{ field: 'performanceDate', sort: 'asc' }] },
                    }}
                    sx={{
                      '& .MuiDataGrid-row:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                    getRowHeight={() => 52}
                  />
                </Box>
              )}
            </>
          )}
        </Paper>

        {/* Edit/Add Performance Dialog */}
        <Dialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          maxWidth="sm"
          fullWidth
          disableScrollLock
        >
          <DialogTitle>
            {performanceToEdit?.id ? t('Edit Performance') : t('Add Performance')}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 2 }}>
              <DatePicker
                label={t('Performance Date')}
                value={performanceToEdit?.performanceDate ?? null}
                onChange={handlePerformanceDateChange}
                format="L"
                minDate={dayjs()}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                    error: !performanceToEdit?.performanceDate,
                    helperText: !performanceToEdit?.performanceDate ? t('Date is required') : '',
                  },
                }}
              />
              
              <TimePicker
                label={t('Start Time')}
                value={performanceToEdit?.startTime ?? null}
                onChange={handleStartTimeChange}
                ampm={false}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                  },
                }}
              />
              
              <TimePicker
                label={t('End Time')}
                value={performanceToEdit?.endTime ?? null}
                onChange={handleEndTimeChange}
                ampm={false}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                  },
                }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>{t('Cancel')}</Button>
            <Button 
              onClick={handleSavePerformance} 
              variant="contained"
              disabled={!performanceToEdit?.performanceDate}
            >
              {t('Save')}
            </Button>
          </DialogActions>
        </Dialog>

      </Container>
    );
  };

  export default PerformanceList;
