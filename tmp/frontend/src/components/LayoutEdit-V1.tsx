import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  TextField,
  Paper,
  Box,
  Typography,
  Grid,
  Alert,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from "@mui/icons-material";
import LayoutPreviewSVG from "./LayoutPreviewSVG";
import { useTranslation } from 'react-i18next';
import { layoutApi, theaterApi } from '../services/api';
import { LayoutJSON, SectionJSON, RowJSON } from "../../../shared/types/layout";
import { useAuth } from '../contexts/AuthContext';
import { toast } from '../contexts/ToastContext';

const LayoutEdit: React.FC = () => {
  const navigate = useNavigate();
  //const { id, theaterId } = useParams<{ id: string, theaterId: string }>();
  const { id, theaterId: theaterIdFromParams } = useParams<{ id: string, theaterId?: string }>();
  const [theaterId, setTheaterId] = useState<string | undefined>(theaterIdFromParams);
  const { isAuthenticated, isAdmin } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { t } = useTranslation();

  // Layout fields
  const [layoutName, setLayoutName] = useState('');
  const [layoutDescription, setLayoutDescription] = useState('');
  const [layoutJSON, setLayoutJSON] = useState<LayoutJSON>({ // TODO: to config
    version: 1,
    stage: { x: 300, y: 40, width: 400, height: 50, label: t('Stage') },
    sections: [
      {
        id: "platea",
        label: "Platea",
        origin: { x: 500, y: 200 },
        rowSpacing: 64,
        seatSpacing: 52,
        rows: [
          { "rowId": "A", "seatCount": 16, "curve": -2, "stretch": 1 },
          { "rowId": "B", "seatCount": 16, "curve": -2, "stretch": 1 },
          { "rowId": "C", "seatCount": 16, "curve": -2, "stretch": 1 }
        ]
      }
    ]
  });

  // Theater fields
  const [theaterName, setTheaterName] = useState('');
  const [theaterDescription, setTheaterDescription] = useState('');

  const loadLayout = useCallback(async () => {
    if (id) { // if new event, id is undefined
      try {
        const response = await layoutApi.getLayoutById(id!);
        const layout = response.data;
        
        setLayoutName(layout.name);
        setLayoutDescription(layout.description || '');
        setLayoutJSON(JSON.parse(layout.json));
        setTheaterId(layout.theaterId)

        setError('');
      } catch (err: any) {
        setError(err.response?.data?.error || t('Failed to load layout'));
      } finally {
      }
    }
  }, [id, t]);
  
  const loadTheater = useCallback(async () => {
    if (theaterId) { // if new event, id is undefined
      try {
        const response = await theaterApi.getTheaterById(theaterId!);
        const theater = response.data;
        
        setTheaterName(theater.name);
        setTheaterDescription(theater.description || '');

        setError('');
      } catch (err: any) {
        setError(err.response?.data?.error || t('Failed to load theater'));
      } finally {
      }
    }
  }, [theaterId, t]);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate('/layouts');
      return;
    }
    loadLayout();
    loadTheater();
   }, [isAuthenticated, isAdmin, navigate, loadLayout, loadTheater]);

  // Update stage
  const updateStage = (field: string, value: number | string) => {
    setLayoutJSON({
      ...layoutJSON,
      stage: { ...layoutJSON.stage, [field]: value }
    });
  };

  // Add section
  const addSection = () => {
    const newSection: SectionJSON = {
      id: `section_${Date.now()}`,
      label: `Section ${layoutJSON.sections.length + 1}`,
      origin: { x: 500, y: 200 + (layoutJSON.sections.length * 300) },
      rowSpacing: 64,
      seatSpacing: 52,
      rows: [
        { rowId: "A", seatCount: 10, curve: 0, stretch: 1.0 }
      ]
    };
    setLayoutJSON({
      ...layoutJSON,
      sections: [...layoutJSON.sections, newSection]
    });
  };

  // Remove section
  const removeSection = (index: number) => {
    setLayoutJSON({
      ...layoutJSON,
      sections: layoutJSON.sections.filter((_, i) => i !== index)
    });
  };

  // Update section
  const updateSection = (sectionIndex: number, field: string, value: any) => {
    const newSections = [...layoutJSON.sections];
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      newSections[sectionIndex] = {
        ...newSections[sectionIndex],
        [parent]: {
          ...(newSections[sectionIndex] as any)[parent],
          [child]: value
        }
      };
    } else {
      newSections[sectionIndex] = {
        ...newSections[sectionIndex],
        [field]: value
      };
    }
    setLayoutJSON({ ...layoutJSON, sections: newSections });
  };

  // Add row to section
  const addRow = (sectionIndex: number) => {
    const section = layoutJSON.sections[sectionIndex];
    const lastRow = section.rows[section.rows.length - 1];
    const nextRowId = lastRow 
      ? String.fromCharCode(lastRow.rowId.charCodeAt(0) + 1)
      : 'A';

    const newRow: RowJSON = {
      rowId: nextRowId,
      seatCount: lastRow?.seatCount || 10,
      curve: lastRow?.curve || 0,
      stretch: lastRow?.stretch || 1.0
    };

    const newSections = [...layoutJSON.sections];
    newSections[sectionIndex].rows.push(newRow);
    setLayoutJSON({ ...layoutJSON, sections: newSections });
  };

  // Remove row
  const removeRow = (sectionIndex: number, rowIndex: number) => {
    const newSections = [...layoutJSON.sections];
    newSections[sectionIndex].rows = newSections[sectionIndex].rows.filter((_, i) => i !== rowIndex);
    setLayoutJSON({ ...layoutJSON, sections: newSections });
  };

  // Update row
  const updateRow = (sectionIndex: number, rowIndex: number, field: keyof RowJSON, value: string | number) => {
    const newSections = [...layoutJSON.sections];
    // Special handling for curve field
    if (field === 'curve') {
      // If value is a string, parse it to number
      const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
      
      // Invert the value: display 2 becomes -2, etc.
      // Clamp to range [-40, 40]
      const invertedValue = -numValue;
      const clampedValue = Math.max(-40, Math.min(40, invertedValue));
      
      newSections[sectionIndex].rows[rowIndex] = {
        ...newSections[sectionIndex].rows[rowIndex],
        [field]: clampedValue
      };
    } else {
      // For other fields, keep existing logic
      newSections[sectionIndex].rows[rowIndex] = {
        ...newSections[sectionIndex].rows[rowIndex],
        [field]: value
      };
    }
    // newSections[sectionIndex].rows[rowIndex] = {
    //   ...newSections[sectionIndex].rows[rowIndex],
    //   [field]: value
    // };
    setLayoutJSON({ ...layoutJSON, sections: newSections });
  };

  // Save layout
  const save = async () => {
    try {
      setSaving(true);
      // const layout: Layout = {
      //   id: id ?? `layout-${Date.now()}`, // or generate proper ID
      //   name: layoutName,
      //   description: layoutDescription,
      //   theaterId: '', // TODO ...
      //   json: JSON.stringify(layoutJSON) // store LayoutJSON as string
      // };
      const layoutData = {
        name: layoutName,
        description: layoutDescription,
        theaterId,
        json: JSON.stringify(layoutJSON) // Only stringify the layoutJSON
      };
      if (!id) { // TODO: if new
        await layoutApi.createLayout(layoutData);
        toast.success("Layout created successfully!");
      } else {
        await layoutApi.updateLayout(id, layoutData);
        toast.success("Layout saved successfully!");
      }
      navigate(-1); // Important: go back, to eventually conclude theater edit
    } catch (error: any) { // TODO... error: ???
      toast.error(t("Failed to save layout: {{err}}", { err: error.response?.data?.error }));
    } finally {
      setSaving(false);
    }
  };

  // Cancel layout
  const cancel = async () => {
    navigate('/layouts');
  };
  
  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        {/* Editor Panel */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 1, maxHeight: '80vh', overflow: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h5">{t('Layout Editor')}</Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<CancelIcon />}
                  onClick={cancel}
                  size="small"
                >
                  {t('Cancel')}
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={save}
                  disabled={saving}
                >
                  {saving ? t('Saving...') : t('Save')}
                </Button>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <TextField
                fullWidth
                label={t('Theater')}
                type="text"
                value={`${theaterName} ${theaterDescription ? '(' + theaterDescription + ')' : ''}`}
                disabled
                // inputProps={
                //     { readOnly: true }
                // }
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <TextField
                fullWidth
                label={t('Layout name')}
                type="text"
                value={layoutName}
                onChange={(e) => setLayoutName(e.target.value)}
              />
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
               <TextField
                fullWidth
                label={t('Layout description')}
                type="text"
                value={layoutDescription}
                onChange={(e) => setLayoutDescription(e.target.value)}
              />
            </Box>

            {/* Stage Settings */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">{t('Stage')}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label={t('Label')}
                      value={layoutJSON.stage.label}
                      onChange={(e) => updateStage('label', e.target.value)}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label={t('X Position')}
                      type="number"
                      value={layoutJSON.stage.x}
                      onChange={(e) => updateStage('x', parseFloat(e.target.value))}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label={t('Y Position')}
                      type="number"
                      value={layoutJSON.stage.y}
                      onChange={(e) => updateStage('y', parseFloat(e.target.value))}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label={t('Width')}
                      type="number"
                      value={layoutJSON.stage.width}
                      onChange={(e) => updateStage('width', parseFloat(e.target.value))}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label={t('Height')}
                      type="number"
                      value={layoutJSON.stage.height}
                      onChange={(e) => updateStage('height', parseFloat(e.target.value))}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            <Divider sx={{ my: 2 }} />

            {/* Sections */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">{t('Sections')}</Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={addSection}
                  size="small"
                >
                  {t('Add Section')}
                </Button>
              </Box>

              {layoutJSON.sections.map((section, sectionIndex) => (
                <Accordion key={section.id}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Typography sx={{ flexGrow: 1 }}>{section.label}</Typography>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSection(sectionIndex);
                        }}
                        disabled={layoutJSON.sections.length === 1}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label={t('Section Label')}
                          value={section.label}
                          onChange={(e) => updateSection(sectionIndex, 'label', e.target.value)}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label={t('Origin X')}
                          type="number"
                          value={section.origin.x}
                          onChange={(e) => updateSection(sectionIndex, 'origin.x', parseFloat(e.target.value))}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label={t('Origin Y')}
                          type="number"
                          value={section.origin.y}
                          onChange={(e) => updateSection(sectionIndex, 'origin.y', parseFloat(e.target.value))}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label={t('Row Spacing')}
                          type="number"
                          value={section.rowSpacing}
                          onChange={(e) => updateSection(sectionIndex, 'rowSpacing', parseFloat(e.target.value))}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          fullWidth
                          label={t('Seat Spacing')}
                          type="number"
                          value={section.seatSpacing}
                          onChange={(e) => updateSection(sectionIndex, 'seatSpacing', parseFloat(e.target.value))}
                        />
                      </Grid>

                      {/* Rows */}
                      <Grid item xs={12}>
                        <Divider sx={{ my: 2 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="subtitle2">Rows</Typography>
                          <Button
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => addRow(sectionIndex)}
                          >
                            {t('Add Row')}
                          </Button>
                        </Box>

                        {section.rows.map((row, rowIndex) => (
                          <Paper key={rowIndex} variant="outlined" sx={{ p: 2, mb: 2 }}>
                            <Grid container spacing={1} alignItems="center">
                              <Grid item xs={2}>
                                <TextField
                                  fullWidth
                                  label={t('Row')}
                                  value={row.rowId}
                                  onChange={(e) => updateRow(sectionIndex, rowIndex, 'rowId', e.target.value)}
                                  inputProps={{ maxLength: 2 }}
                                  size="small"
                                />
                              </Grid>
                              <Grid item xs={3}>
                                <TextField
                                  fullWidth
                                  label={t('Seats')}
                                  type="number"
                                  value={row.seatCount}
                                  onChange={(e) => updateRow(sectionIndex, rowIndex, 'seatCount', parseInt(e.target.value) || 0)}
                                  inputProps={{ min: 1 }}
                                  size="small"
                                />
                              </Grid>
                              <Grid item xs={3}>
                                <TextField
                                  fullWidth
                                  label={t('Curve')}
                                  type="number"
                                  value={-row.curve!}
                                  onChange={(e) => updateRow(sectionIndex, rowIndex, 'curve', parseFloat(e.target.value) || 0)}
                                  inputProps={{ 
                                    step: 0.1,
                                    min: -40,
                                    max: 40
                                  }}
                                  size="small"
                                />
                              </Grid>
                              <Grid item xs={3}>
                                <TextField
                                  fullWidth
                                  label={t('Stretch')}
                                  type="number"
                                  value={row.stretch}
                                  onChange={(e) => updateRow(sectionIndex, rowIndex, 'stretch', parseFloat(e.target.value) || 1)}
                                  inputProps={{ step: 0.1, min: 0.1 }}
                                  size="small"
                                />
                              </Grid>
                              <Grid item xs={1}>
                                <IconButton
                                  size="small"
                                  onClick={() => removeRow(sectionIndex, rowIndex)}
                                  disabled={section.rows.length === 1}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Grid>
                            </Grid>
                          </Paper>
                        ))}
                      </Grid>
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Preview Panel */}
        <Grid item xs={12} md={7}>
          <Paper 
            sx={{ 
              p: 3, 
              height: '80vh',
              display: 'flex',
              flexDirection: 'column' 
            }}
          >
            <Typography variant="h5" gutterBottom sx={{ flexShrink: 0 }}>
              {t('Preview of layout "{{layoutName}}"', {layoutName})}
            </Typography>
            
            {/* Scrollable SVG container - flex grow to fill space */}
            <Box
              sx={{
                flex: 1,  // ✅ Fill remaining height
                width: '100%',
                overflow: 'auto',
                //scrollbarWidth: 'thin',
                //scrollbarColor: '#ccc transparent',
                '&::-webkit-scrollbar': {
                  width: '8px',
                  height: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  backgroundColor: '#f1f1f1',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb': {
                  backgroundColor: '#c1c1c1',
                  borderRadius: '4px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  backgroundColor: '#a8a8a8',
                },
              }}
            >
              <Box sx={{ minWidth: 'max-content', minHeight: 'max-content' }}>
                <LayoutPreviewSVG layout={layoutJSON} />
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LayoutEdit;
