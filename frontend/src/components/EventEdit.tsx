import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMediaQuery, useTheme } from '@mui/material';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Grid,
  //Alert,
  FormControl,
  FormControlLabel,
  Switch,
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
import { useSetup } from '@/contexts/SetupContext';
import { toast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/utils/misc';
import TagSelector from './TagSelector';
import ImageUploadSection from './ImageUploadSection';
import ImageUploadEditPopup from './ImageUploadEditPopup';
import { CastEditor, type CastEntry } from './CastEditor'; 
//import type { CurrencyCode } from '@/shared/config';
import config from '@/config';


const EventEdit: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { isOperator } = useAuth();
  
  const isEditMode = id && id !== 'new';

  const isAtLeastMd = useMediaQuery(theme.breakpoints.up('md'));

  const setup = useSetup();

  // TODO: to config
  const GENRES_PRESETS = [
    t('Comedy'),
    t('Drama'),
    t('Opera'),
    t('Musical'),
    t('Tragedy'),
    t('Ballet')
  ];
  const LANGUAGES_PRESETS = [
    t('English'),
    t('Italian'),
    t('French'),
    t('German'),
    t('Spanish')
  ];
  const RATING_PRESETS = [
    t('G - General Audiences'), t('PG - Parental Guidance Suggested'),
    t('PG-13 - Parents Strongly Cautioned'),
    t('R - Restricted'),
    t('NC-17 - Adults Only')
  ];

  //const incomingTheaterId = (location.state as any)?.eventData?.selectedTheaterId ?? '';
  
  const [theaters, setTheaters] = useState<TheaterStats[]>([]);
  const [saving, setSaving] = useState(false);
  //const [error, setError] = useState('');

  // Event fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  //const [genre, setGenre] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [durationMinutes, setDurationMinutes] = useState<number>(120);
  const [intermissionCount, setIntermissionCount] = useState<number>(1);
  const [rating, setRating] = useState('');
  const [language, setLanguage] = useState<string>(t('Italian')); // TODO: from config.app.events.default.language
  const [director, setDirector] = useState('');
  const [playwright, setPlaywright] = useState('');
  const [producer, setProducer] = useState('');
  const [choreographer, setChoreographer] = useState('');
  const [musicalDirector, setMusicalDirector] = useState('');
  const [cast, setCast] = useState<CastEntry[]>([]);
  const [canceled, setCanceled] = useState(false);
  const [cancelationReason, setCancelationReason] = useState('');
  const [theaterId, setTheaterId] = useState('');

  const [openingDate, setOpeningDate] = useState<Dayjs | null>(null);
  const [closingDate, setClosingDate] = useState<Dayjs | null>(null);
  const [typicalStartTime, setTypicalStartTime] = useState<Dayjs | null>(null);
  const [typicalEndTime, setTypicalEndTime] = useState<Dayjs | null>(null);

  //const [currency, setCurrency] = useState<CurrencyCode>(config.app.defaultCurrency); // if we will need a user selectable default currency, we will read from it...
  const [currency, setCurrency] = useState(config.app.defaultCurrency);
  const [baseTicketPrice, setBaseTicketPrice] = useState<number>(0); // TODO: to config
  const [baseTicketPriceDisplay, setBaseTicketPriceDisplay] = useState(baseTicketPrice.toFixed(2));
  
  const [specialRequirements, setSpecialRequirements] = useState('');
  const [minimumAge, setMinimumAge] = useState<number>(0);

  const [contentWarnings, setContentWarnings] = useState('');
  const [status, setStatus] = useState<'scheduled' | 'in progress' | 'completed' | 'canceled'>('scheduled');
  // Performances
  const [performances, setPerformances] = useState<Partial<EventPerformance>[]>([]);

  // Image upload state
  const [posterImage, setPosterImage] = useState<string | null>(null);
  const [isImageUploadPopupOpen, setIsImageUploadPopupOpen] = useState(false);

  const loadEvent = useCallback(async (overrideTheaterId?: string) => {
    toast.info('loading');
    try {
      const response = await eventApi.getEventById(id!);
      const event = response.data;
      
      setTitle(event.title);
      setDescription(event.description || '');
      //setGenre(event.genre || '');
      //setGenres(JSON.parse(event.genres || ''));
      if (event.genres) {
        setGenres(typeof event.genres === 'string' ? JSON.parse(event.genres) : event.genres);
      }
      setDurationMinutes(event.durationMinutes || 120);
      setIntermissionCount(event.intermissionCount || 1);
      setRating(event.rating || '');
      setLanguage(event.language || 'Italian'); // TODO: from config
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
      
      setCurrency(event.currency);
      setBaseTicketPrice(event.baseTicketPrice);
      setBaseTicketPriceDisplay(event.baseTicketPrice.toFixed(2));
      //setCurrency(event.currency as any);
      setSpecialRequirements(event.specialRequirements || '');
      setMinimumAge(event.minimumAge || 0);
      setPosterImage(event.posterImage || null);
      setContentWarnings(event.contentWarnings || '');
      setStatus(event.status);
      setCanceled(event.canceled === 1);
      setCancelationReason(event.cancelationReason || '');

      if (event.performances) {
        setPerformances(event.performances);
      }

      setTheaterId(overrideTheaterId ?? event.theaterId); // Use override if provided

      //setError('');
    } catch (error: any) {
      toast.error(getErrorMessage(error));
    }
  }, [id, toast]);

  useEffect(() => {
    if (!isOperator) {
      navigate(-1);
      return;
    }

    const state = (location.state as any)?.eventData;
    const incomingTheaterId = (location.state as any)?.eventData?.selectedTheaterId as string | undefined;

    (async () => {
      try {
        const response = await theaterApi.getAllTheaters();
        setTheaters(response.data);
        if (incomingTheaterId) {
          setTheaterId(incomingTheaterId);
        }
      } catch (error: any) {
        console.error(t('Failed to load theaters: {{err}}', { err: error.response?.data?.error }));
      }
      if (incomingTheaterId && state) {
        // Restore form snapshot: no loadEvent needed, data comes from state
        if (state.title !== undefined) setTitle(state.title);
        if (state.description !== undefined) setDescription(state.description);
        if (state.genres !== undefined) setGenres(state.genres);
        if (state.durationMinutes !== undefined) setDurationMinutes(state.durationMinutes);
        if (state.intermissionCount !== undefined) setIntermissionCount(state.intermissionCount);
        if (state.rating !== undefined) setRating(state.rating);
        if (state.language !== undefined) setLanguage(state.language);
        if (state.director !== undefined) setDirector(state.director);
        if (state.playwright !== undefined) setPlaywright(state.playwright);
        if (state.producer !== undefined) setProducer(state.producer);
        if (state.choreographer !== undefined) setChoreographer(state.choreographer);
        if (state.musicalDirector !== undefined) setMusicalDirector(state.musicalDirector);
        if (state.cast !== undefined) setCast(state.cast);
        if (state.openingDate) setOpeningDate(dayjs(state.openingDate));
        if (state.closingDate) setClosingDate(dayjs(state.closingDate));
        if (state.typicalStartTime) setTypicalStartTime(dayjs(state.typicalStartTime));
        if (state.typicalEndTime) setTypicalEndTime(dayjs(state.typicalEndTime));
        if (state.currency !== undefined) setCurrency(state.currency);
        if (state.baseTicketPrice !== undefined) setBaseTicketPrice(state.baseTicketPrice);
        if (state.specialRequirements !== undefined) setSpecialRequirements(state.specialRequirements);
        if (state.minimumAge !== undefined) setMinimumAge(state.minimumAge);
        if (state.posterImage !== undefined) setPosterImage(state.posterImage);
        if (state.contentWarnings !== undefined) setContentWarnings(state.contentWarnings);
        if (state.status !== undefined) setStatus(state.status);
      } else
        if (isEditMode) {
          await loadEvent(incomingTheaterId);
        }
    })();
  }, [isOperator]);
  
  // // Pick up selectedTheaterId when returning from TheaterEdit
  // useEffect(() => {
  //   const state = location.state as { eventData?: { selectedTheaterId?: string } } | null;
  //   const selectedTheaterId = state?.eventData?.selectedTheaterId;
  //   if (!selectedTheaterId) return;

  //   (async () => {
  //     await Promise.all([
  //       loadTheaters(),
  //       isEditMode ? loadEvent() : Promise.resolve(), // Loads old theaterId from server
  //     ]);
  //     setTheaterId(selectedTheaterId); // Then override it here, last
  //   })();
  // }, [location.state]);

  const handleSave = async () => {
    // verify event feasibility
    if (!title) {
      toast.warning(t('Title is mandatory'));
      return;
    }
    if (!theaterId) {
      toast.warning(t('A theater must be selected'));
      return;
    }

    try {
      setSaving(true);
      //setError('');

      const eventData: Partial<Event> = {
        title,
        description,
        genres,
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
        currency,
        baseTicketPrice,
        specialRequirements,
        minimumAge,
        posterImage: posterImage ?? undefined,
        contentWarnings,
        status,
        canceled: canceled ? 1 : 0,
        cancelationReason,
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
      //setError(msg);
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
    <Container maxWidth="lg" sx={{ p: { xs: 2, sm: 4 }, mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 } }}>
        {/* <Typography variant="h4" gutterBottom>
          {isEditMode ? t('Edit Event') : t('Create New Event')}
        </Typography> */}
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
          <TheaterComedyIcon fontSize="large" /> {isEditMode ? t('Edit Event') : t('Create New Event')}
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label={t('Title')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </Grid>

          {/* <Grid item xs={12} md={4}>
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
                <MenuItem value="canceled">{t('canceled')}</MenuItem>
              </Select>
            </FormControl>
          </Grid> */}
          

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

          <Grid item xs={6}>
            {/* <TextField
              fullWidth
              label={t('Genre')}
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              placeholder={t('Drama, Comedy, Musical, etc.')}
            /> */}
            <TagSelector
              label={t('Genere')}
              storageKey='eventGenresCustom'
              presetOptions={GENRES_PRESETS}
              value={genres}
              onChange={setGenres}
              multiple
            />
            {/* <TagSelector
              label={t('Genere')}
              storageKey='genresCustom'
              value={genres}
              onChange={setGenres}
              defaultOptions={[
                'Comedy',
                'Drama',
                'Opera',
                'Musical',
                'Tragedy'
              ]}
            /> */}
          </Grid>

          <Grid item xs={6}>
            {/* <TextField
              fullWidth
              label={t('Language')}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            /> */}
            <TagSelector
              label={t('Language')}
              storageKey='eventLanguageCustom'
              presetOptions={LANGUAGES_PRESETS}
              value={language}
              onChange={setLanguage}
              multiple={false}
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
            {/* <TextField
              fullWidth
              label={t('Rating')}
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              placeholder={t('PG, PG-13, R, etc.')}
            /> */}
            <TagSelector
              label={t('Rating')}
              storageKey='eventRatingCustom'
              presetOptions={RATING_PRESETS}
              value={rating}
              onChange={setRating}
              multiple={false}
            />
          </Grid>

          {/* Venue Information */}
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>{t('Theater')}</InputLabel>
              <Select
                value={theaterId}
                label={t('Theater')}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '<new>') {
                    // Collect current form state so it survives navigation
                    navigate('/theater/new', {
                      state: {
                        returnTo: `/event/${id ?? 'new'}`,
                        eventData: {
                          title,
                          description,
                          genres,
                          durationMinutes,
                          intermissionCount,
                          rating,
                          language,
                          director,
                          playwright,
                          producer,
                          choreographer,
                          musicalDirector,
                          cast,
                          theaterId,
                          openingDate: openingDate?.toISOString(),
                          closingDate: closingDate?.toISOString(),
                          typicalStartTime: typicalStartTime?.toISOString(),
                          typicalEndTime: typicalEndTime?.toISOString(),
                          currency,
                          baseTicketPrice,
                          specialRequirements,
                          minimumAge,
                          posterImage,
                          contentWarnings,
                          status,
                          canceled,
                          cancelationReason,
                        },
                      },
                      replace: true,
                    });
                  } else {
                    setTheaterId(val);
                  }
                }}
              >
                {console.log('[Select render] value:', theaterId, 'options:', theaters.map(t => t.id)) as any}
                <MenuItem value="<new>"><i>{t('New Theater')}</i></MenuItem>
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
            <Stack direction="row" spacing={1}>
              <DatePicker
                label={t('Start Date')}
                value={openingDate}
                onChange={(newValue) => setOpeningDate(newValue as any)}
                maxDate={closingDate || undefined}
                sx={{ width: '100%' }}
                slotProps={{
                  inputAdornment: {
                    sx: { ml: 0 }, // Removes left margin on the icon container
                  },
                  openPickerButton: {
                    sx: { p: '4px' }, // Reduces icon button padding (default is ~8px)
                  },
                }}
              />
              <DatePicker
                label={t('End Date')}
                value={closingDate}
                onChange={(newValue) => setClosingDate(newValue as any)}
                minDate={openingDate || undefined}
                sx={{ width: '100%' }}
                slotProps={{
                  inputAdornment: {
                    sx: { ml: 0 }, // Removes left margin on the icon container
                  },
                  openPickerButton: {
                    sx: { p: '4px' }, // Reduces icon button padding (default is ~8px)
                  },
                }}
              />
            </Stack>
          </Grid>

          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={1}>
              <TimePicker
                label={isAtLeastMd ? t('Typical Start Time') : t('Start Time')}
                value={typicalStartTime}
                onChange={(newValue) => setTypicalStartTime(newValue as any)}
                sx={{ width: '100%' }}
              />
              <TimePicker
                label={isAtLeastMd ? t('Typical End Time') : t('End Time')}
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
                <MenuItem key={'none'} value={''}>
                  {t('none')}
                </MenuItem>
                {/*
                {Object.values(config.app.currencies).map((currency) => (
                  <MenuItem key={currency.name} value={currency.symbol}>
                    {currency.symbol} ({currency.name})
                  </MenuItem>
                ))}
                */}
                {Object.entries(config.app.currencies).map(([key, currency]) => (
                  <MenuItem key={key} value={key}>
                    {currency.symbol} ({currency.name})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={8} md={6}>
            <TextField
              fullWidth
              label={t('Base Ticket Price')}
              type="number"
              value={baseTicketPriceDisplay}
              onChange={(e) => {
                setBaseTicketPriceDisplay(e.target.value);
                setBaseTicketPrice(parseFloat(e.target.value) || 0)
              }}
              onFocus={() => {
                if (baseTicketPrice === 0) {
                  setBaseTicketPriceDisplay('');
                } else {
                  setBaseTicketPriceDisplay(baseTicketPrice.toString());
                }
              }}
              onBlur={() => {
                setBaseTicketPriceDisplay(baseTicketPrice.toFixed(2))
              }}
              required
              InputProps={{
                startAdornment: (
                  //<InputAdornment position="start">{config.app.currencies[currency].symbol}</InputAdornment>,
                  <InputAdornment position="start" sx={{ mt: -0.2 }}>
                    {config.app.currencies[currency]?.symbol}
                  </InputAdornment>
                )
              }}
              inputProps={{ min: 0, step: 1 }}
              disabled={currency === ''}
            />
          </Grid>

          {/* Additional Information */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              {t('Additional Information')}
            </Typography>
          </Grid>

          <Grid item xs={6} md={3}>
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
                  imageApi.delete(posterImage).catch(() => { }); // TODO: handle errors...
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

          {isEditMode && ( // Do not show set canceled switch when creating event
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={canceled}
                    onChange={(e) => setCanceled(e.target.checked)}
                  />
                }
                label={t('Cancel event')}
              />
            </Grid>
          )}

          {canceled && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('Cancelation reason')}
                value={cancelationReason}
                onChange={(e) => setCancelationReason(e.target.value)}
              />
            </Grid>
          )}

          {/* Performances */}
          {isEditMode && ( // Show Performances button only when editing event
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, mb: 2 }}>
                <Button
                  startIcon={<TheaterComedyIcon />}
                  onClick={() => navigate(`/event/${id}`)}
                  variant="outlined"
                >
                  {t('Performances')}
                </Button>
              </Box>
            </Grid>
          )}

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
