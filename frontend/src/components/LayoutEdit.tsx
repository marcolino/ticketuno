import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  ViewCompact as ViewCompactIcon,
} from '@mui/icons-material';
import { useDialog } from '../contexts/DialogContext';
import useNavigate from '@/hooks/useNavigate';
import LayoutPreviewSVG from './LayoutPreviewSVG';
//import { SpecialCondition } from './LayoutSeat';
import LayoutLegend from './LayoutLegend';
import SeatMarkingToolbar, { MarkingCondition } from './SeatMarkingToolbar';
import { layoutApi, theaterApi } from '@/services/api';
import { LayoutJSON, SectionJSON, RowJSON } from '@/shared/types/layout';
import { generateSeats, SpecialCondition } from '@/shared/types/layoutToSeats';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/contexts/ToastContext';

// Define location state interface
interface LocationState {
  theaterData?: {
    name: string;
    location: string;
    selectedLayoutId: string;
  };
  returnTo?: string;
  parentReturnTo?: string,
  parentEventData?: string,
  theaterId?: string; // You can also pass theaterId directly
}

const LayoutEdit: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();

  const isEditMode = id && id !== 'new';
  
  const showDialog = useDialog();
  
  // Get theater data and return path from location state
  //const { theaterData, returnTo, theaterId: theaterIdFromState } = location.state as LocationState || {};
  const {
    theaterData,
    returnTo,
    theaterId: theaterIdFromState,
    parentReturnTo,
    parentEventData
  } = location.state as LocationState || {};

  // Use theaterId from state or params (state takes precedence)
  const [theaterId, setTheaterId] = useState<string | undefined>(
    theaterIdFromState || undefined
  );
  
  const { isOperator } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [isEditable, setIsEditable] = useState(true);
  
  const [markingActive, setMarkingActive] = useState(false);
  const [markingCondition, setMarkingCondition] = useState<MarkingCondition | null>(null);

  // Layout fields
  const SECTION_VERTICAL_GAP = 115;
  const [layoutName, setLayoutName] = useState('');
  const [layoutDescription, setLayoutDescription] = useState('');
  const [layoutJSON, setLayoutJSON] = useState<LayoutJSON>({ // TODO: to config
    version: 1,
    stage: { x: 300, y: 40, width: 400, height: 50, label: t('Stage') },
    sections: [
      {
        id: 'platea',
        label: 'Platea',
        origin: { x: 500, y: 200 },
        rowSpacing: 64,
        seatSpacing: 52,
        rows: [
          { 'rowId': 'A', 'seatCount': 12, 'curve': -2, 'stretch': 1 },
          { 'rowId': 'B', 'seatCount': 12, 'curve': -2, 'stretch': 1 },
          { 'rowId': 'C', 'seatCount': 12, 'curve': -2, 'stretch': 1 },
        ]
      },
      {
        id: 'galleria',
        label: 'Galleria',
        origin: { x: 500, y: 475 },
        rowSpacing: 64,
        seatSpacing: 52,
        rows: [
          { 'rowId': 'A', 'seatCount': 10, 'curve': 0, 'stretch': 1 },
          { 'rowId': 'B', 'seatCount': 10, 'curve': 0, 'stretch': 1 },
          { 'rowId': 'C', 'seatCount': 10, 'curve': 0, 'stretch': 1 },
          { 'rowId': 'D', 'seatCount': 10, 'curve': 0, 'stretch': 1 },
          { 'rowId': 'E', 'seatCount': 10, 'curve': 0, 'stretch': 1 },
        ],
      },
    ],
  });
  
  //const seats = generateSeats(layoutJSON); // No status needed
  const seats = useMemo(() => {
    const raw = generateSeats(layoutJSON);
    const conditions = layoutJSON.seatConditions || {};

    // Per-row display counter, skipping absent seats
    const rowCounters: Record<string, number> = {};
    
    // return raw.map(seat => ({
    //   ...seat,
    //   specialCondition: conditions[seat.seatId] as SpecialCondition | undefined,
    // }));
    return raw.map(seat => {
      const rowKey = `${seat.sectionId}|${seat.rowId}`;
      const specialCondition = conditions[seat.seatId] as SpecialCondition | undefined;

      if (rowCounters[rowKey] === undefined) rowCounters[rowKey] = 1;

      const displayNumber = specialCondition === 'Absent'
        ? seat.seatNumber // Absent seat keeps its physical number (for operator reference)
        : rowCounters[rowKey]++; // Everyone else gets the next display slot

      return {
        ...seat,
        specialCondition,
        displayNumber,
      };
    });
  }, [layoutJSON]);

  // Theater fields from location state
  const [theaterName, setTheaterName] = useState(theaterData?.name || '');
  const [theaterDescription, setTheaterDescription] = useState('');

  const [expandedSection, setExpandedSection] = useState<string | false>(false);
  const sectionLabelRefs = React.useRef<Record<string, HTMLInputElement | null>>({});

  const loadTheater = useCallback(async (theaterIdToLoad: string) => {
    try {
      const response = await theaterApi.getTheaterById(theaterIdToLoad);
      const theater = response.data;
      
      setTheaterName(theater.name);
      setTheaterDescription(theater.description || '');
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || t('Failed to load theater'));
    }
  }, [t]);

  const loadLayout = useCallback(async () => {
    if (id) {
      try {
        const response = await layoutApi.getLayoutById(id!);
        const layout = response.data;
        
        setLayoutName(layout.name);
        setLayoutDescription(layout.description || '');
        setLayoutJSON(JSON.parse(layout.json));
        setTheaterId(layout.theaterId);
        setIsEditable(layout.isEditable ?? true);

        // Disable all inputs and hide marking toolbar when locked:
        if (!layout.isEditable) { // TODO: handle layout.lockInfo ...
          toast.warning(t('This layout cannot be modified')); // some active booking is present...
          if (layout.lockInfo) {
            const reservedTotal = layout.lockInfo.reduce((sum, lock) => sum + lock.reserved, 0);
            const bookedTotal = layout.lockInfo.reduce((sum, lock) => sum + lock.booked, 0);
            showDialog({
              title: t('This layout cannot be modified'),
              content: (
                <Typography
                  variant="subtitle1"
                  color="text.secondary"
                  component="div" // render as inline element
                  sx={{ lineHeight: 1.5 }}
                >
                  <strong>
                    {reservedTotal > 0 && bookedTotal > 0
                      ? t('There are these active reservations / bookings')
                      : reservedTotal > 0
                        ? t('There are these active reservations')
                        : t('There are these active bookings')
                    }:
                  </strong>
                  {
                    layout.lockInfo.map((lock, index) => (
                      <Box key={index} sx={{ mt: 1, ml: 1 }}>
                        {t('Event')}: <i>{lock.eventTitle}</i><br />
                        {t('Performance date')}: <i>{lock.performanceDate} {lock.startTime}</i><br />
                        {lock.reserved > 0 && <>{t('Reserved seats')}: <i>{lock.reserved}</i><br /></>}
                        {lock.booked > 0 && <>{t('Booked seats')}: <i>{lock.booked}</i><br /></>}
                      </Box>
                    ))
                  }
                </Typography>
              ),
              confirmText: 'Ok',
              shrinkToContent: true,
            });
          }
          //console.warn("Layout is read-only:", layout)
        }

        // If we have theaterId from the layout, load theater details
        if (layout.theaterId) {
          loadTheater(layout.theaterId);
        }
        
        setError('');
      } catch (err: any) {
        setError(err.response?.data?.error || t('Failed to load layout'));
      }
    }
  }, [id, t, loadTheater]);

  useEffect(() => {
    if (!isOperator) {
      navigate(-1);
      return;
    }
  }, [isOperator, navigate]);

  useEffect(() => {
    // If we have theaterData from location state, use it
    if (theaterData?.name) {
      setTheaterName(theaterData.name);
    }
    
    loadLayout();
  }, [loadLayout, theaterData]);

  // Update stage
  const updateStage = (field: string, value: number | string) => {
    setLayoutJSON({
      ...layoutJSON,
      stage: { ...layoutJSON.stage, [field]: value }
    });
  };

  // Add section
  const addSection = () => {
    const newId = `section_${Date.now()}`;
    const lastSection = layoutJSON.sections[layoutJSON.sections.length - 1];

    let newY = 200;

    if (lastSection) {
      const rowsCount = lastSection.rows.length;

      // Y of last row center
      const lastRowY =
        lastSection.origin.y +
        (rowsCount - 1) * lastSection.rowSpacing;

      // Add half spacing to reach bottom edge
      const sectionBottom =
        lastRowY + lastSection.rowSpacing / 2;

      newY = sectionBottom + SECTION_VERTICAL_GAP;
    }

    const newSection: SectionJSON = {
      id: newId,
      label: `Section ${layoutJSON.sections.length + 1}`,
      origin: { x: lastSection?.origin.x || 500, y: newY },
      rowSpacing: 64,
      seatSpacing: 52,
      rows: [
        { rowId: 'A', seatCount: 10, curve: 0, stretch: 1.0 }
      ]
    };

    setLayoutJSON(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));

    setExpandedSection(newId);

    // Focus and select new section name
    setTimeout(() => {
      const input = sectionLabelRefs.current[newId];
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
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

  const removeSection = (index: number) => {
    setLayoutJSON(prev => {
      const newSections = prev.sections.filter((_, i) => i !== index);

      // Update expandedSection if needed
      if (expandedSection === prev.sections[index].id) {
        if (newSections[index]) {
          // Expand next section if exists
          setExpandedSection(newSections[index].id);
        } else if (newSections[index - 1]) {
          // Otherwise expand previous section
          setExpandedSection(newSections[index - 1].id);
        } else {
          // No sections left
          setExpandedSection(false);
        }
      }

      // Remove the ref of the deleted section
      const removedId = prev.sections[index].id;
      delete sectionLabelRefs.current[removedId];

      return {
        ...prev,
        sections: newSections
      };
    });
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
    if (field === 'curve') {
      const numValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
      const invertedValue = -numValue;
      const clampedValue = Math.max(-40, Math.min(40, invertedValue));
      
      newSections[sectionIndex].rows[rowIndex] = {
        ...newSections[sectionIndex].rows[rowIndex],
        [field]: clampedValue
      };
    } else {
      newSections[sectionIndex].rows[rowIndex] = {
        ...newSections[sectionIndex].rows[rowIndex],
        [field]: value
      };
    }
    setLayoutJSON({ ...layoutJSON, sections: newSections });
  };

  const validate = () => {
    if (!layoutName) {
      toast.warning(t("Layout name is mandatory"));
      return false;
    }
    return true;
  };

  // Save layout - KEY CHANGE HERE
  const save = async () => {
    if (!validate()) return;
    try {
      setSaving(true);
      const layoutData = {
        name: layoutName,
        description: layoutDescription,
        theaterId,
        json: JSON.stringify(layoutJSON)
      };
      
      let savedLayout;
      if (!id) {
        const response = await layoutApi.createLayout(layoutData);
        savedLayout = response.data;
        toast.success('Layout created successfully!');
      } else {
        const response = await layoutApi.updateLayout(id, layoutData);
        savedLayout = response.data;
        toast.success('Layout saved successfully!');
      }
      
      // Navigate back with updated theater data
      // navigate(((returnTo || -1) as any), {
      //   state: {
      //     theaterData: {
      //       ...theaterData,
      //       selectedLayoutId: savedLayout.id
      //     }
      //   }
      // });

       // Navigate back with selectedLayoutId
      if (returnTo) {
        navigate(returnTo, {
          state: {
            theaterData: {
              ...theaterData,
              selectedLayoutId: savedLayout.id
            },
            returnTo: parentReturnTo, // TheaterEdit needs this to find its way back
            eventData: parentEventData, 
          },
          replace: true, 
        });
      } else {
        navigate(-1);
      }
    } catch (error: any) {
      toast.error(t('Failed to save layout: {{err}}', { err: error.response?.data?.error }));
    } finally {
      setSaving(false);
    }
  };

  // Cancel layout
  const cancel = async () => {
    // Navigate back with original theater data
    navigate(returnTo || '/layouts', {
      state: { theaterData },
      replace: true, 
    });
    //navigate(returnTo || '/layouts');
  };
  
  const activeConditions = useMemo(() => {
    const found = new Set<SpecialCondition>();
    seats.forEach(seat => {
      if (seat.specialCondition) found.add(seat.specialCondition);
    });
    return [...found];
  }, [seats]);
  
  const handleMarkingSeatClick = useCallback((seatId: string) => {
    if (!markingActive || !markingCondition) return;

    setLayoutJSON(prev => {
      const current = { ...(prev.seatConditions || {}) };

      if (markingCondition === 'Normal') {
        // Remove any special condition
        delete current[seatId];
      } else {
        // Toggle: clicking the same condition twice clears it
        if (current[seatId] === markingCondition) {
          delete current[seatId];
        } else {
          current[seatId] = markingCondition as SpecialCondition;
        }
      }

      return { ...prev, seatConditions: current };
    });
  }, [markingActive, markingCondition]);

  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        {/* Editor Panel */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 1, maxHeight: '80vh', overflow: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              {/* <Typography variant="h5">{t('Layout Editor')}</Typography> */}
              <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
                <ViewCompactIcon fontSize="large" /> {isEditMode ? t('Edit Layout') : t('Create New Layout')}
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

            </Box>

            {/* Theater info */}
            {theaterName && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <TextField
                  fullWidth
                  label={t('Theater')}
                  type="text"
                  value={`${theaterName} ${theaterDescription ? '(' + theaterDescription + ')' : ''}`}
                  disabled
                />
              </Box>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <TextField
                fullWidth
                label={t('Layout name')}
                type="text"
                value={layoutName}
                onChange={(e) => setLayoutName(e.target.value)}
                required
                autoFocus
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
                <Accordion
                  key={section.id}
                  expanded={expandedSection === section.id}
                  onChange={(_, isExpanded) =>
                    setExpandedSection(isExpanded ? section.id : false)
                  }
                >
                {/* <Accordion key={section.id}> */}
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
                          inputRef={(el) => (sectionLabelRefs.current[section.id] = el)}
                          onChange={(e) => updateSection(sectionIndex, 'label', e.target.value)}
                        />
                        {/* <TextField
                          fullWidth
                          label={t('Section Label')}
                          value={section.label}
                          onChange={(e) => updateSection(sectionIndex, 'label', e.target.value)}
                        /> */}
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

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ width: { xs: '100%', sm: 'auto' }, display: 'flex', justifyContent: 'flex-end' }}>
                {isEditable && (
                  <SeatMarkingToolbar
                    active={markingActive}
                    selectedCondition={markingCondition}
                    onToggleActive={() => {
                      setMarkingActive(v => !v);
                      setMarkingCondition(null); // Reset selection when toggling
                    }}
                    onSelectCondition={setMarkingCondition}
                  />
                )}
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
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
                  disabled={!isEditable || saving}
                  size="small"
                >
                  {saving ? t('Saving...') : t('Save')}
                  </Button>
              </Box>
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
            <Typography variant="h6" gutterBottom sx={{ flexShrink: 0 }}>
              {/* {t('Preview of layout "{{layoutName}}"', {layoutName})} */}
              {t('Preview')}
            </Typography>
            
            <Box
              sx={{
                flex: 1,
                width: '100%',
                overflow: 'auto',
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
                {/* <LayoutPreviewSVG layout={layoutJSON} /> */}
                <LayoutPreviewSVG
                  layout={layoutJSON}
                  seats={seats}
                  //interactive={false}
                  interactive={markingActive} // Seats become clickable in marking mode, also while editing
                  onSeatClick={handleMarkingSeatClick} // Supplies the selected condition
                  bookingView={false}
                />
                <LayoutLegend
                  conditions={activeConditions}
                  showStatusLegend={false}
                  isEditView={true}
                />
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LayoutEdit;
