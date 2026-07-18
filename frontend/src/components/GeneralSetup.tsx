import { useEffect, useState, useMemo, useRef } from 'react';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box, Container, Paper, Grid, MenuItem,
  Divider, Select, InputLabel, FormControl, Button, List,
  ListItemButton, ListItemText, useMediaQuery, Accordion,
  AccordionSummary, AccordionDetails, Typography,
  Switch, FormControlLabel
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useToast } from '@/contexts/ToastContext';
import { useSetupRefresh, defaultSetup, deepMerge } from '@/contexts/SetupContext';
import { setupApi, imageApi,  } from '@/services/api';
import PageHeader from './PageHeader';
import { getErrorMessage } from '@ticketuno/shared/utils/misc';
import type {
  GeneralSetupType,
  GeneralSetupSections,
  PaymentGateway,
  DeepPartial,
} from '@ticketuno/shared';
import { CurrencyCode } from '@ticketuno/shared';
import config from '@/config';

// ── Constants ───────────────────────────────────────────────────
const currencies = Object.keys(config.app.currencies);

const TIMEZONES: string[] = typeof Intl.supportedValuesOf === 'function'
  ? Intl.supportedValuesOf('timeZone')
  : ['Europe/Rome', 'Europe/Paris', 'Europe/London', 'America/New_York', 'UTC'];
  
const SECTIONS: GeneralSetupSections[] = ['app', 'branding', /*'preferences', 'security',*/ 'payments'];

const PAYMENT_GATEWAYS: { value: PaymentGateway; label: string }[] = [
  { value: 'stripe', label: 'Stripe' },
  { value: 'satispay', label: 'Satispay' },
  { value: 'revolut', label: 'Revolut' },
  { value: 'paypal', label: 'PayPal' },
  { value: 'sumup', label: 'SumUp' },
  { value: 'cash', label: 'Cash' },
  { value: 'free', label: 'Free' },
];

// // ── Typed handleChange ──────────────────────────────────────────
// type SectionKeyMap = {
//   [S in GeneralSetupSections]: keyof GeneralSetupType[S];
// };

type SectionSetter = <
  S extends GeneralSetupSections,
  K extends keyof GeneralSetupType[S]
>(section: S, key: K, value: GeneralSetupType[S][K]) => void;

// ── Deep diff ───────────────────────────────────────────────────
function deepDiff<T extends object>(current: T, original: T): DeepPartial<T> {
  const diff: DeepPartial<T> = {};
  for (const key of Object.keys(current) as (keyof T)[]) {
    const c = current[key], o = original[key];
    if (typeof c === 'object' && c !== null && typeof o === 'object' && o !== null) {
      const nested = deepDiff(c as object, o as object);
      if (Object.keys(nested).length) (diff as Record<string, unknown>)[key as string] = nested;
    } else if (c !== o) {
      diff[key] = c;
    }
  }
  return diff;
}

// ── Component ───────────────────────────────────────────────────
function GeneralSetup() {
  const theme = useTheme();
  const { t } = useTranslation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const toast = useToast();
  const refreshSetup = useSetupRefresh();

  const [section, setSection] = useState<GeneralSetupSections>('app');
  const [initialStatus, setInitialStatus] = useState<GeneralSetupType | null>(null);
  const [status, setStatus] = useState<GeneralSetupType>(defaultSetup);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entryStatusRef = useRef<GeneralSetupType | null>(null);

  // ── Typed change handler ──────────────────────────────────────
  const handleChange: SectionSetter = (sec, key, value) => {
    setStatus(prev => ({
      ...prev,
      [sec]: { ...prev[sec], [key]: value },
    }));
  };

  // ── Load ──────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const response = await setupApi.load();
        const merged: GeneralSetupType = deepMerge(defaultSetup, response.data || {});
        setStatus(merged);
        setInitialStatus(merged);
        entryStatusRef.current = merged;
        toast.success(t('Settings loaded'));
      } catch (error) {
        setSaveError(getErrorMessage(error));
      }
    })();
  }, []);

  // ── Dirty detection ───────────────────────────────────────────
  const isDirty = useMemo(() =>
    !!initialStatus && JSON.stringify(status) !== JSON.stringify(initialStatus),
    [status, initialStatus]);

  const isModifiedSinceEntry = useMemo(() =>
    !!entryStatusRef.current && JSON.stringify(status) !== JSON.stringify(entryStatusRef.current),
    [status]);

  // ── Auto-save ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isDirty) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (!initialStatus) return;
      const diff = deepDiff(status, initialStatus);
      if (!Object.keys(diff).length) return;

      setSaving(true);
      setSaveError(null);
      try {
        await setupApi.save(diff);
        await refreshSetup();
        setInitialStatus({ ...status });
        setJustSaved(true);
        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = setTimeout(() => setJustSaved(false), 1000);
      } catch (error) {
        setSaveError(getErrorMessage(error));
      } finally {
        setSaving(false);
      }
    }, 333);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [status]);

  const handleReset = () => {
    if (!entryStatusRef.current) return;
    setStatus(entryStatusRef.current);
    toast.info(t('Settings have been reset'));
  };

  // ── Section renderers ─────────────────────────────────────────
  const sectionRenderers: Record<GeneralSetupSections, () => JSX.Element> = {

    app: () => (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>{t('Currency')}</InputLabel>
            <Select
              value={status.app.currency}
              label={t('Currency')}
              onChange={(e) => handleChange('app', 'currency', e.target.value as CurrencyCode)}
            >
              {currencies.map((c) => (
                <MenuItem key={c} value={c}>{c}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>{t('Timezone')}</InputLabel>
            <Select
              value={status.app.timezone}
              label={t('Timezone')}
              onChange={(e) => handleChange('app', 'timezone', e.target.value)}
            >
              {TIMEZONES.map((tz) => <MenuItem key={tz} value={tz}>{tz}</MenuItem>)}
            </Select>
          </FormControl>
        </Grid>
        {/* <Grid item xs={12}>
          <TextField
            label={t('Session timeout (minutes)')}
            type="number"
            fullWidth
            value={status.app.timeout}
            onChange={(e) => handleChange('app', 'timeout', Number(e.target.value))}
          />
        </Grid> */}
      </Grid>
    ),

    branding: () => {
      const logoUrl = status.branding.logoImage
        ? `${config.app.baseUrlBackend}/uploads/${status.branding.logoImage}`
        : null;

      const handleLogoUpload = async (file: File) => {
        try {
          const response = await imageApi.upload(file, 'logo');
          handleChange('branding', 'logoImage', response.data.filename);
        } catch (error) {
          toast.error(getErrorMessage(error));
        }
      };

      const handleLogoRemove = async () => {
        if (status.branding.logoImage) {
          try { await imageApi.delete(status.branding.logoImage); }
          catch (error) { console.warn('Failed to delete old logo file:', error); }
        }
        handleChange('branding', 'logoImage', null);
      };

      return (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            {logoUrl && (
              <Box sx={{ mb: 2 }}>
                <img src={logoUrl} alt={t('Logo')} style={{ maxHeight: 80, maxWidth: '100%' }} />
              </Box>
            )}
            <Button variant="outlined" component="label">
              {t('Upload logo')}
              <input
                type="file" hidden
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => { const file = e.target.files?.[0]; if (file) handleLogoUpload(file); }}
              />
            </Button>
            {status.branding.logoImage && (
              <Button color="error" onClick={handleLogoRemove} sx={{ ml: 1 }}>{t('Remove')}</Button>
            )}
          </Grid>
        </Grid>
      );
    },

    // preferences: () => (
    //   <Grid container spacing={2}>
    //     <Grid item xs={12}>
    //       <FormControlLabel
    //         control={
    //           <Switch
    //             checked={status.preferences.enableNotifications}
    //             onChange={(e) => handleChange('preferences', 'enableNotifications', e.target.checked)}
    //           />
    //         }
    //         label={t('Enable notifications')}
    //       />
    //     </Grid>
    //     <Grid item xs={12}>
    //       <TextField
    //         label={t('Launch date')}
    //         type="date"
    //         fullWidth
    //         InputLabelProps={{ shrink: true }}
    //         disabled={!status.preferences.enableNotifications}
    //         value={status.preferences.launchDate ?? ''}
    //         onChange={(e) => handleChange('preferences', 'launchDate', e.target.value || null)}
    //       />
    //     </Grid>
    //     <Grid item xs={12}>
    //       <TextField
    //         label={t('Launch time')}
    //         type="time"
    //         fullWidth
    //         InputLabelProps={{ shrink: true }}
    //         disabled={!status.preferences.enableNotifications}
    //         value={status.preferences.time ?? ''}
    //         onChange={(e) => handleChange('preferences', 'time', e.target.value || null)}
    //       />
    //     </Grid>
    //   </Grid>
    // ),

    // security: () => (
    //   <Grid container spacing={2}>
    //     <Grid item xs={12}>
    //       <TextField
    //         label={t('API Key')}
    //         type={showApiKey ? 'text' : 'password'}
    //         fullWidth
    //         value={status.security.apiKey}
    //         onChange={(e) => handleChange('security', 'apiKey', e.target.value)}
    //         InputProps={{
    //           endAdornment: (
    //             <InputAdornment position="end">
    //               <IconButton onClick={() => setShowApiKey((v) => !v)} edge="end">
    //                 {showApiKey ? <VisibilityOff /> : <Visibility />}
    //               </IconButton>
    //             </InputAdornment>
    //           ),
    //         }}
    //       />
    //     </Grid>
    //   </Grid>
    // ),

    payments: () => {
      const { enabled, gateway } = status.payments;
      return (
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={enabled}
                  onChange={(e) => handleChange('payments', 'enabled', e.target.checked)}
                />
              }
              label={t('Enable payments')}
            />
          </Grid>

          <Grid item xs={12}>
            <FormControl fullWidth disabled={!enabled}>
              <InputLabel>{t('Payment gateway')}</InputLabel>
              <Select
                value={gateway ?? ''}
                label={t('Payment gateway')}
                onChange={(e) =>
                  handleChange('payments', 'gateway', (e.target.value as PaymentGateway) || null)
                }
              >
                {PAYMENT_GATEWAYS.map(({ value, label }) => (
                  <MenuItem key={value} value={value}>{label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      );
    },
  };

  // ── Single entry point ─────────────────────────────────────────
  const renderSection = (s: GeneralSetupSections) => sectionRenderers[s]();

  // ── Sidebar ───────────────────────────────────────────────────
  const SidebarContent = (
    <List sx={{ width: 220 }}>
      {SECTIONS.map((s) => (
        <ListItemButton
          key={s}
          selected={section === s}
          onClick={() => setSection(s)}
          sx={{
            borderRadius: 1,
            '&.Mui-selected': {
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              '&:hover': { backgroundColor: theme.palette.primary.dark },
            },
          }}
        >
          <ListItemText
            primary={t(s)}
            primaryTypographyProps={{ fontWeight: section === s ? 600 : 400 }}
          />
        </ListItemButton>
      ))}
    </List>
  );

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <PageHeader title={t('Settings')} />
      <Paper sx={{ p: 2, borderRadius: 1, backgroundColor: 'background.paper' }}>
        <Box sx={{ display: 'flex', mt: 2, flexDirection: isMobile ? 'column' : 'row' }}>

          {!isMobile && SidebarContent}

          <Box sx={{ flex: 1, p: 2 }}>
            {isMobile
              ? SECTIONS.map((s) => (
                  <Accordion
                    key={s}
                    expanded={section === s}
                    onChange={() => setSection(s)}
                    disableGutters elevation={0} square={false}
                    sx={{ mb: 1, borderRadius: 1, overflow: 'hidden', '&:before': { display: 'none' } }}
                  >
                    <AccordionSummary
                      expandIcon={
                        <ExpandMoreIcon
                          sx={{ color: section === s ? theme.palette.primary.contrastText : undefined }}
                        />
                      }
                      sx={{
                        mb: 1,
                        backgroundColor: section === s ? theme.palette.primary.main : undefined,
                        color: section === s ? theme.palette.primary.contrastText : undefined,
                        borderRadius: 1,
                        '&.Mui-expanded': { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
                      }}
                    >
                      <Typography fontWeight={600}>{t(s)}</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ backgroundColor: theme.palette.background.paper }}>
                      {renderSection(s)}
                    </AccordionDetails>
                  </Accordion>
                ))
              : renderSection(section)
            }
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box display="flex" alignItems="flex-start" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1} sx={{ flex: 1, minWidth: 0 }}>
            {saveError ? (
              <>
                <ErrorIcon color="error" />
                <Typography variant="caption" color="error" sx={{ wordBreak: 'break-word' }}>
                  {saveError}
                </Typography>
              </>
            ) : saving ? (
              <AccessTimeIcon color="info" />
            ) : justSaved ? (
              <CheckCircleIcon color="success" />
            ) : isDirty ? (
              <AccessTimeIcon color="warning" />
            ) : (
              <CheckCircleIcon sx={{ opacity: 0 }} />
            )}
          </Box>
          <Button variant="outlined" disabled={!isModifiedSinceEntry} onClick={handleReset}>
            {t('Reset')}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default GeneralSetup;
