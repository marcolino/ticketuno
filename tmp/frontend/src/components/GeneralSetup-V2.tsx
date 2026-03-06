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
  Alert,
  Button,
  List,
  ListItemButton,
  ListItemText,
  useMediaQuery,
  Drawer,
  IconButton,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import { useToast } from '@/contexts/ToastContext';
import { setupApi } from '@/services/api';
import PageHeader from "./PageHeader";
import { getErrorMessage } from '@/utils/misc';
import { SetupStatus } from '@/shared/types/generalSetup';
import config from '@/shared/config';

const defaultSetup: SetupStatus = { // TODO: from config...
  currency: 'EUR',
  timeout: 10,
  enableNotifications: true,
  launchDate: null,
  time: null,
  apiKey: ''
};

//const currencies = ['EUR', 'USD', 'GBP', 'JPY']; // TODO: from config...
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mobile drawer state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

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

  /* Auto save (1s) */
  useEffect(() => {
    if (!isDirty) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const diff = getDiff();
      if (!Object.keys(diff).length) return;

      setSaving(true);
      const previous = initialStatus;

      // optimistic
      setInitialStatus(status);

      try {
        await setupApi.save(diff);
        toast.success(t('settings.auto_saved'));
      } catch {
        // rollback
        if (previous) {
          setStatus(previous);
          setInitialStatus(previous);
        }
        toast.error(t('settings.rollback'));
      } finally {
        setSaving(false);
      }
    }, 1000); // TODO: 1 to config

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [status]);

  const handleReset = () => {
    if (!initialStatus) return;
    setStatus(initialStatus);
    toast.warning(t('settings.reset'));
  };

  /* Sidebar content */
  const SidebarContent = (
    <List sx={{ width: isMobile ? 240 : 220, borderRight: isMobile ? undefined : `1px solid ${theme.palette.divider}` }}>
      {['app', 'preferences', 'security'].map((s) => (
        <ListItemButton
          key={s}
          selected={section === s}
          onClick={() => {
            setSection(s as 'app' | 'preferences' | 'security');
            if (isMobile) setMobileDrawerOpen(false); // close drawer on mobile after click
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
      <PageHeader title={t('Settings')} />

      {isMobile && (
        <IconButton
          onClick={() => setMobileDrawerOpen(true)}
          sx={{ mb: 2 }}
        >
          <MenuIcon />
        </IconButton>
      )}

      <Drawer
        anchor="left"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 240,
            pt: '80px', // Adjust for topbar height
          },
        }}
      >
        {SidebarContent}
      </Drawer>


      <Paper sx={{ p: 3, borderRadius: 1 }}>
        {saving && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {t('Saving settings...')}
          </Alert>
        )}

        {isDirty && !saving && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {t('Settings are not saved')}
          </Alert>
        )}

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
