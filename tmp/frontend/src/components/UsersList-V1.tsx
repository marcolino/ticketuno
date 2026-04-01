import React, { useState, useEffect, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  //Typography,
  Paper,
  Stack,
  //CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Edit,
  Delete,
  FilterList,
  Email,
  DeleteSweep,
  Search,
  Close,
} from '@mui/icons-material';
import { GridRowSelectionModel, DataGrid, GridColDef } from '@mui/x-data-grid';
import { /*DatePicker,*/LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import useNavigate from '@/hooks/useNavigate';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/contexts/DialogContext';
import { toast } from '@/contexts/ToastContext';
import { userApi } from '@/services/api';
import { getErrorMessage } from '@/utils/misc';
import { handleGuardResult } from '@/utils/guardHandler';
import { UserProfile } from '@/shared/types/user';
import { Role, assignableRoles } from '@/shared/utils/roles';

type UserRow = UserProfile & { name: string };

const getFullName = (user: UserProfile) =>
  `${user.firstName} ${user.lastName}`.trim();

// Debounce hook
function useDebounce<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

//
// Filter Panel
//
const FilterPanel = memo(({ show, filters, onFilterChange, currentUserRole }: any) => {
  const { t } = useTranslation();
  const theme = useTheme();

  const handleChange = (field: string, value: any) => {
    onFilterChange({ ...filters, [field]: value });
  };

  return (
    <Box
      sx={{
        display: show ? 'grid' : 'none',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(auto-fit, minmax(220px, 1fr))',
        },
        gap: 2,
        mb: 2,
        p: 2,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
      }}
    >
      <TextField
        label={t('Name')}
        value={filters.name}
        onChange={(e) => handleChange('name', e.target.value)}
        size="small"
        fullWidth
        sx={{ gridColumn: { xs: '1 / -1', sm: 'auto' } }}
      />

      <TextField
        label={t('Email')}
        value={filters.email}
        onChange={(e) => handleChange('email', e.target.value)}
        size="small"
        fullWidth
      />

      <TextField
        label={t('Phone')}
        value={filters.phone}
        onChange={(e) => handleChange('phone', e.target.value)}
        size="small"
        fullWidth
      />

      <FormControl size="small" fullWidth>
        <InputLabel>{t('Role')}</InputLabel>
        <Select
          value={filters.role}
          label={t('Role')}
          onChange={(e) => handleChange('role', e.target.value)}
        >
          <MenuItem value="">{t('All')}</MenuItem>
          {assignableRoles(currentUserRole || 'admin').map((role: Role) => (
            <MenuItem key={role} value={role}>
              {t(role)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
});

//
// Main Component
//
const UsersList: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const showDialog = useDialog();
  const { user: currentUser } = useAuth();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [users, setUsers] = useState<UserProfile[] | null>(null);
  //const [loading, setLoading] = useState(true);
  //const [error, setError] = useState<string | null>(null);

  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
  });

  const [quickFilterText, setQuickFilterText] = useState('');
  const debouncedSearch = useDebounce(quickFilterText, 300);

  const [navigateTo, setNavigateTo] = useState<string | null>(null);
  
  //const [selectionModel, setSelectionModel] = useState<string[]>([]);
  const [rowSelectionModel, setRowSelectionModel] =
    useState<GridRowSelectionModel>({
      type: 'include',
      ids: new Set(),
    })
  ;

  // // Fetch users
  // useEffect(() => {
  //   (async () => {
  //     try {
  //       const res = await userApi.getAllUsers();
  //       setUsers(res.data);
  //     } catch {
  //       setError(t('Failed to load users'));
  //       toast.error(t('Failed to load users'));
  //     } finally {
  //       setLoading(false);
  //     }
  //   })();
  // }, [t]);

  const loadUsers = async () => {
    try {
      // setLoading(true);
      const response = await userApi.getAllUsers();
      setUsers(response.data);
    } catch (error) {
      setUsers(null);
      // setError(err.response?.data?.error);
      toast.error(getErrorMessage(error));
    }
  };

  useEffect(() => {
    if (!users) {
      loadUsers();
    }
  }, [users]);


  useEffect(() => {
    if (navigateTo) {
      navigate(navigateTo);
      setNavigateTo(null);
    }
  }, [navigateTo]);

  //
  // rows
  //
  const rows: UserRow[] = useMemo(
    () => {
      if (!users) return [];
      return users.map((u) => ({
        ...u,
        name: getFullName(u),
      }));
    },
    [users]
  );

  // Filtering
  const filteredUsers = useMemo(() => {
    return rows.filter((user) => {
      if (filters.name && !user.name.toLowerCase().includes(filters.name.toLowerCase()))
        return false;

      if (filters.email && !user.email.toLowerCase().includes(filters.email.toLowerCase()))
        return false;

      if (filters.phone && !(user.phone || '').toLowerCase().includes(filters.phone.toLowerCase()))
        return false;

      if (filters.role && user.role !== filters.role) return false;

      if (debouncedSearch) {
        const q = debouncedSearch.toLowerCase();
        return (
          user.name.toLowerCase().includes(q) ||
          user.email.toLowerCase().includes(q) ||
          (user.phone || '').toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [rows, filters, debouncedSearch]);

  //const selectedCount = selectionModel.length;
  const selectedCount = rowSelectionModel.ids.size;

  // Actions
  const handleDeleteUser = (id: string) => {
    showDialog({
      title: t('Delete user'),
      content: t('Are you sure?'),
      // onConfirm: async () => {
      //   await userApi.deleteUser(id);
      //   setUsers((prev) => prev.filter((u) => u.id !== id));
      //   toast.success(t('Deleted'));
      // },
      onConfirm: async () => {
        const response = await userApi.delete(id);
        const { success, wasBlocked } = await handleGuardResult(response.data, 'deleted', showDialog, toast, t);
        if (wasBlocked) {
          setNavigateTo('/users');
          return;
        }
        if (!success) return;
        // success path continues here
        toast.success(t('User deleted successfully'));
        await loadUsers();
      }
    });
  };

  const handleBulkDelete = () => {
    const selectedIds = Array.from(rowSelectionModel.ids);
    if (!selectedIds.length) return;

    showDialog({
      title: t('Delete selected users'),
      content: t('Delete {{count}} users?', { count: selectedIds.length }),
      confirmText: t('Delete!'),
      onConfirm: async () => {
        const selectedIds = Array.from(rowSelectionModel.ids);

        try {
          await Promise.all(selectedIds.map((id) => userApi.delete(id.toString())));
        } catch (error) {
          toast.error(getErrorMessage(error));
          return;
        }

        setUsers((prev) =>
          prev ? prev.filter((u) => !selectedIds.includes(u.id)) : null
        );

        // clear selection
        setRowSelectionModel({
          type: 'include',
          ids: new Set(),
        });

        toast.success(t('Deleted'));
      },
      cancelText: t('Cancel'),
    });
  };

  //
  // columns
  //
  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: t('Name'),
      width: isMobile ? 180 : undefined,
      flex: isMobile ? undefined : 1.5,
    },
    {
      field: 'email',
      headerName: t('Email'),
      width: isMobile ? 220 : undefined,
      flex: isMobile ? undefined : 2,
    },
    {
      field: 'phone',
      headerName: t('Phone'),
      width: isMobile ? 150 : undefined,
      flex: isMobile ? undefined : 1,
    },
    {
      field: 'role',
      headerName: t('Role'),
      width: isMobile ? 130 : undefined,
      flex: isMobile ? undefined : 1,
    },
    {
      field: 'actions',
      headerName: t('Actions'),
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <>
          <IconButton onClick={() => navigate(`/profile/${params.row.id}`)}>
            <Edit />
          </IconButton>
          <IconButton color="error" onClick={() => handleDeleteUser(params.row.id)}>
            <Delete />
          </IconButton>
        </>
      ),
    },
  ];

  //
  // bulk actions
  //
  const BulkActions = ({ count }: { count: number }) => {
    if (count === 0) return null;

    return (
      <Stack direction="row" spacing={1}>
        <Button
          color="error"
          onClick={handleBulkDelete}
          startIcon={<DeleteSweep />}
        >
          {t('Delete selected')}
        </Button>
        <Button startIcon={<Email />}>
          {t('Send email')}
        </Button>
      </Stack>
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box p={2}>
        <Paper sx={{ p: 2 }}>
          <Stack spacing={2}>
            {/* Top bar */}
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={1}>
                <Button
                  variant={showFilters ? 'contained' : 'outlined'}
                  startIcon={<FilterList />}
                  onClick={() => setShowFilters((s) => !s)}
                >
                  {t('Filter')}
                </Button>

                {(filters.name || filters.email || filters.phone || filters.role || quickFilterText) && (
                  <IconButton
                    onClick={() => {
                      setFilters({ name: '', email: '', phone: '', role: '' });
                      setQuickFilterText('');
                    }}
                  >
                    <Close />
                  </IconButton>
                )}
              </Stack>

              <BulkActions count={selectedCount} />
            </Stack>

            {/* Filters */}
            <FilterPanel
              show={showFilters}
              filters={filters}
              onFilterChange={setFilters}
              currentUserRole={currentUser?.role}
            />

            {/* Search */}
            <TextField
              size="small"
              placeholder={t('Search...')}
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: <Search sx={{ mr: 1 }} />,
                endAdornment: quickFilterText && (
                  <IconButton size="small" onClick={() => setQuickFilterText('')}>
                    <Close fontSize="small" />
                  </IconButton>
                ),
              }}
            />

            {/* Grid */}
            <Box sx={{ width: '100%', overflowX: 'auto' }}>
              <Box sx={{ minWidth: 700 }}>
                <DataGrid
                  rows={filteredUsers}
                  columns={columns}
                  checkboxSelection
                  rowSelectionModel={rowSelectionModel}
                  onRowSelectionModelChange={(newModel) => {
                    setRowSelectionModel(newModel);
                  }}
                  autoHeight
                  disableRowSelectionOnClick
                />
              </Box>
            </Box>
          </Stack>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
};

export default UsersList;
