import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  Container,
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  Stack,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Visibility, FilterList, Search, Close } from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

import Alert from './Alert';
import PageHeader from './PageHeader';
import useNavigate from '@/hooks/useNavigate';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/contexts/DialogContext';
import { bookingApi, userApi } from '@/services/api';
import { getErrorMessage } from '@ticketuno/shared/utils/misc';
import { BookingEnriched, BookingStatus } from '@ticketuno/shared/types/bookings';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

const STATUS_COLORS: Record<BookingStatus, 'success' | 'error' | 'warning' | 'default'> = {
  confirmed: 'success',
  canceled:  'error',
  refunded: 'warning',
  pending_payment: 'warning',
};

function formatDate(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BookingsListProps {
  mode?: 'all' | 'my';
}

interface FilterValues {
  status: string;
  eventTitle: string;
  userEmail: string;
  dateFrom: string;
  dateTo: string;
}

const DEFAULT_FILTERS: FilterValues = {
  status: '', // 'confirmed',
  eventTitle: '',
  userEmail: '',
  dateFrom: '',
  dateTo: '',
};

// ---------------------------------------------------------------------------
// Filter panel
// ---------------------------------------------------------------------------

interface FilterPanelProps {
  show: boolean;
  filters: FilterValues;
  onFilterChange: (f: FilterValues) => void;
}

const FilterPanel = memo(({ show, filters, onFilterChange }: FilterPanelProps) => {
  const { t } = useTranslation();
  const theme = useTheme();

  const set = (field: keyof FilterValues, value: string) =>
    onFilterChange({ ...filters, [field]: value });

  return (
    <Box
      sx={{
        display: show ? 'grid' : 'none',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fit, minmax(200px, 1fr))' },
        gap: 2,
        mb: 2,
        p: 2,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
      }}
    >
      <FormControl size="small" fullWidth>
        <InputLabel>{t('Status')}</InputLabel>
        <Select
          value={filters.status}
          label={t('Status')}
          onChange={(e) => set('status', e.target.value)}
        >
          <MenuItem value=""><i>{t('All')}</i></MenuItem>
          <MenuItem value="confirmed">{t('Confirmed')}</MenuItem>
          <MenuItem value="canceled">{t('Canceled')}</MenuItem>
          <MenuItem value="refunded">{t('Refunded')}</MenuItem>
        </Select>
      </FormControl>

      <TextField size="small" fullWidth label={t('Event')}
        value={filters.eventTitle}
        onChange={(e) => set('eventTitle', e.target.value)}
      />

      <TextField size="small" fullWidth label={t('User email')}
        value={filters.userEmail}
        onChange={(e) => set('userEmail', e.target.value)}
      />

      <TextField size="small" fullWidth label={t('Performance from')} type="date"
        value={filters.dateFrom}
        onChange={(e) => set('dateFrom', e.target.value)}
        InputLabelProps={{ shrink: true }}
      />

      <TextField size="small" fullWidth label={t('Performance to')} type="date"
        value={filters.dateTo}
        onChange={(e) => set('dateTo', e.target.value)}
        InputLabelProps={{ shrink: true }}
      />
    </Box>
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const BookingsList: React.FC<BookingsListProps> = ({ mode = 'all' }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { isAuthenticated, login } = useAuth();
  const showDialog = useDialog();
  const [searchParams] = useSearchParams();

  // ---------------------------------------------------------------------------
  // Auth / token-exchange state
  // ---------------------------------------------------------------------------

  const [authReady/*, setAuthReady*/] = useState(isAuthenticated);
  const [authError, setAuthError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Payment dialog state
  // ---------------------------------------------------------------------------

  const [paymentDialogShown, setPaymentDialogShown] = useState(false);

  // Check for payment parameters
  const paymentStatus = searchParams.get('payment');
  const sessionId = searchParams.get('session_id');

  // Show payment dialog if needed
  useEffect(() => {
    if (paymentDialogShown) return;
    if (!paymentStatus) return;

    const isSuccess = paymentStatus === 'success';
    const isCanceled = paymentStatus === 'canceled';

    if (!isSuccess && !isCanceled) return;

    // Determine dialog content
    const title = isSuccess 
      ? t('Payment Successful! 🎉')
      : t('Payment Cancelled');

    const content = isSuccess
      ? t('Your payment has been processed successfully. Your booking is now confirmed. You will receive a confirmation email shortly.')
      : t('Your payment was cancelled. You can try booking again or contact support if you need assistance.');

    const mode = isSuccess ? 'success' : 'warning';

    // Show the dialog
    setPaymentDialogShown(true);
    showDialog({
      title,
      content,
      confirmText: t('Ok'),
      mode,
      onConfirm: () => {
        // Clean up URL parameters
        const url = new URL(window.location.href);
        url.searchParams.delete('payment');
        url.searchParams.delete('session_id');
        window.history.replaceState({}, '', url.toString());
        // Reload bookings
        if (authReady && !authError) {
          loadBookings();
        }
      },
    });
  }, [paymentStatus, sessionId, showDialog, t, authReady, authError]);

  // ---------------------------------------------------------------------------
  // Auth handling
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (isAuthenticated) return;

    const pushToken = new URLSearchParams(window.location.search).get('token');

    if (!pushToken) {
      setAuthError(t('Session expired. Please log in again.'));
      return;
    }

    userApi
      .loginWithToken(pushToken)
      .then(({ data }) => login({ token: data.jwt }))
      .catch((err: unknown) => {
        setAuthError(t('The link has expired or is invalid. Please log in.'));
        console.error('[BookingsList] push token exchange failed:', getErrorMessage(err));
      });
  }, []);

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  const [bookings, setBookings] = useState<BookingEnriched[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    try {
      const response = (mode === 'my')
        ? await bookingApi.getMy()
        : await bookingApi.getAll();
      setBookings(response.data);
    } catch (err) {
      setBookings(null);
      setLoadError(getErrorMessage(err));
    }
  }, [mode]);

  useEffect(() => {
    if (authReady && !authError && !bookings) {
      loadBookings();
    }
  }, [authReady, authError, bookings, loadBookings]);

  // ---------------------------------------------------------------------------
  // Filters
  // ---------------------------------------------------------------------------

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterValues>(DEFAULT_FILTERS);
  const [quickFilterText, setQuickFilterText] = useState('');
  const debouncedSearch = useDebounce(quickFilterText, 300);

  const filteredRows = useMemo(() => {
    if (!bookings) return [];
    return bookings.filter((b) => {
      if (filters.status && b.status !== filters.status) return false;
      if (filters.eventTitle && !b.eventTitle.toLowerCase().includes(filters.eventTitle.toLowerCase())) return false;
      if (filters.userEmail && !b.userEmail.toLowerCase().includes(filters.userEmail.toLowerCase())) return false;
      if (filters.dateFrom && b.performanceDate < filters.dateFrom) return false;
      if (filters.dateTo && b.performanceDate > filters.dateTo) return false;
      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        return (
          b.bookingRef.toLowerCase().includes(q) ||
          b.eventTitle.toLowerCase().includes(q) ||
          `${b.userFirstName} ${b.userLastName}`.toLowerCase().includes(q) ||
          b.userEmail.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [bookings, filters, debouncedSearch]);

  const hasActiveFilters =
    filters.status !== 'confirmed' ||
    !!filters.eventTitle || !!filters.userEmail ||
    !!filters.dateFrom || !!filters.dateTo ||
    !!quickFilterText;

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
    setQuickFilterText('');
  }, []);

  // ---------------------------------------------------------------------------
  // Columns
  // ---------------------------------------------------------------------------

  const columns = useMemo((): GridColDef[] => (
    [
      {
        field: 'bookingRef',
        headerName: t('Ticket ref'),
        width: 130,
        renderCell: (p) => (
          <Box component="span" sx={{
            fontFamily: 'monospace', fontWeight: 700,
            fontSize: '0.8rem', letterSpacing: 0.5,
          }}>
            {p.value}
          </Box>
        ),
      },
      {
        field: 'userName',
        headerName: t('User'),
        width: isMobile ? 160 : undefined,
        flex: isMobile ? undefined : 1.4,
        valueGetter: (_v: unknown, row: BookingEnriched) =>
          `${row.userFirstName} ${row.userLastName}`,
      },
      {
        field: 'userEmail',
        headerName: t('Email'),
        width: isMobile ? 200 : undefined,
        flex: isMobile ? undefined : 1.6,
      },
      {
        field: 'eventTitle',
        headerName: t('Event'),
        width: isMobile ? 200 : undefined,
        flex: isMobile ? undefined : 1.6,
      },
      {
        field: 'performanceDate',
        headerName: t('Date'),
        width: 120,
        valueFormatter: (v: string) => formatDate(v),
      },
      {
        field: 'startTime',
        headerName: t('Time'),
        width: 65,
      },
      {
        field: 'totalPrice',
        headerName: t('Price'),
        width: 80,
        align: 'right',
        headerAlign: 'right',
        valueFormatter: (v: number) =>
          v != null ? v.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '',
      },
      {
        field: 'status',
        headerName: t('Status'),
        width: 115,
        renderCell: (p) => (
          <Chip
            label={t(p.value as string)}
            color={STATUS_COLORS[p.value as BookingStatus] ?? 'default'}
            size="small"
          />
        ),
      },
      {
        field: 'scannedAt',
        headerName: t('Scanned'),
        width: 85,
        align: 'center',
        headerAlign: 'center',
        renderCell: (p) =>
          p.value ? <Chip label={t('Yes')} color="info" size="small" /> : null,
      },
      {
        field: 'bookedAt',
        headerName: t('Booked'),
        width: 155,
        valueFormatter: (v: string) => formatDateTime(v),
      },
      {
        field: 'actions',
        headerName: '',
        width: 56,
        sortable: false,
        renderCell: (p) => (
          <IconButton
            size="small"
            onClick={() => navigate(`/bookings/edit/${p.row.id}`)}
            title={t('View ticket')}
          >
            <Visibility />
          </IconButton>
        ),
      },
    ] satisfies GridColDef[]
  ).filter((col) =>
    mode === 'my' ? !['userName', 'userEmail'].includes(col.field) : true,
  ), [t, isMobile, navigate, mode]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <PageHeader title={t('Bookings')} showAdd={false} />

      {authError && <Alert severity="error">{authError}</Alert>}
      {loadError && <Alert severity="error">{loadError}</Alert>}

      {!authError && !loadError && bookings?.length === 0 && (
        <Alert severity="info">{t('No bookings found')}</Alert>
      )}

      {authReady && !authError && (
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
            <TextField
              size="small"
              placeholder={t('Search by ref, event, user…')}
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
              sx={{ flex: 1, minWidth: 160 }}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1 }} />,
                endAdornment: quickFilterText ? (
                  <IconButton size="small" onClick={() => setQuickFilterText('')}>
                    <Close fontSize="small" />
                  </IconButton>
                ) : null,
              }}
            />

            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
              <Button
                variant={showFilters ? 'contained' : 'outlined'}
                startIcon={<FilterList />}
                onClick={() => setShowFilters((s) => !s)}
              >
                {t('Filter')}
              </Button>

              {hasActiveFilters && (
                <IconButton onClick={clearFilters} title={t('Clear filters')}>
                  <Close />
                </IconButton>
              )}
            </Stack>
          </Box>

          <FilterPanel
            show={showFilters}
            filters={filters}
            onFilterChange={setFilters}
          />

          <Box sx={{ width: '100%', overflowX: 'auto' }}>
            <Box sx={{ minWidth: 900 }}>
              <DataGrid
                rows={filteredRows}
                columns={columns}
                autoHeight
                disableRowSelectionOnClick
                initialState={{
                  pagination: { paginationModel: { pageSize: 25 } },
                  sorting: { sortModel: [{ field: 'bookedAt', sort: 'desc' }] },
                }}
                pageSizeOptions={[10, 25, 50, 100]}
              />
            </Box>
          </Box>
        </Stack>
      )}
    </Container>
  );
};

export default BookingsList;
