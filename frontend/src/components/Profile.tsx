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
import { toast } from '@/contexts/ToastContext';
import { userApi } from '@/services/api';

const Profile: React.FC = () => {
  const { user, isAdmin, updateUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  //const [error, setError] = useState('');
  //const [success, setSuccess] = useState('');
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down('sm')); // true for xs

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(-1);
      return;
    }
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setEmail(user.email);
      setPhone(user.phone || '');
      setRole(user.role);
    }
  }, [user, isAuthenticated, navigate]);

  const handleCancel = async () => {
    toast.success(t('Profile updated successfully'));
    navigate(-1);
  }

  const handleSave = async () => {
    try {
      //setError('');
      //setSuccess('');
      setLoading(true);
      const updates: any = {
        firstName,
        lastName,
        email,
        phone,
      };
      if (isAdmin) {
        updates.role = role;
      }

      const response = await userApi.updateProfile(updates);
      updateUser(response.data);
      //setSuccess('Profile updated successfully');
      toast.success(t('Profile updated successfully'));
      navigate(-1);
    } catch (err: any) {
      //setError(err.response?.data?.error || 'Failed to update profile');
      toast.error(err.response?.data?.error || t('Failed to update profile'));
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

          {isAdmin && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={role}
                label="Role"
                onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
              >
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
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
              onClick={handleSave}
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
