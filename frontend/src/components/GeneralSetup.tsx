import { useEffect, useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Container,
  Paper,
  Grid,
  TextField,
  MenuItem,
  Divider,
  Select,
  InputLabel,
  FormControl,
  Button,
  List,
  ListItemButton,
  ListItemText,
  useMediaQuery,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Switch,
  FormControlLabel
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
}  from '@mui/icons-material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useToast } from '@/contexts/ToastContext';
import { useSetupRefresh, defaultSetup } from '@/contexts/SetupContext';
import { setupApi } from '@/services/api';
import PageHeader from './PageHeader';
import { getErrorMessage } from '@/shared/utils/misc';
import { GeneralSetupType } from '@/shared/types/generalSetup';
import config from '@/config';

const currencies = Object.keys(config.app.currencies);

function GeneralSetup() {
  const theme = useTheme();
  const { t } = useTranslation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const toast = useToast();
  const refreshSetup = useSetupRefresh();

  const [section, setSection] = useState<'app' | 'preferences' | 'security'>('app');
  const [initialStatus, setInitialStatus] = useState<GeneralSetupType | null>(null);
  const [status, setStatus] = useState<GeneralSetupType>(defaultSetup);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Captured once on mount — never changes. Reset always goes back here.
  const entryStatusRef = useRef<GeneralSetupType | null>(null);

  const handleChange = (key: keyof GeneralSetupType, value: unknown) => {
    setStatus((prev) => ({ ...prev, [key]: value as GeneralSetupType[typeof key] }));
  };
  
  useEffect(() => {
    (async () => {
      try {
        const response = await setupApi.load();
        const merged: GeneralSetupType = { ...defaultSetup, ...response.data };
        setStatus(merged);
        setInitialStatus(merged);
        entryStatusRef.current = merged;   // lock in the entry snapshot
        toast.success(t('Settings loaded'));
      } catch (error) {
        const msg = getErrorMessage(error);
        setSaveError(msg);
      }
    })();
  }, []);

  /* Dirty detection (vs last-saved, drives auto-save) */
  const isDirty = useMemo(() => {
    if (!initialStatus) return false;
    return JSON.stringify(status) !== JSON.stringify(initialStatus);
  }, [status, initialStatus]);

  /* Reset-button visibility (vs entry snapshot) */
  const isModifiedSinceEntry = useMemo(() => {
    if (!entryStatusRef.current) return false;
    return JSON.stringify(status) !== JSON.stringify(entryStatusRef.current);
  }, [status]);

  function diffObject<T extends object>(current: T, original: T): Partial<T> {
    const diff: Partial<T> = {};
    (Object.keys(current) as (keyof T)[]).forEach((key) => {
      if (current[key] !== original[key]) {
        diff[key] = current[key];
      }
    });
    return diff;
  }

  const getDiff = (): Partial<GeneralSetupType> => {
    if (!initialStatus) return {};
    return diffObject(status, initialStatus);
  };

  /* Auto-save */
  useEffect(() => {
    if (!isDirty) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const diff = getDiff();
      if (!Object.keys(diff).length) return;

      setSaving(true);
      setSaveError(null);

      try {
        await setupApi.save(diff);
        await refreshSetup();
        setInitialStatus({ ...status });   // advance the last-saved baseline
        setJustSaved(true);

        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = setTimeout(() => {
          setJustSaved(false);
        }, 1 * 1000);

      } catch (error) {
        const msg = getErrorMessage(error);
        setSaveError(msg);
      } finally {
        setSaving(false);
      }
    }, (1 / 3) * 1000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [status]);

  const handleReset = () => {
    if (!entryStatusRef.current) return;
    setStatus(entryStatusRef.current);
    toast.info(t('Settings have been reset'));
  };

  /* Sidebar content desktop */
  const SidebarContent = (
    <List sx={{ width: 220 }}>
      {(['app', 'preferences', 'security'] as const).map((s) => (
        <ListItemButton
          key={s}
          selected={section === s}
          onClick={() => setSection(s)}
          sx={{
            borderRadius: 1,
            '&.Mui-selected': {
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
              },
            },
          }}
        >
          <ListItemText
            primary={t(s)}
            primaryTypographyProps={{
              fontWeight: section === s ? 600 : 400
            }}
          />
        </ListItemButton>
      ))}
    </List>
  );

  const renderAppSection = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <FormControl fullWidth>
          <InputLabel>{t('Currency')}</InputLabel>
          <Select
            value={status.currency}
            label={t('Currency')}
            onChange={(e) => handleChange('currency', e.target.value)}
          >
            {currencies.map((c) => (
              <MenuItem key={c} value={c}>{c}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12}>
        <TextField
          label={t('Timeout (todo...)')}
          type="number"
          fullWidth
          value={status.timeout}
          onChange={(e) => handleChange('timeout', Number(e.target.value))}
        />
      </Grid>
    </Grid>
  );

  const renderPreferencesSection = () => (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={status.enableNotifications}
              onChange={(e) => handleChange('enableNotifications', e.target.checked)}
            />
          }
          label={t('Enable notifications')}
        />
      </Grid>
    </Grid>
  );

  return (
    <Container maxWidth="md" sx={{ py: 2 }}>
      <PageHeader title={t('Settings')} />

      <Paper sx={{ p: 2, borderRadius: 1, backgroundColor: 'background.paper' }}>

        <Box sx={{
          display: "flex",
          mt: 2,
          flexDirection: isMobile ? 'column' : 'row',
        }}>

          {!isMobile && SidebarContent}

          <Box sx={{ flex: 1, p: 2 }}>

            {/* MOBILE ACCORDION */}
            {isMobile && (['app', 'preferences', 'security'] as const).map((s) => (
              <Accordion
                key={s}
                expanded={section === s}
                onChange={() => setSection(s)}
                disableGutters
                elevation={0}
                square={false}
                sx={{
                  mb: 1,
                  borderRadius: 1,
                  overflow: 'hidden',
                  '&:before': { display: 'none' },
                }}
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
                    '&.Mui-expanded': {
                      borderBottomLeftRadius: 0,
                      borderBottomRightRadius: 0,
                    },
                  }}
                >
                  <Typography fontWeight={600}>{t(s)}</Typography>
                </AccordionSummary>

                <AccordionDetails
                  sx={{
                    borderBottomLeftRadius: 2,
                    borderBottomRightRadius: 2,
                    backgroundColor: theme.palette.background.paper,
                  }}
                >
                  {s === 'app' && renderAppSection()}
                  {s === 'preferences' && renderPreferencesSection()}
                </AccordionDetails>
              </Accordion>
            ))}

            {/* DESKTOP CONTENT */}
            {!isMobile && section === 'app' && renderAppSection()}
            {!isMobile && section === 'preferences' && renderPreferencesSection()}

          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box display="flex" alignItems="flex-start" justifyContent="space-between">

          {/* STATUS LEFT */}
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

          {/* RESET RIGHT */}
          <Button
            variant="outlined"
            disabled={!isModifiedSinceEntry}
            onClick={handleReset}
          >
            {t('Reset')}
          </Button>

        </Box>
      </Paper>
    </Container>
  );
}

export default GeneralSetup;
