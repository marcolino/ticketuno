import React, { useState, useEffect, useCallback, useRef, createElement } from 'react';
import { useParams, useLocation, useBlocker } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMediaQuery, useTheme } from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
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
import TagSelector from './TagSelector';
import ImageUploadSection from './ImageUploadSection';
import ImageUploadEditPopup from './ImageUploadEditPopup';
import { CastEditor } from './CastEditor';
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
  language: 'Italian',
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

type EventFormValues = ReturnType<typeof getDefaultEvent>;

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

  const [theaters, setTheaters] = useState<TheaterStats[]>([]);
  const [isImageUploadPopupOpen, setIsImageUploadPopupOpen] = useState(false);

  const showDialog = useDialog();

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    watch,
    formState: { isDirty, isSubmitting },
  } = useForm<EventFormValues>({
    defaultValues: getDefaultEvent(),
  });

  // Watch only fields needed for cross-field JSX logic
  const openingDateObj = watch('openingDateObj');
  const closingDateObj = watch('closingDateObj');
  const currency = watch('currency');
  const canceled = watch('canceled');

  // Ref-based escape hatch for intentional navigations (save, sub-flow to theater/new).
  // isDirty is still true when navigate() fires synchronously after handleSubmit;
  // the ref is read immediately by the blocker condition, bypassing the render cycle.
  const skipBlocker = useRef(false);

  // --- Navigation blocker: prompt on unsaved changes ---
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !skipBlocker.current &&
      isDirty &&
      currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    (async () => {
      const confirmed = await showDialog({
        title: t('Unsaved changes'),
        content: t('You have unsaved changes. Leave anyway?'),
        confirmText: t('Leave'),
        cancelText: t('Stay'),
        mode: 'warning',
      });
      if (confirmed) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    })();
  }, [blocker.state]);

  // Handles browser tab close / hard refresh — cases useBlocker cannot intercept
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      (e as any).returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const loadEvent = useCallback(
    async (overrideTheaterId?: string) => {
      try {
        const response = await eventApi.getEventById(id!);
        const apiEvent = response.data;
        const converted = eventFromApi(apiEvent);
        if (overrideTheaterId) {
          converted.theaterId = overrideTheaterId;
        }
        reset(converted);
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [id, reset]
  );

  useEffect(() => {
    const state = (location.state)?.eventData;
    const incomingTheaterId = (location.state)?.eventData?.selectedTheaterId as string | undefined;

    (async () => {
      try {
        const response = await theaterApi.getAllTheaters();
        setTheaters(response.data);
      } catch (error) {
        console.error(t('Failed to load theaters: {{err}}', { err: getErrorMessage(error) }));
      }

      if (incomingTheaterId && state) {
        reset({
          ...getDefaultEvent(),
          ...state,
          openingDateObj: state.openingDate ? dayjs(state.openingDate) : null,
          closingDateObj: state.closingDate ? dayjs(state.closingDate) : null,
          typicalStartTimeObj: state.typicalStartTime ? dayjs(state.typicalStartTime) : null,
          typicalEndTimeObj: state.typicalEndTime ? dayjs(state.typicalEndTime) : null,
          theaterId: incomingTheaterId,
        });
      } else if (isEditMode) {
        await loadEvent(incomingTheaterId);
      }
    })();
  }, [isEditMode, loadEvent, location.state, t]);

  const handleSave = handleSubmit(async (data) => {
    if (!data.title) {
      toast.warning(t('Title is mandatory'));
      return;
    }
    if (!data.theaterId) {
      toast.warning(t('A theater must be selected'));
      return;
    }

    try {
      const {
        openingDateObj,
        closingDateObj,
        typicalStartTimeObj,
        typicalEndTimeObj,
        ...cleanEvent
      } = data;

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
            navigate('/bookings');
          }
          return;
        }

        // Normal success case
        if (result.updated === true) {
          toast.success(t('Event updated successfully!'));
          skipBlocker.current = true;
          navigate(-1);
          return;
        }

        // Fallback error
        toast.error(t('Event not updated'));
        return;
      } else {
        // Create mode: unchanged, but you could also adapt if needed
        const response = await eventApi.createEvent(eventData);
        if (response.data?.id) {
          toast.success(t('Event created successfully!'));
          skipBlocker.current = true;
          navigate(-1);
        } else {
          toast.error(t('Event not created'));
        }
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  });

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
              {...register('title')}
              fullWidth
              label={t('Title')}
              required
              autoFocus
            />
          </Grid>

          {/* Description */}
          <Grid item xs={12}>
            <TextField
              {...register('description')}
              fullWidth
              label={t('Description')}
              multiline
              rows={3}
            />
          </Grid>

          {/* Genres */}
          <Grid item xs={6}>
            <Controller
              name="genres"
              control={control}
              render={({ field }) => (
                <TagSelector
                  label={t('Genere')}
                  storageKey="eventGenresCustom"
                  presetOptions={GENRES_PRESETS}
                  value={field.value || []}
                  onChange={field.onChange}
                  multiple
                />
              )}
            />
          </Grid>

          {/* Language */}
          <Grid item xs={6}>
            <Controller
              name="language"
              control={control}
              render={({ field }) => (
                <TagSelector
                  label={t('Language')}
                  storageKey="eventLanguageCustom"
                  presetOptions={LANGUAGES_PRESETS}
                  value={field.value || ''}
                  onChange={field.onChange}
                  multiple={false}
                />
              )}
            />
          </Grid>

          {/* Duration & Intermissions */}
          <Grid item xs={12} md={4}>
            <TextField
              {...register('durationMinutes', { valueAsNumber: true })}
              fullWidth
              label={t('Duration (minutes)')}
              type="number"
              inputProps={{ min: 0 }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              {...register('intermissionCount', { valueAsNumber: true })}
              fullWidth
              label={t('Intermissions')}
              type="number"
              inputProps={{ min: 0 }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Controller
              name="rating"
              control={control}
              render={({ field }) => (
                <TagSelector
                  label={t('Rating')}
                  storageKey="eventRatingCustom"
                  presetOptions={RATING_PRESETS}
                  value={field.value || ''}
                  onChange={field.onChange}
                  multiple={false}
                />
              )}
            />
          </Grid>

          {/* Theater selection */}
          <Grid item xs={12}>
            <FormControl fullWidth required>
              <InputLabel>{t('Theater')}</InputLabel>
              <Controller
                name="theaterId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || ''}
                    label={t('Theater')}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '<new>') {
                        // Mark intentional navigation so blocker doesn't fire for this sub-flow
                        skipBlocker.current = true;
                        navigate('/theater/new', {
                          state: {
                            returnTo: `/event/${id ?? 'new'}`,
                            eventData: {
                              ...getValues(),
                              openingDate: getValues('openingDateObj')?.toISOString(),
                              closingDate: getValues('closingDateObj')?.toISOString(),
                              typicalStartTime: getValues('typicalStartTimeObj')?.toISOString(),
                              typicalEndTime: getValues('typicalEndTimeObj')?.toISOString(),
                            },
                          },
                          replace: true,
                        });
                      } else {
                        field.onChange(val);
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
                )}
              />
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
              {...register('director')}
              fullWidth
              label={t('Director')}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              {...register('playwright')}
              fullWidth
              label={t('Playwright')}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              {...register('producer')}
              fullWidth
              label={t('Producer')}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              {...register('choreographer')}
              fullWidth
              label={t('Choreographer')}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              {...register('musicalDirector')}
              fullWidth
              label={t('Musical Director')}
            />
          </Grid>

          {/* Cast */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              {t('Actors')}
            </Typography>
            <Controller
              name="cast"
              control={control}
              render={({ field }) => (
                <CastEditor
                  value={field.value || []}
                  onChange={field.onChange}
                />
              )}
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
              <Controller
                name="openingDateObj"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label={t('Start Date')}
                    value={field.value}
                    onChange={field.onChange}
                    maxDate={closingDateObj || undefined}
                    sx={{ width: '100%' }}
                    slotProps={{
                      inputAdornment: { sx: { ml: 0 } },
                      openPickerButton: { sx: { p: '4px' } },
                    }}
                  />
                )}
              />
              <Controller
                name="closingDateObj"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label={t('End Date')}
                    value={field.value}
                    onChange={field.onChange}
                    minDate={openingDateObj || undefined}
                    sx={{ width: '100%' }}
                    slotProps={{
                      inputAdornment: { sx: { ml: 0 } },
                      openPickerButton: { sx: { p: '4px' } },
                    }}
                  />
                )}
              />
            </Stack>
          </Grid>
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={1}>
              <Controller
                name="typicalStartTimeObj"
                control={control}
                render={({ field }) => (
                  <TimePicker
                    label={isAtLeastMd ? t('Typical Start Time') : t('Start Time')}
                    value={field.value}
                    onChange={field.onChange}
                    sx={{ width: '100%' }}
                  />
                )}
              />
              <Controller
                name="typicalEndTimeObj"
                control={control}
                render={({ field }) => (
                  <TimePicker
                    label={isAtLeastMd ? t('Typical End Time') : t('End Time')}
                    value={field.value}
                    onChange={field.onChange}
                    sx={{ width: '100%' }}
                  />
                )}
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
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value || ''}
                    label={t('Currency')}
                    onChange={(e) => field.onChange(e.target.value)}
                  >
                    <MenuItem value="">{t('none')}</MenuItem>
                    {Object.entries(config.app.currencies).map(([key, currency]) => (
                      <MenuItem key={key} value={key}>
                        {currency.symbol} ({currency.name})
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
            </FormControl>
          </Grid>
          <Grid item xs={8} md={6}>
            <Controller
              name="baseTicketPrice"
              control={control}
              render={({ field }) => (
                <TextField
                  fullWidth
                  label={t('Base Ticket Price')}
                  type="text"
                  value={(field.value ?? 0).toFixed(2)}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start" sx={{ mt: -0.2 }}>
                        {config.app.currencies[currency || '']?.symbol}
                      </InputAdornment>
                    ),
                  }}
                  inputProps={{ min: 0, step: 1 }}
                  disabled={!currency}
                />
              )}
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
              {...register('minimumAge', { valueAsNumber: true })}
              fullWidth
              label={t('Minimum Age')}
              type="number"
              inputProps={{ min: 0 }}
            />
          </Grid>
          {isAtLeastMd && <Grid item xs={12} md={9} />}

          {/* Poster Image */}
          <Grid item xs={12} md={9}>
            <Controller
              name="posterImage"
              control={control}
              render={({ field }) => (
                <ImageUploadSection
                  label={t('Poster Image')}
                  imageFilename={field.value ?? null}
                  onUploadClick={() => setIsImageUploadPopupOpen(true)}
                  onClearClick={() => {
                    if (field.value) {
                      imageApi.delete(field.value).catch(() => {});
                    }
                    field.onChange(null);
                  }}
                />
              )}
            />
          </Grid>
          {isAtLeastMd && <Grid item xs={12} md={9} />}

          <Grid item xs={12}>
            <TextField
              {...register('specialRequirements')}
              fullWidth
              label={t('Special Requirements')}
              multiline
              rows={2}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              {...register('contentWarnings')}
              fullWidth
              label={t('Content Warnings')}
              multiline
              rows={2}
            />
          </Grid>

          {/* Cancel event (edit mode only) */}
          {isEditMode && (
            <Grid item xs={12}>
              <Controller
                name="canceled"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={field.value === 1}
                        onChange={(e) => field.onChange(e.target.checked ? 1 : 0)}
                      />
                    }
                    label={t('Cancel event')}
                  />
                )}
              />
            </Grid>
          )}
          {canceled === 1 && (
            <Grid item xs={12}>
              <TextField
                {...register('cancelationReason')}
                fullWidth
                label={t('Cancelation reason')}
              />
            </Grid>
          )}
        </Grid>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 4 }}>
          <Button variant="outlined" onClick={() => navigate(-1)} disabled={isSubmitting}>
            {t('Cancel')}
          </Button>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting
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
          setValue('posterImage', filename, { shouldDirty: true });
        }}
        imageType="poster"
        simpleMode={false}
        //fixedAspectRatio={9 / 16}
        maxSizeMB={10}
        title={t('Upload poster image')}
        existingImageUrl={'/uploads/poster-f48c1cc4fbf93ffbb64d393e4296f9fe.jpg'}
      />
    </Container>
  );
};

export default EventEdit;
