import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { t } from 'i18next';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Alert,
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
  Hidden,
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
  Theaters as TheaterIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import 'dayjs/locale/it';
import 'dayjs/locale/en';
import 'dayjs/locale/fr';

import { eventApi } from '../services/api';
import { EventWithDetails, EventPerformance } from '../../../shared/types/event';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';

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
  status: 'scheduled' | 'in progress' | 'completed' | 'cancelled';
  createdAt?: string;
  updatedAt?: string;
}

const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin/*, isAuthenticated*/ } = useAuth();
  
  const [event, setEvent] = useState<EventWithDetails | null>(null);
  const [performances, setPerformances] = useState<EventPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const [performanceToDelete, setPerformanceToDelete] = useState<string | null>(null);

  // Responsive breakpoints
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md')); // xs and sm for mobile

  const showDialog = useDialog();

  dayjs.locale('it'); // TODO: Set to current locale dynamically

  const loadEvent = useCallback(async () => {
    try {
      setLoading(true);
      const response = await eventApi.getEventById(id!);
      setEvent(response.data);
      
      // Filter to show only upcoming performances for non-admin users
      const filteredPerfs = isAdmin ?
        response.data.performances :
        response.data.performances?.filter(p => {
          if (!p.performanceDate) return false;
          const perfDate = dayjs(p.performanceDate);
          const now = dayjs();
          return perfDate.isValid() && perfDate.isAfter(now) && p.status === 'scheduled';
        })
      ;
      setPerformances(filteredPerfs!);
      
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load event details');
    } finally {
      setLoading(false);
    }
  }, [id, isAdmin]);

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

  // Convert EventPerformance to EventPerformanceForm (for editing)
  // const performanceToForm = (perf: EventPerformance): EventPerformanceForm => ({
  //   ...perf,
  //   performanceDate: perf.performanceDate ? dayjs(perf.performanceDate) : null,
  //   startTime: perf.startTime ? dayjs(`1970-01-01T${perf.startTime}`) : null,
  //   endTime: perf.endTime ? dayjs(`1970-01-01T${perf.endTime}`) : null,
  // });

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
    
   let nextDay: Dayjs | null = null;
  
    if (performances.length > 0) {
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
      status: 'scheduled',
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
    setPerformanceToDelete(performanceId);
    //setDeleteDialogOpen(true);
    showDialog({
      title: t('Confirm Performance Delete'),
      content: t('Are you sure you want to delete this performance?\nThis action cannot be undone.'),
      cancelText: 'Cancel',
      confirmText: 'Delete',
      onConfirm: () => confirmDelete(id!, performanceId),
      // buttons: [
      //   {
      //     text: "Alternative option",
      //     onClick: alternativeAction,
      //     variant: "outlined",
      //   },
      // ],
    });
  };

  const confirmDelete = async (eventId: string, performanceId: string) => {
    try {
      await eventApi.deletePerformance(eventId, performanceId);
      await reloadEvent();
    } catch (err: any) {
      setError(
        err.response?.data?.error || t('Failed to delete performance')
      );
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
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save performance');
    }
  };

  const handleBulkAction = (action: string) => {
    setBulkMenuAnchor(null);
    const selectedIds = Array.from(selectedRows.ids);
    
    switch (action) {
      case 'cancel':
        alert(`Bulk cancel ${selectedIds.length} performances - TODO: implement`);
        break;
      case 'delete':
        alert(`Bulk delete ${selectedIds.length} performances - TODO: implement`);
        break;
    }
  };

  const handleBookPerformance = (performanceId: string) => {
    navigate(`/performance/${id}/${performanceId}`);
  };

  // const handleEditEvent = () => {
  //   navigate(`/event/edit/${id}`);
  // };

  // Date/Time handlers for pickers
  const handlePerformanceDateChange = (value: Dayjs | null, _context: any) => {
    setPerformanceToEdit(prev => prev ? { ...prev, performanceDate: value } : null);
  };

  const handleStartTimeChange = (value: Dayjs | null, _context: any) => {
    setPerformanceToEdit(prev => prev ? { ...prev, startTime: value } : null);
  };

  const handleEndTimeChange = (value: Dayjs | null, _context: any) => {
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
    return (performance.availableSeats ?? 0) + (performance.bookedSeats ?? 0);
  };

  // Create Choose Seats button component to avoid repetition
  const ChooseSeatsButton = ({ performance, size = 'medium' }: { performance: EventPerformance, size?: 'small' | 'medium' }) => {
    const isAvailable = (performance.availableSeats ?? 0) > 0 && performance.status === 'scheduled';
    const buttonText = isAvailable ? 
      (isMobile ? (
        <>
          <Box component="span" display="block">{t('Choose')}</Box>
          <Box component="span" display="block">{t('seats')}</Box>
        </>
      ) : t('Choose seats')) 
      : t('Sold Out');
    
    const buttonColor = isAvailable ? 'success' : 'error';
    const buttonVariant = 'contained'; // Always contained for consistency

    return (
      <Button
        variant={buttonVariant}
        color={buttonColor}
        onClick={() => handleBookPerformance(performance.id || '')}
        disabled={!isAvailable}
        size={size}
        sx={{
          fontWeight: 'bold',
          whiteSpace: 'normal',
          lineHeight: 1.1,
          textAlign: 'center',
          minWidth: isMobile ? 70 : 'auto',
          ...(isMobile && {
            height: isAvailable ? 70 : 'auto',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            py: 1,
            px: 1.5, // Add horizontal padding for 'Sold Out'
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
      width: isAdmin ? 140 : 140,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box sx={{ 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center' // This centers the content vertically
        }}>
          {isAdmin ? (
            <AdminActionButtons performance={params.row} />
          ) : (
            <ChooseSeatsButton performance={params.row} size="small" />
          )}
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

  if (error || !event) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error || t('Event not found')}</Alert>
        <Button onClick={() => navigate('/')} sx={{ mt: 2 }}>
          {t('Back to Events')}
        </Button>
      </Container>
    );
  }

  const posterImageUrl = event.posterImage ? `/uploads/${event.posterImage}` : null; // TODO: '/uploads' to config

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
            {isAdmin ? (
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
      {!isAdmin && (
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
                <TheaterIcon sx={{ fontSize: 80, color: 'white', opacity: 0.5 }} />
              )}
            
              {/* Chips */}
              <Box sx={{
                order: { xs: 1, sm: 1, md: 2 },
                alignSelf: { xs: 'stretch', md: 'flex-start' },
              }}>
                <Typography sx={{
                  typography: { xs: 'h5', md: 'h3' }
                }} component="h1">
                  {event.title}
                </Typography>
                {event.genre && (
                  <Chip label={t(event.genre)} sx={{ mr: 1 }} />
                )}
                {event.rating && (
                  <Chip label={t(event.rating)} variant="outlined" />
                )}
              </Box>
            </Box>
            {/* {isAdmin && (
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
          {event.description && (
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
                    {event.theater && (
                      <ListItem>
                        <TheatersIcon sx={{ mr: 2, color: 'text.secondary' }} />
                        <ListItemText
                          primary={t('Venue')}
                          secondary={event.theater.name}
                        />
                      </ListItem>
                    )}
                    
                    {event.durationMinutes && (
                      <ListItem>
                        <TimeIcon sx={{ mr: 2, color: 'text.secondary' }} />
                        <ListItemText
                          primary={t('Duration')}
                          secondary={`${event.durationMinutes} ${t('minutes')}${event.intermissionCount ? ` (${event.intermissionCount} ${t('intermission')}${event.intermissionCount > 1 ? 's' : ''})` : ''}`}
                        />
                      </ListItem>
                    )}

                    {(event.openingDate || event.closingDate) && (
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
                        secondary={`${t('From')} ${event.currency} ${event.baseTicketPrice.toFixed(2)}`}
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
                          primary={t('Director')}
                          secondary={event.director}
                        />
                      </ListItem>
                    )}

                    {event.playwright && (
                      <ListItem>
                        <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
                        <ListItemText
                          primary={t('Playwright')}
                          secondary={event.playwright}
                        />
                      </ListItem>
                    )}

                    {event.musicalDirector && (
                      <ListItem>
                        <PersonIcon sx={{ mr: 2, color: 'text.secondary' }} />
                        <ListItemText
                          primary={t('Musical Director')}
                          secondary={event.musicalDirector}
                        />
                      </ListItem>
                    )}

                    {event.language && (
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
                {(event.contentWarnings || event.minimumAge || event.specialRequirements) && (
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
          {isAdmin && (
            <Box sx={{
              justifyContent: 'space-between', 
              alignItems: 'center',
              mb: 3,
            }}>
              <Typography sx={{ typography: { xs: 'h5', md: 'h3' } }} component="h6">
                {event.title}
              </Typography>
            </Box>
          )}
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
            {isAdmin && selectedRows.ids.size > 0 && (
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
            {isAdmin && (
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

        {performances.length === 0 ? (
          <Alert severity="info">
            {t('No performances scheduled at this time.')}
          </Alert>
        ) : (
          <>
            {/* Mobile card view */}
            <Hidden mdUp>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {performances.slice(0, 10).map((performance) => (
                  <MobilePerformanceCard key={performance.id} performance={performance} />
                ))}
                {performances.length > 10 && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    {t('Showing 10 of {{total}} performances. Use desktop view for full table.', { total: performances.length })}
                  </Alert>
                )}
              </Box>
            </Hidden>

            {/* Desktop DataGrid */}
            <Hidden mdDown>
              <Box sx={{ 
                height: 500, 
                width: '100%',
              }}>
                <DataGrid
                  rows={performances}
                  columns={columns}
                  checkboxSelection={isAdmin}
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
            </Hidden>
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
              value={performanceToEdit?.performanceDate}
              onChange={handlePerformanceDateChange as any}
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
              value={performanceToEdit?.startTime}
              onChange={handleStartTimeChange as any}
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
              value={performanceToEdit?.endTime}
              onChange={handleEndTimeChange as any}
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

      {/* Delete Confirmation Dialog */}
      {/* <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>{t('Confirm Delete')}</DialogTitle>
        <DialogContent>
          <Typography>
            {t('Are you sure you want to delete this performance? This action cannot be undone.')}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>{t('Cancel')}</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            {t('Delete')}
          </Button>
        </DialogActions>
      </Dialog> */}
    </Container>
  );
};

export default EventDetails;
