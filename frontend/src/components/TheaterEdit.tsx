import React, { useState, useEffect, useCallback, useRef, createElement } from 'react';
import { useLocation, useParams, useBlocker } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  MenuItem,
} from '@mui/material';
import {
  Save as SaveIcon,
  Curtains as CurtainsIcon,
} from '@mui/icons-material';
import useNavigate from '@/hooks/useNavigate';
import PhoneInput from './PhoneInput';
import OpenStreetMapAutocomplete from './OpenStreetMapAutocomplete';
import TagSelector from './TagSelector';
import ActiveBookingsWarning from './ActiveBookingsWarning';
import { theaterApi, layoutApi } from '@/services/api';
import { Layout } from '@/shared/types/layout';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useDialog } from '@/contexts/DialogContext';
import { getErrorMessage } from '@/shared/utils/misc';
import config from '@/shared/config';

const TheaterEdit: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const showDialog = useDialog();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const { isOperator } = useAuth();

  const isEditMode = id && id !== 'new';

  const STAGE_PRESETS = [
    t('Proscenium (Italian style)'),
    t('Proscenium with Apron (prominent stage)'),
    t('Arena (Circular o semi-circular)'),
    t('Thrust '),
    t('Black Box'),
  ];

  const { returnTo, eventData } = (location.state || {}) as {
    returnTo?: string;
    eventData?: Record<string, unknown>;
  };

  // To avoid updating it if not changed, to avoid unuseful guard warnings
  const [originalLayoutId, setOriginalLayoutId] = useState<string>('');

  const [layouts, setLayouts] = useState<Layout[]>([]);

  const { register, control, handleSubmit, reset, getValues, setValue, formState: { isDirty, isSubmitting } } = useForm({
    // Check if we have state passed from caller
    defaultValues: location.state?.theaterData ?? {
      name: '',
      description: '',
      stageType: '',
      address: '',
      contactPhone: '',
      contactEmail: '',
      websiteUrl: '',
      status: 'active',
      currentLayoutId: '',
    },
  });

  // Ref-based escape hatch for intentional navigations (save, sub-flow to layout/new).
  // reset(data) schedules a re-render but navigate() fires synchronously before it
  // completes, so isDirty is still true when the blocker evaluates. The ref is
  // synchronous and is visible to the blocker condition immediately.
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

  const loadTheater = useCallback(async () => {
    try {
      const response = await theaterApi.getTheaterById(id!);
      const theater = response.data;
      console.log('getTheaterById theater:', theater);

      reset({
        ...theater,
        currentLayoutId: theater.currentLayoutId || '', // Ensure currentLayoutId is set
        contactPhone: theater.contactPhone || '', // Ensure contactPhone is set
        contactEmail: theater.contactEmail || '', // Ensure contactEmail is set
      });
      setOriginalLayoutId(theater.currentLayoutId || '');
      // // Load current layout for this theater
      // const layoutResponse = await theaterApi.getTheaterLayoutCurrent(id!);
      // reset({
      //   ...theater,
      //   selectedLayoutId: layoutResponse.data?.id || ''
      // });
      //setError('');
    } catch (error) {
      //setError(err.response?.data?.error || 'Failed to load theater');
      toast.error(getErrorMessage(error));
    }
  }, [id]);

  const loadLayouts = async () => {
    try {
      const response = await layoutApi.getAllLayouts();
      const layouts = response.data;
      console.log('getAllLayouts layouts:', layouts);
      setLayouts(layouts);
      //setError('');
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };
  
  useEffect(() => {
    if (!isOperator) {
      navigate(-1);
      return;
    }

    (async () => {
      // Check if returning from layout creation FIRST
      if (location.state?.theaterData?.selectedLayoutId) {
        // Load layouts first so the new layout is available before rendering
        await loadLayouts();
        
        reset({
          ...getValues(),
          ...location.state.theaterData, // Merge new layout ID
          currentLayoutId: location.state.theaterData.selectedLayoutId,
        });
        
        // // Load layouts AFTER setting state (so new layout appears)
        // await loadLayouts();
        return; // Skip theater load - we're editing existing
      }

      await Promise.all([
        loadLayouts(),
        isEditMode ? loadTheater() : Promise.resolve()
      ]);
    })();
  }, [isOperator]); // Runs once on mount, or when role changes

  useEffect(() => {
    const state = location.state as { theaterData?: { selectedLayoutId?: string } };
    if (state?.theaterData?.selectedLayoutId) {

      (async () => {
        // Ensure layouts are loaded before setting the selected ID
        if (layouts.length === 0) {
          await loadLayouts();
        }
        setValue('currentLayoutId', state.theaterData?.selectedLayoutId, { shouldDirty: true });
      })();
    }
  }, [location.state]);
  
  const handleLayoutSelect = (layoutId: string) => {
    if (layoutId === '<new>') {
      // Mark intentional navigation so blocker doesn't fire for this sub-flow
      skipBlocker.current = true;
      navigate('/layout/new', {
        state: { 
          theaterData: getValues(), 
          returnTo: `/theater/edit/${id || 'new'}`,
          theaterId: id,  // pass the theater ID if editing existing theater
          parentReturnTo: returnTo,
          parentEventData: eventData,
        },
        replace: true,
      });
    } else {
      //setSelectedLayoutId(layoutId);
      setValue('currentLayoutId', layoutId, { shouldDirty: true });
    }
  };
  
  const contactPhoneValidate = (value: string) => {
    // E.164 format requires at least 8 digits including country code
    if (!value || value.length < 8) {
      //setError('Enter a valid international phone number');
      toast.warning(t('Enter a valid international phone number'));
    }
  };
  
  const handleSave = handleSubmit(async (data) => {
    if (!data.name.trim()) {
      toast.warning(t('Name is required'));
      return;
    }
    if (!data.currentLayoutId) {
      toast.warning(t('A layout is required'));
      return;
    }
    try {
      //setError('');

      let savedId: string;
      if (isEditMode) {
        const payload = { ...data };
        if (payload.currentLayoutId === originalLayoutId) {
          delete payload.currentLayoutId; // Unchanged, skip guard
        }
        const response = await theaterApi.updateTheater(id, payload);
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
        // if (!response.data.updated) {
        //   if (response.data.reason === 'THEATER_HAS_ACTIVE_BOOKINGS') {
        //     await showDialog({
        //       title: t('Active Bookings Exist'),
        //       content: response.data.blockedBy ?
        //         <ActiveBookingsWarning bookings={response.data.blockedBy} action={'theater'}  /> :
        //         <>{t('No bookings info')}</>
        //       ,
        //       cancelText: t('Cancel'),
        //       onCancel: () => { },
        //       shrinkToContent: true,
        //     });
        //     return;
        //   }
        // }
        if (result.updated === true) {
          savedId = id!;
          toast.success(t('Theater updated successfully!'));
          skipBlocker.current = true;
          navigate(-1);
          return;
        }
        // Fallback error
        toast.error(t('Failed to update theater'));
        return;
      } else {
        const response = await theaterApi.createTheater(data);
        savedId = response.data;
        toast.success(t('Theater created successfully!'));
      }

      skipBlocker.current = true;
      if (returnTo) {
        navigate(returnTo, {
          state: {
            eventData: {
              ...eventData,
              selectedTheaterId: savedId,
            },
          },
          replace: true,
        });
      } else {
        navigate(-1);
      }
    } catch (error) {
      toast.error(
        getErrorMessage(error) ||
        t('Failed to {{action}} theater', { action: isEditMode ? t('update') : t('create') })
      );
    }
  });

  // const validatePhone = (phone: string) => {
  //   if (!phone || phone.length < 8) {
  //     // setPhoneError(true);
  //     // setPhoneHelper('Please enter a valid phone number');
  //   } else {
  //   //   setPhoneError(false);
  //   //   setPhoneHelper('');
  //   // }
  // };
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
          <CurtainsIcon fontSize="large" /> {isEditMode ? t('Edit Theater') : t('Create New Theater')}
        </Typography>

        {/* {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )} */}

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <TextField
              {...register('name')}
              label={t('Name')}
              fullWidth
              required
              autoFocus
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              {...register('description')}
              label={t('Description')}
              multiline
              rows={3}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <Controller
              name="stageType"
              control={control}
              render={({ field }) => (
                <TagSelector
                  label={t('Stage Type')}
                  storageKey='eventStageCustom'
                  presetOptions={STAGE_PRESETS}
                  value={field.value}
                  //onChange={handleInputChange}
                  onChange={field.onChange}
                />
              )}
            />
            {/* <TextField
              name="stageType"
              label={t('Stage Type')}
              value={theaterData.stageType}
              onChange={handleInputChange}
              placeholder={t('Proscenium, Proscenium with Apron, Arena, Thrust, Black Box, ...')}
              fullWidth
              /*
                - Proscenio (Proscenium): All'Italiana, il più tradizionale, con un'area rialzata separata dalla platea da un "boccascena" (arco) e un "golfo mistico" (fossa dell'orchestra) per i musicisti, con il pubblico che guarda frontalmente.
                - Proscenio/Ribalta (Proscenium with Apron): Un'estensione del palcoscenico oltre il boccascena, dove il palco "sporge" verso la platea.
                - Arena: Circolare o semicircolare, circondato dal pubblico su più lati, creando maggiore vicinanza.
                - A Spinta (Thrust): Una piattaforma che si estende nel pubblico, che circonda il palco su tre lati, unendo attori e spettatori.
                - Scatola Nera (Black Box): Uno spazio scenico versatile, solitamente cubico e dipinto di nero, con il pubblico posizionato in modo flessibile. 
              * /
            /> */}
          </Grid>

          <Grid item xs={12} md={8}>
            <Controller
              name="address"
              control={control}
              render={({ field }) => (
                <OpenStreetMapAutocomplete
                  name="address"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  placeholder={t('Indirizzo stradale')}
                />
              )}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              {...register('websiteUrl')}
              label="Website URL"
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <Controller
                name="contactPhone"
                control={control}
                render={({ field }) => (
                  <PhoneInput
                    label={t('Contact phone number')}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={() => contactPhoneValidate(field.value)}
                    defaultCountry={config.app.defaultLanguage}
                  />
                )}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <TextField
                {...register('contactEmail')}
                type="email"
                label="Contact email"
                fullWidth={false}
              />
            </FormControl>
          </Grid>

          {/* We really don't need theater's attribute 'active'/'inactive'...
          <Grid item xs={12} md={2}>
            <FormControl fullWidth required>
              <InputLabel>{t('Status')}</InputLabel>
              <TextField
                select
                fullWidth
                required
                label={t('Status')}
                name="status"
                value={theaterData.status}
                onChange={handleInputChange}
              >
                <MenuItem key="1" value="active">{t('Active')}</MenuItem>
                <MenuItem key="0" value="inactive">{t('Inactive')}</MenuItem>
              </TextField>
            </FormControl>
          </Grid>
          */}

          <Grid item xs={12} md={6}>
            <FormControl fullWidth required>
              <Controller
                name="currentLayoutId"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    fullWidth
                    required
                    label={t('Layout')}
                    name="selectedLayoutId"
                    value={
                      layouts.some(l => l.id === field.value)
                        ? field.value
                        : ''
                    }
                    onChange={(e) => handleLayoutSelect(e.target.value)}
                  >
                    <MenuItem value={"<new>"}>
                      <i>{t('New Layout')}</i>
                    </MenuItem>
                    {layouts.map((layout, index) => (
                      <MenuItem key={index} value={layout.id}>
                        {layout.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </FormControl>
          </Grid>

        </Grid>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 4 }}>
          <Button
            variant="outlined"
            onClick={() => {
              if (returnTo) {
                navigate(returnTo, { state: { eventData }, replace: true });
              } else {
                navigate(-1);
              }
            }}
            disabled={isSubmitting}
          >
            {t('Cancel')}
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ?
              (isEditMode ? t('Updating...') : t('Creating...')) :
              (isEditMode ? t('Update Theater') : t('Create Theater'))
            }
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default TheaterEdit;
