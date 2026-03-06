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
  //Alert,
  Button,
  List,
  ListItemButton,
  ListItemText,
  useMediaQuery,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Drawer
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  Menu as MenuIcon,
  AccessTime as AccessTimeIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
}  from '@mui/icons-material';
import { useToast } from '@/contexts/ToastContext';
import { setupApi } from '@/services/api';
import PageHeader from "./PageHeader";
import { getErrorMessage } from '@/utils/misc';
import { SetupStatus } from '@/shared/types/generalSetup';
import config from '@/config';

const defaultSetup: SetupStatus = { // TODO: from config
  currency: 'EUR',
  timeout: 10,
  enableNotifications: true,
  launchDate: null,
  time: null,
  apiKey: ''
};
const currencies = Object.keys(config.app.currencies);

function GeneralSetup() {
  const theme = useTheme();
  const { t } = useTranslation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const toast = useToast();

  const [section, setSection] = useState<'app' | 'preferences' | 'security'>('app');
  const [initialStatus, setInitialStatus] = useState<SetupStatus | null>(null);
  const [status, setStatus] = useState<SetupStatus>(defaultSetup);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = <K extends keyof SetupStatus>(
    key: K,
    value: SetupStatus[K]
  ) => {
    setStatus((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    (async () => {
      try {
        const response = await setupApi.load();
        const data = response.data;
        const merged: SetupStatus = {
          ...defaultSetup,
          ...data
        };
        setStatus(merged);
        setInitialStatus(merged);
        toast.success(t('Settings loaded'));
      } catch(error) {
        toast.error(t('Error loading settings: {{err}}', { err: getErrorMessage(error) }));
      }
    })();
  }, []);

  /* Dirty detection */
  const isDirty = useMemo(() => {
    if (!initialStatus) return false;
    return JSON.stringify(status) !== JSON.stringify(initialStatus);
  }, [status, initialStatus]);

  function diffObject<T extends object>(current: T, original: T): Partial<T> {
    const diff: Partial<T> = {};
    (Object.keys(current) as (keyof T)[]).forEach((key) => {
      if (current[key] !== original[key]) {
        diff[key] = current[key];
      }
    });
    return diff;
  }

  const getDiff = (): Partial<SetupStatus> => {
    if (!initialStatus) return {};
    return diffObject(status, initialStatus);
  };

  /* Auto save */
  useEffect(() => {
    if (!isDirty) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const diff = getDiff();
      if (!Object.keys(diff).length) return;

      setSaving(true);
      setSaveError(null); // reset previous error

      try {
        await setupApi.save(diff);
        // DO NOT update initialStatus
        // We keep original snapshot intact
      } catch {
        setSaveError('Failed to save');
        toast.error(t('Settings could not be saved'));
      } finally {
        setSaving(false);
      }
    }, (1/3) * 1000); // TODO: to config

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [status]);

  const handleReset = () => {
    if (!initialStatus) return;
    setStatus(initialStatus);
    toast.info(t('Settings have been reset'));
  };

  /* Sidebar content, reused for desktop and mobile drawer */
  const SidebarContent = (
    <List sx={{ width: 220 }}>
      {['app', 'preferences', 'security'].map((s) => (
        <ListItemButton
          key={s}
          selected={section === s}
          onClick={() => {
            setSection(s as any);
            setMobileDrawerOpen(false); // close drawer on mobile
          }}
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
          <ListItemText primary={t(s)} />
        </ListItemButton>
      ))}
    </List>
  );

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Mobile AppBar */}
      {isMobile && (
        <AppBar position="fixed" sx={{ top: 64, mb: 2 }}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={() => setMobileDrawerOpen(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div">
              {t('Settings')}
            </Typography>
            &emsp;
            <Typography variant="h6" noWrap component="div">
              {t(section)}
            </Typography>
          </Toolbar>
        </AppBar>
      )}

      {/* Drawer for mobile */}
      {isMobile && (
        <Drawer
          anchor="left"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          PaperProps={{ sx: { width: 240, pt: isMobile ? '112px' : '64px' } }}
        >
          {SidebarContent}
        </Drawer>
      )}

      {/* PageHeader only for desktop, mobile AppBar already shows title */}
      {!isMobile && <PageHeader title={t('Settings')} />}

      <Paper sx={{ p: 3, borderRadius: 1, mt: isMobile ? 8 : 0 }}>

        {saveError ? (
          <ErrorIcon color="error" />
        ) : saving ? (
          <AccessTimeIcon color="info" />
        ) : isDirty ? (
          <AccessTimeIcon color="warning" />
        ) : justSaved ? (
          <CheckCircleIcon color="success" />
        ) :
          <CheckCircleIcon sx={{ opacity: 0 }} />
        }

        <Box sx={{ display: "flex", mt: 3 }}>
          {/* Sidebar Desktop */}
          {!isMobile && SidebarContent}

          {/* Content */}
          <Box sx={{ flex: 1, p: 3 }}>
            {section === 'app' && (
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>{t('Currency')}</InputLabel>
                    <Select
                      value={status.currency}
                      label={t('Currency')}
                      onChange={(e) =>
                        handleChange('currency', e.target.value)
                      }
                    >
                      {currencies.map((c) => (
                        <MenuItem key={c} value={c}>
                          {c}
                        </MenuItem>
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
                    onChange={(e) =>
                      handleChange('timeout', Number(e.target.value))
                    }
                  />
                </Grid>
              </Grid>
            )}
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box display="flex" justifyContent="flex-end">
          <Button
            variant="outlined"
            disabled={!isDirty}
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
