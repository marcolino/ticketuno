import React, { useState, useEffect, useCallback, createElement } from 'react';
import { useLocation, useParams  } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  //useTheme,
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
// import PhoneInput from 'react-phone-input-2';
// import 'react-phone-input-2/lib/material.css';
import PhoneInput from './PhoneInput';
import OpenStreetMapAutocomplete from './OpenStreetMapAutocomplete';
// import TextFieldPhone from './TextFieldPhone';
import TagSelector from './TagSelector';
import ActiveBookingsWarning from './ActiveBookingsWarning';
import { theaterApi, layoutApi } from '@/services/api';
import { Layout } from '@ticketuno/shared/types/layout';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useDialog } from '@/contexts/DialogContext';
import useUnsavedChanges from '@/hooks/useUnsavedChanges';
import { getErrorMessage } from '@ticketuno/shared/utils/misc';
import { TheaterStatus } from '@ticketuno/shared';
import { sharedConfig as config } from '@ticketuno/shared';

interface TheaterData {
  name: string;
  description?: string;
  stageType?: string;
  address?: string;
  contactPhone: string;
  contactEmail: string;
  websiteUrl?: string;
  status: TheaterStatus;
  currentLayoutId: string;
  selectedLayoutId?: string;
}

const TheaterEdit: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const showDialog = useDialog();
  const toast = useToast();
  //const theme = useTheme();
  const { id } = useParams<{ id: string }>();
  const { isOperator } = useAuth();

  const isEditMode = id && id !== 'new';

  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChanges(isDirty);

  const STAGE_PRESETS = [
    t('Proscenium (Italian style)'),
    t('Proscenium with Apron (prominent stage)'),
    t('Arena (Circular o semi-circular)'),
    t('Thrust'),
    t('Black Box'),
  ];

  const { returnTo, eventData } = (location.state || {}) as {
    returnTo?: string;
    eventData?: Record<string, unknown>;
  };

  //const [theaters, setTheaters] = useState<TheaterStats[]>([]);
  const [saving, setSaving] = useState(false);
  //const [error, setError] = useState('');

  // To avoid updating it if not changed, to avoid unuseful guard warnings
  const [originalLayoutId, setOriginalLayoutId] = useState<string>('');

  // Theater fields
  const [theaterData, setTheaterData] = useState<TheaterData>(() => {
    // Check if we have state passed from caller
    if (location.state?.theaterData) {
      return location.state.theaterData;
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

  const loadTheater = useCallback(async () => {
    try {
      const response = await theaterApi.getTheaterById(id!);
      const theater = response.data;
      console.log('getTheaterById theater:', theater);

      setTheaterData({
        ...theater,
        currentLayoutId: theater.currentLayoutId || '', // Ensure currentLayoutId is set
        contactPhone: theater.contactPhone || '', // Ensure contactPhone is set
        contactEmail: theater.contactEmail || '', // Ensure contactEmail is set
      });
      setOriginalLayoutId(theater.currentLayoutId || '');
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
      if (location.state?.theaterData?.selectedLayoutId) {
        // Load layouts first so the new layout is available before rendering
        await loadLayouts();
        
        setTheaterData((prev) => ({
          ...prev,
          ...location.state.theaterData, // Merge new layout ID
          selectedLayoutId: location.state.theaterData.selectedLayoutId
        }));
        
        setIsDirty(true);
        
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
        setTheaterData((prev) => ({
          ...prev,
          currentLayoutId: state.theaterData?.selectedLayoutId || ''
        }));
      })();
    }
  }, [location.state]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTheaterData({
      ...theaterData,
      [e.target.name]: e.target.value
    });
    setIsDirty(true);
  };

  const handleAddressChange = (event: { target: { name?: string; value: string } }) => {
    setTheaterData((prev: TheaterData) => ({
      ...prev,
      [event.target.name || 'address']: event.target.value
    }));
    setIsDirty(true);
  };
  
  const handleLayoutSelect = (layoutId: string) => {
    if (layoutId === '<new>') {

      navigate('/layout/new', {
        state: { 
          theaterData, 
          returnTo: `/theater/edit/${id || 'new'}`,
          theaterId: id,  // pass the theater ID if editing existing theater
          parentReturnTo: returnTo,
          parentEventData: eventData,
        },
        replace: true,
      });
      return;
    }

    setTheaterData((prev: TheaterData) => ({ 
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
    if (!theaterData.name?.trim()) {
      toast.warning(t('Name is required'));
      return;
    }
    if (!theaterData.currentLayoutId) {
      toast.warning(t('A layout is required'));
      return;
    }
    
    try {
      setSaving(true);

      let savedId: string;
      if (isEditMode) {
        // Create payload without the layout ID if it hasn't changed
        const basePayload = { ...theaterData };

        // const payload = basePayload.currentLayoutId === originalLayoutId
        //   ? (({ currentLayoutId, ...rest }) => rest)(basePayload)
        //   : basePayload;
        // If layout hasn't changed, remove it from the payload
        const payload = basePayload.currentLayoutId === originalLayoutId
          ? Object.fromEntries(
              Object.entries(basePayload).filter(([key]) => key !== 'currentLayoutId')
            )
          : basePayload
        ;
        const response = await theaterApi.updateTheater(id, payload);
        const result = response.data;
        
        // Check if the update was blocked by active bookings
        if (result.blockedBy?.length) {
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
          toast.success(t('Theater updated successfully!'));
          navigate(-1);
          return;
        }
        
        toast.error(t('Failed to update theater'));
        return;
      } else {
        const response = await theaterApi.createTheater(theaterData);
        savedId = response.data;
        toast.success(t('Theater created successfully!'));
      }

      setIsDirty(false);
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
    } finally {
      setSaving(false);
    }
  };

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
              name="name"
              label={t('Name')}
              value={theaterData.name}
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
              value={theaterData.description}
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
              value={theaterData.stageType || ''}
              //onChange={handleInputChange}
              onChange={(value: string) => {
                setTheaterData({ ...theaterData, stageType: value });
                setIsDirty(true);
              }}
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
            <OpenStreetMapAutocomplete
              name="address"
              value={theaterData.address ?? ''}
              onChange={handleAddressChange}
              placeholder={t('Indirizzo stradale')}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              name="websiteUrl"
              label="Website URL"
              value={theaterData.websiteUrl}
              onChange={handleInputChange}
              fullWidth
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <PhoneInput
                label={t('Contact phone number')}
                value={theaterData.contactPhone}
                onChange={(value) => {
                  setTheaterData((prev: TheaterData) => ({ ...prev, contactPhone: value }));
                  setIsDirty(true);
                }}
                onBlur={() => contactPhoneValidate(theaterData.contactPhone)}
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
                value={theaterData.contactEmail}
                onChange={handleInputChange}
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
              <TextField
                select
                fullWidth
                required
                label={t('Layout')}
                name="selectedLayoutId"
                value={
                  layouts.some(l => l.id === theaterData.currentLayoutId)
                    ? theaterData.currentLayoutId
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
              (isEditMode ? t('Update Theater') : t('Create Theater'))
            }
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default TheaterEdit;
