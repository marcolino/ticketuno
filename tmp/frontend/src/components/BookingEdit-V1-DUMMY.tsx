import React, { useState, useEffect, useCallback, createElement } from 'react';
import { useLocation, useParams  } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  BookOnline as BookOnlineIcon,
} from '@mui/icons-material';
import useNavigate from '@/hooks/useNavigate';
import PhoneInput from './PhoneInput';
import OpenStreetMapAutocomplete from './OpenStreetMapAutocomplete';
import TagSelector from './TagSelector';
import ActiveBookingsWarning from './ActiveBookingsWarning';
import { eventApi, layoutApi } from '@/services/api';
import { Layout } from '@/shared/types/layout';
import { useToast } from '@/contexts/ToastContext';
import { useDialog } from '@/contexts/DialogContext';
import useUnsavedChanges from '@/hooks/useUnsavedChanges';
import { getErrorMessage } from '@/shared/utils/misc';
import config from '@/shared/config';

const BookingEdit: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const showDialog = useDialog();
  const toast = useToast();
  //const theme = useTheme();
  const { id } = useParams<{ id: string }>();

  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChanges(isDirty);

  const [saving, setSaving] = useState(false);

  // To avoid updating it if not changed, to avoid unuseful guard warnings
  const [originalLayoutId, setOriginalLayoutId] = useState<string>('');

  // Booking fields
  const [BookingData, setBookingData] = useState(() => {
    // Check if we have state passed from caller
    if (location.state?.BookingData) {
      return location.state.BookingData;
    }
    return {
      name: '',
      description: '',
      stageType: '',
      address: '',
      contactPhone: '',
      contactEmail: '',
      websiteUrl: '',
      status: 'active',
      currentLayoutId: '',
      //selectedLayoutId: '',
    };
  });

  const [layouts, setLayouts] = useState<Layout[]>([]);

  const loadBooking = useCallback(async () => {
    try {
      const response = await eventApi.getEventBookingById(id!);
      const Booking = response.data;
      console.log('getEventBookingById Booking:', Booking);

      setBookingData({
        ...Booking,
        currentLayoutId: Booking.currentLayoutId || '', // Ensure currentLayoutId is set
        contactPhone: Booking.contactPhone || '', // Ensure contactPhone is set
        contactEmail: Booking.contactEmail || '', // Ensure contactEmail is set
      });
      setOriginalLayoutId(Booking.currentLayoutId || '');
      setIsDirty(false);
    } catch (error) {
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
      if (location.state?.BookingData?.selectedLayoutId) {
        // Load layouts first so the new layout is available before rendering
        await loadLayouts();
        
        setBookingData((prev) => ({
          ...prev,
          ...location.state.BookingData, // Merge new layout ID
          selectedLayoutId: location.state.BookingData.selectedLayoutId
        }));
        
        setIsDirty(true);
        
        return; // Skip Booking load - we're editing existing
      }

      await Promise.all([
        loadLayouts(),
        isEditMode ? loadBooking() : Promise.resolve()
      ]);
    })();
  }, [isOperator]); // Runs once on mount, or when role changes

  useEffect(() => {
    const state = location.state as { BookingData?: { selectedLayoutId?: string } };
    if (state?.BookingData?.selectedLayoutId) {

      (async () => {
        // Ensure layouts are loaded before setting the selected ID
        if (layouts.length === 0) {
          await loadLayouts();
        }
        setBookingData((prev) => ({
          ...prev,
          currentLayoutId: state.BookingData?.selectedLayoutId
        }));
      })();
    }
  }, [location.state]);
  
  const handleInputChange = (e) => {
    setBookingData({
      ...BookingData,
      [e.target.name]: e.target.value
    });
    setIsDirty(true);
  };
  
  const handleLayoutSelect = (layoutId: string) => {
    if (layoutId === '<new>') {

      navigate('/layout/new', {
        state: { 
          BookingData, 
          returnTo: `/Booking/edit/${id || 'new'}`,
          BookingId: id,  // pass the Booking ID if editing existing Booking
          parentReturnTo: returnTo,
          parentEventData: eventData,
        },
        replace: true,
      });
      return;
    }

    setBookingData((prev) => ({ 
      ...prev, 
      currentLayoutId: layoutId
    }));
  
    setIsDirty(true);
  };
  
  const contactPhoneValidate = (value: string) => {
    // E.164 format requires at least 8 digits including country code
    if (!value || value.length < 8) {
      //setError('Enter a valid international phone number');
      toast.warning(t('Enter a valid international phone number'));
    }
  };
  
  const handleSave = async () => {
    if (!BookingData.name.trim()) {
      toast.warning(t('Name is required'));
      return;
    }
    if (!BookingData.currentLayoutId) {
      toast.warning(t('A layout is required'));
      return;
    }
    try {
      setSaving(true);
      //setError('');

      let savedId: string;
      if (isEditMode) {
        const payload = { ...BookingData };
        if (payload.currentLayoutId === originalLayoutId) {
          delete payload.currentLayoutId; // Unchanged, skip guard
        }
        const response = await BookingApi.updateBooking(id, payload);
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
        if (result.updated === true) {
          savedId = id!;
          setIsDirty(false);
          toast.success(t('Booking updated successfully!'));
          navigate(-1);
          return;
        }
        // Fallback error
        toast.error(t('Failed to update Booking'));
        return;
      } else {
        const response = await BookingApi.createBooking(BookingData);
        savedId = response.data;
        toast.success(t('Booking created successfully!'));
      }

      setIsDirty(false);
      if (returnTo) {
        navigate(returnTo, {
          state: {
            eventData: {
              ...eventData,
              selectedBookingId: savedId,
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
        t('Failed to {{action}} Booking', { action: isEditMode ? t('update') : t('create') })
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
          <BookOnlineIcon fontSize="large" /> {isEditMode ? t('Edit Booking') : t('Create New Booking')}
        </Typography>

        {/* {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )} */}

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <TextField
              name="name"
              label={t('Name')}
              value={BookingData.name}
              onChange={handleInputChange}
              fullWidth
              required
              autoFocus
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              name="description"
              label={t('Description')}
              value={BookingData.description}
              onChange={handleInputChange}
              multiline
              rows={3}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <TagSelector
              label={t('Stage Type')}
              storageKey='eventStageCustom'
              presetOptions={STAGE_PRESETS}
              value={BookingData.stageType}
              //onChange={handleInputChange}
              onChange={(value) => {
                setBookingData({ ...BookingData, stageType: value });
                setIsDirty(true);
              }}
            />
            {/* <TextField
              name="stageType"
              label={t('Stage Type')}
              value={BookingData.stageType}
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
            <OpenStreetMapAutocomplete
              name="address"
              value={BookingData.address}
              onChange={handleInputChange}
              placeholder={t('Indirizzo stradale')}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              name="websiteUrl"
              label="Website URL"
              value={BookingData.websiteUrl}
              onChange={handleInputChange}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <PhoneInput
                label={t('Contact phone number')}
                value={BookingData.contactPhone}
                onChange={(value) => {
                  setBookingData(prev => ({ ...prev, contactPhone: value }));
                  setIsDirty(true);
                }}
                onBlur={() => contactPhoneValidate(BookingData.contactPhone)}
                defaultCountry={config.app.defaultLanguage}
              />
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <TextField
                name="contactEmail"
                type="email"
                label="Contact email"
                value={BookingData.contactEmail}
                onChange={handleInputChange}
                fullWidth={false}
              />
            </FormControl>
          </Grid>

          {/* We really don't need Booking's attribute 'active'/'inactive'...
          <Grid item xs={12} md={2}>
            <FormControl fullWidth required>
              <InputLabel>{t('Status')}</InputLabel>
              <TextField
                select
                fullWidth
                required
                label={t('Status')}
                name="status"
                value={BookingData.status}
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
              <TextField
                select
                fullWidth
                required
                label={t('Layout')}
                name="selectedLayoutId"
                value={
                  layouts.some(l => l.id === BookingData.currentLayoutId)
                    ? BookingData.currentLayoutId
                    : ''
                }
                onChange={(e) => {
                  handleLayoutSelect(e.target.value);
                  setIsDirty(true);
                }}
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
              (isEditMode ? t('Update Booking') : t('Create Booking'))
            }
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default BookingEdit;
