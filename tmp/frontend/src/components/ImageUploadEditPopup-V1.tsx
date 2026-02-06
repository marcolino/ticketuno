import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  Button,
  IconButton,
  LinearProgress,
  Alert,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Stack,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  //Paper,
  TextField,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Close,
  CloudUpload,
  InsertPhoto,
  CheckCircle,
  RestartAlt,
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
  History,
  Download,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import Cropper from 'react-easy-crop';
import imageCompression from 'browser-image-compression';
import { getCroppedImg } from '../utils/canvasUtils';

// TypeScript Interfaces
interface ImageData {
  file: File;
  preview: string;
  name: string;
  size: number;
  originalSize?: number;
}

interface CropState {
  x: number;
  y: number;
}

interface FlipState {
  horizontal: boolean;
  vertical: boolean;
}

interface FilterState {
  brightness: number;
  contrast: number;
  saturation: number;
}

interface HistoryState {
  crop: CropState;
  zoom: number;
  rotation: number;
  brightness: number;
  contrast: number;
  saturation: number;
}

interface Preset {
  name: string;
  aspect?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  timestamp: string;
}

interface AspectRatioOption {
  label: string;
  value: number | 'free';
}

interface ImageUploadEditPopupProps {
  open: boolean;
  onClose: () => void;
  //onSave: (imageBlob: Blob) => void;
  onSave: (imageUrl: string, imageData: any) => void;
  fixedAspectRatio?: number;
  maxSizeMB?: number;
  title?: string;
}

const ASPECT_RATIO_OPTIONS: AspectRatioOption[] = [
  { label: 'Free', value: 'free' },
  { label: 'Square (1:1)', value: 1 },
  { label: 'Landscape (16:9)', value: 16/9 },
  { label: 'Portrait (9:16)', value: 9/16 },
  { label: 'Instagram (4:5)', value: 4/5 },
  { label: 'Facebook (1.91:1)', value: 1.91 },
];

const ImageUploadEditPopup: React.FC<ImageUploadEditPopupProps> = ({
  open,
  onClose,
  onSave,
  fixedAspectRatio,
  maxSizeMB = 5,
  title = 'Upload & Edit Image',
}) => {
  // Steps: 'upload' | 'edit' | 'preview'
  const [activeStep, setActiveStep] = useState<'upload' | 'edit' | 'preview'>('upload');
  const [uploadedImage, setUploadedImage] = useState<ImageData | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [compressedInfo, setCompressedInfo] = useState<{
    originalSize: string;
    compressedSize: string;
    reduction: string;
  } | null>(null);

  // Edit state
  const [crop, setCrop] = useState<CropState>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [flip, setFlip] = useState<FlipState>({ horizontal: false, vertical: false });
  const [aspect, setAspect] = useState<number | 'free'>(fixedAspectRatio || 'free');
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  
  // Filter state
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);
  
  // History state
  const historyRef = useRef<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  
  // Presets state
  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetName, setPresetName] = useState<string>('');

  // Load presets from localStorage
  useEffect(() => {
    const savedPresets = localStorage.getItem('imageEditorPresets');
    if (savedPresets) {
      try {
        setPresets(JSON.parse(savedPresets));
      } catch (e) {
        console.error('Failed to parse saved presets:', e);
      }
    }
  }, []);

  // Initialize aspect ratio from props
  useEffect(() => {
    if (fixedAspectRatio !== undefined) {
      setAspect(fixedAspectRatio);
    } else {
      setAspect('free');
    }
  }, [fixedAspectRatio]);

  // Save state to history
  const saveToHistory = useCallback((state: HistoryState) => {
    const newHistory = historyRef.current.slice(0, historyIndex + 1);
    newHistory.push(state);
    historyRef.current = newHistory;
    setHistoryIndex(newHistory.length - 1);
  }, [historyIndex]);

  // Apply state from history
  const applyState = useCallback((state: HistoryState) => {
    setCrop(state.crop);
    setZoom(state.zoom);
    setRotation(state.rotation);
    setBrightness(state.brightness);
    setContrast(state.contrast);
    setSaturation(state.saturation);
  }, []);
  
  // Handle undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const state = historyRef.current[newIndex];
      applyState(state);
      setHistoryIndex(newIndex);
    }
  }, [historyIndex, applyState]);

  // Handle redo
  const handleRedo = useCallback(() => {
    if (historyIndex < historyRef.current.length - 1) {
      const newIndex = historyIndex + 1;
      const state = historyRef.current[newIndex];
      applyState(state);
      setHistoryIndex(newIndex);
    }
  }, [historyIndex, applyState]);

  // Save current state to history on changes
  useEffect(() => {
    if (activeStep === 'edit' && uploadedImage) {
      const currentState: HistoryState = {
        crop,
        zoom,
        rotation,
        brightness,
        contrast,
        saturation,
      };

      // Debounce history saving
      const timer = setTimeout(() => {
        if (historyRef.current.length === 0 || 
            JSON.stringify(historyRef.current[historyIndex]) !== JSON.stringify(currentState)) {
          saveToHistory(currentState);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [crop, zoom, rotation, brightness, contrast, saturation, activeStep, uploadedImage, historyIndex, saveToHistory]);

  // Image compression
  const compressImage = async (file: File): Promise<File> => {
    const options = {
      maxSizeMB: maxSizeMB,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      onProgress: (progress: number) => {
        setCompressionProgress(Math.round(progress));
      },
    };

    try {
      const compressedFile = await imageCompression(file, options);
      const beforeSize = (file.size / 1024 / 1024).toFixed(2);
      const afterSize = (compressedFile.size / 1024 / 1024).toFixed(2);
      
      setCompressedInfo({
        originalSize: beforeSize,
        compressedSize: afterSize,
        reduction: ((1 - compressedFile.size / file.size) * 100).toFixed(1),
      });

      return compressedFile;
    } catch (error) {
      console.error('Compression error:', error);
      return file; // Return original if compression fails
    }
  };

  // Handle image upload
  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    setError('');
    setCompressionProgress(0);
    setCompressedInfo(null);

    if (rejectedFiles.length > 0) {
      const error = rejectedFiles[0].errors[0];
      if (error.code === 'file-too-large') {
        setError(`File is too large. Maximum size is ${maxSizeMB}MB`);
      } else if (error.code === 'file-invalid-type') {
        setError('Please upload a valid image (JPEG, PNG, WebP, GIF)');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      setIsLoading(true);
      try {
        const file = acceptedFiles[0];
        
        // Compress image
        const compressedFile = await compressImage(file);
        
        const reader = new FileReader();
        reader.onload = () => {
          const imageData: ImageData = {
            file: compressedFile,
            preview: reader.result as string,
            name: compressedFile.name,
            size: compressedFile.size,
            originalSize: file.size,
          };
          
          setUploadedImage(imageData);
          setActiveStep('edit');
          setIsLoading(false);
          
          // Initialize history
          const initialState: HistoryState = {
            crop: { x: 0, y: 0 },
            zoom: 1,
            rotation: 0,
            brightness: 100,
            contrast: 100,
            saturation: 100,
          };
          historyRef.current = [initialState];
          setHistoryIndex(0);
        };
        reader.readAsDataURL(compressedFile);
      } catch (err) {
        setError('Failed to process image');
        setIsLoading(false);
      }
    }
  }, [maxSizeMB]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif'],
    },
    maxSize: maxSizeMB * 1024 * 1024,
    multiple: false,
  });

  // Handle crop complete
  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Handle save preset
  const savePreset = () => {
    if (!presetName.trim()) return;
    
    const preset: Preset = {
      name: presetName,
      aspect: aspect === 'free' ? undefined : aspect,
      brightness,
      contrast,
      saturation,
      timestamp: new Date().toISOString(),
    };
    
    const updatedPresets = [...presets, preset];
    setPresets(updatedPresets);
    localStorage.setItem('imageEditorPresets', JSON.stringify(updatedPresets));
    setPresetName('');
  };

  // Load preset
  const loadPreset = (preset: Preset) => {
    if (preset.aspect !== undefined && fixedAspectRatio === undefined) {
      setAspect(preset.aspect);
    }
    if (preset.brightness !== undefined) setBrightness(preset.brightness);
    if (preset.contrast !== undefined) setContrast(preset.contrast);
    if (preset.saturation !== undefined) setSaturation(preset.saturation);
  };

  // Delete preset
  const deletePreset = (index: number) => {
    const updatedPresets = presets.filter((_, i) => i !== index);
    setPresets(updatedPresets);
    localStorage.setItem('imageEditorPresets', JSON.stringify(updatedPresets));
  };

  // Handle final save
  const handleFinalSave = async () => {
    if (!uploadedImage || !croppedAreaPixels) return;
    
    setIsLoading(true);
    try {
      const filters = { brightness, contrast, saturation };
      const croppedBlob = await getCroppedImg(
        uploadedImage.preview,
        croppedAreaPixels,
        rotation,
        flip,
        filters
      );
      
      onSave(croppedBlob);
      
      setEditedImage(URL.createObjectURL(croppedBlob));
      setActiveStep('preview');
    } catch (e) {
      console.error('Error processing image:', e);
      setError('Failed to save image');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle download
  const handleDownload = () => {
    if (!editedImage) return;
    
    const link = document.createElement('a');
    link.href = editedImage;
    link.download = `edited-${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reset all
  const handleReset = () => {
    setUploadedImage(null);
    setEditedImage(null);
    setActiveStep('upload');
    setError('');
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setFlip({ horizontal: false, vertical: false });
    setCompressionProgress(0);
    setCompressedInfo(null);
    historyRef.current = [];
    setHistoryIndex(-1);
  };

  // Close handler
  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Filter style for preview
  const filterStyle = {
    filter: `
      brightness(${brightness}%) 
      contrast(${contrast}%) 
      saturate(${saturation}%)
    `,
  };

  // Get cropper aspect value (undefined for 'free')
  const getCropperAspect = () => {
    return aspect === 'free' ? undefined : aspect;
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '90vh', maxHeight: '800px' }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="div">
          {title}
        </Typography>
        <IconButton onClick={handleClose}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ overflow: 'hidden' }}>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Processing image...
            </Typography>
          </Box>
        )}

        {!isLoading && (
          <>
            {/* Stepper */}
            <Stepper activeStep={activeStep === 'upload' ? 0 : activeStep === 'edit' ? 1 : 2} sx={{ mb: 3 }}>
              <Step>
                <StepLabel>Upload</StepLabel>
              </Step>
              <Step>
                <StepLabel>Edit</StepLabel>
              </Step>
              <Step>
                <StepLabel>Preview</StepLabel>
              </Step>
            </Stepper>

            {/* Error Display */}
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Upload Step */}
            {activeStep === 'upload' && (
              <Box>
                {compressionProgress > 0 && compressionProgress < 100 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      Compressing image... {compressionProgress}%
                    </Typography>
                    <LinearProgress 
                      variant="determinate" 
                      value={compressionProgress} 
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                  </Box>
                )}

                {compressedInfo && (
                  <Alert 
                    severity="success" 
                    icon={<CheckCircle />}
                    sx={{ mb: 2 }}
                  >
                    Image compressed: {compressedInfo.originalSize}MB → {compressedInfo.compressedSize}MB 
                    ({compressedInfo.reduction}% reduction)
                  </Alert>
                )}

                <Card
                  {...getRootProps()}
                  sx={{
                    border: '2px dashed',
                    borderColor: isDragActive ? 'primary.main' : 'divider',
                    backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
                    p: 4,
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: 'primary.main',
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <input {...getInputProps()} />
                  
                  <Box sx={{ py: 3 }}>
                    {isDragActive ? (
                      <>
                        <CloudUpload sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                        <Typography variant="h6" color="primary">
                          Drop the image here
                        </Typography>
                      </>
                    ) : (
                      <>
                        <InsertPhoto sx={{ fontSize: 60, color: 'action.active', mb: 2 }} />
                        <Typography variant="h6" gutterBottom>
                          Drag & drop an image here
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          or click to browse files
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Supports: JPEG, PNG, WebP, GIF • Max: {maxSizeMB}MB
                        </Typography>
                      </>
                    )}
                  </Box>
                </Card>
              </Box>
            )}

            {/* Edit Step */}
            {activeStep === 'edit' && uploadedImage && (
              <Box sx={{ height: '60vh', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ flex: 1, display: 'flex', gap: 2, overflow: 'hidden' }}>
                  {/* Cropper */}
                  <Card sx={{ flex: 3 }}>
                    <CardContent sx={{ position: 'relative', height: '100%', minHeight: '400px' }}>
                      <Cropper
                        image={uploadedImage.preview}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={getCropperAspect()}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                        style={{
                          containerStyle: { 
                            backgroundColor: '#f5f5f5',
                            ...filterStyle 
                          },
                        }}
                      />
                    </CardContent>
                  </Card>

                  {/* Controls */}
                  <Card sx={{ flex: 1, overflow: 'auto' }}>
                    <CardContent>
                      {/* Toolbar */}
                      <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap' }}>
                        {/* Wrap disabled IconButtons in spans */}
                        <Tooltip title="Undo">
                          <span>
                            <IconButton 
                              onClick={handleUndo} 
                              disabled={historyIndex <= 0}
                              size="small"
                            >
                              <Undo />
                            </IconButton>
                          </span>
                        </Tooltip>
                        
                        <Tooltip title="Redo">
                          <span>
                            <IconButton 
                              onClick={handleRedo} 
                              disabled={historyIndex >= historyRef.current.length - 1}
                              size="small"
                            >
                              <Redo />
                            </IconButton>
                          </span>
                        </Tooltip>
                        
                        <Tooltip title="Rotate Left">
                          <IconButton 
                            onClick={() => setRotation(rotation - 90)}
                            size="small"
                          >
                            <RotateLeft />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Rotate Right">
                          <IconButton 
                            onClick={() => setRotation(rotation + 90)}
                            size="small"
                          >
                            <RotateRight />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Flip Horizontal">
                          <IconButton 
                            onClick={() => setFlip({ ...flip, horizontal: !flip.horizontal })}
                            size="small"
                          >
                            <Flip sx={{ transform: 'scaleX(-1)' }} />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Zoom Out">
                          <IconButton 
                            onClick={() => setZoom(Math.max(0.1, zoom - 0.1))}
                            size="small"
                          >
                            <ZoomOut />
                          </IconButton>
                        </Tooltip>
                        
                        <Tooltip title="Zoom In">
                          <IconButton 
                            onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                            size="small"
                          >
                            <ZoomIn />
                          </IconButton>
                        </Tooltip>
                      </Stack>

                      {/* Aspect Ratio (hidden if fixedAspectRatio is provided) */}
                      {fixedAspectRatio === undefined && (
                        <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                          <InputLabel>Aspect Ratio</InputLabel>
                          <Select
                            value={aspect}
                            label="Aspect Ratio"
                            onChange={(e) => setAspect(e.target.value as number | 'free')}
                          >
                            {ASPECT_RATIO_OPTIONS.map((option) => (
                              <MenuItem key={option.label} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}

                      {/* Zoom Slider */}
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="body2" gutterBottom>
                          Zoom: {zoom.toFixed(1)}x
                        </Typography>
                        <Slider
                          value={zoom}
                          min={0.1}
                          max={3}
                          step={0.1}
                          onChange={(_, value) => setZoom(value as number)}
                          valueLabelDisplay="auto"
                        />
                      </Box>

                      {/* Rotation Slider */}
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="body2" gutterBottom>
                          Rotation: {rotation}°
                        </Typography>
                        <Slider
                          value={rotation}
                          min={0}
                          max={360}
                          onChange={(_, value) => setRotation(value as number)}
                          valueLabelDisplay="auto"
                        />
                      </Box>

                      {/* Filters */}
                      <Typography variant="subtitle2" gutterBottom fontWeight="bold">
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
                          onChange={(_, value) => setBrightness(value as number)}
                          valueLabelDisplay="auto"
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
                          onChange={(_, value) => setContrast(value as number)}
                          valueLabelDisplay="auto"
                        />
                      </Box>
                      
                      <Box sx={{ mb: 3 }}>
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
                          onChange={(_, value) => setSaturation(value as number)}
                          valueLabelDisplay="auto"
                        />
                      </Box>

                      {/* Presets */}
                      <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                        Presets
                      </Typography>
                      
                      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                        <TextField
                          size="small"
                          label="Preset Name"
                          value={presetName}
                          onChange={(e) => setPresetName(e.target.value)}
                          sx={{ flex: 1 }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && presetName.trim()) {
                              savePreset();
                            }
                          }}
                        />
                        <Button 
                          variant="outlined" 
                          onClick={savePreset}
                          disabled={!presetName.trim()}
                          size="small"
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
                    </CardContent>
                  </Card>
                </Box>
              </Box>
            )}

            {/* Preview Step */}
            {activeStep === 'preview' && editedImage && uploadedImage && (
              <Box>
                <Typography variant="h6" gutterBottom>
                  Final Result
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                  <Card sx={{ flex: 1 }}>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        Original
                      </Typography>
                      <CardMedia
                        component="img"
                        image={uploadedImage.preview}
                        alt="Original"
                        sx={{ borderRadius: 1, maxHeight: 300, objectFit: 'contain' }}
                      />
                      <Box sx={{ mt: 2 }}>
                        <Chip 
                          label={`${(uploadedImage.size / 1024 / 1024).toFixed(2)} MB`} 
                          size="small" 
                          variant="outlined" 
                          sx={{ mr: 1 }}
                        />
                        <Chip 
                          label="Original" 
                          color="default" 
                          size="small" 
                        />
                      </Box>
                    </CardContent>
                  </Card>

                  <Card sx={{ flex: 1 }}>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        Edited
                      </Typography>
                      <CardMedia
                        component="img"
                        image={editedImage}
                        alt="Edited"
                        sx={{ borderRadius: 1, maxHeight: 300, objectFit: 'contain' }}
                      />
                      <Box sx={{ mt: 2 }}>
                        <Chip 
                          label="Edited" 
                          color="success" 
                          size="small"
                          icon={<CheckCircle />}
                          sx={{ mr: 1 }}
                        />
                        <Chip 
                          label="Ready to download" 
                          variant="outlined" 
                          size="small" 
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
        <Box>
          {activeStep === 'edit' && (
            <Button
              variant="outlined"
              onClick={() => setActiveStep('upload')}
              startIcon={<RestartAlt />}
              size="small"
            >
              Upload Different
            </Button>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          {activeStep === 'preview' && (
            <>
              <Button
                variant="outlined"
                onClick={handleDownload}
                startIcon={<Download />}
                size="small"
              >
                Download
              </Button>
              <Button
                variant="outlined"
                onClick={handleReset}
                startIcon={<RestartAlt />}
                size="small"
              >
                Start Over
              </Button>
            </>
          )}
          
          {activeStep === 'edit' && (
            <Button
              variant="contained"
              onClick={handleFinalSave}
              startIcon={<Save />}
              disabled={isLoading}
              size="small"
            >
              {isLoading ? 'Saving...' : 'Save & Continue'}
            </Button>
          )}
          
          <Button
            variant={activeStep === 'preview' ? 'contained' : 'outlined'}
            onClick={handleClose}
            size="small"
          >
            {activeStep === 'preview' ? 'Done' : 'Cancel'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ImageUploadEditPopup;
