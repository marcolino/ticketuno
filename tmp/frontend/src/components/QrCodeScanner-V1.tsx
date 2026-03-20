/**
 * QrCodeScanner.tsx
 *
 * Dependencies:
 *   "jsqr": "^1.4.0"
 *   "@mui/material", "@mui/icons-material", "@emotion/react", "@emotion/styled"
 *   "react-i18next", "i18next"
 *
 */

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  Fade,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import { alpha, styled, keyframes } from '@mui/material/styles';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CloseIcon from '@mui/icons-material/Close';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import BlockIcon from '@mui/icons-material/Block';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import AndroidIcon from '@mui/icons-material/Android';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';
import LooksOneIcon from '@mui/icons-material/LooksOne';
import LooksTwoIcon from '@mui/icons-material/LooksTwo';
import Looks3Icon from '@mui/icons-material/Looks3';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import jsQR from 'jsqr';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QrCodeScannerProps {
  /** Called with the decoded QR string as soon as a code is detected. */
  onScan: (result: string) => void;
  /** Called when the user closes/cancels the scanner. */
  onClose?: () => void;
  /** Controls whether the scanner is open. */
  open: boolean;
  /** Optional MUI Dialog maxWidth override. Defaults to "sm". */
  maxWidth?: 'xs' | 'sm' | 'md';
}

type CameraPermission = 'unknown' | 'granted' | 'denied' | 'unavailable';
type ScannerState = 'idle' | 'requesting' | 'active' | 'error';
type Platform =
  | 'ios'
  | 'android'
  | 'desktop-chrome'
  | 'desktop-firefox'
  | 'desktop-safari'
  | 'desktop-edge'
  | 'desktop-other';

// ─── Platform detection ───────────────────────────────────────────────────────


function detectPlatform(): Platform {
  const ua = navigator.userAgent;

  // --- iOS detection (the tricky one) ---
  // Old way used navigator.platform === 'MacIntel' + maxTouchPoints
  // Modern iPads report a MacIntel UA, so we still need maxTouchPoints,
  // but we read it from navigator directly, not the deprecated .platform
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  ;

  if (isIOS) return 'ios';
  if (/android/i.test(ua)) return 'android';
  if (/Edg\//.test(ua)) return 'desktop-edge';
  if (/Chrome\//.test(ua)) return 'desktop-chrome';
  if (/Firefox\//.test(ua)) return 'desktop-firefox';
  if (/Safari\//.test(ua)) return 'desktop-safari';
  return 'desktop-other';
}

// function detectPlatform(): Platform {
//   const ua = navigator.userAgent;
//   const isIOS =
//     /iPad|iPhone|iPod/.test(ua) ||
//     (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
//   if (isIOS) return 'ios';
//   if (/android/i.test(ua)) return 'android';
//   if (/Edg\//.test(ua)) return 'desktop-edge';
//   if (/Chrome\//.test(ua)) return 'desktop-chrome';
//   if (/Firefox\//.test(ua)) return 'desktop-firefox';
//   if (/Safari\//.test(ua)) return 'desktop-safari';
//   return 'desktop-other';
// }

function isMobilePlatform(p: Platform) {
  return p === 'ios' || p === 'android';
}

// ─── Animations ───────────────────────────────────────────────────────────────

const scanLine = keyframes`
  0%   { top: 8%;  opacity: 0.9; }
  50%  { top: 88%; opacity: 1;   }
  100% { top: 8%;  opacity: 0.9; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1;   transform: scale(1);    }
  50%       { opacity: 0.6; transform: scale(0.97); }
`;

const successPop = keyframes`
  0%   { transform: scale(0.8);  opacity: 0; }
  60%  { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1);    opacity: 1; }
`;

// ─── Styled components ────────────────────────────────────────────────────────

const ViewfinderWrapper = styled(Box)(({ theme }) => ({
  position: 'relative',
  width: '100%',
  aspectRatio: '1 / 1',
  borderRadius: theme.shape.borderRadius * 2,
  overflow: 'hidden',
  backgroundColor: '#000',
  boxShadow: `0 8px 32px ${alpha('#000', 0.45)}`,
}));

const StyledVideo = styled('video')({
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

const HiddenCanvas = styled('canvas')({ display: 'none' });

const Overlay = styled(Box)({
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
});

const CornerBracket = styled(Box, {
  shouldForwardProp: (p) =>
    !['corner', 'size', 'thickness', 'bracketColor'].includes(p as string),
})<{
  corner: 'tl' | 'tr' | 'bl' | 'br';
  size?: number;
  thickness?: number;
  bracketColor?: string;
}>(({ corner, size = 22, thickness = 3, bracketColor = '#ffffff' }) => {
  const borders: Record<string, string | number> = {};
  const top = corner.startsWith('t');
  const left = corner.endsWith('l');
  borders[`border${top ? 'Top' : 'Bottom'}`] = `${thickness}px solid ${bracketColor}`;
  borders[`border${left ? 'Left' : 'Right'}`] = `${thickness}px solid ${bracketColor}`;
  return {
    position: 'absolute',
    width: size,
    height: size,
    ...(top ? { top: '10%' } : { bottom: '10%' }),
    ...(left ? { left: '10%' } : { right: '10%' }),
    ...borders,
    borderRadius:
      top && left   ? '4px 0 0 0'
      : top && !left  ? '0 4px 0 0'
      : !top && left  ? '0 0 0 4px'
                      : '0 0 4px 0',
    opacity: 0.9,
  };
});

const ScanLineBar = styled(Box)(({ theme }) => ({
  position: 'absolute',
  left: '10%',
  right: '10%',
  height: 2,
  borderRadius: 1,
  background: `linear-gradient(90deg,
    transparent 0%,
    ${theme.palette.primary.light} 20%,
    ${theme.palette.primary.main} 50%,
    ${theme.palette.primary.light} 80%,
    transparent 100%
  )`,
  boxShadow: `0 0 8px 2px ${alpha(theme.palette.primary.main, 0.5)}`,
  animation: `${scanLine} 2.6s ease-in-out infinite`,
}));

const SuccessOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: alpha(theme.palette.success.dark, 0.82),
  animation: `${successPop} 0.35s ease-out forwards`,
}));

const ScanningLabel = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  color: alpha('#fff', 0.85),
  animation: `${pulse} 2s ease-in-out infinite`,
}));

// ─── Recovery steps config ────────────────────────────────────────────────────

interface RecoveryStep {
  icon: React.ElementType;
  labelKey: string;
}

const STEP_NUM_ICONS = [LooksOneIcon, LooksTwoIcon, Looks3Icon];

function getRecoverySteps(platform: Platform, t): RecoveryStep[] {
  switch (platform) {
    case 'ios':
      return [
        { icon: DeleteOutlineIcon, labelKey: t('Delete this app from your Home Screen, then re-add it from your browser') },
        { icon: SettingsIcon, labelKey: t('Or go to iOS Settings → Safari → Camera → find this site → set to Allow')  },
      ];
    case 'android':
      return [
        { icon: DeleteOutlineIcon, labelKey: t('Uninstall this app, then reinstall it from your browser') },
        { icon: SettingsIcon, labelKey: t('Or open Android Settings → Apps → your browser → Permissions → Camera → Allow')  },
      ];
    case 'desktop-chrome':
      return [{ icon: LockOpenIcon, labelKey: t('Click the 🔒 lock icon in the address bar → Camera → Allow → reload the page') }];
    case 'desktop-firefox':
      return [{ icon: LockOpenIcon, labelKey: t('Click the 🔒 lock icon → Connection Secure → More Information → Permissions → Camera → Allow') }];
    case 'desktop-safari':
      return [{ icon: SettingsIcon, labelKey: t('Go to Safari menu → Settings → Websites → Camera → find this site → Allow') }];
    case 'desktop-edge':
      return [{ icon: LockOpenIcon, labelKey: t('Click the 🔒 lock icon in the address bar → Camera → Allow → reload the page') }];
    default: // by default assum Chrome
      return [{ icon: LockOpenIcon, labelKey: t('Click the 🔒 lock icon in the address bar → Camera → Allow → reload the page') }];
  }
}

function platformIcon(platform: Platform): React.ElementType {
  if (platform === 'ios') return PhoneIphoneIcon;
  if (platform === 'android') return AndroidIcon;
  return DesktopWindowsIcon;
}

// ─── Denied panel ─────────────────────────────────────────────────────────────

interface DeniedPanelProps {
  platform: Platform;
  onCheckAgain: () => Promise<void>;
  checkingAgain: boolean;
  stillDenied: boolean;
}

const DeniedPanel: React.FC<DeniedPanelProps> = ({
  platform,
  onCheckAgain,
  checkingAgain,
  stillDenied,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const isMobile = isMobilePlatform(platform);
  const steps = getRecoverySteps(platform, t);
  const PlatformIcon = platformIcon(platform);

  return (
    <Stack spacing={2} sx={{ width: '100%' }}>
      {/* Top alert */}
      <Alert
        severity="warning"
        icon={<BlockIcon />}
        sx={{ borderRadius: 2, alignItems: 'flex-start' }}
      >
        <Typography variant="body2" fontWeight={700} gutterBottom>
          {t('Camera access was blocked')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('You denied camera access. The app cannot ask again, but you can unblock it manually.')}
        </Typography>
      </Alert>

      {/* Steps card */}
      <Box
        sx={{
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        {/* Card header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1.25,
            backgroundColor: alpha(theme.palette.action.hover, 0.5),
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <PlatformIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing={0.4}>
            {isMobile
              ? t('How to restore access')
              : t('How to restore access in your browser')}
          </Typography>
        </Box>

        <List dense disablePadding>
          {steps.map((step, idx) => {
            const StepNumIcon = STEP_NUM_ICONS[idx] ?? LooksOneIcon;
            const StepIcon = step.icon;
            return (
              <React.Fragment key={step.labelKey}>
                {idx > 0 && <Divider component="li" />}
                <ListItem alignItems="flex-start" sx={{ py: 1.25, px: 2 }}>
                  <ListItemIcon sx={{ minWidth: 30, mt: 0.3 }}>
                    <StepNumIcon sx={{ fontSize: 18, color: 'primary.main' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Stack direction="row" alignItems="center" spacing={0.75}>
                        <StepIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                        <Typography variant="body2">{t(step.labelKey)}</Typography>
                      </Stack>
                    }
                  />
                </ListItem>
              </React.Fragment>
            );
          })}

          {/* Final step: tap Check Again */}
          <Divider component="li" />
          <ListItem alignItems="flex-start" sx={{ py: 1.25, px: 2 }}>
            <ListItemIcon sx={{ minWidth: 30, mt: 0.3 }}>
              {steps.length < 3
                ? <Looks3Icon sx={{ fontSize: 18, color: 'primary.main' }} />
                : <RefreshIcon sx={{ fontSize: 18, color: 'primary.main' }} />}
            </ListItemIcon>
            <ListItemText
              primary={
                <Stack direction="row" alignItems="center" spacing={0.75}>
                  <RefreshIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                  <Typography variant="body2">{t('Come back here and tap "Check Again"')}</Typography>
                </Stack>
              }
            />
          </ListItem>
        </List>
      </Box>

      {/* PWA reinstall note — mobile only */}
      {isMobile && (
        <Typography variant="caption" color="text.secondary" textAlign="center">
          {t('💡 On mobile, uninstalling and reinstalling this app also resets camera permission.')}
        </Typography>
      )}

      {/* Check Again button */}
      <Button
        variant="contained"
        fullWidth
        startIcon={
          checkingAgain
            ? <CircularProgress size={16} color="inherit" />
            : <RefreshIcon />
        }
        onClick={onCheckAgain}
        disabled={checkingAgain}
        sx={{ borderRadius: 2, py: 1 }}
      >
        {t('Check Again')}
      </Button>

      {/* Still denied feedback */}
      <Collapse in={stillDenied}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          <Typography variant="body2">{t('Camera is still blocked. Make sure you saved the setting change and try again')}</Typography>
        </Alert>
      </Collapse>
    </Stack>
  );
};

// ─── Permission query helper ──────────────────────────────────────────────────

async function queryExistingPermission(): Promise<CameraPermission> {
  if (!('permissions' in navigator)) return 'unknown';
  try {
    const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
    if (status.state === 'granted') return 'granted';
    if (status.state === 'denied') return 'denied';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export const QrCodeScanner: React.FC<QrCodeScannerProps> = ({
  onScan,
  onClose,
  open,
  maxWidth = 'sm',
}) => {
  const { t } = useTranslation();
  const theme = useTheme();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);

  const [permission, setPermission] = useState<CameraPermission>('unknown');
  const [scannerState, setScannerState] = useState<ScannerState>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [scannedValue, setScannedValue] = useState<string>('');
  const [showPermissionNotice, setShowPermissionNotice] = useState(false);
  const [platform] = useState<Platform>(detectPlatform);
  const [checkingAgain, setCheckingAgain] = useState(false);
  const [stillDenied, setStillDenied] = useState(false);

  // ── Check existing permission when dialog opens ───────────────────────────
  useEffect(() => {
    if (!open) return;
    setScannerState('idle');
    setScannedValue('');
    setErrorMsg('');
    setStillDenied(false);

    queryExistingPermission().then((p) => {
      setPermission(p);
      if (p === 'granted') {
        startCamera();
      } else if (p === 'denied') {
        setScannerState('error');
      } else {
        setShowPermissionNotice(true);
      }
    });

    return () => stopCamera();
  }, [open]);

  // ── Start camera ──────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setScannerState('requesting');
    setErrorMsg('');
    setStillDenied(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      setPermission('granted');
      setScannerState('active');
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch (err: unknown) {
      stopCamera();
      const name = (err as DOMException)?.name ?? '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setPermission('denied');
        setScannerState('error');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setPermission('unavailable');
        setErrorMsg(t('No camera was found on this device'));
        setScannerState('error');
      } else {
        setErrorMsg(t('Could not start the camera. Please check your device and try again'));
        setScannerState('error');
      }
    }
  }, [t]);

  // ── Stop camera ───────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // ── QR decode loop ────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (
      !video ||
      !canvas ||
      video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA
    ) {
      animFrameRef.current = requestAnimationFrame(tick);
      return;
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });
    if (code?.data) {
      setScannedValue(code.data);
      stopCamera();
      setTimeout(() => onScan(code.data), 600);
      return;
    }
    animFrameRef.current = requestAnimationFrame(tick);
  }, [onScan, stopCamera]);

  useEffect(() => {
    if (scannerState === 'active') {
      animFrameRef.current = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [scannerState, tick]);

  // ── "Check Again" — re-query permission without prompting ─────────────────
  const handleCheckAgain = useCallback(async () => {
    setCheckingAgain(true);
    setStillDenied(false);
    const p = await queryExistingPermission();
    setPermission(p);
    if (p === 'granted') {
      setCheckingAgain(false);
      startCamera();
    } else if (p === 'unknown') {
      // User reset to "Ask" in settings — we can prompt again now
      setCheckingAgain(false);
      setScannerState('idle');
      startCamera();
    } else {
      setCheckingAgain(false);
      setStillDenied(true);
    }
  }, [startCamera]);

  // ── Dialog handlers ───────────────────────────────────────────────────────
  const handlePermissionProceed = () => {
    setShowPermissionNotice(false);
    startCamera();
  };

  const handlePermissionCancel = () => {
    setShowPermissionNotice(false);
    onClose?.();
  };

  const handleClose = () => {
    stopCamera();
    setScannedValue('');
    setScannerState('idle');
    setErrorMsg('');
    setStillDenied(false);
    onClose?.();
  };

  const handleStop = () => {
    stopCamera();
    setScannerState('idle');
  };

  const handleRetry = () => {
    setErrorMsg('');
    setScannerState('idle');
    setScannedValue('');
    if (permission === 'unknown') setShowPermissionNotice(true);
    else startCamera();
  };

  const isDenied = permission === 'denied' && scannerState === 'error';

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Permission notice dialog ──────────────────────────────── */}
      <Dialog
        open={open && showPermissionNotice}
        maxWidth="xs"
        fullWidth
        PaperProps={{ elevation: 6, sx: { borderRadius: 3, p: 1 } }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 3,
            pt: 2.5,
            pb: 1,
          }}
        >
          <CameraAltIcon color="primary" />
          <Typography variant="h6" fontWeight={700}>
            {t('Scan Ticket QR Code')}
          </Typography>
        </Box>

        <DialogContent>
          <Stack spacing={2}>
            <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ borderRadius: 2 }}>
              <Typography variant="body2" fontWeight={600}>
                {t('Access to camera is required')}
              </Typography>
            </Alert>
            <Typography variant="body2" color="text.secondary">
              {t('To read QR codes, this app needs access to your camera. Your OS will show a permission prompt: please tap "Allow" to continue.')}
            </Typography>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={handlePermissionCancel} size="small">
            {t('Cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handlePermissionProceed}
            startIcon={<CameraAltIcon />}
            size="small"
          >
            {t('Proceed')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Main scanner dialog ───────────────────────────────────── */}
      <Dialog
        open={open && !showPermissionNotice}
        maxWidth={maxWidth}
        fullWidth
        onClose={handleClose}
        TransitionComponent={Fade}
        TransitionProps={{ timeout: 300 }}
        PaperProps={{ elevation: 8, sx: { borderRadius: 3, overflow: 'hidden' } }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2.5,
            py: 1.5,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <QrCodeScannerIcon color="primary" sx={{ fontSize: 22 }} />
            <Typography variant="subtitle1" fontWeight={700} letterSpacing={0.3}>
              {t('Scan Ticket QR Code')}
            </Typography>
          </Stack>
          <Tooltip title={t('Cancel')}>
            <IconButton size="small" onClick={handleClose} edge="end">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Body */}
        <DialogContent sx={{ p: 3 }}>
          <Stack spacing={2.5} alignItems="center">

            {/* Viewfinder — hidden when denied to give space to instructions */}
            {!isDenied && (
              <ViewfinderWrapper>
                <StyledVideo
                  ref={videoRef}
                  muted
                  playsInline
                  autoPlay
                  style={{
                    opacity: scannerState === 'active' ? 1 : 0,
                    transition: 'opacity 0.4s ease',
                  }}
                />
                <HiddenCanvas ref={canvasRef} />

                {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
                  <CornerBracket
                    key={c}
                    corner={c}
                    bracketColor={
                      scannedValue
                        ? theme.palette.success.light
                        : theme.palette.primary.light
                    }
                  />
                ))}

                {scannerState === 'active' && !scannedValue && (
                  <Overlay><ScanLineBar /></Overlay>
                )}

                {scannedValue && (
                  <SuccessOverlay>
                    <Stack alignItems="center" spacing={1}>
                      <QrCodeScannerIcon sx={{ fontSize: 52, color: '#fff' }} />
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        color="#fff"
                        textAlign="center"
                        sx={{ px: 2, wordBreak: 'break-all' }}
                      >
                        {scannedValue}
                      </Typography>
                    </Stack>
                  </SuccessOverlay>
                )}

                {(scannerState === 'idle' || scannerState === 'requesting') && !scannedValue && (
                  <Overlay
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: alpha('#000', 0.55),
                    }}
                  >
                    {scannerState === 'requesting'
                      ? <CircularProgress size={36} sx={{ color: '#fff' }} />
                      : <QrCodeScannerIcon sx={{ fontSize: 64, color: alpha('#fff', 0.25) }} />
                    }
                  </Overlay>
                )}
              </ViewfinderWrapper>
            )}

            {/* Scanning label */}
            {scannerState === 'active' && !scannedValue && (
              <ScanningLabel>
                <CircularProgress size={14} color="inherit" thickness={5} />
                <Typography variant="caption" fontWeight={600} letterSpacing={0.5}>
                  {t('Looking for a QR code…')}
                </Typography>
              </ScanningLabel>
            )}

            {!scannedValue && scannerState === 'idle' && !errorMsg && (
              <Typography variant="caption" color="text.secondary">
                {t('Point your camera at a QR code to scan it')}
              </Typography>
            )}

            {/* Non-denied errors */}
            {errorMsg && !isDenied && (
              <Alert severity="error" sx={{ width: '100%', borderRadius: 2 }}>
                {errorMsg}
              </Alert>
            )}

            {/* ── Denied recovery panel ── */}
            {isDenied && (
              <DeniedPanel
                platform={platform}
                onCheckAgain={handleCheckAgain}
                checkingAgain={checkingAgain}
                stillDenied={stillDenied}
              />
            )}
          </Stack>
        </DialogContent>

        {/* Actions */}
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1, justifyContent: 'center' }}>
          {scannerState === 'idle' && !errorMsg && (
            <Button
              variant="contained"
              size="medium"
              startIcon={<CameraAltIcon />}
              onClick={startCamera}
              sx={{ borderRadius: 2, px: 3 }}
            >
              {t('Start scanning')}
            </Button>
          )}

          {scannerState === 'active' && (
            <Button
              variant="outlined"
              size="medium"
              color="inherit"
              onClick={handleStop}
              sx={{ borderRadius: 2, px: 3 }}
            >
              {t('Stop')}
            </Button>
          )}

          {scannerState === 'error' && !isDenied && (
            <Button
              variant="contained"
              size="medium"
              onClick={handleRetry}
              sx={{ borderRadius: 2, px: 3 }}
            >
              {t('Try again')}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default QrCodeScanner;
