import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  TextField,
  Typography,
  Alert,
  Stack,
  Skeleton,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  BugReport as BugReportIcon,
  LiveTv as LiveTvIcon,

} from '@mui/icons-material';
import { useConfig } from '@/contexts/ConfigContext';
import { stripeConnectApi } from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@ticketuno/shared/utils/misc';

// ── Types ───────────────────────────────────────────────────
//export type StripeConnectStatus = 'none' | 'pending' | 'active' | 'error';
import { StripeConnectSetup, StripeConnectStatus } from '@ticketuno/shared';
// export interface StripeConnectSetup {
//   status: StripeConnectStatus;
//   organizerEmail?: string;
//   businessName?: string;
//   accountId?: string;
//   chargesEnabled?: boolean;
//   payoutsEnabled?: boolean;
//   detailsSubmitted?: boolean;
//   onboardingUrl?: string;
//   error?: string;
// }

// ── Component Props ────────────────────────────────────────
interface StripeOrganizerSetupProps {
  /** Called when the setup status changes */
  onStatusChange?: (status: StripeConnectStatus) => void;
  /** Initial setup data (optional) */
  initialData?: StripeConnectSetup | null;
  /** Whether the component is in a loading state */
  loading?: boolean;
}

// ── Status Chip Component ──────────────────────────────────
interface StatusChipProps {
  status: StripeConnectStatus;
}

function ModeChip() {
  const { t } = useTranslation();
  const { stripeMode } = useConfig();
  
  const getModeConfig = () => {
    switch (stripeMode) {
      case 'test':
        return {
          label: t('Stripe test mode'),
          color: 'error' as const,
          icon: <BugReportIcon />,
        };
      case 'live':
        return {
          label: t('Stripe live mode'),
          color: 'success' as const,
          icon: <LiveTvIcon />,
        };
      default:
        return {
          label: t('Stripe unforeseen mode v {{mode}}', {mode: stripeMode}),
          color: 'default' as const,
          icon: <ErrorIcon />,
        };
    }
  };

  const config = getModeConfig();

  return (
    <Chip
      //icon={config.icon}
      label={config.label}
      color={config.color}
      variant="filled"
      size="medium"
      sx={{ fontWeight: 600 }}
    />
  );
};

function StatusChip({ status }: StatusChipProps) {
  const { t } = useTranslation();

  const getStatusConfig = (status: StripeConnectStatus) => {
    switch (status) {
      case 'none':
        return {
          label: t('Not connected'),
          color: 'default' as const,
          icon: <LinkOffIcon />,
        };
      case 'pending':
        return {
          label: t('Pending'),
          color: 'warning' as const,
          icon: <PendingIcon />,
        };
      case 'active':
        return {
          label: t('Active'),
          color: 'success' as const,
          icon: <CheckCircleIcon />,
        };
      case 'error':
        return {
          label: t('Error'),
          color: 'error' as const,
          icon: <ErrorIcon />,
        };
      default:
        return {
          label: t('Unknown'),
          color: 'default' as const,
          icon: <ErrorIcon />,
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Chip
      icon={config.icon}
      label={config.label}
      color={config.color}
      variant="filled"
      size="medium"
      sx={{ fontWeight: 600 }}
    />
  );
}

// ── Main Component ─────────────────────────────────────────
export function StripeOrganizerSetup({
  onStatusChange,
  initialData = null,
  loading: externalLoading = false,
}: StripeOrganizerSetupProps) {
  const { t } = useTranslation();
  const toast = useToast();

  // ── State ──────────────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [setup, setSetup] = useState<StripeConnectSetup | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // ── Status helpers ────────────────────────────────────────
  const status = setup?.status || 'none';
  const isActive = status === 'active';
  const isPending = status === 'pending';
  const isNone = status === 'none';
  //const isError = status === 'error';

  // ── Load status on mount ──────────────────────────────────
  const loadStatus = useCallback(async () => {
    if (externalLoading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await stripeConnectApi.status();
      const data = response.data;
      setSetup(data);
      setOnboardingUrl(data.onboardingUrl || null);
      
      // If status is 'none', pre-fill from existing data
      if (data.status === 'none' && data.organizerEmail) {
        setEmail(data.organizerEmail);
      }
      if (data.status === 'none' && data.businessName) {
        setBusinessName(data.businessName);
      }
      
      onStatusChange?.(data.status);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [externalLoading, onStatusChange, toast]);

  // ── Load on mount ──────────────────────────────────────────
  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // ── Sync status ────────────────────────────────────────────
  const syncStatus = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await stripeConnectApi.sync();
      const data = response.data;
      setSetup(data);
      setOnboardingUrl(data.onboardingUrl || null);
      onStatusChange?.(data.status);
      
      if (data.status === 'active') {
        toast.success(t('Stripe account is now active!'));
      } else if (data.status === 'pending') {
        toast.info(t('Stripe account setup is pending completion.'));
      } else {
        toast.info(t('Status refreshed.'));
      }
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [loading, onStatusChange, toast, t]);

  // ── Create account & get onboarding link ──────────────────
  const handleOnboard = useCallback(async () => {
    // Validate inputs
    if (!email.trim()) {
      toast.warning(t('Please enter an email address'));
      return;
    }
    if (!businessName.trim()) {
      toast.warning(t('Please enter a business name'));
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.warning(t('Please enter a valid email address'));
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await stripeConnectApi.onboard({
        organizerEmail: email.trim(),
        businessName: businessName.trim(),
      });

      const data = response.data;
      setSetup(data.stripe);
      setOnboardingUrl(data.onboardingUrl);
      onStatusChange?.(data.stripe.status);

      toast.success(t('Onboarding link created successfully!'));

      // Open the onboarding URL in a new tab
      if (data.onboardingUrl) {
        window.open(data.onboardingUrl, '_blank');
      }
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  }, [email, businessName, onStatusChange, toast, t]);

  // ── Refresh onboarding link ───────────────────────────────
  const handleRefreshLink = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await stripeConnectApi.refreshLink();
      const data = response.data;
      setOnboardingUrl(data.onboardingUrl);

      toast.success(t('New onboarding link created!'));

      // Open the onboarding URL in a new tab
      if (data.onboardingUrl) {
        window.open(data.onboardingUrl, '_blank');
      }
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [loading, toast, t]);

  // ── Show loading state ────────────────────────────────────
  if (externalLoading || loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Skeleton variant="text" width="60%" height={32} />
          <Skeleton variant="rectangular" height={56} />
          <Skeleton variant="rectangular" height={56} />
          <Skeleton variant="rectangular" height={40} width="40%" />
        </Stack>
      </Paper>
    );
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Stack spacing={3}>
        {/* Header with status */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" component="h2" fontWeight={600}>
              {t('Stripe Connect Setup')}
            </Typography>
            <ModeChip />
            <StatusChip status={status} />
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={syncStatus}
              disabled={isNone || loading}
            >
              {t('Refresh status')}
            </Button>
            {!isActive && !isNone && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<LinkIcon />}
                onClick={handleRefreshLink}
                disabled={loading}
              >
                {t('New onboarding link')}
              </Button>
            )}
          </Box>
        </Box>

        {/* Status details */}
        {setup && status !== 'none' && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, bgcolor: 'action.hover', p: 2, borderRadius: 1 }}>
            {setup.organizerEmail && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <EmailIcon fontSize="small" color="action" />
                <Typography variant="body2">{setup.organizerEmail}</Typography>
              </Box>
            )}
            {setup.businessName && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <BusinessIcon fontSize="small" color="action" />
                <Typography variant="body2">{setup.businessName}</Typography>
              </Box>
            )}
            {setup.detailsSubmitted !== undefined && (
              <Chip
                label={setup.detailsSubmitted ? t('Details submitted') : t('Details pending')}
                size="small"
                color={setup.detailsSubmitted ? 'success' : 'warning'}
                variant="outlined"
              />
            )}
            {setup.chargesEnabled !== undefined && (
              <Chip
                label={setup.chargesEnabled ? t('Charges enabled') : t('Charges disabled')}
                size="small"
                color={setup.chargesEnabled ? 'success' : 'default'}
                variant="outlined"
              />
            )}
            {setup.payoutsEnabled !== undefined && (
              <Chip
                label={setup.payoutsEnabled ? t('Payouts enabled') : t('Payouts disabled')}
                size="small"
                color={setup.payoutsEnabled ? 'success' : 'default'}
                variant="outlined"
              />
            )}
          </Box>
        )}

        {/* Error display */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Onboarding form - only show when not active */}
        {!isActive && (
          <>
            <Divider />
            <Typography variant="subtitle2" color="text.secondary">
              {isNone 
                ? t('Connect your Stripe account to start accepting payments.')
                : t('Complete your Stripe account setup to start accepting payments.')}
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label={t('Organizer Email')}
                  type="email"
                  fullWidth
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isPending || isCreating || loading}
                  placeholder="organizer@example.com"
                  InputProps={{
                    startAdornment: <EmailIcon color="action" sx={{ mr: 1 }} />,
                  }}
                  helperText={t('The email address of the Stripe account owner')}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label={t('Business Name')}
                  fullWidth
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  disabled={isPending || isCreating || loading}
                  placeholder="My Theater Company"
                  InputProps={{
                    startAdornment: <BusinessIcon color="action" sx={{ mr: 1 }} />,
                  }}
                  helperText={t('The legal or business name for the Stripe account')}
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                startIcon={isCreating ? <CircularProgress size={20} /> : <LinkIcon />}
                onClick={handleOnboard}
                disabled={isCreating || loading || isPending}
                sx={{ minWidth: 200 }}
              >
                {isCreating 
                  ? t('Creating account...') 
                  : isPending 
                    ? t('Setup pending...') 
                    : t('Create account and get onboarding link')}
              </Button>

              {isPending && (
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefreshLink}
                  disabled={loading}
                >
                  {t('New onboarding link')}
                </Button>
              )}
            </Box>

            {onboardingUrl && !isActive && (
              <Alert severity="info" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  {t('Onboarding link has been sent to the organizer. You can also click the button above to open it in a new tab.')}
                </Typography>
              </Alert>
            )}
          </>
        )}

        {/* Active state */}
        {isActive && (
          <Alert severity="success" icon={<CheckCircleIcon />}>
            <Typography variant="body1" fontWeight={600}>
              {t('Stripe account is fully active and ready to accept payments!')}
            </Typography>
            {setup && setup.accountId && (
              <Typography variant="caption" color="text.secondary">
                {t('Account ID')}: {setup.accountId}
              </Typography>
            )}
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}

export default StripeOrganizerSetup;
