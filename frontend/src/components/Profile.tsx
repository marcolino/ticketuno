import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import Title from '@/components/Title';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';
import { toast } from '@/contexts/ToastContext';
import { userApi } from '@/services/api';
import { UserProfile } from '@/shared/types/user';
import {
  userCanManageAccount,
  userCanSetRole,
  assignableRoles,
  Role,
} from '@/shared/utils/roles';

interface ProfileProps {
  userId?: string; // undefined = editing self
}

const Profile: React.FC<ProfileProps> = ({ userId }) => {
  //const { user, updateUser, isAdmin, isAuthenticated } = useAuth();
  const { user: currentUser, updateUser, /*isAdmin, */isAuthenticated } = useAuth();
  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const { t } = useTranslation();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm')); // true for xs
  const showDialog = useDialog();

  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('user');
  //const [error, setError] = useState('');
  //const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

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
          setFirstName(currentUser.firstName);
          setLastName(currentUser.lastName);
          setEmail(currentUser.email);
          setPhone(currentUser.phone ?? '');
          setRole(currentUser.role as Role);
        }
      } else {
        if (userId) { // Only fetch if userId is a real value
          // Fetch the other user's profile
          const response = await userApi.getProfile(userId);
          const profile: UserProfile = response.data;
          setTargetUser(profile);
          setFirstName(profile.firstName);
          setLastName(profile.lastName);
          setEmail(profile.email);
          setPhone(profile.phone ?? '');
          setRole(profile.role as Role);
        }
      }
    };
    load();
  }, [userId, currentUser, isSelf]);

  // useEffect(() => {
  //   if (currentUser) {
  //     setTargetUser(currentUser as UserProfile);
  //     setFirstName(currentUser.firstName);
  //     setLastName(currentUser.lastName);
  //     setEmail(currentUser.email);
  //     setPhone(currentUser.phone || '');
  //     setRole(currentUser.role);
  //   }
  // }, [currentUser, isAuthenticated, navigate]);

  const handleCancel = async () => {
    toast.success(t('Profile updated successfully'));
    navigate(-1);
  }

  const handleSaveWithWarning = async () => {
    if (isSelf && currentUser && currentUser.role !== role) {
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

  const handleSave = async () => {
    if (!currentUser || !targetUser) return;
    try {
      setLoading(true);
      const updates: Partial<UserProfile> = {
        firstName,
        lastName,
        email,
        phone,
      };
      if (canEditRoles && role !== targetUser.role) {
        if (userCanSetRole(currentUser.role, targetUser.role, role)) {
          updates.role = role;
        }
      }

      //const response = await userApi.updateProfile(userId || currentUser?.id, updates);
      const response = await userApi.updateProfile(isSelf ? currentUser?.id : userId, updates);

      // Only update auth context when editing yourself
      if (isSelf) {
        updateUser(response.data);
      }
      
      //setSuccess('Profile updated successfully');
      toast.success(t('Profile updated successfully'));
      navigate(-1);
    } catch (error: any) {
      console.warn(error, typeof error); // TODO !!!
      toast.error(error.response?.data?.error || t('Failed to update profile: {{err}}', { err: error.getMessage() }));
    } finally {
      setLoading(false);
    }
  };

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
          <TextField
            fullWidth
            label="First Name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Last Name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
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
                {roleOptions.map(r => (
                  <MenuItem key={r} value={r}>
                    {/* {t(r.charAt(0).toUpperCase() + r.slice(1))} */}
                    {t(r)}
                  </MenuItem>
                ))}
              </Select>
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
              disabled={loading}
              size={isXs ? "small" : "medium"}
              sx={isXs ? { px: 1 } : {}}
            >
              {loading ? t('Saving...') : t('Save Changes')}
            </Button>
          </Box>
          
        </Box>
      </Paper>
    </Container>
  );
};

export default Profile;
