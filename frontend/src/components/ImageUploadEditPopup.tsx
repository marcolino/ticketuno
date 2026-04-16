import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Stepper, Step, StepLabel,
  Box, Typography, Button, IconButton,
  LinearProgress, Alert,
  Card, CardContent, CardMedia,
  Chip, Stack, Slider,
  FormControl, InputLabel, Select, MenuItem,
  TextField, Tooltip,
} from '@mui/material';
import {
  Close, CloudUpload, InsertPhoto, CheckCircle,
  RestartAlt, Undo, Redo,
  RotateLeft, RotateRight, /*ZoomIn, ZoomOut,*/ Flip,
  Brightness5, Save, History,
} from '@mui/icons-material';
import { useDropzone, FileRejection} from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import imageCompression from 'browser-image-compression';
import { getErrorMessage } from '@/shared/utils/misc';
import { imageApi } from '@/services/api';
import { ImageType } from '@/shared/types/image';

// ─── Helper: apply filters, rotation, flip to an image element ─────────────
const applyFiltersAndTransformations = async (
  imageElement: HTMLImageElement,
  rotation: number,
  flip: { horizontal: boolean; vertical: boolean },
  filters: { brightness: number; contrast: number; saturation: number }
): Promise<HTMLCanvasElement> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  const rad = (rotation * Math.PI) / 180;
  const w = imageElement.naturalWidth;
  const h = imageElement.naturalHeight;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const newW = Math.floor(w * cos + h * sin);
  const newH = Math.floor(w * sin + h * cos);
  canvas.width = newW;
  canvas.height = newH;

  ctx.save();
  ctx.translate(newW / 2, newH / 2);
  ctx.rotate(rad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.drawImage(imageElement, -w / 2, -h / 2, w, h);
  ctx.restore();

  // Apply brightness, contrast, saturation
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const brightnessFactor = filters.brightness / 100;
  const contrastFactor = filters.contrast / 100;
  const saturationFactor = filters.saturation / 100;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    r = (r - 128) * contrastFactor + 128;
    g = (g - 128) * contrastFactor + 128;
    b = (b - 128) * contrastFactor + 128;

    r += 255 * (brightnessFactor - 1);
    g += 255 * (brightnessFactor - 1);
    b += 255 * (brightnessFactor - 1);

    const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
    r = gray + (r - gray) * saturationFactor;
    g = gray + (g - gray) * saturationFactor;
    b = gray + (b - gray) * saturationFactor;

    data[i] = Math.min(255, Math.max(0, r));
    data[i + 1] = Math.min(255, Math.max(0, g));
    data[i + 2] = Math.min(255, Math.max(0, b));
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
};

// ─── Helper: crop a canvas to a PixelCrop ──────────────────────────────────
const cropCanvas = (sourceCanvas: HTMLCanvasElement, crop: PixelCrop): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = crop.width;
  canvas.height = crop.height;
  ctx.drawImage(
    sourceCanvas,
    crop.x, crop.y, crop.width, crop.height,
    0, 0, crop.width, crop.height
  );
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.95);
  });
};

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface ImageData {
  file: File;
  preview: string;
  name: string;
  size: number;
  originalSize?: number;
}

interface FlipState { horizontal: boolean; vertical: boolean; }

interface HistoryState {
  rotation: number;
  flip: FlipState;
  brightness: number;
  contrast: number;
  saturation: number;
  aspect?: number;  // undefined = free
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
  onSave: (filename: string) => void;
  imageType?: ImageType;
  fixedAspectRatio?: number;
  maxSizeMB?: number;
  title?: string;
  simpleMode?: boolean;
  existingImageUrl?: string;
}

type StepName = 'upload' | 'confirm' | 'success' | 'edit' | 'preview';

const ASPECT_RATIO_OPTIONS: AspectRatioOption[] = [
  { label: 'Free', value: 'free' },
  { label: 'Square (1:1)', value: 1 },
  { label: 'Landscape (16:9)', value: 16 / 9 },
  { label: 'Portrait (9:16)', value: 9 / 16 },
  { label: 'Instagram (4:5)', value: 4 / 5 },
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
  simpleMode = false,
  existingImageUrl,
}) => {
  const { t } = useTranslation();

  const [activeStep, setActiveStep] = useState<StepName>('upload');
  const [initialUrl, setInitialUrl] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<ImageData | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [compressedInfo, setCompressedInfo] = useState<{
    originalSize: string; compressedSize: string; reduction: string;
  } | null>(null);

  // ── Edit state (full mode only) ──────────────────────────────────────────
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);

  const [rotation, setRotation] = useState<number>(0);
  const [flip, setFlip] = useState<FlipState>({ horizontal: false, vertical: false });
  const [aspect, setAspect] = useState<number | 'free'>(fixedAspectRatio || 'free');

  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);

  const historyRef = useRef<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  const [presets, setPresets] = useState<Preset[]>([]);
  const [presetName, setPresetName] = useState<string>('');

  const objectUrlRef = useRef<string | null>(null);

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

  // ── Auto-load when dialog opens with an existing image ────────────────────
  // useEffect(() => {
  //   if (open && existingImageUrl) {
  //     loadExistingImage(existingImageUrl);
  //   }
  // }, [open, existingImageUrl]);

  useEffect(() => {
    if (open) {
      setInitialUrl(existingImageUrl ?? null);
    }
  }, [open]);

  useEffect(() => {
    if (initialUrl) {
      loadExistingImage(initialUrl);
    }
  }, [initialUrl]);
  
  // ── Load existing image ───────────────────────────────────────────────────
  const loadExistingImage = useCallback(async (url: string) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const filename = url.split('/').pop()?.split('?')[0] || 'existing-image.jpg';
      const file = new File([blob], filename, { type: blob.type });

      // Revoke any previous object URL before creating a new one
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const preview = URL.createObjectURL(blob);
      objectUrlRef.current = preview;

      setUploadedImage({
        file,
        preview,
        name: filename,
        size: blob.size,
      });

      if (simpleMode) {
        setActiveStep('confirm');
      } else {
        setCrop(undefined);
        setCompletedCrop(undefined);
        setRotation(0);
        setFlip({ horizontal: false, vertical: false });
        setBrightness(100);
        setContrast(100);
        setSaturation(100);
        setAspect(fixedAspectRatio ?? 'free');
        historyRef.current = [{
          rotation: 0, flip: { horizontal: false, vertical: false },
          brightness: 100, contrast: 100, saturation: 100,
          aspect: fixedAspectRatio,
        }];
        setHistoryIndex(0);
        setActiveStep('edit');
      }
    } catch (err) {
      setError(t('Failed to load existing image: {{msg}}', { msg: getErrorMessage(err) }));
    } finally {
      setIsLoading(false);
    }
  }, [simpleMode, fixedAspectRatio, t]);

  // ── History (full mode) ──────────────────────────────────────────────────

  const getCurrentHistoryState = (): HistoryState => ({
    rotation, flip, brightness, contrast, saturation,
    aspect: aspect === 'free' ? undefined : aspect,
  });

  const saveToHistory = useCallback((state: HistoryState) => {
    const newHistory = historyRef.current.slice(0, historyIndex + 1);
    newHistory.push(state);
    historyRef.current = newHistory;
    setHistoryIndex(newHistory.length - 1);
  }, [historyIndex]);

  const applyState = useCallback((state: HistoryState) => {
    setRotation(state.rotation);
    setFlip(state.flip);
    setBrightness(state.brightness);
    setContrast(state.contrast);
    setSaturation(state.saturation);
    if (state.aspect !== undefined && fixedAspectRatio === undefined) {
      setAspect(state.aspect);
    }
  }, [fixedAspectRatio]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      applyState(historyRef.current[historyIndex - 1]);
      setHistoryIndex(historyIndex - 1);
    }
  }, [historyIndex, applyState]);

  const handleRedo = useCallback(() => {
    if (historyIndex < historyRef.current.length - 1) {
      applyState(historyRef.current[historyIndex + 1]);
      setHistoryIndex(historyIndex + 1);
    }
  }, [historyIndex, applyState]);

   useEffect(() => {
    if (!simpleMode && activeStep === 'edit' && uploadedImage) {
      const current = getCurrentHistoryState();
      const timer = setTimeout(() => {
        if (!historyRef.current.length ||
            JSON.stringify(historyRef.current[historyIndex]) !== JSON.stringify(current)) {
          saveToHistory(current);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [rotation, flip, brightness, contrast, saturation, aspect,
      activeStep, uploadedImage, historyIndex, saveToHistory, simpleMode]);

  // // Set a default crop when the image loads
  // useEffect(() => {
  //   if (activeStep === 'edit' && imgRef.current && !crop) {
  //     const img = imgRef.current;
      
  //     const setDefaultCrop = () => {
  //       const { naturalWidth, naturalHeight } = img;
  //       // For PixelCrop (completed crop) – unit must be 'px'
  //       const fullPixelCrop: PixelCrop = {
  //         unit: 'px',
  //         x: 0,
  //         y: 0,
  //         width: naturalWidth,
  //         height: naturalHeight,
  //       };
  //       setCompletedCrop(fullPixelCrop);
        
  //       // For ReactCrop display (Crop) – unit can be '%'
  //       const fullPercentCrop: Crop = {
  //         unit: '%',
  //         x: 0,
  //         y: 0,
  //         width: 100,
  //         height: 100,
  //       };
  //       setCrop(fullPercentCrop);
  //     };

  //     if (img.complete) {
  //       setDefaultCrop();
  //     } else {
  //       img.onload = setDefaultCrop;
  //     }
  //   }
  // }, [activeStep, imgRef.current, crop]);
  
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
        originalSize: (file.size / 1024 / 1024).toFixed(2),
        compressedSize: (compressed.size / 1024 / 1024).toFixed(2),
        reduction: ((1 - compressed.size / file.size) * 100).toFixed(1),
      });
      return compressed;
    } catch {
      return file;
    }
  }, [maxSizeMB]);

  // ── Drop handler ─────────────────────────────────────────────────────────

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
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
      const file = acceptedFiles[0];
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
          setActiveStep('confirm');
        } else {
          setActiveStep('edit');
          // Reset all edit states
          setCrop(undefined);
          setCompletedCrop(undefined);
          setRotation(0);
          setFlip({ horizontal: false, vertical: false });
          setBrightness(100);
          setContrast(100);
          setSaturation(100);
          setAspect(fixedAspectRatio || 'free');
          historyRef.current = [{
            rotation: 0, flip: { horizontal: false, vertical: false },
            brightness: 100, contrast: 100, saturation: 100,
            aspect: fixedAspectRatio,
          }];
          setHistoryIndex(0);
        }
      };
      reader.readAsDataURL(compressed);
    } catch {
      setError(t('Failed to process image'));
    } finally {
      setIsLoading(false);
    }
  }, [maxSizeMB, compressImage, simpleMode, t, fixedAspectRatio]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif'] },
    maxSize: maxSizeMB * 1024 * 1024,
    multiple: false,
  });

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
    if (p.brightness !== undefined) setBrightness(p.brightness);
    if (p.contrast !== undefined) setContrast(p.contrast);
    if (p.saturation !== undefined) setSaturation(p.saturation);
  };

  const deletePreset = (i: number) => {
    const updated = presets.filter((_, idx) => idx !== i);
    setPresets(updated);
    localStorage.setItem('imageEditorPresets', JSON.stringify(updated));
  };

  // ── Upload actions ───────────────────────────────────────────────────────

  const handleSimpleUpload = async () => {
    if (!uploadedImage) return;
    setIsLoading(true);
    setError('');
    try {
      const { data } = await imageApi.upload(uploadedImage.file, imageType);
      onSave(data.filename);
      setActiveStep('success');
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalSave = async () => {
    if (!uploadedImage || !imgRef.current) return;

    const imgElement = imgRef.current;
    const displayedWidth = imgElement.clientWidth;
    const displayedHeight = imgElement.clientHeight;

    // Always fall back to full image if no crop was drawn
    const effectiveCrop: PixelCrop = completedCrop ?? {
      unit: 'px', x: 0, y: 0,
      width: imgElement.naturalWidth,
      height: imgElement.naturalHeight,
    };

    setIsLoading(true);
    setError('');
    try {
      const filteredCanvas = await applyFiltersAndTransformations(
        imgElement, rotation, flip, { brightness, contrast, saturation }
      );
      const scaledCrop = scaleCropToCanvas(
        effectiveCrop, displayedWidth, displayedHeight,
        filteredCanvas.width, filteredCanvas.height
      );
      const croppedBlob = await cropCanvas(filteredCanvas, scaledCrop);
      const { data } = await imageApi.upload(croppedBlob, imageType);
      setEditedImage(URL.createObjectURL(croppedBlob));
      onSave(data.filename);
      setActiveStep('preview');
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  // ── Reset / Close ────────────────────────────────────────────────────────

  const handleReset = () => {
    // Revoke any object URL we created for the existing image
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setUploadedImage(null); setEditedImage(null);
    setActiveStep('upload'); setError('');
    setCrop(undefined); setCompletedCrop(undefined);
    setRotation(0); setFlip({ horizontal: false, vertical: false });
    setBrightness(100); setContrast(100); setSaturation(100);
    setCompressionProgress(0); setCompressedInfo(null);
    historyRef.current = []; setHistoryIndex(-1);
  };

  const handleClose = () => { handleReset(); onClose(); };

  // ── Helpers ──────────────────────────────────────────────────────────────

  const filterStyle = {
    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`,
  };

  // When aspect ratio changes, auto-adjust the crop to fit
  const handleAspectChange = (newAspect: number | 'free') => {
    setAspect(newAspect);
    if (imgRef.current && crop) {
      const { width, height } = imgRef.current;
      const newCrop = makeAspectCrop(
        { unit: '%', width: crop.width, height: crop.height },
        newAspect === 'free' ? NaN : newAspect,
        width,
        height
      );
      setCrop(centerCrop(newCrop, width, height));
    }
  };

  const getCropperAspect = () => (aspect === 'free' ? undefined : aspect);

  const scaleCropToCanvas = (
    crop: PixelCrop,
    displayedWidth: number,
    displayedHeight: number,
    canvasWidth: number,
    canvasHeight: number
  ): PixelCrop => {
    const scaleX = canvasWidth / displayedWidth;
    const scaleY = canvasHeight / displayedHeight;
    return {
      x: crop.x * scaleX,
      y: crop.y * scaleY,
      width: crop.width * scaleX,
      height: crop.height * scaleY,
      unit: 'px',
    };
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={simpleMode ? 'sm' : 'lg'}
      fullWidth
      PaperProps={{ sx: { height: '90vh', maxHeight: '800px' } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="div">{title}</Typography>
        <IconButton onClick={handleClose}><Close /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ overflow: 'hidden' }}>

        {!isLoading && (
          <>
            {!simpleMode && (
              <Stepper activeStep={activeStep === 'upload' ? 0 : activeStep === 'edit' ? 1 : 2} sx={{ mb: 3 }}>
                <Step><StepLabel>{t('Upload')}</StepLabel></Step>
                <Step><StepLabel>{t('Edit')}</StepLabel></Step>
                <Step><StepLabel>{t('Preview')}</StepLabel></Step>
              </Stepper>
            )}

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            {/* UPLOAD */}
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

            {/* CONFIRM (simple mode) */}
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

            {/* SUCCESS (simple mode) */}
            {simpleMode && activeStep === 'success' && (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                <Typography variant="h6" gutterBottom>{t('Upload Successful!')}</Typography>
                <Typography variant="body2" color="text.secondary">{t('The image has been uploaded and saved')}</Typography>
              </Box>
            )}

            {/* EDIT (full mode) */}
            {!simpleMode && activeStep === 'edit' && uploadedImage && (
              <Box sx={{ height: '60vh', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ flex: 1, display: 'flex', gap: 2, overflow: 'hidden' }}>

                  {/* Cropper panel */}
                  <Card sx={{ flex: 3, overflow: 'auto' }}>
                    <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                      <ReactCrop
                        crop={crop}
                        onChange={(_, percentCrop) => setCrop(percentCrop)}
                        onComplete={(c) => setCompletedCrop(c)}
                        aspect={getCropperAspect()}
                        ruleOfThirds
                      >
                        <img
                          ref={imgRef}
                          src={uploadedImage.preview}
                          alt="Edit"
                          style={{ maxWidth: '100%', maxHeight: '60vh', ...filterStyle }}
                          crossOrigin="anonymous"
                          onLoad={(e) => {
                            if (!crop) {
                              const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
                              setCompletedCrop({ unit: 'px', x: 0, y: 0, width: w, height: h });
                              setCrop({ unit: '%', x: 0, y: 0, width: 100, height: 100 });
                            }
                          }}
                        />
                      </ReactCrop>
                    </CardContent>
                  </Card>

                  {/* Controls panel */}
                  <Card sx={{ flex: 1, overflow: 'auto' }}>
                    <CardContent>
                      <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap' }}>
                        <Tooltip title={t('Undo')}>
                          <span><IconButton onClick={handleUndo} disabled={historyIndex <= 0} size="small"><Undo /></IconButton></span>
                        </Tooltip>
                        <Tooltip title={t('Redo')}>
                          <span><IconButton onClick={handleRedo} disabled={historyIndex >= historyRef.current.length - 1} size="small"><Redo /></IconButton></span>
                        </Tooltip>
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
                      </Stack>

                      {/* Aspect ratio */}
                      {fixedAspectRatio === undefined && (
                        <FormControl fullWidth size="small" sx={{ mb: 3 }}>
                          <InputLabel>{t('Aspect Ratio')}</InputLabel>
                          <Select
                            value={aspect}
                            label={t('Aspect Ratio')}
                            onChange={(e) => handleAspectChange(e.target.value as number | 'free')}
                          >
                            {ASPECT_RATIO_OPTIONS.map(o => (
                              <MenuItem key={o.label} value={o.value}>{o.label}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}

                      {/* Rotation */}
                      <Box sx={{ mb: 3 }}>
                        <Typography variant="body2" gutterBottom>{t('Rotation: {{d}}°', { d: rotation })}</Typography>
                        <Slider value={rotation} min={0} max={360} onChange={(_, v) => setRotation(v as number)} valueLabelDisplay="auto" />
                      </Box>

                      {/* Filters */}
                      <Typography variant="subtitle2" gutterBottom fontWeight="bold">{t('Filters')}</Typography>

                      {[
                        { label: t('Brightness'), value: brightness, set: setBrightness },
                        { label: t('Contrast'), value: contrast, set: setContrast },
                        { label: t('Saturation'), value: saturation, set: setSaturation },
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

            {/* PREVIEW (full mode) */}
            {!simpleMode && activeStep === 'preview' && editedImage && uploadedImage && (
              <Box sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', md: 'row' },
                  gap: 3,
                  overflowY: { xs: 'auto', md: 'visible' },
                  maxHeight: { xs: '66vh', md: 'none' },
                }}>
                <Typography variant="h6" gutterBottom>{t('Final Result')}</Typography>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                  <Card sx={{ flex: 1 }}>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>{t('Original')}</Typography>
                      <CardMedia component="img" image={uploadedImage.preview} alt={t('Original')}
                        sx={{ borderRadius: 1, maxHeight: 300, objectFit: 'contain' }} />
                      <Box sx={{ mt: 2 }}>
                        <Chip label={`${(uploadedImage.size / 1024 / 1024).toFixed(2)} MB`} size="small" variant="outlined" sx={{ mr: 1 }} />
                        <Chip label={t('Original')} variant="outlined" size="small" />
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
                        <Chip label={t('Final')} variant="outlined" size="small" />
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      {/* ACTIONS */}
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
          {simpleMode && activeStep === 'success' && (
            <Button variant="contained" onClick={handleClose} size="small">{t('Done')}</Button>
          )}

          {!simpleMode && activeStep === 'edit' && (
            <Button variant="contained" onClick={handleFinalSave}
              startIcon={<Save />} disabled={isLoading} size="small">
              {isLoading ? t('Saving...') : t('Save & Upload')}
            </Button>
          )}

          {!simpleMode && activeStep === 'preview' && (
            <Button variant="outlined" onClick={handleReset} startIcon={<RestartAlt />} size="small">
              {t('Start Over')}
            </Button>
          )}

          {!(simpleMode && activeStep === 'success') && (
            <Button
              variant={activeStep === 'preview' ? 'contained' : 'outlined'}
              onClick={handleClose} size="small" disabled={isLoading}
            >
              {activeStep === 'preview' ? t('Done') : t('Cancel')}
            </Button>
          )}

          {simpleMode && activeStep === 'confirm' && (
            <Button variant="contained" onClick={handleSimpleUpload}
              startIcon={<CloudUpload />} disabled={isLoading} size="small">
              {isLoading ? t('Uploading...') : t('Upload')}
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ImageUploadEditPopup;
