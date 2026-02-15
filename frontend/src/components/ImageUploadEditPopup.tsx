// ImageUploadEditPopup.tsx

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Stepper, Step, StepLabel,
  Box, Typography, Button, IconButton,
  LinearProgress, Alert,
  Card, CardContent, CardMedia,
  Chip, Stack, Slider,
  FormControl, InputLabel, Select, MenuItem,
  TextField, Tooltip, //CircularProgress,
} from '@mui/material';
import {
  Close, CloudUpload, InsertPhoto, CheckCircle,
  RestartAlt, Undo, Redo,
  RotateLeft, RotateRight, ZoomIn, ZoomOut, Flip,
  Brightness5, Save, History,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import Cropper from 'react-easy-crop';
import imageCompression from 'browser-image-compression';
import { getCroppedImg } from '@/utils/canvasUtils';
import { imageApi } from '@/services/api';
import { ImageType } from '@/shared/types/image';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface ImageData {
  file: File;
  preview: string;
  name: string;
  size: number;
  originalSize?: number;
}

interface CropState { x: number; y: number; }
interface FlipState { horizontal: boolean; vertical: boolean; }

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
  onSave: (filename: string) => void;          // ← changed: just the filename
  imageType?: ImageType;
  fixedAspectRatio?: number;
  maxSizeMB?: number;
  title?: string;
  simpleMode?: boolean;                         // ← NEW
}

type StepName = 'upload' | 'confirm' | 'success' | 'edit' | 'preview';
// simple mode uses:  upload → confirm → success
// full mode uses:    upload → edit → preview

const ASPECT_RATIO_OPTIONS: AspectRatioOption[] = [
  { label: 'Free',              value: 'free' },
  { label: 'Square (1:1)',      value: 1 },
  { label: 'Landscape (16:9)', value: 16 / 9 },
  { label: 'Portrait (9:16)',  value: 9 / 16 },
  { label: 'Instagram (4:5)',  value: 4 / 5 },
  { label: 'Facebook (1.91:1)', value: 1.91 },
];

// ─── Component ───────────────────────────────────────────────────────────────

const ImageUploadEditPopup: React.FC<ImageUploadEditPopupProps> = ({
  open,
  onClose,
  onSave,
  imageType = 'poster',
  fixedAspectRatio,
  maxSizeMB = 5,
  title = 'Upload & Edit Image',
  simpleMode = false,                           // ← NEW, defaults to full mode
}) => {
  const { t } = useTranslation();

  const [activeStep, setActiveStep] = useState<StepName>('upload');
  const [uploadedImage, setUploadedImage]       = useState<ImageData | null>(null);
  const [editedImage,   setEditedImage]         = useState<string | null>(null);
  const [isLoading,     setIsLoading]           = useState(false);
  const [error,         setError]               = useState<string>('');
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [compressedInfo, setCompressedInfo] = useState<{
    originalSize: string; compressedSize: string; reduction: string;
  } | null>(null);

  // ── Edit state (full mode only) ──────────────────────────────────────────
  const [crop,     setCrop]     = useState<CropState>({ x: 0, y: 0 });
  const [zoom,     setZoom]     = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [flip,     setFlip]     = useState<FlipState>({ horizontal: false, vertical: false });
  const [aspect,   setAspect]   = useState<number | 'free'>(fixedAspectRatio || 'free');
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const [brightness,  setBrightness]  = useState<number>(100);
  const [contrast,    setContrast]    = useState<number>(100);
  const [saturation,  setSaturation]  = useState<number>(100);

  const historyRef   = useRef<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const [presets,    setPresets]    = useState<Preset[]>([]);
  const [presetName, setPresetName] = useState<string>('');

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!simpleMode) {
      const saved = localStorage.getItem('imageEditorPresets');
      if (saved) {
        try { setPresets(JSON.parse(saved)); }
        catch (e) { console.error('Failed to parse saved presets:', e); }
      }
    }
  }, [simpleMode]);

  useEffect(() => {
    setAspect(fixedAspectRatio !== undefined ? fixedAspectRatio : 'free');
  }, [fixedAspectRatio]);

  // ── History (full mode) ──────────────────────────────────────────────────

  const saveToHistory = useCallback((state: HistoryState) => {
    const newHistory = historyRef.current.slice(0, historyIndex + 1);
    newHistory.push(state);
    historyRef.current = newHistory;
    setHistoryIndex(newHistory.length - 1);
  }, [historyIndex]);

  const applyState = useCallback((state: HistoryState) => {
    setCrop(state.crop); setZoom(state.zoom); setRotation(state.rotation);
    setBrightness(state.brightness); setContrast(state.contrast); setSaturation(state.saturation);
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const i = historyIndex - 1;
      applyState(historyRef.current[i]);
      setHistoryIndex(i);
    }
  }, [historyIndex, applyState]);

  const handleRedo = useCallback(() => {
    if (historyIndex < historyRef.current.length - 1) {
      const i = historyIndex + 1;
      applyState(historyRef.current[i]);
      setHistoryIndex(i);
    }
  }, [historyIndex, applyState]);

  useEffect(() => {
    if (!simpleMode && activeStep === 'edit' && uploadedImage) {
      const current: HistoryState = { crop, zoom, rotation, brightness, contrast, saturation };
      const timer = setTimeout(() => {
        if (!historyRef.current.length ||
            JSON.stringify(historyRef.current[historyIndex]) !== JSON.stringify(current)) {
          saveToHistory(current);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [crop, zoom, rotation, brightness, contrast, saturation,
      activeStep, uploadedImage, historyIndex, saveToHistory, simpleMode]);

  // ── Compression ──────────────────────────────────────────────────────────

  const compressImage = useCallback(async (file: File): Promise<File> => {
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: maxSizeMB,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        onProgress: (p: number) => setCompressionProgress(Math.round(p)),
      });
      setCompressedInfo({
        originalSize:   (file.size     / 1024 / 1024).toFixed(2),
        compressedSize: (compressed.size / 1024 / 1024).toFixed(2),
        reduction:      ((1 - compressed.size / file.size) * 100).toFixed(1),
      });
      return compressed;
    } catch {
      return file;
    }
  }, [maxSizeMB]);

  // ── Drop handler ─────────────────────────────────────────────────────────

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(''); setCompressionProgress(0); setCompressedInfo(null);

    if (rejectedFiles.length > 0) {
      const code = rejectedFiles[0].errors[0].code;
      setError(code === 'file-too-large'
        ? t('File is too large. Maximum size is {{max}}MB', { max: maxSizeMB })
        : t('Please upload a valid image (JPEG, PNG, WebP, GIF)'));
      return;
    }

    if (acceptedFiles.length === 0) return;

    setIsLoading(true);
    try {
      const file      = acceptedFiles[0];
      const compressed = await compressImage(file);

      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImage({
          file: compressed,
          preview: reader.result as string,
          name: compressed.name,
          size: compressed.size,
          originalSize: file.size,
        });

        if (simpleMode) {
          setActiveStep('confirm');       // ← simple: skip editor
        } else {
          setActiveStep('edit');          // ← full: open editor
          historyRef.current = [{
            crop: { x: 0, y: 0 }, zoom: 1, rotation: 0,
            brightness: 100, contrast: 100, saturation: 100,
          }];
          setHistoryIndex(0);
        }
        setIsLoading(false);
      };
      reader.readAsDataURL(compressed);
    } catch {
      setError(t('Failed to process image'));
      setIsLoading(false);
    }
  }, [maxSizeMB, compressImage, simpleMode, t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif'] },
    maxSize: maxSizeMB * 1024 * 1024,
    multiple: false,
  });

  const onCropComplete = useCallback((_area: any, pixels: any) => {
    setCroppedAreaPixels(pixels);
  }, []);

  // ── Presets (full mode) ──────────────────────────────────────────────────

  const savePreset = () => {
    if (!presetName.trim()) return;
    const updated = [...presets, {
      name: presetName,
      aspect: aspect === 'free' ? undefined : aspect,
      brightness, contrast, saturation,
      timestamp: new Date().toISOString(),
    }];
    setPresets(updated);
    localStorage.setItem('imageEditorPresets', JSON.stringify(updated));
    setPresetName('');
  };

  const loadPreset = (p: Preset) => {
    if (p.aspect !== undefined && fixedAspectRatio === undefined) setAspect(p.aspect);
    if (p.brightness  !== undefined) setBrightness(p.brightness);
    if (p.contrast    !== undefined) setContrast(p.contrast);
    if (p.saturation  !== undefined) setSaturation(p.saturation);
  };

  const deletePreset = (i: number) => {
    const updated = presets.filter((_, idx) => idx !== i);
    setPresets(updated);
    localStorage.setItem('imageEditorPresets', JSON.stringify(updated));
  };

  // ── Upload actions ───────────────────────────────────────────────────────

  /** Simple mode: upload the compressed file directly, no editing */
  const handleSimpleUpload = async () => {
    if (!uploadedImage) {
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const { data } = await imageApi.upload(uploadedImage.file, imageType);
      onSave(data.filename);
      setActiveStep('success'); // don't close yet - show success state
    } catch (err: any) {
      setError(err.response?.data?.error || t('Failed to upload image: {{err}}', { err: err.message }));
    } finally {
      setIsLoading(false);
    }
  };

  /** Full mode: crop/edit → upload the result */
  const handleFinalSave = async () => {
    if (!uploadedImage || !croppedAreaPixels) return;
    setIsLoading(true);
    setError('');
    try {
      const croppedBlob = await getCroppedImg(
        uploadedImage.preview, croppedAreaPixels, rotation, flip,
        { brightness, contrast, saturation }
      );

      const { data } = await imageApi.upload(croppedBlob, imageType);

      setEditedImage(URL.createObjectURL(croppedBlob));
      setActiveStep('preview');
      onSave(data.filename); // parent stores filename
    } catch (err: any) {
      setError(err.response?.data?.error || t('Failed to save image: {{err}}', { err: err.message }));
    } finally {
      setIsLoading(false);
    }
  };

  // ── Reset / Close ────────────────────────────────────────────────────────

  const handleReset = () => {
    setUploadedImage(null); setEditedImage(null);
    setActiveStep('upload'); setError('');
    setCrop({ x: 0, y: 0 }); setZoom(1); setRotation(0);
    setBrightness(100); setContrast(100); setSaturation(100);
    setFlip({ horizontal: false, vertical: false });
    setCompressionProgress(0); setCompressedInfo(null);
    historyRef.current = []; setHistoryIndex(-1);
  };

  const handleClose = () => { handleReset(); onClose(); };

  // ── Helpers ──────────────────────────────────────────────────────────────

  const filterStyle = {
    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
  };
  const getCropperAspect = () => (aspect === 'free' ? undefined : aspect);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={simpleMode ? 'sm' : 'lg'}      // ← smaller dialog in simple mode
      fullWidth
      PaperProps={{ sx: { height: '90vh', maxHeight: '800px' } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="div">{title}</Typography>
        <IconButton onClick={handleClose}><Close /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ overflow: 'hidden' }}>

        {/* Loading overlay */}
        {/* {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', flexDirection: 'column' }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 2 }}>
              {activeStep === 'edit' ? t('Processing and uploading...') : t('Processing image...')}
            </Typography>
          </Box>
        )} */}

        {!isLoading && (
          <>
            {/* Stepper ── full mode only */}
            {!simpleMode && (
              <Stepper activeStep={activeStep === 'upload' ? 0 : activeStep === 'edit' ? 1 : 2} sx={{ mb: 3 }}>
                <Step><StepLabel>{t('Upload')}</StepLabel></Step>
                <Step><StepLabel>{t('Edit')}</StepLabel></Step>
                <Step><StepLabel>{t('Preview')}</StepLabel></Step>
              </Stepper>
            )}

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            {/* ──────────── UPLOAD (both modes) ──────────── */}
            {activeStep === 'upload' && (
              <Box>
                {compressionProgress > 0 && compressionProgress < 100 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      {t('Compressing image...')} {compressionProgress}%
                    </Typography>
                    <LinearProgress variant="determinate" value={compressionProgress} sx={{ height: 8, borderRadius: 4 }} />
                  </Box>
                )}
                {compressedInfo && (
                  <Alert severity="success" icon={<CheckCircle />} sx={{ mb: 2 }}>
                    {t('Compressed: {{before}}MB → {{after}}MB ({{r}}% reduction)',
                      { before: compressedInfo.originalSize, after: compressedInfo.compressedSize, r: compressedInfo.reduction })}
                  </Alert>
                )}

                <Card
                  {...getRootProps()}
                  sx={{
                    border: '2px dashed',
                    borderColor: isDragActive ? 'primary.main' : 'divider',
                    backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
                    p: 4, textAlign: 'center', cursor: 'pointer', transition: 'all 0.3s ease',
                    '&:hover': { borderColor: 'primary.main', backgroundColor: 'action.hover' },
                  }}
                >
                  <input {...getInputProps()} />
                  <Box sx={{ py: 3 }}>
                    {isDragActive ? (
                      <>
                        <CloudUpload sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                        <Typography variant="h6" color="primary">{t('Drop the image here')}</Typography>
                      </>
                    ) : (
                      <>
                        <InsertPhoto sx={{ fontSize: 60, color: 'action.active', mb: 2 }} />
                        <Typography variant="h6" gutterBottom>{t('Drag & drop an image here')}</Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>{t('or click to browse files')}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {t('Supports: JPEG, PNG, WebP, GIF • Max: {{max}}MB', { max: maxSizeMB })}
                        </Typography>
                      </>
                    )}
                  </Box>
                </Card>
              </Box>
            )}

            {/* ──────────── CONFIRM (simple mode only) ──────────── */}
            {simpleMode && activeStep === 'confirm' && uploadedImage && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Card sx={{ maxWidth: 480, width: '100%' }}>
                  <CardMedia
                    component="img"
                    image={uploadedImage.preview}
                    alt={t('Preview')}
                    sx={{ maxHeight: 400, objectFit: 'contain' }}
                  />
                </Card>
                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                  <Chip label={`${(uploadedImage.size / 1024 / 1024).toFixed(2)} MB`} size="small" variant="outlined" />
                  {compressedInfo && (
                    <Chip
                      label={t('Compressed {{r}}%', { r: compressedInfo.reduction })}
                      size="small" color="success" variant="outlined"
                    />
                  )}
                </Stack>
              </Box>
            )}

            {/* ──────────── SUCCESS (simple mode only) ──────────── */}
            {simpleMode && activeStep === 'success' && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>
                  {t('Upload Successful!')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {t('Theimage has been uploaded and saved')}
                </Typography>
              </Box>
            )}

            {/* ──────────── EDIT (full mode only) ──────────── */}
            {!simpleMode && activeStep === 'edit' && uploadedImage && (
              <Box sx={{ height: '60vh', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ flex: 1, display: 'flex', gap: 2, overflow: 'hidden' }}>

                  {/* Cropper panel */}
                  <Card sx={{ flex: 3 }}>
                    <CardContent sx={{ position: 'relative', height: '100%', minHeight: '400px' }}>
                      <Cropper
                        image={uploadedImage.preview}
                        crop={crop} zoom={zoom} rotation={rotation}
                        aspect={getCropperAspect()}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                        style={{ containerStyle: { backgroundColor: '#f5f5f5', ...filterStyle } }}
                      />
                    </CardContent>
                  </Card>

                  {/* Controls panel */}
                  <Card sx={{ flex: 1, overflow: 'auto' }}>
                    <CardContent>
                      {/* Toolbar */}
                      <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap' }}>
                        <Tooltip title={t('Undo')}><span>
                          <IconButton onClick={handleUndo} disabled={historyIndex <= 0} size="small"><Undo /></IconButton>
                        </span></Tooltip>
                        <Tooltip title={t('Redo')}><span>
                          <IconButton onClick={handleRedo} disabled={historyIndex >= historyRef.current.length - 1} size="small"><Redo /></IconButton>
                        </span></Tooltip>
                        <Tooltip title={t('Rotate Left')}>
                          <IconButton onClick={() => setRotation(r => r - 90)} size="small"><RotateLeft /></IconButton>
                        </Tooltip>
                        <Tooltip title={t('Rotate Right')}>
                          <IconButton onClick={() => setRotation(r => r + 90)} size="small"><RotateRight /></IconButton>
                        </Tooltip>
                        <Tooltip title={t('Flip Horizontal')}>
                          <IconButton onClick={() => setFlip(f => ({ ...f, horizontal: !f.horizontal }))} size="small">
                            <Flip sx={{ transform: 'scaleX(-1)' }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('Zoom Out')}>
                          <IconButton onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} size="small"><ZoomOut /></IconButton>
                        </Tooltip>
                        <Tooltip title={t('Zoom In')}>
                          <IconButton onClick={() => setZoom(z => Math.min(3, z + 0.1))} size="small"><ZoomIn /></IconButton>
                        </Tooltip>
                      </Stack>

                      {/* Aspect ratio */}
                      {fixedAspectRatio === undefined && (
                        <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                          <InputLabel>{t('Aspect Ratio')}</InputLabel>
                          <Select value={aspect} label={t('Aspect Ratio')} onChange={e => setAspect(e.target.value as number | 'free')}>
                            {ASPECT_RATIO_OPTIONS.map(o => (
                              <MenuItem key={o.label} value={o.value}>{o.label}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}

                      {/* Zoom */}
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="body2" gutterBottom>{t('Zoom: {{z}}x', { z: zoom.toFixed(1) })}</Typography>
                        <Slider value={zoom} min={0.1} max={3} step={0.1} onChange={(_, v) => setZoom(v as number)} valueLabelDisplay="auto" />
                      </Box>

                      {/* Rotation */}
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="body2" gutterBottom>{t('Rotation: {{d}}°', { d: rotation })}</Typography>
                        <Slider value={rotation} min={0} max={360} onChange={(_, v) => setRotation(v as number)} valueLabelDisplay="auto" />
                      </Box>

                      {/* Filters */}
                      <Typography variant="subtitle2" gutterBottom fontWeight="bold">{t('Filters')}</Typography>

                      {[
                        { label: t('Brightness'),  value: brightness,  set: setBrightness  },
                        { label: t('Contrast'),    value: contrast,    set: setContrast    },
                        { label: t('Saturation'),  value: saturation,  set: setSaturation  },
                      ].map(({ label, value, set }) => (
                        <Box key={label} sx={{ mb: 2 }}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Brightness5 fontSize="small" />
                            <Typography variant="body2" sx={{ flex: 1 }}>{label}</Typography>
                            <Typography variant="caption">{value}%</Typography>
                          </Stack>
                          <Slider value={value} min={0} max={200} onChange={(_, v) => set(v as number)} valueLabelDisplay="auto" />
                        </Box>
                      ))}

                      {/* Presets */}
                      <Typography variant="subtitle2" gutterBottom fontWeight="bold" sx={{ mt: 1 }}>{t('Presets')}</Typography>
                      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                        <TextField
                          size="small" label={t('Preset Name')} value={presetName} sx={{ flex: 1 }}
                          onChange={e => setPresetName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && presetName.trim()) savePreset(); }}
                        />
                        <Button variant="outlined" onClick={savePreset} disabled={!presetName.trim()} size="small">{t('Save')}</Button>
                      </Stack>
                      <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                        {presets.map((p, i) => (
                          <Chip key={i} label={p.name} onClick={() => loadPreset(p)} onDelete={() => deletePreset(i)} icon={<History />} size="small" />
                        ))}
                        {presets.length === 0 && (
                          <Typography variant="caption" color="text.secondary">{t('No saved presets yet')}</Typography>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Box>
              </Box>
            )}

            {/* ──────────── PREVIEW (full mode only) ──────────── */}
            {!simpleMode && activeStep === 'preview' && editedImage && uploadedImage && (
              <Box>
                <Typography variant="h6" gutterBottom>{t('Final Result')}</Typography>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                  <Card sx={{ flex: 1 }}>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>{t('Original')}</Typography>
                      <CardMedia component="img" image={uploadedImage.preview} alt={t('Original')}
                        sx={{ borderRadius: 1, maxHeight: 300, objectFit: 'contain' }} />
                      <Box sx={{ mt: 2 }}>
                        <Chip label={`${(uploadedImage.size / 1024 / 1024).toFixed(2)} MB`} size="small" variant="outlined" sx={{ mr: 1 }} />
                        <Chip label={t('Original')} size="small" />
                      </Box>
                    </CardContent>
                  </Card>
                  <Card sx={{ flex: 1 }}>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>{t('Edited & Uploaded')}</Typography>
                      <CardMedia component="img" image={editedImage} alt={t('Edited')}
                        sx={{ borderRadius: 1, maxHeight: 300, objectFit: 'contain' }} />
                      <Box sx={{ mt: 2 }}>
                        <Chip label={t('Uploaded')} color="success" size="small" icon={<CheckCircle />} sx={{ mr: 1 }} />
                        <Chip label={t('Ready to use')} variant="outlined" size="small" />
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      {/* ──────────── ACTIONS ──────────── */}
      <DialogActions sx={{ justifyContent: 'space-between', px: 3, py: 2 }}>
        <Box>
          {(activeStep === 'edit' || activeStep === 'confirm') && (
            <Button variant="outlined" onClick={() => setActiveStep('upload')}
              startIcon={<RestartAlt />} size="small" disabled={isLoading}>
              {simpleMode ? t('Change Image') : t('Upload Different')}
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* Simple mode: Upload button on confirm */}
          {simpleMode && activeStep === 'confirm' && (
            <Button variant="contained" onClick={handleSimpleUpload}
              startIcon={<CloudUpload />} disabled={isLoading} size="small">
              {isLoading ? t('Uploading...') : t('Upload')}
            </Button>
          )}

          {/* Simple mode: success step - just close */}
          {simpleMode && activeStep === 'success' && (
            <Button variant="contained" onClick={handleClose} size="small">
              {t('Done')}
            </Button>
          )}

          {/* Full mode: Save & Upload on edit */}
          {!simpleMode && activeStep === 'edit' && (
            <Button variant="contained" onClick={handleFinalSave}
              startIcon={<Save />} disabled={isLoading} size="small">
              {isLoading ? t('Saving...') : t('Save & Upload')}
            </Button>
          )}

          {/* Full mode: Start Over on preview */}
          {!simpleMode && activeStep === 'preview' && (
            <Button variant="outlined" onClick={handleReset} startIcon={<RestartAlt />} size="small">
              {t('Start Over')}
            </Button>
          )}

          {/* Cancel / Done */}
          <Button
            variant={activeStep === 'preview' ? 'contained' : 'outlined'}
            onClick={handleClose} size="small" disabled={isLoading}
          >
            {activeStep === 'preview' ? t('Done') : t('Cancel')}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ImageUploadEditPopup;
