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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Menu,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  List,
  Divider,
  ListItem,
  ListItemText,
} from '@mui/material';
import { DataGrid, GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';
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
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import dayjs, { Dayjs } from 'dayjs';

import { eventApi } from '../services/api';
import { EventWithDetails, EventPerformance } from '../../../shared/types/event';
import { useAuth } from '../contexts/AuthContext';

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
  const { isAdmin, isAuthenticated } = useAuth();
  
  const [event, setEvent] = useState<EventWithDetails | null>(null);
  const [performances, setPerformances] = useState<EventPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // DataGrid states
  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>([]);
  const [bulkMenuAnchor, setBulkMenuAnchor] = useState<null | HTMLElement>(null);
  
  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [performanceToEdit, setPerformanceToEdit] = useState<EventPerformanceForm | null>(null);
  const [performanceToDelete, setPerformanceToDelete] = useState<string | null>(null);

  const loadEvent = useCallback(async () => {
    try {
      setLoading(true);
      const response = await eventApi.getEventById(id!);
      setEvent(response.data);
      
      const perfResponse = await eventApi.getPerformances(id!);
      // Filter to show only upcoming performances for non-admin users
      const filteredPerfs = isAdmin 
        ? perfResponse.data 
        : perfResponse.data.filter(p => {
            if (!p.performanceDate) return false;
            const perfDate = dayjs(p.performanceDate);
            const now = dayjs();
            return perfDate.isValid() && 
                   perfDate.isAfter(now) && 
                   p.status === 'scheduled';
          });
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

  // Convert EventPerformance to EventPerformanceForm (for editing)
  const performanceToForm = (perf: EventPerformance): EventPerformanceForm => ({
    ...perf,
    performanceDate: perf.performanceDate ? dayjs(perf.performanceDate) : null,
    startTime: perf.startTime ? dayjs(`1970-01-01T${perf.startTime}`) : null,
    endTime: perf.endTime ? dayjs(`1970-01-01T${perf.endTime}`) : null,
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
    setPerformanceToEdit({
      id: undefined,
      eventId: id!,
      performanceDate: null,
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
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!performanceToDelete) return;
    try {
      // TODO: Implement delete API endpoint
      // await eventApi.deletePerformance(id!, performanceToDelete);
      alert('Delete API not implemented yet - add this to your eventApi');
      await loadEvent();
      setDeleteDialogOpen(false);
      setPerformanceToDelete(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete performance');
    }
  };

  const handleSavePerformance = async () => {
    if (!performanceToEdit) return;
    try {
      const payload = formToPerformance(performanceToEdit);
      
      if (performanceToEdit.id) {
        // TODO: Implement update API endpoint
        // await eventApi.updatePerformance(id!, performanceToEdit.id, payload);
        alert('Update API not implemented yet - add this to your eventApi');
      } else {
        await eventApi.createPerformance(id!, payload);
      }
      await loadEvent();
      setEditDialogOpen(false);
      setPerformanceToEdit(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save performance');
    }
  };

  const handleBulkAction = (action: string) => {
    setBulkMenuAnchor(null);
    switch (action) {
      case 'cancel':
        // TODO! alert(`Bulk cancel ${selectedRows.length} performances - TODO: implement`);
        break;
      case 'delete':
        // TODO! alert(`Bulk delete ${selectedRows.length} performances - TODO: implement`);
        break;
    }
  };

  const handleBookPerformance = (performanceId: string) => {
    if (!isAuthenticated) {
      // Authentication will be handled by parent component
    }
    navigate(`/performance/${id}/${performanceId}`);
  };

  const handleEditEvent = () => {
    navigate(`/event/edit/${id}`);
  };

  // Utility functions with dayjs
  const formatDate = (dateString: string) => {
    if (!dateString) return t('Not set');
    const date = dayjs(dateString);
    if (!date.isValid()) return t('Invalid date');
    return date.format('LL'); // Locale-aware long date format
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return t('Not set');
    const time = dayjs(`1970-01-01T${timeString}`);
    if (!time.isValid()) return t('Invalid time');
    return time.format('LT'); // Locale-aware time format
  };

  const getStatusColor = (status: string): "default" | "primary" | "success" | "error" => {
    switch (status) {
      case 'scheduled': return 'primary';
      case 'in progress': return 'success';
      case 'completed': return 'default';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  // DataGrid columns configuration
  const columns: GridColDef[] = [
    {
      field: 'performanceDate',
      headerName: t('Date'),
      width: 180,
      valueFormatter: (value) => formatDate(value),
    },
    {
      field: 'startTime',
      headerName: t('Start Time'),
      width: 120,
      valueFormatter: (value) => formatTime(value),
    },
    {
      field: 'endTime',
      headerName: t('End Time'),
      width: 120,
      valueFormatter: (value) => formatTime(value || ''),
    },
    {
      field: 'availableSeats',
      headerName: t('Available'),
      width: 100,
      type: 'number',
    },
    {
      field: 'bookedSeats',
      headerName: t('Booked'),
      width: 100,
      type: 'number',
    },
    {
      field: 'status',
      headerName: t('Status'),
      width: 130,
      renderCell: (params) => (
        <Chip
          label={t(params.value)}
          color={getStatusColor(params.value)}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      headerName: t('Actions'),
      width: 140,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <Box>
          {isAdmin ? (
            <>
              <Tooltip title={t('Edit')}>
                <IconButton
                  size="small"
                  onClick={() => handleEditPerformance(params.row)}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={t('Delete')}>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDeletePerformance(params.row.id)}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          ) : (
            <Button
              size="small"
              variant="contained"
              onClick={() => handleBookPerformance(params.row.id)}
              disabled={params.row.availableSeats === 0 || params.row.status !== 'scheduled'}
            >
              {params.row.availableSeats === 0 ? t('Sold Out') : t('Book')}
            </Button>
          )}
        </Box>
      ),
    },
  ];

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (error || !event) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error || 'Event not found'}</Alert>
        <Button onClick={() => navigate('/')} sx={{ mt: 2 }}>
          {t('Back to Events')}
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Event Details Header */}
      <Paper elevation={3} sx={{ p: 4, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Typography variant="h3" component="h1">
                {event.title}
              </Typography>
              <Chip
                label={t(event.status)}
                color={getStatusColor(event.status)}
              />
            </Box>
            {event.genre && (
              <Chip label={t(event.genre)} sx={{ mr: 1 }} />
            )}
            {event.rating && (
              <Chip label={t(event.rating)} variant="outlined" />
            )}
          </Box>
          {isAdmin && (
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={handleEditEvent}
            >
              {t('Edit Event')}
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
          </>
        )}
      </Paper>

      {/* Performances Section */}
      <Paper elevation={3} sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">
            {t('Performances')}
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {isAdmin && selectedRows && Array.isArray(selectedRows) && selectedRows.length > 0 && (
              <>
                <Chip
                  label={t('{{count}} selected', { count: selectedRows.length })}
                  color="primary"
                  onDelete={() => setSelectedRows([])}
                />
                <Button
                  variant="outlined"
                  startIcon={<MoreVertIcon />}
                  onClick={(e) => setBulkMenuAnchor(e.currentTarget)}
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
              >
                {t('Add Performance')}
              </Button>
            )}
          </Box>
        </Box>

        {performances.length === 0 ? (
          <Alert severity="info">
            {t('No performances scheduled at this time.')}
          </Alert>
        ) : (
          <Box sx={{ height: 500, width: '100%' }}>
            <DataGrid
              rows={performances}
              columns={columns}
              checkboxSelection={isAdmin}
              disableRowSelectionOnClick
              rowSelectionModel={selectedRows}
              onRowSelectionModelChange={(newSelection) => setSelectedRows(newSelection)}
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
            />
          </Box>
        )}
      </Paper>

      {/* Edit/Add Performance Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {performanceToEdit?.id ? t('Edit Performance') : t('Add Performance')}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <DatePicker
              label={t('Performance Date')}
              value={performanceToEdit?.performanceDate}
              onChange={(newDate) => 
                setPerformanceToEdit(prev => prev ? { ...prev, performanceDate: newDate } : null)
              }
              format="LL"
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
              onChange={(newTime) => 
                setPerformanceToEdit(prev => prev ? { ...prev, startTime: newTime } : null)
              }
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
              onChange={(newTime) => 
                setPerformanceToEdit(prev => prev ? { ...prev, endTime: newTime } : null)
              }
              ampm={false}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                },
              }}
            />
            
            <FormControl fullWidth>
              <InputLabel>{t('Status')}</InputLabel>
              <Select
                value={performanceToEdit?.status || 'scheduled'}
                label={t('Status')}
                onChange={(e) => 
                  setPerformanceToEdit(prev => prev ? { ...prev, status: e.target.value as any } : null)
                }
              >
                <MenuItem value="scheduled">{t('Scheduled')}</MenuItem>
                <MenuItem value="in progress">{t('In Progress')}</MenuItem>
                <MenuItem value="completed">{t('Completed')}</MenuItem>
                <MenuItem value="cancelled">{t('Cancelled')}</MenuItem>
              </Select>
            </FormControl>
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
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
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
      </Dialog>
    </Container>
  );
};

export default EventDetails;
