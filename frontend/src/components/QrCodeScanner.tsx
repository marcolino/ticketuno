/**
 * Dependencies:
 *   "jsqr": "^1.4.0"
 *   "@mui/material", "@mui/icons-material", "@emotion/react", "@emotion/styled"
 *   "react-i18next", "i18next"
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

// ─── Sound utilities ──────────────────────────────────────────────────────────
//
// Pure Web Audio API — no asset files needed.
// Both functions are exported so you can also call them from outside the
// component (e.g. in your own onScan handler after server validation).

let _audioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new AudioContext();
  }
  return _audioCtx;
}

/**
 * Plays a short two-tone ascending beep — the classic barcode-scanner sound.
 * Safe to call with no await; errors are swallowed silently.
 */
export function playSuccessSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Two quick ascending tones: 880 Hz → 1320 Hz
    const tones = [
      { freq: 880,  start: now,        duration: 0.07 },
      { freq: 1320, start: now + 0.08, duration: 0.10 },
    ];

    tones.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      // Quick fade-in then fade-out
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.35, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.start(start);
      osc.stop(start + duration + 0.01);
    });
  } catch {
    // AudioContext not available (e.g. SSR) — fail silently
  }
}

/**
 * Plays a short descending buzz — used to signal a camera/scan failure.
 * Safe to call with no await; errors are swallowed silently.
 */
export function playFailureSound(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const duration = 0.25;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sawtooth';
    // Descending sweep: 320 Hz → 130 Hz
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(130, now + duration);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.start(now);
    osc.stop(now + duration + 0.01);
  } catch {
    // fail silently
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface QrCodeScannerProps {
  /**
   * Called every time a QR code is successfully decoded.
   * After this callback fires the component waits `scanCooldown` ms,
   * then automatically resets and resumes scanning.
   */
  onScan: (result: string) => void;
  /** Called when the user closes/cancels the scanner. */
  onClose?: () => void;
  /** Controls whether the scanner is open. */
  open: boolean;
  /** Optional MUI Dialog maxWidth override. Defaults to "sm". */
  maxWidth?: 'xs' | 'sm' | 'md';
  /**
   * Milliseconds to show the success overlay before resuming scanning.
   * Defaults to 2000.
   */
  scanCooldown?: number;
  /**
   * Play synthesised sounds on success and failure.
   * Defaults to true.
   */
  enableSounds?: boolean;
}

type CameraPermission = 'unknown' | 'granted' | 'denied' | 'unavailable';
type ScannerState = 'idle' | 'requesting' | 'active' | 'cooldown' | 'error';
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
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (isIOS) return 'ios';
  if (/android/i.test(ua)) return 'android';
  if (/Edg\//.test(ua)) return 'desktop-edge';
  if (/Chrome\//.test(ua)) return 'desktop-chrome';
  if (/Firefox\//.test(ua)) return 'desktop-firefox';
  if (/Safari\//.test(ua)) return 'desktop-safari';
  return 'desktop-other';
}

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

// Countdown ring shrinks from full circle to nothing over `duration` seconds
// TODO: why duration is not used ?
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const cooldownShrink = (_duration: number) => keyframes`
  0%   { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: 126; }   /* 2π × r=20 ≈ 126 */
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
    // Smoothly transition color when switching between scanning/success/cooldown
    transition: 'border-color 0.3s ease',
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

// ─── Cooldown ring SVG ────────────────────────────────────────────────────────

/** Animated circular countdown ring shown during the cooldown period. */
const CooldownRing: React.FC<{ durationMs: number }> = ({ durationMs }) => {
  const shrink = cooldownShrink(durationMs / 1000);
  const durationS = `${durationMs / 1000}s`;
  const circumference = 2 * Math.PI * 20; // r=20 → ≈125.7

  return (
    <Box
      component="svg"
      viewBox="0 0 48 48"
      sx={{
        position: 'absolute',
        bottom: 10,
        right: 10,
        width: 36,
        height: 36,
        transform: 'rotate(-90deg)',
        pointerEvents: 'none',
      }}
    >
      {/* Track */}
      <circle
        cx="24" cy="24" r="20"
        fill="none"
        stroke="rgba(255,255,255,0.2)"
        strokeWidth="3"
      />
      {/* Animated progress */}
      <circle
        cx="24" cy="24" r="20"
        fill="none"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={0}
        style={{
          animation: `${shrink} ${durationS} linear forwards`,
        }}
      />
    </Box>
  );
};

// ─── Recovery steps config ────────────────────────────────────────────────────

interface RecoveryStep {
  icon: React.ElementType;
  labelKey: string;
}

const STEP_NUM_ICONS = [LooksOneIcon, LooksTwoIcon, Looks3Icon];

function getRecoverySteps(platform: Platform, t: (k: string) => string): RecoveryStep[] {
  switch (platform) {
    case 'ios':
      return [
        { icon: DeleteOutlineIcon, labelKey: t('Delete this app from your Home Screen, then re-add it from your browser') },
        { icon: SettingsIcon,      labelKey: t('Or go to iOS Settings → Safari → Camera → find this site → set to Allow') },
      ];
    case 'android':
      return [
        { icon: DeleteOutlineIcon, labelKey: t('Uninstall this app, then reinstall it from your browser') },
        { icon: SettingsIcon,      labelKey: t('Or open Android Settings → Apps → your browser → Permissions → Camera → Allow') },
      ];
    case 'desktop-chrome':
      return [{ icon: LockOpenIcon, labelKey: t('Click the 🔒 lock icon in the address bar → Camera → Allow → reload the page') }];
    case 'desktop-firefox':
      return [{ icon: LockOpenIcon, labelKey: t('Click the 🔒 lock icon → Connection Secure → More Information → Permissions → Camera → Allow') }];
    case 'desktop-safari':
      return [{ icon: SettingsIcon, labelKey: t('Go to Safari menu → Settings → Websites → Camera → find this site → Allow') }];
    case 'desktop-edge':
      return [{ icon: LockOpenIcon, labelKey: t('Click the 🔒 lock icon in the address bar → Camera → Allow → reload the page') }];
    default:
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
      <Alert severity="warning" icon={<BlockIcon />} sx={{ borderRadius: 2, alignItems: 'flex-start' }}>
        <Typography variant="body2" fontWeight={700} gutterBottom>
          {t('Camera access was blocked')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t('You denied camera access. The app cannot ask again, but you can unblock it manually.')}
        </Typography>
      </Alert>

      <Box sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          px: 2, py: 1.25,
          backgroundColor: alpha(theme.palette.action.hover, 0.5),
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}>
          <PlatformIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography variant="caption" fontWeight={700} color="text.secondary" letterSpacing={0.4}>
            {isMobile ? t('How to restore access') : t('How to restore access in your browser')}
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
                  <ListItemText primary={
                    <Stack direction="row" alignItems="center" spacing={0.75}>
                      <StepIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                      <Typography variant="body2">{step.labelKey}</Typography>
                    </Stack>
                  } />
                </ListItem>
              </React.Fragment>
            );
          })}

          <Divider component="li" />
          <ListItem alignItems="flex-start" sx={{ py: 1.25, px: 2 }}>
            <ListItemIcon sx={{ minWidth: 30, mt: 0.3 }}>
              {steps.length < 3
                ? <Looks3Icon sx={{ fontSize: 18, color: 'primary.main' }} />
                : <RefreshIcon sx={{ fontSize: 18, color: 'primary.main' }} />}
            </ListItemIcon>
            <ListItemText primary={
              <Stack direction="row" alignItems="center" spacing={0.75}>
                <RefreshIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
                <Typography variant="body2">{t('Come back here and tap "Check Again"')}</Typography>
              </Stack>
            } />
          </ListItem>
        </List>
      </Box>

      {isMobile && (
        <Typography variant="caption" color="text.secondary" textAlign="center">
          {t('💡 On mobile, uninstalling and reinstalling this app also resets camera permission.')}
        </Typography>
      )}

      <Button
        variant="contained"
        fullWidth
        startIcon={checkingAgain ? <CircularProgress size={16} color="inherit" /> : <RefreshIcon />}
        onClick={onCheckAgain}
        disabled={checkingAgain}
        sx={{ borderRadius: 2, py: 1 }}
      >
        {t('Check Again')}
      </Button>

      <Collapse in={stillDenied}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          <Typography variant="body2">
            {t('Camera is still blocked. Make sure you saved the setting change and try again')}
          </Typography>
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
  scanCooldown = 2 * 1000,
  enableSounds = true,
}) => {
  const { t } = useTranslation();
  const theme = useTheme();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [permission, setPermission] = useState<CameraPermission>('unknown');
  const [scannerState, setScannerState] = useState<ScannerState>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [scannedValue, setScannedValue] = useState<string>('');
  const [showPermissionNotice, setShowPermissionNotice] = useState(false);
  const [platform] = useState<Platform>(detectPlatform);
  const [checkingAgain, setCheckingAgain] = useState(false);
  const [stillDenied, setStillDenied] = useState(false);

  // ── Open/close lifecycle ──────────────────────────────────────────────────
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

    return () => {
      stopCamera();
      if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    };
  }, [open]); // e_slint-disable-line react-hooks/exhaustive-deps

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
        if (enableSounds) playFailureSound();
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setPermission('unavailable');
        setErrorMsg(t('No camera was found on this device'));
        setScannerState('error');
        if (enableSounds) playFailureSound();
      } else {
        setErrorMsg(t('Could not start the camera. Please check your device and try again'));
        setScannerState('error');
        if (enableSounds) playFailureSound();
      }
    }
  }, [t, enableSounds]);

  // ── Stop camera ───────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  // ── Resume scanning after cooldown ────────────────────────────────────────
  //   Called internally — keeps the stream alive and just restarts the
  //   decode loop without re-requesting camera permission.
  const resumeScanning = useCallback(() => {
    setScannedValue('');
    setScannerState('active');
    // tick loop is restarted by the effect below that watches scannerState
  }, []);

  // ── QR decode loop ────────────────────────────────────────────────────────
  const tick = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(tick);
      return;
    }
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    });

    if (code?.data) {
      //code.data = "qewrqewrqewrqwer"; // TODO ...

      // ── Successful decode ──
      if (enableSounds) playSuccessSound();
      setScannedValue(code.data);
      setScannerState('cooldown'); // show overlay + ring
      onScan(code.data); // notify parent immediately

      // Schedule automatic reset
      cooldownTimer.current = setTimeout(() => {
        resumeScanning();
      }, scanCooldown);

      return; // stop this loop; it will restart when state → 'active'
    }

    animFrameRef.current = requestAnimationFrame(tick);
  }, [onScan, enableSounds, scanCooldown, resumeScanning]);

  // Start/stop the decode loop whenever scannerState changes
  useEffect(() => {
    if (scannerState === 'active') {
      animFrameRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(animFrameRef.current);
    }
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [scannerState, tick]);

  // ── "Check Again" ─────────────────────────────────────────────────────────
  const handleCheckAgain = useCallback(async () => {
    setCheckingAgain(true);
    setStillDenied(false);
    const p = await queryExistingPermission();
    setPermission(p);
    if (p === 'granted') {
      setCheckingAgain(false);
      startCamera();
    } else if (p === 'unknown') {
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
    if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
    stopCamera();
    setScannedValue('');
    setScannerState('idle');
    setErrorMsg('');
    setStillDenied(false);
    onClose?.();
  };

  const handleStop = () => {
    if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
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

  const isDenied     = permission === 'denied' && scannerState === 'error';
  const isCooldown   = scannerState === 'cooldown';

  // Bracket color: green during cooldown, primary otherwise
  const bracketColor = isCooldown
    ? theme.palette.success.light
    : theme.palette.primary.light;

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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 3, pt: 2.5, pb: 1 }}>
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
          <Button variant="contained" onClick={handlePermissionProceed} startIcon={<CameraAltIcon />} size="small">
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
        <Box sx={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          px: 2.5, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}`,
        }}>
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

            {!isDenied && (
              <ViewfinderWrapper>
                {/* Live video — stays mounted throughout; opacity hides it when idle */}
                <StyledVideo
                  ref={videoRef}
                  muted
                  playsInline
                  autoPlay
                  style={{
                    opacity: scannerState === 'active' || isCooldown ? 1 : 0,
                    transition: 'opacity 0.4s ease',
                  }}
                />
                <HiddenCanvas ref={canvasRef} />

                {/* Corner brackets */}
                {(['tl', 'tr', 'bl', 'br'] as const).map((c) => (
                  <CornerBracket key={c} corner={c} bracketColor={bracketColor} />
                ))}

                {/* Scan line — only while actively decoding */}
                {scannerState === 'active' && (
                  <Overlay><ScanLineBar /></Overlay>
                )}

                {/* Success / cooldown overlay */}
                {isCooldown && (
                  <SuccessOverlay>
                    <Stack alignItems="center" spacing={1}>
                      <QrCodeScannerIcon sx={{ fontSize: 52, color: '#fff' }} />
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        color="#fff"
                        textAlign="center"
                        sx={{ px: 2, wordBreak: 'break-all', maxWidth: '80%' }}
                      >
                        {scannedValue}
                      </Typography>
                    </Stack>
                    {/* Countdown ring in bottom-right corner */}
                    <CooldownRing durationMs={scanCooldown} />
                  </SuccessOverlay>
                )}

                {/* Idle / requesting placeholder */}
                {(scannerState === 'idle' || scannerState === 'requesting') && (
                  <Overlay sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: alpha('#000', 0.55),
                  }}>
                    {scannerState === 'requesting'
                      ? <CircularProgress size={36} sx={{ color: '#fff' }} />
                      : <QrCodeScannerIcon sx={{ fontSize: 64, color: alpha('#fff', 0.25) }} />
                    }
                  </Overlay>
                )}
              </ViewfinderWrapper>
            )}

            {/* Status label below viewfinder */}
            {scannerState === 'active' && (
              <ScanningLabel>
                <CircularProgress size={14} color="inherit" thickness={5} />
                <Typography variant="caption" fontWeight={600} letterSpacing={0.5}>
                  {t('Looking for a QR code…')}
                </Typography>
              </ScanningLabel>
            )}

            {isCooldown && (
              <Typography variant="caption" color="success.main" fontWeight={600} letterSpacing={0.4}>
                {t('Scanned! Ready for next code in a moment…')}
              </Typography>
            )}

            {!scannedValue && scannerState === 'idle' && !errorMsg && (
              <Typography variant="caption" color="text.secondary">
                {t('Point your camera at a QR code to scan it')}
              </Typography>
            )}

            {errorMsg && !isDenied && (
              <Alert severity="error" sx={{ width: '100%', borderRadius: 2 }}>
                {errorMsg}
              </Alert>
            )}

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

          {(scannerState === 'active' || isCooldown) && (
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
