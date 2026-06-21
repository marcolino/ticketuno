import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Container,
  Paper,
  TextField,
  Button,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Cancel,
  Save,
  AccountBox,
  LockOpen,
} from '@mui/icons-material';

import useNavigate from '@/hooks/useNavigate';
import PhoneInput from '@/components/PhoneInput';
import Title from '@/components/Title';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/contexts/DialogContext';
import { toast } from '@/contexts/ToastContext';
import { useConsent } from '@/contexts/ConsentContext';
import { userApi } from '@/services/api';
import { getErrorMessage } from '@ticketuno/shared/utils/misc';
import { UserProfile } from '@ticketuno/shared/types/user';
import {
  userCanManageAccount,
  userCanSetRole,
  assignableRoles,
  Role,
} from '@ticketuno/shared/utils/roles';
import { sharedConfig as config } from '@ticketuno/shared';

import equal from 'fast-deep-equal';
import useUnsavedChanges from '@/hooks/useUnsavedChanges';

const UserEdit: React.FC = () => {
  const { id: userId } = useParams<{ id: string }>();
  const { user: currentUser, updateUser, isAuthenticated, loading } = useAuth();
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const { t } = useTranslation();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm'));
  const showDialog = useDialog();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('user');

  const isSelf = !userId || userId === currentUser?.id;

  const { openConsentDialog } = useConsent();

  const canEditRoles =
    !!currentUser &&
    !!targetUser &&
    userCanManageAccount(currentUser.role, targetUser.role);

  const roleOptions = currentUser
    ? assignableRoles(currentUser.role).reverse()
    : [];

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(-1);
    }
  }, [isAuthenticated, navigate]);

  // -----------------------------
  // SNAPSHOT + DIRTY STATE
  // -----------------------------
  const currentSnapshot = useMemo(
    () => ({
      firstName,
      lastName,
      email,
      phone,
      role,
    }),
    [firstName, lastName, email, phone, role]
  );

  const [initialSnapshot, setInitialSnapshot] = useState<any>(null);

  const isDirty = useMemo(() => {
    if (!initialSnapshot) return false;
    return !equal(initialSnapshot, currentSnapshot);
  }, [initialSnapshot, currentSnapshot]);

  const { blocker } = useUnsavedChanges(isDirty, async () => {
    return await showDialog({
      title: t('Unsaved changes'),
      content: t('You have unsaved changes. Leave anyway?'),
      confirmText: t('Leave'),
      cancelText: t('Stay'),
      mode: 'warning',
    });
  });

  // -----------------------------
  // LOAD USER
  // -----------------------------
  useEffect(() => {
    (async () => {
      if (isSelf) {
        if (currentUser) {
          const data = {
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
            email: currentUser.email,
            phone: currentUser.phone ?? '',
            role: currentUser.role as Role,
          };

          setTargetUser(currentUser as UserProfile);
          setFirstName(data.firstName);
          setLastName(data.lastName);
          setEmail(data.email);
          setPhone(data.phone);
          setRole(data.role);

          setInitialSnapshot(data);
        }
      } else if (userId) {
        const response = await userApi.getProfile(userId);
        const profile: UserProfile = response.data;

        const data = {
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          phone: profile.phone ?? '',
          role: profile.role as Role,
        };

        setTargetUser(profile);
        setFirstName(data.firstName);
        setLastName(data.lastName);
        setEmail(data.email);
        setPhone(data.phone);
        setRole(data.role);

        setInitialSnapshot(data);
      }
    })();
  }, [userId, currentUser, isSelf]);

  const handleShowConsents = async () => {
    openConsentDialog();
  };

  // -----------------------------
  // CANCEL
  // -----------------------------
  const handleCancel = async () => {
    navigate(-1);
  };

  // -----------------------------
  // SAVE
  // -----------------------------
  const handleSave = async () => {
    if (!currentUser || !targetUser) return;

    try {
      const updates: Partial<UserProfile> = {
        firstName,
        lastName,
        phone,
      };

      if (email !== targetUser.email) {
        updates.email = email;
      }

      if (canEditRoles && role !== targetUser.role) {
        if (userCanSetRole(currentUser.role, targetUser.role, role)) {
          updates.role = role;
        }
      }

      const response = await userApi.updateProfile(
        isSelf ? currentUser?.id : userId,
        updates
      );

      if (isSelf) {
        updateUser(response.data);
      }

      toast.success(t('Profile updated successfully'));

      setInitialSnapshot(currentSnapshot);

      if (blocker?.reset) blocker.reset();

      navigate(-1);
    } catch (error) {
      toast.error(
        t('Failed to update profile: {{err}}', {
          err: getErrorMessage(error),
        })
      );
    }
  };

  // -----------------------------
  // RENDER
  // -----------------------------
  return (
    <Container
      maxWidth="sm"
      sx={{
        mx: 'auto',
        mt: 4,
        mb: 4,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: isXs ? 2 : 4,
          mx: { xs: 0, sm: 10 },
        }}
      >
        <Title icon={<AccountBox />}>
          {t('Profile')}
        </Title>

        <Box sx={{ mt: 3 }}>
          <TextField
            fullWidth
            label={t('First Name')}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label={t('Last Name')}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            fullWidth
            label={t('Email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
          />

          <PhoneInput
            label={t('Phone number')}
            value={phone}
            onChange={setPhone}
            onBlur={(e) => setPhone(e.target.value)}
            defaultCountry={config.app.defaultLanguage}
            sx={{ mb: 2 }}
          />

          {canEditRoles && roleOptions.length > 0 && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>{t('Role')}</InputLabel>
              <Select
                value={role}
                label={t('Role')}
                onChange={(e) => setRole(e.target.value as Role)}
              >
                {roleOptions.map((r) => (
                  <MenuItem key={r} value={r}>
                    {t(r)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Button
            fullWidth
            variant="contained"
            startIcon={<LockOpen />}
            onClick={handleShowConsents}
            size={isXs ? 'small' : 'medium'}
            sx={{ mb: 2, ...(isXs ? { px: 1 } : {})}}
          >
            {t('Show Consents')}
          </Button>

          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Cancel />}
              onClick={handleCancel}
              size={isXs ? 'small' : 'medium'}
              sx={isXs ? { px: 1 } : {}}
            >
              {t('Cancel')}
            </Button>

            <Button
              fullWidth
              variant="contained"
              startIcon={<Save />}
              onClick={handleSave}
              disabled={loading}
              size={isXs ? 'small' : 'medium'}
              sx={isXs ? { px: 1 } : {}}
            >
              {loading ? t('Saving...') : (isXs ? t('Save') : t('Save Changes'))}
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default UserEdit;
