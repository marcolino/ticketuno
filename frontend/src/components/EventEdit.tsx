import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Grid,
  Alert,
  //CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
} from '@mui/material';
import {
  Save as SaveIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { eventApi, theaterApi } from '../services/api';
import { Event, EventPerformance } from '../types/event';
import { TheaterStats } from '../types/theater';
import { useAuth } from '../contexts/AuthContext';

const EventEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, isAdmin } = useAuth();

  const isEditMode = id && id !== 'new';

  const [theaters, setTheaters] = useState<TheaterStats[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Event fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number>(120);
  const [intermissionCount, setIntermissionCount] = useState<number>(1);
  const [rating, setRating] = useState('');
  const [language, setLanguage] = useState('English');
  const [director, setDirector] = useState('');
  const [playwright, setPlaywright] = useState('');
  const [producer, setProducer] = useState('');
  const [choreographer, setChoreographer] = useState('');
  const [musicalDirector, setMusicalDirector] = useState('');
  const [theaterId, setTheaterId] = useState('');
  const [stageType, setStageType] = useState('');
  const [openingDate, setOpeningDate] = useState('');
  const [closingDate, setClosingDate] = useState('');
  const [baseTicketPrice, setBaseTicketPrice] = useState<number>(50);
  const [currency, setCurrency] = useState('USD');
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [minimumAge, setMinimumAge] = useState<number>(0);
  const [typicalStartTime, setTypicalStartTime] = useState('19:30');
  const [typicalEndTime, setTypicalEndTime] = useState('');
  const [eventPosterUrl, setEventPosterUrl] = useState('');
  const [trailerUrl, setTrailerUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [contentWarnings, setContentWarnings] = useState('');
  const [status, setStatus] = useState<'scheduled' | 'in_progress' | 'completed' | 'cancelled'>('scheduled');

  // Performances
  const [performances, setPerformances] = useState<Partial<EventPerformance>[]>([]);

  const loadTheaters = async () => {
    try {
      const response = await theaterApi.getAllTheaters();
      setTheaters(response.data);
    } catch (err) {
      console.error('Failed to load theaters', err);
    }
  };

  const loadEvent = useCallback(async () => {
    try {
      const response = await eventApi.getEventById(id!);
      const event = response.data;
      
      setTitle(event.title);
      setDescription(event.description || '');
      setGenre(event.genre || '');
      setDurationMinutes(event.durationMinutes || 120);
      setIntermissionCount(event.intermissionCount || 1);
      setRating(event.rating || '');
      setLanguage(event.language || 'English');
      setDirector(event.director || '');
      setPlaywright(event.playwright || '');
      setProducer(event.producer || '');
      setChoreographer(event.choreographer || '');
      setMusicalDirector(event.musicalDirector || '');
      setTheaterId(event.theaterId);
      setStageType(event.stageType || '');
      setOpeningDate(event.openingDate || '');
      setClosingDate(event.closingDate || '');
      setBaseTicketPrice(event.baseTicketPrice);
      setCurrency(event.currency);
      setSpecialRequirements(event.specialRequirements || '');
      setMinimumAge(event.minimumAge || 0);
      setTypicalStartTime(event.typicalStartTime || '19:30');
      setTypicalEndTime(event.typicalEndTime || '');
      setEventPosterUrl(event.eventPosterUrl || '');
      setTrailerUrl(event.trailerUrl || '');
      setWebsiteUrl(event.websiteUrl || '');
      setContentWarnings(event.contentWarnings || '');
      setStatus(event.status);

      if (event.performances) {
        setPerformances(event.performances);
      }

      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load event');
    } finally {
    }
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate('/events');
      return;
    }

    loadTheaters();
    if (isEditMode) {
      loadEvent();
    }
  }, [isAuthenticated, isAdmin, isEditMode, navigate, loadEvent]);
  
  const addPerformance = () => {
    setPerformances([
      ...performances,
      {
        performanceDate: '',
        startTime: typicalStartTime || '19:30',
        endTime: typicalEndTime || '',
        status: 'scheduled'
      }
    ]);
  };

  const removePerformance = (index: number) => {
    setPerformances(performances.filter((_, i) => i !== index));
  };

  const updatePerformance = (index: number, field: string, value: string) => {
    const updated = [...performances];
    updated[index] = { ...updated[index], [field]: value };
    setPerformances(updated);
  };

  const handleSave = async () => {
    if (!title.trim() || !theaterId || !baseTicketPrice) {
      setError('Title, theater, and base ticket price are required');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const eventData: Partial<Event> = {
        title,
        description,
        genre,
        durationMinutes,
        intermissionCount,
        rating,
        language,
        director,
        playwright,
        producer,
        choreographer,
        musicalDirector,
        theaterId,
        stageType,
        openingDate,
        closingDate,
        baseTicketPrice,
        currency,
        specialRequirements,
        minimumAge,
        typicalStartTime,
        typicalEndTime,
        eventPosterUrl,
        trailerUrl,
        websiteUrl,
        contentWarnings,
        status
      };

      let eventId: string;

      if (isEditMode) {
        await eventApi.updateEvent(id!, eventData);
        eventId = id!;
        alert('Event updated successfully!');
      } else {
        const response = await eventApi.createEvent(eventData);
        eventId = response.data.id;
        alert('Event created successfully!');
      }

      // Create new performances (only for new ones without id)
      for (const perf of performances) {
        if (!perf.id && perf.performanceDate && perf.startTime) {
          await eventApi.createPerformance(eventId, perf);
        }
      }

      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to ${isEditMode ? 'update' : 'create'} event`);
    } finally {
      setSaving(false);
    }
  };

  // if (loading) {
  //   return (
  //     <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
  //       <CircularProgress />
  //     </Box>
  //   );
  // }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          {isEditMode ? 'Edit Event' : 'Create New Event'}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Basic Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>
          </Grid>

          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth required>
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                label="Status"
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <MenuItem value="scheduled">Scheduled</MenuItem>
                <MenuItem value="in_progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={3}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Genre"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder="Drama, Comedy, Musical, etc."
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Duration (minutes)"
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
              inputProps={{ min: 0 }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Intermissions"
              type="number"
              value={intermissionCount}
              onChange={(e) => setIntermissionCount(parseInt(e.target.value) || 0)}
              inputProps={{ min: 0 }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Rating"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              placeholder="PG, PG-13, R, etc."
            />
          </Grid>

          {/* Production Details */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Production Details
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Director"
              value={director}
              onChange={(e) => setDirector(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Playwright"
              value={playwright}
              onChange={(e) => setPlaywright(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Producer"
              value={producer}
              onChange={(e) => setProducer(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Choreographer"
              value={choreographer}
              onChange={(e) => setChoreographer(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Musical Director"
              value={musicalDirector}
              onChange={(e) => setMusicalDirector(e.target.value)}
            />
          </Grid>

          {/* Venue Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Venue Information
            </Typography>
          </Grid>

          <Grid item xs={12} md={8}>
            <FormControl fullWidth required>
              <InputLabel>Theater</InputLabel>
              <Select
                value={theaterId}
                label="Theater"
                onChange={(e) => setTheaterId(e.target.value)}
              >
                {theaters.map((theater) => (
                  <MenuItem key={theater.id} value={theater.id}>
                    {theater.name} ({theater.totalSeats} seats)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Stage Type"
              value={stageType}
              onChange={(e) => setStageType(e.target.value)}
              placeholder="Proscenium, Thrust, etc."
            />
          </Grid>

          {/* Schedule */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Schedule
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Opening Date"
              type="date"
              value={openingDate}
              onChange={(e) => setOpeningDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Closing Date"
              type="date"
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Typical Start Time"
              type="time"
              value={typicalStartTime}
              onChange={(e) => setTypicalStartTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Typical End Time"
              type="time"
              value={typicalEndTime}
              onChange={(e) => setTypicalEndTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>

          {/* Pricing */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Pricing
            </Typography>
          </Grid>

          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label="Base Ticket Price"
              type="number"
              value={baseTicketPrice}
              onChange={(e) => setBaseTicketPrice(parseFloat(e.target.value) || 0)}
              required
              InputProps={{
                startAdornment: <InputAdornment position="start">{currency}</InputAdornment>,
              }}
              inputProps={{ min: 0, step: 0.01 }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Currency</InputLabel>
              <Select
                value={currency}
                label="Currency"
                onChange={(e) => setCurrency(e.target.value)}
              >
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="EUR">EUR</MenuItem>
                <MenuItem value="GBP">GBP</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Additional Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Additional Information
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Minimum Age"
              type="number"
              value={minimumAge}
              onChange={(e) => setMinimumAge(parseInt(e.target.value) || 0)}
              inputProps={{ min: 0 }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Poster URL"
              value={eventPosterUrl}
              onChange={(e) => setEventPosterUrl(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Trailer URL"
              value={trailerUrl}
              onChange={(e) => setTrailerUrl(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Website URL"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Special Requirements"
              value={specialRequirements}
              onChange={(e) => setSpecialRequirements(e.target.value)}
              multiline
              rows={2}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Content Warnings"
              value={contentWarnings}
              onChange={(e) => setContentWarnings(e.target.value)}
              multiline
              rows={2}
            />
          </Grid>

          {/* Performances */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 2 }}>
              <Typography variant="h6">
                Performances
              </Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={addPerformance}
                variant="outlined"
              >
                Add Performance
              </Button>
            </Box>
          </Grid>

          {performances.map((perf, index) => (
            <Grid item xs={12} key={index}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Performance Date"
                      type="date"
                      value={perf.performanceDate || ''}
                      onChange={(e) => updatePerformance(index, 'performanceDate', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="Start Time"
                      type="time"
                      value={perf.startTime || ''}
                      onChange={(e) => updatePerformance(index, 'startTime', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label="End Time"
                      type="time"
                      value={perf.endTime || ''}
                      onChange={(e) => updatePerformance(index, 'endTime', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={2}>
                    <Button
                      fullWidth
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => removePerformance(index)}
                    >
                      Remove
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 4 }}>
          <Button
            variant="outlined"
            onClick={() => navigate('/')}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Event' : 'Create Event')}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default EventEdit;
