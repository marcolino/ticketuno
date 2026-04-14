import React, { useState, useEffect, useRef } from 'react';
import { useParams, useBlocker } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import {
  Container,
  Paper,
  TextField,
  Button,
  Box,
  //Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  //IconButton,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Cancel,
  Save,
  AccountBox,
} from '@mui/icons-material';
import useNavigate from '@/hooks/useNavigate';
import PhoneInput from '@/components/PhoneInput';
import Title from '@/components/Title';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/contexts/DialogContext';
import { toast } from '@/contexts/ToastContext';
import { userApi } from '@/services/api';
import { getErrorMessage } from '@/shared/utils/misc';
import { UserProfile } from '@/shared/types/user';
import {
  userCanManageAccount,
  userCanSetRole,
  assignableRoles,
  Role,
} from '@/shared/utils/roles';
import config from '@/shared/config';

type ProfileFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: Role;
};

const Profile: React.FC/*<ProfileProps>*/ = () => {
  const { id: userId } = useParams<{ id: string }>();
  const { user: currentUser, updateUser, isAuthenticated } = useAuth();
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const { t } = useTranslation();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm')); // true for xs
  const showDialog = useDialog();

  const navigate = useNavigate();
  //const [error, setError] = useState('');
  //const [success, setSuccess] = useState('');

  const isSelf = !userId || userId === currentUser?.id;

  // Can the current user even open this profile for role editing?
  const canEditRoles =
    //!isSelf &&
    !!currentUser &&
    !!targetUser &&
    userCanManageAccount(currentUser.role, targetUser.role)
  ;
  
  // Only the roles the current user is allowed to assign
  //const roleOptions = currentUser ? assignableRoles(currentUser.role) : [];
  const roleOptions = currentUser ? assignableRoles(currentUser.role).reverse() : [];

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    formState: { isDirty, isSubmitting },
  } = useForm<ProfileFormValues>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'user',
    },
  });

  // Ref-based escape hatch for intentional navigations (save, cancel).
  // isDirty is still true when navigate() fires synchronously after save;
  // the ref is read immediately by the blocker condition, bypassing the render cycle.
  const skipBlocker = useRef(false);

  // --- Navigation blocker: prompt on unsaved changes ---
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !skipBlocker.current &&
      isDirty &&
      currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    (async () => {
      const confirmed = await showDialog({
        title: t('Unsaved changes'),
        content: t('You have unsaved changes. Leave anyway?'),
        confirmText: t('Leave'),
        cancelText: t('Stay'),
        mode: 'warning',
      });
      if (confirmed) {
        blocker.proceed();
      } else {
        blocker.reset();
      }
    })();
  }, [blocker.state]);

  // Handles browser tab close / hard refresh — cases useBlocker cannot intercept
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(-1);
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const load = async () => {
      if (isSelf) {
        // Use auth context directly, no fetch needed
        if (currentUser) {
          setTargetUser(currentUser as UserProfile);
          reset({
            firstName: currentUser.firstName,
            lastName: currentUser.lastName,
            email: currentUser.email,
            phone: currentUser.phone ?? '',
            role: currentUser.role as Role,
          });
        }
      } else {
        if (userId) { // Only fetch if userId is a real value
          // Fetch the other user's profile
          const response = await userApi.getProfile(userId);
          const profile: UserProfile = response.data;
          setTargetUser(profile);
          reset({
            firstName: profile.firstName,
            lastName: profile.lastName,
            email: profile.email,
            phone: profile.phone ?? '',
            role: profile.role as Role,
          });
        }
      }
    };
    load();
  }, [userId, currentUser, isSelf]);

  // useEffect(() => {
  //   (async () => {
  //     if (isSelf) {
  //       // No userId prop (or it's the same user) — use currentUser directly
  //       setTargetUser(currentUser);
  //       setFirstName(currentUser!.firstName);
  //       setLastName(currentUser!.lastName);
  //       setEmail(currentUser!.email);
  //       setPhone(currentUser!.phone ?? '');
  //       setRole(currentUser!.role as Role);
  //     } else {
  //       // Admin/operator editing someone else's profile
  //       const response = await userApi.getProfile(userId);
  //       const profile: UserProfile = response.data;
  //       setTargetUser(profile);
  //       setFirstName(profile.firstName);
  //       setLastName(profile.lastName);
  //       setEmail(profile.email);
  //       setPhone(profile.phone ?? '');
  //       setRole(profile.role as Role);
  //     }
  //   })();
  // }, [userId, currentUser, isSelf]);
  
  const handleCancel = async () => {
    toast.success(t('Profile updated successfully'));
    skipBlocker.current = true;
    navigate(-1);
  }

  // handleSaveWithWarning gates handleSave: if the user is stepping their own role
  // down, it shows a confirmation dialog first, then calls handleSave on confirm.
  const handleSaveWithWarning = () => {
    const currentRole = getValues('role');
    if (isSelf && targetUser && targetUser.role !== currentRole) {
      showDialog({
        title: t('Stepping role down'),
        content: t('You are about to step your role down.\nProbably you will not be anymore able to step up anymore.'),
        onConfirm: handleSave,
        cancelText: 'Cancel',
        confirmText: 'Confirm',
        shrinkToContent: true,
      });
    } else {
      handleSave();
    }
  };

  const handleSave = handleSubmit(async (data) => {
    if (!currentUser || !targetUser) return;
    try {
      const updates: Partial<UserProfile> = {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      };
      if (data.email !== targetUser.email) {
        updates.email = data.email;
      }
      if (canEditRoles && data.role !== targetUser.role) {
        if (userCanSetRole(currentUser.role, targetUser.role, data.role)) {
          updates.role = data.role;
        }
      }

      
      //const response = await userApi.updateProfile(userId || currentUser?.id, updates);
      const response = await userApi.updateProfile(isSelf ? currentUser?.id : userId, updates);

      // Only update auth context when editing yourself
      if (isSelf) {
        updateUser(response.data);
      }
      
      toast.success(t('Profile updated successfully'));
      skipBlocker.current = true;
      navigate(-1);
    } catch (error) {
      toast.error(t('Failed to update profile: {{err}}', { err: getErrorMessage(error) }));
    }
  });

  return (
    <Container
      maxWidth="sm"
      sx={{
        mx: 'auto',
        mt: 4, mb: 4,
      }}
    >
      <Paper elevation={3} sx={{
        p: 4,
        mx: { xs: 0, sm: 10 },
      }}>
        <Title icon={<AccountBox />}>
          {t('Profile')}
        </Title>

        {/* {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )} */}

        <Box sx={{ mt: 3 }}>
          <Controller
            name="firstName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label={t('First name')}
                sx={{ mb: 2 }}
              />
            )}
          />
          <Controller
            name="lastName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label={t('Last name')}
                sx={{ mb: 2 }}
              />
            )}
          />
         <Controller
            name="firstName"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label={t('Email')}
                type="email"
                sx={{ mb: 2 }}
              />
            )}
          />
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <PhoneInput
                label={t('Phone number')}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                defaultCountry={config.app.defaultLanguage}
                sx={{ mb: 2 }}
              />
            )}
          />

          {canEditRoles && roleOptions.length > 0 && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>{t('Role')}</InputLabel>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    label={t('Role')}
                    onChange={(e) => field.onChange(e.target.value as Role)}
                  >
                    {roleOptions.map(r => (
                      <MenuItem key={r} value={r}>
                        {/* {t(r.charAt(0).toUpperCase() + r.slice(1))} */}
                        {t(r)}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
            </FormControl>
          )}

          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Cancel />}
              onClick={handleCancel}
              size={isXs ? "small" : "medium"}
              sx={isXs ? { px: 1 } : {}}
            >
              {t('Cancel')}
            </Button>
            <Button
              fullWidth
              variant="contained"
              startIcon={<Save />}
              onClick={handleSaveWithWarning}
              disabled={isSubmitting}
              size={isXs ? "small" : "medium"}
              sx={isXs ? { px: 1 } : {}}
            >
              {isSubmitting ? t('Saving...') : t('Save Changes')}
            </Button>
          </Box>
          
        </Box>
      </Paper>
    </Container>
  );
};

export default Profile;
