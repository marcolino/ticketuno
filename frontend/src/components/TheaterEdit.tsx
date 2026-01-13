import React, { useState, useEffect, useCallback} from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Card,
  CardContent,
  Grid,
  Alert,
  //CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { theaterApi } from '../services/api';
import { Section, Row,/* Theater*/ } from '../types/theater';
import { useAuth } from '../contexts/AuthContext';

const TheaterEdit: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, isAdmin } = useAuth();

  const isEditMode = id && id !== 'new';

  //const [loading, setLoading] = useState(isEditMode);
  const [theaterName, setTheaterName] = useState('');
  const [theaterDescription, setTheaterDescription] = useState('');
  const [sections, setSections] = useState<Section[]>([
    {
      name: 'Orchestra',
      rows: [
        { id: 'A', seats: 12, startNumber: 1 },
      ]
    }
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadTheater = useCallback(async () => {
    try {
      //setLoading(true);
      const response = await theaterApi.getTheaterById(id!);
      const theater = response.data;
      setTheaterName(theater.name);
      setTheaterDescription(theater.description || '');
      setSections(theater.sections);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load theater');
    } finally {
      //setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate('/');
      return;
    }

    if (isEditMode) {
      loadTheater();
    }
  }, [isAuthenticated, isAdmin, isEditMode, navigate, loadTheater]);

  const addSection = () => {
    setSections([
      ...sections,
      {
        name: `Section ${sections.length + 1}`,
        rows: [{ id: 'A', seats: 10, startNumber: 1 }]
      }
    ]);
  };

  const removeSection = (sectionIndex: number) => {
    setSections(sections.filter((_, i) => i !== sectionIndex));
  };

  const updateSectionName = (sectionIndex: number, name: string) => {
    const newSections = [...sections];
    newSections[sectionIndex].name = name;
    setSections(newSections);
  };

  const addRow = (sectionIndex: number) => {
    const newSections = [...sections];
    const lastRow = newSections[sectionIndex].rows[newSections[sectionIndex].rows.length - 1];
    const nextRowId = lastRow ? String.fromCharCode(lastRow.id.charCodeAt(0) + 1) : 'A';

    newSections[sectionIndex].rows.push({
      id: nextRowId,
      seats: 10,
      startNumber: 1
    });
    setSections(newSections);
  };

  const removeRow = (sectionIndex: number, rowIndex: number) => {
    const newSections = [...sections];
    newSections[sectionIndex].rows = newSections[sectionIndex].rows.filter((_, i) => i !== rowIndex);
    setSections(newSections);
  };

  const updateRow = (sectionIndex: number, rowIndex: number, field: keyof Row, value: string | number) => {
    const newSections = [...sections];
    newSections[sectionIndex].rows[rowIndex] = {
      ...newSections[sectionIndex].rows[rowIndex],
      [field]: value
    };
    setSections(newSections);
  };

  const handleSave = async () => {
    if (!theaterName.trim()) {
      setError('Theater name is required');
      return;
    }

    if (sections.length === 0 || sections.some(s => s.rows.length === 0)) {
      setError('Please add at least one section with rows');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const theaterData = {
        name: theaterName,
        description: theaterDescription,
        sections: sections
      };

      if (isEditMode) {
        await theaterApi.updateTheater(id!, theaterData);
        alert('Theater updated successfully!');
      } else {
        await theaterApi.createTheater(theaterData);
        alert('Theater created successfully!');
      }

      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || `Failed to ${isEditMode ? 'update' : 'create'} theater`);
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
          {isEditMode ? 'Edit Theater' : 'Create New Theater'}
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mb: 4 }}>
          <TextField
            fullWidth
            label="Theater Name"
            value={theaterName}
            onChange={(e) => setTheaterName(e.target.value)}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Description (Optional)"
            value={theaterDescription}
            onChange={(e) => setTheaterDescription(e.target.value)}
            multiline
            rows={2}
          />
        </Box>

        {/* Sections */}
        <Typography variant="h5" gutterBottom>
          Sections
        </Typography>

        {sections.map((section, sectionIndex) => (
          <Card key={sectionIndex} sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <TextField
                  label="Section Name"
                  value={section.name}
                  onChange={(e) => updateSectionName(sectionIndex, e.target.value)}
                  sx={{ flexGrow: 1, mr: 2 }}
                />
                <Button
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => removeSection(sectionIndex)}
                  disabled={sections.length === 1}
                >
                  Remove Section
                </Button>
              </Box>

              <Typography variant="h6" gutterBottom>
                Rows
              </Typography>

              {/* Rows */}
              {section.rows.map((row, rowIndex) => (
                <Grid container spacing={2} key={rowIndex} sx={{ mb: 2 }}>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="Row ID"
                      value={row.id}
                      onChange={(e) => updateRow(sectionIndex, rowIndex, 'id', e.target.value.toUpperCase())}
                      inputProps={{ maxLength: 2 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="Number of Seats"
                      type="number"
                      value={row.seats}
                      onChange={(e) => updateRow(sectionIndex, rowIndex, 'seats', parseInt(e.target.value) || 0)}
                      inputProps={{ min: 1, max: 50 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField
                      fullWidth
                      label="Start Number"
                      type="number"
                      value={row.startNumber}
                      onChange={(e) => updateRow(sectionIndex, rowIndex, 'startNumber', parseInt(e.target.value) || 1)}
                      inputProps={{ min: 1 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={3} sx={{ display: 'flex', alignItems: 'center' }}>
                    <Button
                      fullWidth
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={() => removeRow(sectionIndex, rowIndex)}
                      disabled={section.rows.length === 1}
                    >
                      Remove
                    </Button>
                  </Grid>
                </Grid>
              ))}

              <Button
                startIcon={<AddIcon />}
                onClick={() => addRow(sectionIndex)}
                variant="outlined"
                size="small"
              >
                Add Row
              </Button>
            </CardContent>
          </Card>
        ))}

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            startIcon={<AddIcon />}
            onClick={addSection}
            variant="outlined"
            fullWidth
          >
            Add Section
          </Button>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
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
            {saving ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Theater' : 'Create Theater')}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default TheaterEdit;
