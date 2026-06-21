import React, { useState, useEffect, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
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
  //Typography,
  //Paper,
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
// import { /*DatePicker,*/LocalizationProvider } from '@mui/x-date-pickers';
// import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import Alert from './Alert';
import PageHeader from './PageHeader';
import EmailBulkDialog from './EmailBulkDialog';
import useNavigate from '@/hooks/useNavigate';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/contexts/DialogContext';
import { toast } from '@/contexts/ToastContext';
import { userApi } from '@/services/api';
import { getErrorMessage } from '@ticketuno/shared/utils/misc';
import { handleGuardResult } from '@/utils/guardHandler';
import { UserProfile } from '@ticketuno/shared/types/user';
import { GuardedDeleteResult } from '@ticketuno/shared/types/guard';
import { Role, assignableRoles, userCanManageAccount } from '@ticketuno/shared/utils/roles';

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
interface FilterValues {
  name: string;
  email: string;
  phone: string;
  role: string;
}

interface FilterPanelProps {
  show: boolean;
  filters: FilterValues;
  onFilterChange: (filters: FilterValues) => void;
  currentUserRole: Role | undefined;
}

const FilterPanel = memo(({ show, filters, onFilterChange, currentUserRole }: FilterPanelProps) => {
  const { t } = useTranslation();
  const theme = useTheme();

  const handleChange = (field: keyof FilterValues, value: string) => {
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
          <MenuItem value=""><i>{t('All')}</i></MenuItem>
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
  const { user: currentUser, loading } = useAuth();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    });

  const loadUsers = async () => {
    try {
      const response = await userApi.getAllUsers();
      setUsers(response.data);
    } catch (error) {
      setUsers(null);
      setError(getErrorMessage(error));
      //toast.error(getErrorMessage(error));
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

  const selectedCount = rowSelectionModel.ids.size;
  const hasActiveFilters =
    filters.name || filters.email || filters.phone || filters.role || quickFilterText;

  // Actions
  const handleEditUser = (params) => {
    const targetUser = params.row;
    if (!currentUser || !userCanManageAccount(currentUser.role, targetUser.role)) {
      toast.warning(t('Sorry, your user\'s role cannot edit this user, with role {{role}}', {role: targetUser.role}));
      return;
    }
    navigate(`/user/edit/${params.row.id}`);
  }

  const handleDeleteUser = (user: UserRow) => {
    showDialog({
      title: t('Delete user'),
      content: t('Are you sure to delete user "{{userName}}"?', { userName: user.name }),
      confirmText: t('Delete!'),
      onConfirm: async () => {
        try {
          const response = await userApi.delete(user.id);
          const bulk = response.data; // GuardedDeleteResultBulk

          // Normalize the single result (the only entry) into GuardedDeleteResult
          const result = Object.values(bulk.results)[0];
          const normalized: GuardedDeleteResult = {
            deleted: result.deleted,
            reason: result.reason,
            blockedBy: result.blockedBy,
          };

          const { success, wasBlocked } = await handleGuardResult(normalized, 'deleted', 'user', showDialog, toast, t);
          if (wasBlocked) {
             setNavigateTo('/bookings');
            return;
          }
          if (!success) return;
        } catch (error) {
          toast.error(getErrorMessage(error));
          return;
        }

        await loadUsers();
        toast.success(t('User deleted successfully'));
      },
      cancelText: t('Cancel'),
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
          //await Promise.all(selectedIds.map((id) => userApi.delete(id.toString())));
          const response = await userApi.delete(selectedIds.map(String));
          const bulk = response.data; // GuardedDeleteResultBulk
          // Flatten blocked bookings across all ids
          //const allBlockedBy = Object.values(bulk.results as GuardedDeleteResult[]).flatMap(r => r.blockedBy ?? []);
          const allBlockedBy = Object.values(bulk.results).flatMap(r => r.blockedBy ?? []);
            
          // Normalize into the shape handleGuardResult expects
          const responseDataNormalized: GuardedDeleteResult = {
            deleted: bulk.deleted > 0,
            //blocked: bulk.blocked,
            reason: bulk.blocked > 0 ? 'USER_HAS_ACTIVE_BOOKINGS' : undefined,
            blockedBy: allBlockedBy.length > 0 ? allBlockedBy : undefined,
          };
          const { success, wasBlocked } = await handleGuardResult(responseDataNormalized, 'deleted', 'user', showDialog, toast, t);
          if (wasBlocked) {
            setNavigateTo('/bookings');
            return;
          }
          if (!success) return;
        } catch (error) {
          toast.error(getErrorMessage(error));
          return;
        }

        // setUsers((prev) =>
        //   prev ? prev.filter((u) => !selectedIds.includes(u.id)) : null
        // );
        await loadUsers();

        setRowSelectionModel({
          type: 'include',
          ids: new Set(),
        });

        toast.success(t('User deleted successfully'));
      },
      cancelText: t('Cancel'),
    });
  };

  const handleBulkEmail = () => {
    const selectedIds = Array.from(rowSelectionModel.ids);
    if (!selectedIds.length) return;

    const selectedUsers = users!
    .filter((u) => selectedIds.includes(u.id))
      .map((u) => ({ id: u.id, name: u.firstName ?? '', surname: u.lastName ?? '', email: u.email }))
    ;
    
    showDialog({
      title: 'Send bulk email',
      content: (close) => (
        <EmailBulkDialog
          recipients={selectedUsers}
          onClose={close}
        />
      ),
      //cancelText: t('Cancel'),
      showCloseIcon: true,
      paperSx: { maxWidth: { xs: '90vw', sm: 720 } },
    });
  };
  
  //
  // Bulk action buttons — defined once, shared between xs and sm+ renderings
  //
  const bulkActions: React.ReactNode[] = [
    <Button variant="contained" key="delete" color="error" onClick={handleBulkDelete} startIcon={<DeleteSweep />}>
      {t('Delete selected')}
    </Button>,
    <Button variant="contained" key="email" color="info" onClick={handleBulkEmail} startIcon={<Email />} >
      {t('Send email')}
    </Button>,
  ];

  // // Group into pairs for sm+ (2 per row)
  // const bulkActionPairs: React.ReactNode[][] = [];
  // for (let i = 0; i < bulkActions.length; i += 2) {
  //   bulkActionPairs.push(bulkActions.slice(i, i + 2));
  // }

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
          <IconButton onClick={() => handleEditUser(params)}>
            <Edit />
          </IconButton>
          <IconButton color="error" onClick={() => handleDeleteUser(params.row)}>
            <Delete />
          </IconButton>
        </>
      ),
    },
  ];

  return (
    // <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <PageHeader
          title={t('Users')}
          //showAdd={false}
        />
      
        {error && (
          <Alert severity="error">
            {error}
          </Alert>
        )}

        {!loading && !error && (!users || users.length === 0) && (
          <Alert severity="info">{t('No users available')}</Alert>
        )}

        <Stack spacing={2}>

          {/*
            * Control bar — single flex-wrap container so items can flow
            * naturally across one or two rows depending on available space.
            *
            * Layout on xs:
            *   [Search (flex, min-width)] [Filter+Clear] [Bulk (ml:auto)]
            *   Bulk buttons share the first row with Search+Filter; Search
            *   shrinks to minWidth to make room. If Bulk still doesn't fit,
            *   the flex container wraps them to a second row (still right-
            *   aligned via ml:auto).
            *
            * Layout on sm+:
            *   [Search (flex)] [Filter+Clear]
            *   [Bulk buttons — 2 per row] ← forced to new row via width:100%
            */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>

            {/* 1 ─ Search */}
            <TextField
              size="small"
              placeholder={t('Search...')}
              value={quickFilterText}
              onChange={(e) => setQuickFilterText(e.target.value)}
              sx={{ flex: 1, minWidth: 100 }}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1 }} />,
                endAdornment: quickFilterText ? (
                  <IconButton size="small" onClick={() => setQuickFilterText('')}>
                    <Close fontSize="small" />
                  </IconButton>
                ) : null,
              }}
            />

            {/* 2 ─ Filter toggle + clear-all */}
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
              <Button
                variant={showFilters ? 'contained' : 'outlined'}
                startIcon={<FilterList />}
                onClick={() => setShowFilters((s) => !s)}
              >
                {t('Filter')}
              </Button>

              {hasActiveFilters && (
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

            {/* 3 ─ Bulk actions */}
            {selectedCount > 0 && (
              /*
                * Single row, pushed right with ml:auto — works on both xs and sm+.
                * Stays on the same line as Search + Filter since there are only 2 buttons.
                *
                * If bulk buttons grow beyond ~3-4, restore the sm+ multi-row layout:
                *
                * xs (inside same flex-wrap container as Search+Filter):
                *   <Stack direction="row" spacing={1} sx={{ display: { xs: 'flex', sm: 'none' }, ml: 'auto', flexShrink: 0 }}>
                *     {bulkActions}
                *   </Stack>
                *
                * sm+ (forced onto its own row via width:'100%', buttons 2 per row):
                *   <Box sx={{ display: { xs: 'none', sm: 'flex' }, flexDirection: 'column', gap: 1, width: '100%' }}>
                *     {bulkActionPairs.map((pair, i) => (
                *       <Stack key={i} direction="row" spacing={1}>{pair}</Stack>
                *     ))}
                *   </Box>
                */
              <Stack direction="row" spacing={1} sx={{ ml: 'auto', f_lexShrink: 0 }}>
                {bulkActions}
              </Stack>
            )}
          </Box>

          {/* Filter Panel */}
          <FilterPanel
            show={showFilters}
            filters={filters}
            onFilterChange={setFilters}
            currentUserRole={currentUser?.role}
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
      </Container>
    // </LocalizationProvider>
  );
};

export default UsersList;
