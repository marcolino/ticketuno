import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  Box,
  //Typography,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
}

const LoginDialog: React.FC<LoginDialogProps> = ({ open, onClose }) => {
  const { login, register } = useAuth();
  const [tab, setTab] = useState(0);
  const [error, setError] = useState('');
  //const [loading, setLoading] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerFirstName, setRegisterFirstName] = useState('');
  const [registerLastName, setRegisterLastName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');

  const handleLogin = async () => {
    try {
      setError('');
      //setLoading(true);
      await login({ email: loginEmail, password: loginPassword });
      onClose();
      resetForms();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      //setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      setError('');
      //setLoading(true);
      await register({
        email: registerEmail,
        password: registerPassword,
        firstName: registerFirstName,
        lastName: registerLastName,
        phone: registerPhone,
      });
      onClose();
      resetForms();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      //setLoading(false);
    }
  };

  const resetForms = () => {
    setLoginEmail('');
    setLoginPassword('');
    setRegisterEmail('');
    setRegisterPassword('');
    setRegisterFirstName('');
    setRegisterLastName('');
    setRegisterPhone('');
    setError('');
  };

  const handleClose = () => {
    resetForms();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} centered>
          <Tab label="Login" />
          <Tab label="Register" />
        </Tabs>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {tab === 0 ? (
          // Login Form
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              sx={{ mb: 2 }}
              autoFocus
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              sx={{ mb: 2 }}
            />
            <Button
              fullWidth
              variant="contained"
              onClick={handleLogin}
              //disabled={loading || !loginEmail || !loginPassword}
              disabled={/*loading ||*/ !loginEmail || !loginPassword}
              size="large"
            >
              {/*loading ? 'Logging in...' :*/ 'Login'}
            </Button>
          </Box>
        ) : (
          // Register Form
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="First Name"
              value={registerFirstName}
              onChange={(e) => setRegisterFirstName(e.target.value)}
              sx={{ mb: 2 }}
              autoFocus
            />
            <TextField
              fullWidth
              label="Last Name"
              value={registerLastName}
              onChange={(e) => setRegisterLastName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Phone (Optional)"
              value={registerPhone}
              onChange={(e) => setRegisterPhone(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button
              fullWidth
              variant="contained"
              onClick={handleRegister}
              disabled={/*loading ||*/ !registerEmail || !registerPassword || !registerFirstName || !registerLastName}
              size="large"
            >
              {/*loading ? 'Registering...' :*/ 'Register'}
            </Button>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LoginDialog;
