import { useState, useCallback, useEffect, useRef } from 'react';
import Cropper from 'react-easy-crop';
import {
  Box,
  Grid,
  Slider,
  Typography,
  Button,
  IconButton,
  Stack,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Paper
} from '@mui/material';
import {
  Undo,
  Redo,
  RotateLeft,
  RotateRight,
  ZoomIn,
  ZoomOut,
  Flip,
  Brightness5,
  Contrast,
  Save,
  Close,
  History
} from '@mui/icons-material';
import { getCroppedImg } from '../utils/canvasUtils';

const ASPECT_RATIOS = [
  { label: 'Free', value: NaN },
  { label: 'Square (1:1)', value: 1 },
  { label: 'Landscape (16:9)', value: 16/9 },
  { label: 'Portrait (9:16)', value: 9/16 },
  { label: 'Instagram (4:5)', value: 4/5 },
  { label: 'Facebook (1.91:1)', value: 1.91 }
];

const ImageEditor = ({ imageSrc, onEditComplete, onCancel }) => {
  // Crop state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flip, setFlip] = useState({ horizontal: false, vertical: false });
  const [aspect, setAspect] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  
  // Filter state
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  
  // History state for undo/redo
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  
  // Presets
  const [presets, setPresets] = useState([]);
  const [presetName, setPresetName] = useState('');

  // Save current state to history
  const saveToHistory = useCallback((state) => {
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push(state);
    historyRef.current = newHistory;
    historyIndexRef.current = newHistory.length - 1;
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, []);

  // Undo
  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--;
      const state = historyRef.current[historyIndexRef.current];
      applyState(state);
      setHistoryIndex(historyIndexRef.current);
    }
  };

  // Redo
  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++;
      const state = historyRef.current[historyIndexRef.current];
      applyState(state);
      setHistoryIndex(historyIndexRef.current);
    }
  };

  const applyState = (state) => {
    setCrop(state.crop);
    setZoom(state.zoom);
    setRotation(state.rotation);
    setBrightness(state.brightness);
    setContrast(state.contrast);
    setSaturation(state.saturation);
  };

  // Save preset to localStorage
  const savePreset = () => {
    if (!presetName.trim()) return;
    
    const preset = {
      name: presetName,
      aspect,
      brightness,
      contrast,
      saturation,
      timestamp: new Date().toISOString()
    };
    
    const updatedPresets = [...presets, preset];
    setPresets(updatedPresets);
    localStorage.setItem('imageEditorPresets', JSON.stringify(updatedPresets));
    setPresetName('');
  };

  // Load preset
  const loadPreset = (preset) => {
    setAspect(preset.aspect);
    setBrightness(preset.brightness);
    setContrast(preset.contrast);
    setSaturation(preset.saturation);
  };

  // Delete preset
  const deletePreset = (index) => {
    const updatedPresets = presets.filter((_, i) => i !== index);
    setPresets(updatedPresets);
    localStorage.setItem('imageEditorPresets', JSON.stringify(updatedPresets));
  };

  // Load presets from localStorage on mount
  useEffect(() => {
    const savedPresets = localStorage.getItem('imageEditorPresets');
    if (savedPresets) {
      setPresets(JSON.parse(savedPresets));
    }
    
    // Save initial state to history
    const initialState = {
      crop: { x: 0, y: 0 },
      zoom: 1,
      rotation: 0,
      brightness: 100,
      contrast: 100,
      saturation: 100
    };
    saveToHistory(initialState);
  }, [saveToHistory]);

  // Save state to history when it changes
  useEffect(() => {
    const currentState = {
      crop,
      zoom,
      rotation,
      brightness,
      contrast,
      saturation
    };
    
    // Debounce history saving
    const timer = setTimeout(() => {
      if (historyIndexRef.current === -1 || 
          JSON.stringify(historyRef.current[historyIndexRef.current]) !== JSON.stringify(currentState)) {
        saveToHistory(currentState);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [crop, zoom, rotation, brightness, contrast, saturation, saveToHistory]);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      const croppedImage = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        rotation,
        flip,
        { brightness, contrast, saturation }
      );
      onEditComplete(croppedImage);
    } catch (e) {
      console.error('Error processing image:', e);
    }
  }, [imageSrc, croppedAreaPixels, rotation, flip, brightness, contrast, saturation, onEditComplete]);

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setFlip({ horizontal: false, vertical: false });
  };

  const filterStyle = {
    filter: `
      brightness(${brightness}%) 
      contrast(${contrast}%) 
      saturate(${saturation}%)
    `
  };

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ position: 'relative', height: 400 }}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                style={{
                  containerStyle: { 
                    backgroundColor: '#f5f5f5',
                    ...filterStyle 
                  }
                }}
              />
            </CardContent>
          </Card>

          <Box sx={{ mt: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <IconButton onClick={handleUndo} disabled={historyIndex <= 0}>
                <Undo />
              </IconButton>
              <IconButton onClick={handleRedo} disabled={historyIndex >= history.length - 1}>
                <Redo />
              </IconButton>
              <Typography variant="caption" color="text.secondary">
                History ({historyIndex + 1}/{history.length})
              </Typography>
              
              <IconButton onClick={() => setRotation(rotation - 90)}>
                <RotateLeft />
              </IconButton>
              <IconButton onClick={() => setRotation(rotation + 90)}>
                <RotateRight />
              </IconButton>
              
              <IconButton onClick={() => setFlip({ ...flip, horizontal: !flip.horizontal })}>
                <Flip sx={{ transform: 'scaleX(-1)' }} />
              </IconButton>
              
              <IconButton onClick={() => setZoom(Math.max(1, zoom - 0.1))}>
                <ZoomOut />
              </IconButton>
              <IconButton onClick={() => setZoom(Math.min(3, zoom + 0.1))}>
                <ZoomIn />
              </IconButton>
            </Stack>
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Crop Settings
            </Typography>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Aspect Ratio</InputLabel>
              <Select
                value={aspect}
                label="Aspect Ratio"
                onChange={(e) => setAspect(e.target.value)}
              >
                {ASPECT_RATIOS.map((ratio) => (
                  <MenuItem key={ratio.label} value={ratio.value}>
                    {ratio.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Typography gutterBottom>
              Zoom: {zoom.toFixed(1)}x
            </Typography>
            <Slider
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              onChange={(e, value) => setZoom(value)}
              valueLabelDisplay="auto"
            />
            
            <Typography gutterBottom sx={{ mt: 2 }}>
              Rotation: {rotation}°
            </Typography>
            <Slider
              value={rotation}
              min={0}
              max={360}
              onChange={(e, value) => setRotation(value)}
              valueLabelDisplay="auto"
            />
          </Paper>

          <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Filters
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Brightness5 fontSize="small" />
                <Typography variant="body2" sx={{ flex: 1 }}>
                  Brightness
                </Typography>
                <Typography variant="caption">
                  {brightness}%
                </Typography>
              </Stack>
              <Slider
                value={brightness}
                min={0}
                max={200}
                onChange={(e, value) => setBrightness(value)}
              />
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Contrast fontSize="small" />
                <Typography variant="body2" sx={{ flex: 1 }}>
                  Contrast
                </Typography>
                <Typography variant="caption">
                  {contrast}%
                </Typography>
              </Stack>
              <Slider
                value={contrast}
                min={0}
                max={200}
                onChange={(e, value) => setContrast(value)}
              />
            </Box>
            
            <Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Brightness5 fontSize="small" />
                <Typography variant="body2" sx={{ flex: 1 }}>
                  Saturation
                </Typography>
                <Typography variant="caption">
                  {saturation}%
                </Typography>
              </Stack>
              <Slider
                value={saturation}
                min={0}
                max={200}
                onChange={(e, value) => setSaturation(value)}
              />
            </Box>
          </Paper>

          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Saved Presets
            </Typography>
            
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <FormControl size="small" sx={{ flex: 1 }}>
                <InputLabel>Preset Name</InputLabel>
                <Select
                  value={presetName}
                  label="Preset Name"
                  onChange={(e) => setPresetName(e.target.value)}
                >
                  <MenuItem value="">Custom</MenuItem>
                  <MenuItem value="Instagram">Instagram</MenuItem>
                  <MenuItem value="Facebook">Facebook</MenuItem>
                  <MenuItem value="Twitter">Twitter</MenuItem>
                  <MenuItem value="Portrait">Portrait</MenuItem>
                </Select>
              </FormControl>
              <Button 
                variant="outlined" 
                onClick={savePreset}
                disabled={!presetName.trim()}
              >
                Save
              </Button>
            </Stack>
            
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {presets.map((preset, index) => (
                <Chip
                  key={index}
                  label={preset.name}
                  onClick={() => loadPreset(preset)}
                  onDelete={() => deletePreset(index)}
                  icon={<History />}
                  size="small"
                />
              ))}
              {presets.length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  No saved presets yet
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
        <Button
          variant="outlined"
          onClick={handleReset}
          startIcon={<Close />}
        >
          Reset All
        </Button>
        <Button
          variant="outlined"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          startIcon={<Save />}
        >
          Save & Continue
        </Button>
      </Stack>
    </Box>
  );
};

export default ImageEditor;
