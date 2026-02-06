import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useParams  } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
} from '@mui/material';
import {
  Save as SaveIcon,
} from '@mui/icons-material';
import OpenStreetMapAutocomplete from './OpenStreetMapAutocomplete';
import { theaterApi, layoutApi } from '../services/api';
import { Layout } from '../../../shared/types/layout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

const TheaterEdit: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, isAdmin } = useAuth();

  const isEditMode = id && id !== 'new';

  //const [theaters, setTheaters] = useState<TheaterStats[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      websiteUrl: '',
      status: 'active',
      //selectedLayoutId: '',
    };
  });

  const [layouts, setLayouts] = useState<Layout[]>([]);
  //const [selectedLayoutId, setSelectedLayoutId] = useState<string>('');
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>('');
  
  useEffect(() => {
    //if (location.state?.selectedLayoutId) {
    //if (returningState?.selectedLayoutId) {
    if (location.state?.theaterData?.selectedLayoutId) {
      // Auto-select the newly created layout

      // Update the selected layout state when returning from LayoutEdit
      //setSelectedLayoutId(location.state.selectedLayoutId);
      setSelectedLayoutId(location.state?.theaterData?.selectedLayoutId);

      // Reload layouts to include the newly created one
      //loadLayouts();
      
      // // Clear location state
      // navigate(location.pathname, { replace: true, state: {} });
      // Don't clear immediately - React Router will handle it
      // The state will be cleared automatically when user navigates away
    }
  }, [/*returningState, */navigate, location.state, location.pathname]);

  const loadTheater = useCallback(async () => {
    try {
      const response = await theaterApi.getTheaterById(id!);
      const theater = response.data;
      console.log("xxx getTheaterById theater:", theater);

      // Load current layout for this theater
      const layoutResponse = await theaterApi.getTheaterLayoutCurrent(id!);
      setSelectedLayoutId(layoutResponse.data?.id || '');
      
      setTheaterData(theater);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load theater');
    } finally {
    }
  }, [id]);

  useEffect(() => {
    loadLayouts();
  }, [isAuthenticated, isAdmin]);

  const loadLayouts = async () => {
    try {
      const response = await layoutApi.getAllLayouts();
      const layouts = response.data;
      console.log("xxx getAllLayouts layouts:", layouts);
      setLayouts(layouts);
      setError('');
    } catch (err: any) {
      // Show the actual server error message
      setError(err.response?.data?.error || 'Failed to load layouts');
      console.error(err.response?.data || err);
    } finally {
    }
  };

  useEffect(() => { // DEBUG ONLY
    if (theaterData.selectedLayoutId && layouts.length > 0) {
      const selectedLayoutExists = layouts.some(layout => layout.id === theaterData.selectedLayoutId);
      console.log('xxx Selected layout exists in layouts array:', selectedLayoutExists);
      if (!selectedLayoutExists) {
        console.log('xxx Selected layout ID:', theaterData.selectedLayoutId, 'not found in layouts');
      }
    }
  }, [theaterData.selectedLayoutId, layouts]);

  useEffect(() => { // DEBUG ONLY
    console.log("Current layouts:", layouts);
    console.log("Selected layout ID:", selectedLayoutId);
    
    if (selectedLayoutId && layouts.length > 0) {
      const isLayoutInList = layouts.some(layout => layout.id === selectedLayoutId);
      console.log("Is selected layout in the list?", isLayoutInList);
    }
  }, [layouts, selectedLayoutId]);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate('/theaters');
      return;
    }
    loadLayouts();
    if (isEditMode) {
      loadTheater();
    }
  }, [isAuthenticated, isAdmin, isEditMode, navigate, loadTheater]);

  const handleInputChange = (e: any) => {
    setTheaterData({
      ...theaterData,
      [e.target.name]: e.target.value
    });
  };

  const setCurrentLayout = async (e: any) => {
    const layoutId = e.target.value;
    if (layoutId === '<new>') { // create new layout
      // create new layout for this theater, or without a theater if it is not yet saved
      navigate('/layout/new', {
        state: {
          theaterData,
          returnTo: `/theater/edit/${id || 'new'}`,
          theaterId: id // Optional: if we have theaterId
        }
      });
    } else {
      // // Update directly in theaterData
      // setTheaterData({
      //   ...theaterData,
      //   selectedLayoutId: layoutId
      // });
      setSelectedLayoutId(layoutId);
    }
    //setSelectedLayoutId(layoutId);
  };

  const handleSave = async () => {
    if (!theaterData.name.trim()) {
      setError(t('Name is required'));
      return;
    }

    try {
      setSaving(true);
      setError('');

      if (isEditMode) {
        await theaterApi.updateTheaterFull(id, theaterData);
        //await theaterApi.setTheaterLayoutCurrent(id, theaterData.selectedLayoutId);
        if (selectedLayoutId) {
          await theaterApi.setTheaterLayoutCurrent(id, selectedLayoutId);
        }
        toast.success(t('Theater updated successfully!'));
      } else {
        const response = await theaterApi.createTheater(theaterData);
        const newTheaterId = response.data;
        //if (theaterData.selectedLayoutId) {
        if (selectedLayoutId) {
          const res = await theaterApi.setTheaterLayoutCurrent(newTheaterId, selectedLayoutId);
          console.log("RES:", res);
        }
        toast.success(t('Theater created successfully!'));
      }
      navigate('/theaters');
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to ${isEditMode ? 'update' : 'create'} theater`);
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          {isEditMode ? t('Edit Theater') : t('Create New Theater')}
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
              name="name"
              label={t('Name')}
              value={theaterData.name}
              onChange={handleInputChange}
              fullWidth
              required
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
            <TextField
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
              */
            />
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

          <Grid item xs={12} md={2}>
            <FormControl fullWidth required>
              <InputLabel>{t('Layout')}</InputLabel>
              <Select
                name="selectedLayoutId"
                value={selectedLayoutId || ''} // Use the separate state
                //value={theaterData.selectedLayoutId || ''}
                label="Layouts"
                onChange={setCurrentLayout}
              >
                <MenuItem value={"<new>"}>&lt;{t('New Layout')}&gt;</MenuItem>
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
              (isEditMode ? t('Update Theater') : t('Create Theater'))
            }
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default TheaterEdit;
