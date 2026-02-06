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
  Card,
  CardContent,
  CardActions,
  Divider,
  List,
  ListItem,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  IconButton,
  Tooltip,
  Stack,
  Menu,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  TheaterComedy as TheaterIcon,
  Person as PersonIcon,
  AttachMoney as MoneyIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  EventSeat as SeatIcon,
  Warning as WarningIcon,
  MoreVert as MoreVertIcon,
  SelectAll as SelectAllIcon,
  Deselect as DeselectIcon,
  PlayArrow as InProgressIcon,
  CheckCircle as CompletedIcon,
  Cancel as CancelledIcon,
} from '@mui/icons-material';
import { eventApi } from '../services/api';
import { EventWithDetails, EventPerformance } from '../../../shared/types/event';
import { useAuth } from '../contexts/AuthContext';
import EventPerformanceDialog from './EventPerformanceDialog';

const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isAuthenticated } = useAuth();
  
  const [event, setEvent] = useState<EventWithDetails | null>(null);
  const [performances, setPerformances] = useState<EventPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  
  // Table selection state
  const [selected, setSelected] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedPerformance, setSelectedPerformance] = useState<EventPerformance | null>(null);

  const loadEvent = useCallback(async () => {
    try {
      setLoading(true);
      const response = await eventApi.getEventById(id!);
      setEvent(response.data);
      
      const perfResponse = await eventApi.getPerformances(id!);
      const filteredPerfs = isAdmin 
        ? perfResponse.data 
        : perfResponse.data.filter(p => 
            new Date(p.performanceDate) >= new Date() && p.status === 'scheduled'
          );
      setPerformances(filteredPerfs);
      setSelected([]); // Clear selection when data reloads
      
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

  // Selection handlers
  const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const newSelected = performances.map((p) => p.id!);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleClick = (id: string) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: string[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1),
      );
    }

    setSelected(newSelected);
  };

  const isSelected = (id: string) => selected.indexOf(id) !== -1;

  // Performance actions
  const handleEditPerformance = (performance: EventPerformance) => {
    navigate(`/performance/edit/${performance.id}`);
  };

  const handleDeletePerformance = async (performanceId: string) => {
    if (window.confirm(t('Are you sure you want to delete this performance?'))) {
      try {
        setActionLoading(performanceId);
        await eventApi.deletePerformance(performanceId);
        await loadEvent();
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to delete performance');
      } finally {
        setActionLoading(null);
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selected.length === 0) return;
    
    if (window.confirm(t('Are you sure you want to delete {{count}} performance(s)?', { count: selected.length }))) {
      try {
        setActionLoading('bulk');
        await Promise.all(selected.map(id => eventApi.deletePerformance(id)));
        await loadEvent();
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to delete performances');
      } finally {
        setActionLoading(null);
      }
    }
  };

  const handleStatusChange = async (performanceId: string, newStatus: EventPerformance['status']) => {
    try {
      setActionLoading(performanceId);
      await eventApi.updatePerformance(performanceId, { status: newStatus });
      await loadEvent();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update performance');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkStatusChange = async (newStatus: EventPerformance['status']) => {
    if (selected.length === 0) return;
    
    try {
      setActionLoading('bulk');
      await Promise.all(
        selected.map(id => eventApi.updatePerformance(id, { status: newStatus }))
      );
      await loadEvent();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update performances');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, performance: EventPerformance) => {
    setAnchorEl(event.currentTarget);
    setSelectedPerformance(performance);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedPerformance(null);
  };

  const handleAddPerformance = () => {
    setAddDialogOpen(true);
  };

  const handleAddDialogClose = () => {
    setAddDialogOpen(false);
  };

  const handlePerformanceCreated = () => {
    loadEvent();
  };

  const handleBookPerformance = (performanceId: string) => {
    navigate(`/performance/${id}/${performanceId}`);
  };

  const handleEditEvent = () => {
    navigate(`/event/edit/${id}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
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
      case 'in progress': return 'warning';
      case 'completed': return 'success';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <CalendarIcon fontSize="small" />;
      case 'in progress': return <InProgressIcon fontSize="small" />;
      case 'completed': return <CompletedIcon fontSize="small" />;
      case 'cancelled': return <CancelledIcon fontSize="small" />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
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
    <>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* ... (Keep all your existing header and event details JSX here) ... */}
        
        {/* Performances Section - Updated for Admin */}
        <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" component="h2">
              {t('Performances')}
              <Typography variant="body2" color="text.secondary" component="span" sx={{ ml: 2 }}>
                ({performances.length} total)
              </Typography>
            </Typography>
            
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

          {performances.length === 0 ? (
            <Alert severity="info">
              {t('No performances scheduled at this time.')}
            </Alert>
          ) : (
            <>
              {/* Bulk Actions Toolbar */}
              {isAdmin && selected.length > 0 && (
                <Paper elevation={1} sx={{ p: 2, mb: 2, bgcolor: 'action.selected' }}>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      {t('{{count}} selected', { count: selected.length })}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => setSelected([])}
                      startIcon={<DeselectIcon />}
                    >
                      {t('Clear')}
                    </Button>
                    <Divider orientation="vertical" flexItem />
                    <Button
                      size="small"
                      color="error"
                      onClick={handleBulkDelete}
                      startIcon={<DeleteIcon />}
                      disabled={actionLoading === 'bulk'}
                    >
                      {actionLoading === 'bulk' ? t('Deleting...') : t('Delete')}
                    </Button>
                    <Divider orientation="vertical" flexItem />
                    <Typography variant="body2" color="text.secondary">
                      {t('Set status:')}
                    </Typography>
                    {(['scheduled', 'in progress', 'completed', 'cancelled'] as const).map((status) => (
                      <Chip
                        key={status}
                        label={t(status)}
                        size="small"
                        onClick={() => handleBulkStatusChange(status)}
                        disabled={actionLoading === 'bulk'}
                      />
                    ))}
                  </Stack>
                </Paper>
              )}

              {/* Performances Table */}
              <TableContainer 
                sx={{ 
                  maxHeight: isAdmin ? 500 : 'auto',
                  overflow: 'auto',
                  '& .MuiTableRow-root:hover': {
                    bgcolor: isAdmin ? 'action.hover' : 'transparent',
                  }
                }}
              >
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      {isAdmin && (
                        <TableCell padding="checkbox" sx={{ width: 60 }}>
                          <Checkbox
                            indeterminate={selected.length > 0 && selected.length < performances.length}
                            checked={performances.length > 0 && selected.length === performances.length}
                            onChange={handleSelectAllClick}
                            inputProps={{ 'aria-label': t('Select all performances') }}
                          />
                        </TableCell>
                      )}
                      <TableCell>{t('Date & Time')}</TableCell>
                      <TableCell>{t('Status')}</TableCell>
                      <TableCell>{t('Availability')}</TableCell>
                      {!isAdmin && (
                        <TableCell align="center">{t('Action')}</TableCell>
                      )}
                      {isAdmin && (
                        <>
                          <TableCell>{t('Created')}</TableCell>
                          <TableCell align="right">{t('Actions')}</TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {performances.map((performance) => {
                      const isItemSelected = isSelected(performance.id!);
                      const isPast = new Date(performance.performanceDate) < new Date();

                      return (
                        <TableRow
                          key={performance.id}
                          hover
                          selected={isItemSelected}
                          sx={{ 
                            opacity: performance.status === 'cancelled' ? 0.7 : 1,
                            bgcolor: isPast && performance.status === 'scheduled' ? 'warning.50' : 'inherit'
                          }}
                        >
                          {isAdmin && (
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={isItemSelected}
                                onClick={() => handleClick(performance.id!)}
                                inputProps={{ 'aria-labelledby': performance.id }}
                              />
                            </TableCell>
                          )}
                          
                          <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {formatDate(performance.performanceDate)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {formatTime(performance.startTime)}
                                {performance.endTime && ` - ${formatTime(performance.endTime)}`}
                              </Typography>
                            </Box>
                          </TableCell>
                          
                          <TableCell>
                            <Chip
                              size="small"
                              label={t(performance.status)}
                              color={getStatusColor(performance.status) as any}
                              icon={getStatusIcon(performance.status)}
                              variant={isPast && performance.status === 'scheduled' ? 'outlined' : 'filled'}
                            />
                          </TableCell>
                          
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              <SeatIcon fontSize="small" color="action" />
                              <Typography variant="body2">
                                {performance.availableSeats} / {performance.availableSeats + performance.bookedSeats}
                              </Typography>
                              <Chip
                                size="small"
                                label={performance.availableSeats > 0 ? t('Available') : t('Sold Out')}
                                color={performance.availableSeats > 0 ? 'success' : 'error'}
                                variant="outlined"
                              />
                            </Stack>
                          </TableCell>
                          
                          {!isAdmin && (
                            <TableCell align="center">
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleBookPerformance(performance.id!)}
                                disabled={performance.availableSeats === 0 || performance.status !== 'scheduled'}
                              >
                                {performance.availableSeats === 0 ? t('Sold Out') : t('Book')}
                              </Button>
                            </TableCell>
                          )}
                          
                          {isAdmin && (
                            <>
                              <TableCell>
                                <Typography variant="caption" color="text.secondary">
                                  {performance.createdAt && formatDate(performance.createdAt)}
                                </Typography>
                              </TableCell>
                              
                              <TableCell align="right" sx={{ minWidth: 120 }}>
                                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                  <Tooltip title={t('Edit')}>
                                    <IconButton
                                      size="small"
                                      onClick={() => handleEditPerformance(performance)}
                                      disabled={actionLoading === performance.id}
                                    >
                                      <EditIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  
                                  <Tooltip title={t('Quick status')}>
                                    <IconButton
                                      size="small"
                                      onClick={(e) => handleMenuClick(e, performance)}
                                      disabled={actionLoading === performance.id}
                                    >
                                      <MoreVertIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                  
                                  <Tooltip title={t('Delete')}>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleDeletePerformance(performance.id!)}
                                      disabled={actionLoading === performance.id}
                                    >
                                      {actionLoading === performance.id ? (
                                        <CircularProgress size={20} />
                                      ) : (
                                        <DeleteIcon fontSize="small" />
                                      )}
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </Paper>

        {/* Add Performance Dialog */}
        {event && (
          <EventPerformanceDialog
            open={addDialogOpen}
            onClose={handleAddDialogClose}
            event={event}
            onSuccess={handlePerformanceCreated}
          />
        )}

        {/* Status Change Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          {(['scheduled', 'in progress', 'completed', 'cancelled'] as const).map((status) => (
            <MenuItem
              key={status}
              onClick={() => {
                if (selectedPerformance) {
                  handleStatusChange(selectedPerformance.id!, status);
                }
                handleMenuClose();
              }}
              disabled={actionLoading === selectedPerformance?.id}
            >
              {t(status)}
            </MenuItem>
          ))}
        </Menu>
      </Container>
    </>
  );
};

export default EventDetails;
