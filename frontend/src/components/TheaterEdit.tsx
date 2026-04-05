import React, { useState, useEffect, useCallback } from 'react';
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
  InputLabel,
  Select,
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
  //const theme = useTheme();
  const { id } = useParams<{ id: string }>();
  const { isOperator } = useAuth();

  const isEditMode = id && id !== 'new';

  // TODO: to config
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

  //const [theaters, setTheaters] = useState<TheaterStats[]>([]);
  const [saving, setSaving] = useState(false);
  //const [error, setError] = useState('');

  // To avoid updating it if not changed, to avoid unuseful guard warnings
  const [originalLayoutId, setOriginalLayoutId] = useState<string>('');

  // Theater fields
  const [theaterData, setTheaterData] = useState(() => {
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
  //const [selectedLayoutId, setSelectedLayoutId] = useState<string>('');
  
  // useEffect(() => {
  //   if (location.state?.theaterData?.selectedLayoutId) {
  //     // Update the selected layout state when returning from LayoutEdit
  //     setSelectedLayoutId(location.state?.theaterData?.selectedLayoutId);
  //   }
  // }, [navigate, location.state, location.pathname]);

  // const loadTheater1 = useCallback(async () => {
  //   try {
  //     const response = await theaterApi.getTheaterById(id!);
  //     const theater = response.data;
  //     console.log('getTheaterById theater:', theater);

  //     // Load current layout for this theater
  //     const layoutResponse = await theaterApi.getTheaterLayoutCurrent(id!);
  //     setSelectedLayoutId(layoutResponse.data?.id || '');
      
  //     setTheaterData(theater);
  //     setError('');
  //   } catch (err: any) {
  //     setError(err.response?.data?.error || 'Failed to load theater');
  //   }
  // }, [id]);
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
      // // Load current layout for this theater
      // const layoutResponse = await theaterApi.getTheaterLayoutCurrent(id!);
      // setTheaterData({
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
        
        setTheaterData((prev: any) => ({
          ...prev,
          ...location.state.theaterData,  // Merge new layout ID
          selectedLayoutId: location.state.theaterData.selectedLayoutId
        }));
        
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
        setTheaterData((prev: any) => ({
          ...prev,
          currentLayoutId: state.theaterData?.selectedLayoutId
        }));
      })();
      // // When returning from LayoutEdit with a newly created/edited layout
      // //setSelectedLayoutId(state.theaterData.selectedLayoutId);
      // setTheaterData((prev: any) => ({
      //   ...prev,
      //   currentLayoutId: state.theaterData?.selectedLayoutId
      // }));
    }
  }, [location.state]);
  
  const handleInputChange = (e: any) => {
    setTheaterData({
      ...theaterData,
      [e.target.name]: e.target.value
    });
  };

  // const setCurrentLayout = async (e: any) => {
  //   const layoutId = e.target.value;
  //   if (layoutId === '<new>') { // create new layout
  //     // create new layout for this theater, or without a theater if it is not yet saved
  //     navigate('/layout/new', {
  //       state: {
  //         theaterData,
  //         returnTo: `/theater/edit/${id || 'new'}`,
  //         theaterId: id // Optional: if we have theaterId
  //       }
  //     });
  //   } else {
  //     // // Update directly in theaterData
  //     // setTheaterData({
  //     //   ...theaterData,
  //     //   selectedLayoutId: layoutId
  //     // });
  //     setSelectedLayoutId(layoutId);
  //   }
  //   //setSelectedLayoutId(layoutId);
  // };

  // const handleLayoutSelectORIGINAL = (layoutId: string) => {
  //   if (layoutId === '<new>') {
  //     navigate('/layout/new', {
  //       state: {
  //         theaterData,
  //         returnTo: `/theater/edit/${id || 'new'}`,
  //         theaterId: id // Pass the theater ID if editing existing theater
  //       }
  //     });
  //   } else {
  //     setTheaterData((prev: any) => ({ ...prev, selectedLayoutId: layoutId }));
  //   }
  // }
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
    } else {
      //setSelectedLayoutId(layoutId);
      setTheaterData((prev: any) => ({ 
        ...prev, 
        currentLayoutId: layoutId
      }));
    }
  };
  
  const contactPhoneValidate = (value: string) => {
    // E.164 format requires at least 8 digits including country code
    if (!value || value.length < 8) {
      //setError('Enter a valid international phone number');
      toast.warning(t('Enter a valid international phone number'));
    }
  };
  
  const handleSave = async () => {
    if (!theaterData.name.trim()) {
      toast.warning(t('Name is required'));
      return;
    }
    if (!theaterData.currentLayoutId) {
      toast.warning(t('A layout is required'));
      return;
    }
    try {
      setSaving(true);
      //setError('');

      let savedId: string;
      if (isEditMode) {
        const payload = { ...theaterData };
        if (payload.currentLayoutId === originalLayoutId) {
          delete payload.currentLayoutId; // Unchanged, skip guard
        }
        const response = await theaterApi.updateTheater(id, payload);
        if (!response.data.updated) {
          if (response.data.reason === 'THEATER_HAS_ACTIVE_BOOKINGS') {
            await showDialog({
              title: t('Active Bookings Exist'),
              content: response.data.blockedBy ?
                <ActiveBookingsWarning bookings={response.data.blockedBy} action={'theater'}  /> :
                <>{t('No bookings info')}</>
              ,
              cancelText: t('Cancel'),
              onCancel: () => { },
              shrinkToContent: true,
            });
            return;
          }
        }
        savedId = id!;
        toast.success(t('Theater updated successfully!'));
      } else {
        const response = await theaterApi.createTheater(theaterData);
        savedId = response.data;
        toast.success(t('Theater created successfully!'));
      }

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
              value={theaterData.stageType}
              //onChange={handleInputChange}
              onChange={(value) =>
                setTheaterData({ ...theaterData, stageType: value })
              }
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
              value={theaterData.address}
              onChange={handleInputChange}
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
                  setTheaterData(prev => ({ ...prev, contactPhone: value }));
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

          <Grid item xs={12} md={2}>
            <FormControl fullWidth required>
              <InputLabel>{t('Status')}</InputLabel>
              <Select
                name="status"
                value={theaterData.status}
                label="Status"
                onChange={handleInputChange}
              >
                <MenuItem key="1" value="active">{t('Active')}</MenuItem>
                <MenuItem key="0" value="inactive">{t('Inactive')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth required>
              <InputLabel>
                {t('Layout')}
              </InputLabel>
              <Select
                name="selectedLayoutId"
                //value={theaterData.currentLayoutId || ''}
                value={
                  layouts.some(l => l.id === theaterData.currentLayoutId)
                    ? theaterData.currentLayoutId
                    : ''  // fallback prevents the MUI out-of-range warning
                }
                // value={
                //   theaterData.selectedLayoutId &&
                //     layouts.some(layout => layout.id === theaterData.selectedLayoutId)
                //     ? theaterData.selectedLayoutId
                //     : ''
                // }
                label="Layouts"
                onChange={(e) => handleLayoutSelect(e.target.value)}
              >
                <MenuItem value={"<new>"}><i>{t('New Layout')}</i></MenuItem>
                {layouts.map((layout, index) => (
                  <MenuItem key={index} value={layout.id}>{layout.name}</MenuItem>
                ))}
              </Select>
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
