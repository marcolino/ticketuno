import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useMediaQuery, useTheme } from '@mui/material';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Grid,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Stack,
} from '@mui/material';
import {
  Save as SaveIcon,
  TheaterComedy as TheaterComedyIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import dayjs, { Dayjs } from 'dayjs';
import useNavigate from '@/hooks/useNavigate';
import { eventApi, theaterApi, imageApi } from '@/services/api';
import { Event, EventPerformance } from '@/shared/types/event';
import { TheaterStats } from '@/shared/types/theater';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/contexts/ToastContext';
import ImageUploadSection from './ImageUploadSection';
import ImageUploadEditPopup from './ImageUploadEditPopup';
import { CastEditor, type CastEntry } from './CastEditor'; 
import { t } from 'i18next';
import config, { CurrencyCode } from '@/config';

const EventEdit: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, isAdmin } = useAuth();

  const isEditMode = id && id !== 'new';

  const isAtLeastMd = useMediaQuery(theme.breakpoints.up('md'));
  
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
  const [cast, setCast] = useState<CastEntry[]>([]);

  const [theaterId, setTheaterId] = useState('');

  const [openingDate, setOpeningDate] = useState<Dayjs | null>(null);
  const [closingDate, setClosingDate] = useState<Dayjs | null>(null);
  const [typicalStartTime, setTypicalStartTime] = useState<Dayjs | null>(null);
  const [typicalEndTime, setTypicalEndTime] = useState<Dayjs | null>(null);

  const [baseTicketPrice, setBaseTicketPrice] = useState<number>(50);
  const [baseTicketPriceDisplay, setBaseTicketPriceDisplay] = useState(baseTicketPrice.toFixed(2));
  
  const [currency, setCurrency] = useState(config.app.defaultCurrency); // if we will need a user selectable default currency, we will read from it...
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [minimumAge, setMinimumAge] = useState<number>(0);

  const [contentWarnings, setContentWarnings] = useState('');
  const [status, setStatus] = useState<'scheduled' | 'in progress' | 'completed' | 'cancelled'>('scheduled');
  // Performances
  const [performances, setPerformances] = useState<Partial<EventPerformance>[]>([]);

  // Image upload state
  const [posterImage, setPosterImage] = useState<string | null>(null);
  const [isImageUploadPopupOpen, setIsImageUploadPopupOpen] = useState(false);
  
  const loadTheaters = async () => {
    try {
      const response = await theaterApi.getAllTheaters();
      setTheaters(response.data);
    } catch (error: any) { // TODO: comnsole.error ???
      console.error(t('Failed to load theaters: {{err}}', { err: error.response?.data?.error }));
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
      if (event.cast) {
        setCast(typeof event.cast === 'string' ? JSON.parse(event.cast) : event.cast);
      }

      setTheaterId(event.theaterId);
      
      if (event.openingDate) setOpeningDate(dayjs(event.openingDate));
      if (event.closingDate) setClosingDate(dayjs(event.closingDate));
      if (event.typicalStartTime) setTypicalStartTime(dayjs(event.typicalStartTime, 'HH:mm'));
      if (event.typicalEndTime) setTypicalEndTime(dayjs(event.typicalEndTime, 'HH:mm'));
      
      setBaseTicketPrice(event.baseTicketPrice);
      setBaseTicketPriceDisplay(event.baseTicketPrice.toFixed(2));
      setCurrency(event.currency as any);
      setSpecialRequirements(event.specialRequirements || '');
      setMinimumAge(event.minimumAge || 0);
      setPosterImage(event.posterImage || null);
      setContentWarnings(event.contentWarnings || '');
      setStatus(event.status);

      if (event.performances) {
        setPerformances(event.performances);
      }

      setError('');
    } catch (err: any) {
      setError(t('Failed to load event: {{err}}', { err: err.response?.data?.error }));
    }
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate(-1);
      return;
    }

    loadTheaters();
    if (isEditMode) {
      loadEvent();
    }
  }, [isAuthenticated, isAdmin, isEditMode, navigate, loadEvent]);
  
  const handleSave = async () => {
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
        cast: cast as any,
        theaterId,
        openingDate: openingDate?.format('YYYY-MM-DD'),
        closingDate: closingDate?.format('YYYY-MM-DD'),
        typicalStartTime: typicalStartTime?.format('HH:mm'),
        typicalEndTime: typicalEndTime?.format('HH:mm'),
        baseTicketPrice,
        currency,
        specialRequirements,
        minimumAge,
        posterImage: posterImage ?? undefined,
        contentWarnings,
        status
      };

      let eventId: string;

      if (isEditMode) {
        await eventApi.updateEvent(id!, eventData);
        eventId = id!;
        toast.success('Event updated successfully!');
      } else {
        const response = await eventApi.createEvent(eventData);
        eventId = response.data.id;
        toast.success('Event created successfully!');
      }

      // Create new performances (only for new ones without id)
      for (const performance of performances) {
        if (!performance.id && performance.performanceDate && performance.startTime) {
          await eventApi.createPerformance(eventId, performance);
        }
      }

      navigate(-1);
    } catch (error: any) {
      const err = error.response?.data?.error || error.message;
      const msg = isEditMode ?
        t('Failed to update event: {{err}}', { err }) :
        t('Failed to create event: {{err}}', { err })
      ;
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // // Handle image upload callback from popup
  // const handleUploadImage = (imageUrl: string, imageData: any) => {
  //   if (!activeImageType) return;
    
  //   console.log('Image uploaded:', { imageUrl, imageData });
    
  //   setUploadedImages(prev => ({
  //     ...prev,
  //     [activeImageType]: {
  //       url: imageUrl,
  //       size: imageData.fileData?.size || 0,
  //       timestamp: new Date(),
  //       type: activeImageType
  //     }
  //   }));

  //   // Update the poster URL if it's a poster image
  //   if (activeImageType === 'poster') {
  //     setEventPosterUrl(imageUrl);
  //   }
    
  //   toast.success(t('Image uploaded successfully'));
  // };

  // const handleOpenPreview = (imageType: ImageType) => {
  //   const image = uploadedImages[imageType];
  //   if (image?.url) {
  //     window.open(image.url, '_blank');
  //   }
  // };

  // const handleClearImage = (imageType: ImageType) => {
  //   setUploadedImages(prev => ({
  //     ...prev,
  //     [imageType]: null
  //   }));
    
  //   if (imageType === 'poster') {
  //     setEventPosterUrl('');
  //   }
  // };
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          {isEditMode ? t('Edit Event') : t('Create New Event')}
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
              {t('Basic Information')}
            </Typography>
          </Grid>

          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              label={t("Title")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth required>
              <InputLabel>{t('Status')}</InputLabel>
              <Select
                value={status}
                label={t('Status')}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <MenuItem value="scheduled">{t('Scheduled')}</MenuItem>
                <MenuItem value="in progress">{t('In Progress')}</MenuItem>
                <MenuItem value="completed">{t('Completed')}</MenuItem>
                <MenuItem value="cancelled">{t('Cancelled')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label={t('Description')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              multiline
              rows={3}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label={t('Genre')}
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder={t('Drama, Comedy, Musical, etc.')}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label={t('Language')}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label={t('Duration (minutes)')}
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 0)}
              inputProps={{ min: 0 }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label={t('Intermissions')}
              type="number"
              value={intermissionCount}
              onChange={(e) => setIntermissionCount(parseInt(e.target.value) || 0)}
              inputProps={{ min: 0 }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label={t('Rating')}
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              placeholder={t('PG, PG-13, R, etc.')}
            />
          </Grid>

          {/* Venue Information */}
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>{t("Theater")}</InputLabel>
              <Select
                value={theaterId}
                label={t("Theater")}
                onChange={(e) => setTheaterId(e.target.value)}
              >
                {theaters.map((theater) => (
                  <MenuItem key={theater.id} value={theater.id}>
                    {theater.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Production Details */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              {t('Production Details')}
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label={t('Director')}
              value={director}
              onChange={(e) => setDirector(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label={t('Playwright')}
              value={playwright}
              onChange={(e) => setPlaywright(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label={t('Producer')}
              value={producer}
              onChange={(e) => setProducer(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label={t('Choreographer')}
              value={choreographer}
              onChange={(e) => setChoreographer(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label={t('Musical Director')}
              value={musicalDirector}
              onChange={(e) => setMusicalDirector(e.target.value)}
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              {t('Actors')}
            </Typography>
            <CastEditor
              //label={t('Cast')}
              value={cast}
              onChange={setCast}
              // Optional: pass your own preset roles instead of the component's defaults:
              // roleOptions={[
              //   { key: 'director',   value: t('Director')          },
              //   { key: 'lead',       value: t('Lead Actor')         },
              //   { key: 'supporting', value: t('Supporting Actor')   },
              //   { key: 'understudy', value: t('Understudy')         },
              //   { key: 'crew',       value: t('Stage Crew')         },
              // ]}
            />
          </Grid>

          {/* Schedule */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              {t('Schedule')}
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={2}>
              <DatePicker
                label={t('Start Date')}
                value={openingDate}
                onChange={(newValue) => setOpeningDate(newValue as any)}
                maxDate={closingDate || undefined}
                sx={{ width: '100%' }}
              />
              <DatePicker
                label={t('End Date')}
                value={closingDate}
                onChange={(newValue) => setClosingDate(newValue as any)}
                minDate={openingDate || undefined}
                sx={{ width: '100%' }}
              />
            </Stack>
          </Grid>

          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={2}>
              <TimePicker
                label={t('Typical Start Time')}
                value={typicalStartTime}
                onChange={(newValue) => setTypicalStartTime(newValue as any)}
                sx={{ width: '100%' }}
              />
              <TimePicker
                label={t('Typical End Time')}
                value={typicalEndTime}
                onChange={(newValue) => setTypicalEndTime(newValue as any)}
                sx={{ width: '100%' }}
              />
            </Stack>
          </Grid>

          {/* Pricing */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              {t('Pricing')}
            </Typography>
          </Grid>

          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>{t('Currency')}</InputLabel>
              <Select
                value={currency}
                label={t('Currency')}
                onChange={(e) => setCurrency(e.target.value as any)}
              >
                {/* {Object.values(config.app.currencies).map((currency) => (
                  <MenuItem key={currency.code} value={currency.code}>
                    {currency.code} ({currency.symbol})
                  </MenuItem>
                ))} */}
                {Object.entries(config.app.currencies).map(([code, currency]) => (
                  <MenuItem key={code} value={code}>
                    {code} ({currency.symbol})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={10}>
            <TextField
              fullWidth
              label={t('Base Ticket Price')}
              type="number"
              value={baseTicketPriceDisplay}
              onChange={(e) => {
                setBaseTicketPriceDisplay(e.target.value);
                setBaseTicketPrice(parseFloat(e.target.value) || 0)
              }}
              onFocus={() => setBaseTicketPriceDisplay(baseTicketPrice.toString())}
              onBlur={() => setBaseTicketPriceDisplay(baseTicketPrice.toFixed(2))}
              required
              InputProps={{
                startAdornment: (
                  //<InputAdornment position="start">{config.app.currencies[currency].symbol}</InputAdornment>,
                  <InputAdornment position="start" sx={{ mt: -0.2 }}>
                    {config.app.currencies[currency as CurrencyCode]?.symbol}
                  </InputAdornment>
                )
              }}
              inputProps={{ min: 0, step: 1 }}
            />
          </Grid>

          {/* Additional Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              {t('Additional Information')}
            </Typography>
          </Grid>

          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label={t('Minimum Age')}
              type="number"
              value={minimumAge}
              onChange={(e) => setMinimumAge(parseInt(e.target.value) || 0)}
              inputProps={{ min: 0 }}
            />
          </Grid>
          {isAtLeastMd && (
            <Grid item xs={12} md={9}>
            </Grid>
          )}

          {/* Poster Image Upload */}
          <Grid item xs={12} md={9}>
            <ImageUploadSection
              //type="poster"
              label={t('Poster Image')}
              // aspectRatio={9 / 16} // TODO: we need it...
              imageFilename={posterImage}
              onUploadClick={() => setIsImageUploadPopupOpen(true)}
              onClearClick={() => {
                if (posterImage) {
                  imageApi.delete(posterImage).catch(() => { });
                }
                setPosterImage(null);
              }}
              // uploadedImage={uploadedImages.poster}
              // onUploadClick={() => {
              //   setActiveImageType('poster');
              //   setIsImageUploadPopupOpen(true);
              // }}
              // onPreviewClick={() => handleOpenPreview('poster')}
              // onClearClick={() => handleClearImage('poster')}
            />
          </Grid>
          {isAtLeastMd && (
            <Grid item xs={12} md={9}>
            </Grid>
          )}

          <Grid item xs={12}>
            <TextField
              fullWidth
              label={t('Special Requirements')}
              value={specialRequirements}
              onChange={(e) => setSpecialRequirements(e.target.value)}
              multiline
              rows={2}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              label={t('Content Warnings')}
              value={contentWarnings}
              onChange={(e) => setContentWarnings(e.target.value)}
              multiline
              rows={2}
            />
          </Grid>

          {/* Performances */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 2 }}>
              <Button
                startIcon={<TheaterComedyIcon />}
                onClick={() => navigate(`/event/${id}`) }
                variant="outlined"
              >
                {t('Performances')}
              </Button>
            </Box>
          </Grid>

          {/*performances.map((perf, index) => (
            <Grid item xs={12} key={index}>
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label={t('Performance Date')}
                      type="date"
                      value={perf.performanceDate || ''}
                      onChange={(e) => updatePerformance(index, 'performanceDate', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label={t('Start Time')}
                      type="time"
                      value={perf.startTime || ''}
                      onChange={(e) => updatePerformance(index, 'startTime', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <TextField
                      fullWidth
                      label={t('End Time')}
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
                      {t('Remove')}
                    </Button>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          ))*/}
        </Grid>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 4 }}>
          <Button
            variant="outlined"
            onClick={() => navigate(-1)}
            disabled={saving}
          >
            {t('Cancel')}
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ?
              (isEditMode ? t('Updating...') : t('Creating...')) :
              (isEditMode ? t('Update Event') : t('Create Event'))
            }
          </Button>
        </Box>
      </Paper>

      {/* Image Upload Popup */}
      <ImageUploadEditPopup
        open={isImageUploadPopupOpen}
        onClose={() => {
          setIsImageUploadPopupOpen(false);
        }}
        onSave={(filename) => {
          setPosterImage(filename);
          //setIsImageUploadPopupOpen(false); // Do not close Dialog: it shows success, user clicks Done
        }}
        imageType={'poster'}
        simpleMode={true}
        fixedAspectRatio={16/9}
        maxSizeMB={10}
        title={t('Upload poster image')}
      />
    </Container>
  );
};

export default EventEdit;
