  import React, { useState, useEffect, useCallback, createElement } from 'react';
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
  import ActiveBookingsWarning from '@/components/ActiveBookingsWarning';
  import useNavigate from '@/hooks/useNavigate';
  import { eventApi, theaterApi, imageApi } from '@/services/api';
  import { Event} from '@/shared/types/event';
  import { TheaterStats } from '@/shared/types/theater';
  import { toast } from '@/contexts/ToastContext';
  import { getErrorMessage } from '@/shared/utils/misc';
  import { useDialog } from '@/contexts/DialogContext';
  import useUnsavedChanges from '@/hooks/useUnsavedChanges';
  import TagSelector from './TagSelector';
  import ImageUploadSection from './ImageUploadSection';
  import ImageUploadEditPopup from './ImageUploadEditPopup';
  import { CastEditor, type CastEntry } from './CastEditor';
  import config from '@/config';

  // Helper to convert Event from API to form state (Dayjs for dates/times)
  const eventFromApi = (apiEvent: Event): Partial<Event> & {
    openingDateObj: Dayjs | null;
    closingDateObj: Dayjs | null;
    typicalStartTimeObj: Dayjs | null;
    typicalEndTimeObj: Dayjs | null;
  } => ({
    ...apiEvent,
    openingDateObj: apiEvent.openingDate ? dayjs(apiEvent.openingDate) : null,
    closingDateObj: apiEvent.closingDate ? dayjs(apiEvent.closingDate) : null,
    typicalStartTimeObj: apiEvent.typicalStartTime ? dayjs(apiEvent.typicalStartTime, 'HH:mm') : null,
    typicalEndTimeObj: apiEvent.typicalEndTime ? dayjs(apiEvent.typicalEndTime, 'HH:mm') : null,
  });

  const EventEdit: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    //const { isOperator } = useAuth();

    const isEditMode = id && id !== 'new';
    const isAtLeastMd = useMediaQuery(theme.breakpoints.up('md'));

    const GENRES_PRESETS = [
      t('Comedy'),
      t('Drama'),
      t('Opera'),
      t('Musical'),
      t('Tragedy'),
      t('Ballet'),
    ];
    const LANGUAGES_PRESETS = [
      t('English'),
      t('Italian'),
      t('French'),
      t('German'),
      t('Spanish'),
    ];
    const RATING_PRESETS = [
      t('G - General Audiences'),
      t('PG - Parental Guidance Suggested'),
      t('PG-13 - Parents Strongly Cautioned'),
      t('R - Restricted'),
      t('NC-17 - Adults Only'),
    ];

    // Default empty event for new/create mode
    const getDefaultEvent = (): Partial<Event> & {
      openingDateObj: Dayjs | null;
      closingDateObj: Dayjs | null;
      typicalStartTimeObj: Dayjs | null;
      typicalEndTimeObj: Dayjs | null;
    } => ({
      title: '',
      description: '',
      genres: [],
      durationMinutes: 120,
      intermissionCount: 1,
      rating: '',
      language: t('Italian'),
      director: '',
      playwright: '',
      producer: '',
      choreographer: '',
      musicalDirector: '',
      cast: [],
      theaterId: '',
      openingDateObj: null,
      closingDateObj: null,
      typicalStartTimeObj: null,
      typicalEndTimeObj: null,
      currency: config.app.defaultCurrency,
      baseTicketPrice: 0,
      specialRequirements: '',
      minimumAge: 0,
      posterImage: '',
      contentWarnings: '',
      status: 'scheduled',
      canceled: 0,
      cancelationReason: '',
      //performances: [],
    });

    const [theaters, setTheaters] = useState<TheaterStats[]>([]);
    const [saving, setSaving] = useState(false);
    const [event, setEvent] = useState<Partial<Event> & {
      openingDateObj: Dayjs | null;
      closingDateObj: Dayjs | null;
      typicalStartTimeObj: Dayjs | null;
      typicalEndTimeObj: Dayjs | null;
    }>(getDefaultEvent());
    const [isImageUploadPopupOpen, setIsImageUploadPopupOpen] = useState(false);
    const [rawPrice, setRawPrice] = useState<string>('');

    const showDialog = useDialog();

    const [isDirty, setIsDirty] = useState(false);
    useUnsavedChanges(isDirty);

    const loadEvent = useCallback(
      async (overrideTheaterId?: string) => {
        try {
          const response = await eventApi.getEventById(id!);
          const apiEvent = response.data;
          const converted = eventFromApi(apiEvent);
          if (overrideTheaterId) {
            converted.theaterId = overrideTheaterId;
          }
          setEvent(converted);
          setIsDirty(false);
        } catch (error) {
          toast.error(getErrorMessage(error));
        }
      },
      [id, toast]
    );

    useEffect(() => {
      const state = (location.state as any)?.eventData;
      const incomingTheaterId = (location.state as any)?.eventData?.selectedTheaterId as string | undefined;

      (async () => {
        try {
          const response = await theaterApi.getAllTheaters();
          setTheaters(response.data);
          if (incomingTheaterId) {
            setEvent((prev) => ({ ...prev, theaterId: incomingTheaterId }));
          }
        } catch (error) {
          console.error(t('Failed to load theaters: {{err}}', { err: getErrorMessage(error) }));
        }

        if (incomingTheaterId && state) {
          setEvent({
            ...getDefaultEvent(),
            ...state,
            openingDateObj: state.openingDate ? dayjs(state.openingDate) : null,
            closingDateObj: state.closingDate ? dayjs(state.closingDate) : null,
            typicalStartTimeObj: state.typicalStartTime ? dayjs(state.typicalStartTime) : null,
            typicalEndTimeObj: state.typicalEndTime ? dayjs(state.typicalEndTime) : null,
            theaterId: incomingTheaterId,
          });
          setIsDirty(true);
        } else if (isEditMode) {
          await loadEvent(incomingTheaterId);
        }
      })();
    }, [isEditMode, loadEvent, location.state, t]);

    // Set rawPrice when event.baseTicketPrice changes
    useEffect(() => {
      setRawPrice((event.baseTicketPrice ?? 0).toFixed(2));
    }, [event.baseTicketPrice]);

    const handleSave = async () => {
      if (!event.title) {
        toast.warning(t('Title is mandatory'));
        return;
      }
      if (!event.theaterId) {
        toast.warning(t('A theater must be selected'));
        return;
      }

      try {
        setSaving(true);

        const {
          openingDateObj,
          closingDateObj,
          typicalStartTimeObj,
          typicalEndTimeObj,
          ...cleanEvent
        } = event;

        const eventData: Partial<Event> = {
          ...cleanEvent,
          openingDate: openingDateObj?.format('YYYY-MM-DD'),
          closingDate: closingDateObj?.format('YYYY-MM-DD'),
          typicalStartTime: typicalStartTimeObj?.format('HH:mm'),
          typicalEndTime: typicalEndTimeObj?.format('HH:mm'),
        };

        if (isEditMode) {
          const response = await eventApi.updateEvent(id, eventData);
          const result = response.data;

          // Check if the update was blocked by active bookings
          if (result.blockedBy?.length) {
            // Show the guard dialog (same as handleGuardResult)
            const confirmed = await showDialog({
              title: t('Active bookings exist'),
              content: createElement(ActiveBookingsWarning, {
                bookings: result.blockedBy,
                action: 'event',
                verb: 'edit',
              }),
              cancelText: t('Handle bookings'),
              confirmText: t('Cancel'),
              shrinkToContent: true,
              mode: 'warning',
            });
            if (!confirmed) {
              setIsDirty(false);
              navigate('/bookings');
            }
            return;
          }

          // Normal success case
          if (result.updated === true) {
            toast.success(t('Event updated successfully!'));
            setIsDirty(false);
            navigate(-1);
            return;
          }

          // Fallback error
          toast.error(t('Event not updated'));
          return;
        }

        // Create mode
        const response = await eventApi.createEvent(eventData);
        if (response.data?.id) {
          toast.success(t('Event created successfully!'));
          setIsDirty(false);
          navigate(-1);
        } else {
          toast.error(t('Event not created'));
        }
      } catch (error) {
        const err = getErrorMessage(error);
        const msg = isEditMode
          ? t('Failed to update event: {{err}}', { err })
          : t('Failed to create event: {{err}}', { err });
        toast.error(msg);
      } finally {
        setSaving(false);
      }
    };

    // Generic handler for simple fields
    const handleFieldChange = (field: keyof typeof event) => (value) => {
      setEvent((prev) => ({ ...prev, [field]: value }));
      setIsDirty(true);
    };

    const handleGenresChange = (genres: string[]) => {
      setEvent((prev) => ({ ...prev, genres }));
      setIsDirty(true);
    };

    const handleCastChange = (cast: CastEntry[]) => {
      setEvent((prev) => ({ ...prev, cast }));
      setIsDirty(true);
    };

    const handleCanceledToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
      const canceled = e.target.checked ? 1 : 0;
      setEvent((prev) => ({ ...prev, canceled }));
      setIsDirty(true);
    };

    return (
      <Container maxWidth="lg" sx={{ p: { xs: 2, sm: 4 }, mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 4 } }}>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
            <TheaterComedyIcon fontSize="large" />
            {isEditMode ? t('Edit Event') : t('Create New Event')}
          </Typography>

          <Grid container spacing={3}>
            {/* Title */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('Title')}
                value={event.title || ''}
                onChange={(e) => handleFieldChange('title')(e.target.value)}
                required
                autoFocus
              />
            </Grid>

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('Description')}
                value={event.description || ''}
                onChange={(e) => handleFieldChange('description')(e.target.value)}
                multiline
                rows={3}
              />
            </Grid>

            {/* Genres */}
            <Grid item xs={6}>
              <TagSelector
                label={t('Genere')}
                storageKey="eventGenresCustom"
                presetOptions={GENRES_PRESETS}
                value={event.genres || []}
                onChange={handleGenresChange}
                multiple
              />
            </Grid>

            {/* Language */}
            <Grid item xs={6}>
              <TagSelector
                label={t('Language')}
                storageKey="eventLanguageCustom"
                presetOptions={LANGUAGES_PRESETS}
                value={event.language || ''}
                onChange={handleFieldChange('language')}
                multiple={false}
              />
            </Grid>

            {/* Duration & Intermissions */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label={t('Duration (minutes)')}
                type="number"
                value={event.durationMinutes || 0}
                onChange={(e) => handleFieldChange('durationMinutes')(parseInt(e.target.value) || 0)}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label={t('Intermissions')}
                type="number"
                value={event.intermissionCount || 0}
                onChange={(e) => handleFieldChange('intermissionCount')(parseInt(e.target.value) || 0)}
                inputProps={{ min: 0 }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TagSelector
                label={t('Rating')}
                storageKey="eventRatingCustom"
                presetOptions={RATING_PRESETS}
                value={event.rating || ''}
                onChange={handleFieldChange('rating')}
                multiple={false}
              />
            </Grid>

            {/* Theater selection */}
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>{t('Theater')}</InputLabel>
                <Select
                  value={event.theaterId || ''}
                  label={t('Theater')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '<new>') {
                      setIsDirty(false);
                      navigate('/theater/new', {
                        state: {
                          returnTo: `/event/${id ?? 'new'}`,
                          eventData: {
                            ...event,
                            openingDate: event.openingDateObj?.toISOString(),
                            closingDate: event.closingDateObj?.toISOString(),
                            typicalStartTime: event.typicalStartTimeObj?.toISOString(),
                            typicalEndTime: event.typicalEndTimeObj?.toISOString(),
                          },
                        },
                        replace: true,
                      });
                    } else {
                      handleFieldChange('theaterId')(val);
                    }
                  }}
                >
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
                value={event.director || ''}
                onChange={(e) => handleFieldChange('director')(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label={t('Playwright')}
                value={event.playwright || ''}
                onChange={(e) => handleFieldChange('playwright')(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label={t('Producer')}
                value={event.producer || ''}
                onChange={(e) => handleFieldChange('producer')(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label={t('Choreographer')}
                value={event.choreographer || ''}
                onChange={(e) => handleFieldChange('choreographer')(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label={t('Musical Director')}
                value={event.musicalDirector || ''}
                onChange={(e) => handleFieldChange('musicalDirector')(e.target.value)}
              />
            </Grid>

            {/* Cast */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                {t('Actors')}
              </Typography>
              <CastEditor value={event.cast || []} onChange={handleCastChange} />
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
                  value={event.openingDateObj}
                  onChange={(newValue) => handleFieldChange('openingDateObj')(newValue)}
                  maxDate={event.closingDateObj || undefined}
                  sx={{ width: '100%' }}
                  slotProps={{
                    inputAdornment: { sx: { ml: 0 } },
                    openPickerButton: { sx: { p: '4px' } },
                  }}
                />
                <DatePicker
                  label={t('End Date')}
                  value={event.closingDateObj}
                  onChange={(newValue) => handleFieldChange('closingDateObj')(newValue)}
                  minDate={event.openingDateObj || undefined}
                  sx={{ width: '100%' }}
                  slotProps={{
                    inputAdornment: { sx: { ml: 0 } },
                    openPickerButton: { sx: { p: '4px' } },
                  }}
                />
              </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
              <Stack direction="row" spacing={1}>
                <TimePicker
                  label={isAtLeastMd ? t('Typical Start Time') : t('Start Time')}
                  value={event.typicalStartTimeObj}
                  onChange={(newValue) => handleFieldChange('typicalStartTimeObj')(newValue)}
                  sx={{ width: '100%' }}
                />
                <TimePicker
                  label={isAtLeastMd ? t('Typical End Time') : t('End Time')}
                  value={event.typicalEndTimeObj}
                  onChange={(newValue) => handleFieldChange('typicalEndTimeObj')(newValue)}
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
                  value={event.currency || ''}
                  label={t('Currency')}
                  onChange={(e) => handleFieldChange('currency')(e.target.value)}
                >
                  <MenuItem value="">{t('none')}</MenuItem>
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
                type="text"
                // value={(event.baseTicketPrice ?? 0).toFixed(2)}
                value={rawPrice}
                // onChange={(e) => {
                //   const num = parseFloat(e.target.value) || 0;
                //   handleFieldChange('baseTicketPrice')(num);
                // }}
                onChange={(e) => {
                  const input = e.target.value;
                  // Allow only digits and one dot
                  if (/^\d*\.?\d*$/.test(input)) {
                    setRawPrice(input);
                  }
                }}
                onBlur={() => {
                  const num = parseFloat(rawPrice);
                  const finalNum = isNaN(num) ? 0 : num;
                  handleFieldChange('baseTicketPrice')(finalNum);
                  setRawPrice(finalNum.toFixed(2));
                }}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start" sx={{ mt: -0.2 }}>
                      {config.app.currencies[event.currency || '']?.symbol}
                    </InputAdornment>
                  ),
                }}
                // inputProps={{ min: 0, step: 1 }}
                disabled={!event.currency}
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
                value={event.minimumAge ?? 0}
                onChange={(e) => handleFieldChange('minimumAge')(parseInt(e.target.value) || 0)}
                inputProps={{ min: 0 }}
              />
            </Grid>
            {isAtLeastMd && <Grid item xs={12} md={9} />}

            {/* Poster Image */}
            <Grid item xs={12} md={9}>
              <ImageUploadSection
                label={t('Poster Image')}
                imageFilename={event.posterImage ?? null}
                onUploadClick={() => setIsImageUploadPopupOpen(true)}
                onClearClick={() => {
                  if (event.posterImage) {
                    imageApi.delete(event.posterImage).catch(() => {});
                  }
                  handleFieldChange('posterImage')(null);
                }}
              />
            </Grid>
            {isAtLeastMd && <Grid item xs={12} md={9} />}

            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('Special Requirements')}
                value={event.specialRequirements || ''}
                onChange={(e) => handleFieldChange('specialRequirements')(e.target.value)}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label={t('Content Warnings')}
                value={event.contentWarnings || ''}
                onChange={(e) => handleFieldChange('contentWarnings')(e.target.value)}
                multiline
                rows={2}
              />
            </Grid>

            {/* Cancel event (edit mode only) */}
            {isEditMode && (
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch checked={event.canceled === 1} onChange={handleCanceledToggle} />
                  }
                  label={t('Cancel event')}
                />
              </Grid>
            )}
            {event.canceled === 1 && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={t('Cancelation reason')}
                  value={event.cancelationReason || ''}
                  onChange={(e) => handleFieldChange('cancelationReason')(e.target.value)}
                />
              </Grid>
            )}
          </Grid>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 4 }}>
            <Button variant="outlined" onClick={() => navigate(-1)} disabled={saving}>
              {t('Cancel')}
            </Button>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}>
              {saving
                ? isEditMode
                  ? t('Updating...')
                  : t('Creating...')
                : isEditMode
                ? t('Update Event')
                : t('Create Event')}
            </Button>
          </Box>
        </Paper>

        {/* Image Upload Popup */}
        <ImageUploadEditPopup
          open={isImageUploadPopupOpen}
          onClose={() => setIsImageUploadPopupOpen(false)}
          onSave={(filename) => {
            handleFieldChange('posterImage')(filename);
          }}
          imageType="poster"
          simpleMode={false}
          //fixedAspectRatio={9 / 16}
          maxSizeMB={10}
          title={t('Upload poster image')}
          existingImageUrl={event.posterImage ? ('/uploads/' + event.posterImage) : undefined}
        />
      </Container>
    );
  };

  export default EventEdit;
