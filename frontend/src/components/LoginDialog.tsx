import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  Link,
  InputAdornment,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Google as GoogleIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
//import { useToast } from '../contexts/ToastContext';
import { toastAPI as toast } from '../contexts/ToastContext';
//import { showToast } from '../utils/toast';
import { userApi } from '../services/api';

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
}

type TabValue = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

const LoginDialog: React.FC<LoginDialogProps> = ({ open, onClose }) => {
  const { login, register, verifyEmail, resendVerification, forgotPassword, resetPassword, googleLogin } = useAuth();
  const [tab, setTab] = useState<TabValue>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerFirstName, setRegisterFirstName] = useState('');
  const [registerLastName, setRegisterLastName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');

  // Verification
  const [verifyEmailAddress, setVerifyEmailAddress] = useState('');
  const [verifyCode, setVerifyCode] = useState('');

  // Forgot/Reset password
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  //const { toastAPI as toast } = useToast();

  useEffect(() => {
    if (!open) {
      resetForms();
    }
  }, [open]);
  
  const handleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      const result = await login({
        email: loginEmail,
        password: loginPassword,
      });
      if (result?.requiresVerification) {
        setVerifyEmailAddress(result.email!);
        setTab('verify');
        setError('Please verify your email first');
      } else {
        toast.success('Login successful!');
        onClose();
        resetForms();
      }
    } catch (err: any) {
      // if (err.response?.data?.requiresVerification) {
      //   setVerifyEmailAddress(err.response?.data.email);
      //   setTab('verify');
      //   setError('Please verify your email first');
      // } else {
        setError(err.response?.data?.error || 'Login failed');
      // }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      setError('');
      setLoading(true);
      const response = await register({
        email: registerEmail,
        password: registerPassword,
        firstName: registerFirstName,
        lastName: registerLastName,
        phone: registerPhone,
      });
      if (response.verificationCode) { // this happens only in development
        console.log( // TODO: use a custom function...
          'Verification code is %c' + response.verificationCode,
          'color: white; background: red; font-size: 48px; font-weight: bold; padding: 2px;'
        );
      }
      setVerifyEmailAddress(response.email);
      setTab('verify');
      toast.success('Registration successful! Please check your email for verification code.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

    const handleVerifyEmail = async () => {
    try {
      setError('');
      setLoading(true);
      await verifyEmail({ email: verifyEmailAddress, code: verifyCode });
      toast.success('Email verified! You are now logged in.');
      onClose();
      resetForms();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setError('');
      setLoading(true);
      await resendVerification(verifyEmailAddress);
      toast.success('Verification code resent! Check your email.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    try {
      setError('');
      setLoading(true);
      await forgotPassword({ email: forgotEmail });
      setResetEmail(forgotEmail);
      setTab('reset');
      toast.success('Reset code sent! Check your email.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      setError('');
      setLoading(true);
      await resetPassword({ email: resetEmail, code: resetCode, newPassword });
      setTab('login');
      toast.success('Password reset successful! Please login.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setError('');
      const response = await userApi.getGoogleAuthUrl();
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        response.data.authUrl,
        'Google Login',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for OAuth callback
      const handleMessage = async (event: MessageEvent) => {
        if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          try {
            setLoading(true);
            await googleLogin(event.data.code);
            toast.success('Logged in with Google!');
            onClose();
            resetForms();
          } catch (err: any) {
            setError(err.response?.data?.error || 'Google login failed');
          } finally {
            setLoading(false);
          }
          window.removeEventListener('message', handleMessage);
        }
      };

      window.addEventListener('message', handleMessage);
    } catch (err: any) {
      setError('Failed to initialize Google login');
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
    setVerifyEmailAddress('');
    setVerifyCode('');
    setForgotEmail('');
    setResetEmail('');
    setResetCode('');
    setNewPassword('');
    setError('');
    setShowPassword(false);
    setTab('login');
  };

  const handleClose = () => {
    // Prevent closing during critical flows
    if (tab === 'verify' && verifyEmailAddress) {
      showToast.warning('Please complete email verification first');
      return;
    }
    if (tab === 'reset' && resetCode) {
      showToast.warning('Please complete password reset first');
      return;
    }
    resetForms();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown={tab === 'verify' || tab === 'reset'} // Prevent ESC key during flows
      sx={{ mx: 10 }}
    >
      <DialogTitle sx={{ mx: 10 }}>
        {tab === 'login' && 'Login'}
        {tab === 'register' && 'Register'}
        {tab === 'verify' && 'Verify Email'}
        {tab === 'forgot' && 'Forgot Password'}
        {tab === 'reset' && 'Reset Password'}
      </DialogTitle>
      <DialogContent sx={{ mx: 10 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Login Tab */}
        {tab === 'login' && (
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
              type={showPassword ? 'text' : 'password'}
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => setTab('forgot')}
                sx={{ cursor: 'pointer' }}
              >
                Forgot password?
              </Link>
              <Link
                component="button"
                variant="body2"
                onClick={() => setTab('register')}
                sx={{ cursor: 'pointer' }}
              >
                Create account
              </Link>
            </Box>

            <Button
              fullWidth
              variant="contained"
              onClick={handleLogin}
              disabled={loading || !loginEmail || !loginPassword}
              size="large"
              sx={{ mb: 2 }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>

            <Divider sx={{ my: 2 }}>OR</Divider>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleLogin}
              disabled={loading}
              size="large"
            >
              Continue with Google
            </Button>
          </Box>
        )}

        {/* Register Tab */}
        {tab === 'register' && (
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
              type={showPassword ? 'text' : 'password'}
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
              A verification code will be sent to your email
            </Typography>

            <Button
              fullWidth
              variant="contained"
              onClick={handleRegister}
              disabled={loading || !registerEmail || !registerPassword || !registerFirstName || !registerLastName}
              size="large"
              sx={{ mb: 2 }}
            >
              {loading ? 'Registering...' : 'Register'}
            </Button>

            <Link
              component="button"
              variant="body2"
              onClick={() => setTab('login')}
              sx={{ cursor: 'pointer' }}
            >
              Already have an account? Login
            </Link>
          </Box>
        )}

        {/* Verify Email Tab */}
        {tab === 'verify' && (
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              A 6-digit verification code has been sent to <strong>{verifyEmailAddress}</strong>
            </Alert>
            
            <TextField
              fullWidth
              label="Verification Code"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyPress={(e) => e.key === 'Enter' && handleVerifyEmail()}
              sx={{ mb: 2 }}
              autoFocus
              inputProps={{ maxLength: 6, style: { fontSize: '24px', textAlign: 'center', letterSpacing: '8px' } }}
            />

            <Button
              fullWidth
              variant="contained"
              onClick={handleVerifyEmail}
              disabled={loading || verifyCode.length !== 6}
              size="large"
              sx={{ mb: 2 }}
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Didn't receive the code?
              </Typography>
              <Link
                component="button"
                variant="body2"
                onClick={handleResendCode}
                disabled={loading}
                sx={{ cursor: 'pointer' }}
              >
                Resend Code
              </Link>
            </Box>
          </Box>
        )}

        {/* Forgot Password Tab */}
        {tab === 'forgot' && (
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enter your email address and we'll send you a code to reset your password.
            </Typography>
            
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleForgotPassword()}
              sx={{ mb: 2 }}
              autoFocus
            />

            <Button
              fullWidth
              variant="contained"
              onClick={handleForgotPassword}
              disabled={loading || !forgotEmail}
              size="large"
              sx={{ mb: 2 }}
            >
              {loading ? 'Sending...' : 'Send Reset Code'}
            </Button>

            <Link
              component="button"
              variant="body2"
              onClick={() => setTab('login')}
              sx={{ cursor: 'pointer' }}
            >
              Back to Login
            </Link>
          </Box>
        )}

        {/* Reset Password Tab */}
        {tab === 'reset' && (
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              A reset code has been sent to <strong>{resetEmail}</strong>
            </Alert>
            
            <TextField
              fullWidth
              label="Reset Code"
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              sx={{ mb: 2 }}
              autoFocus
              inputProps={{ maxLength: 6 }}
            />
            
            <TextField
              fullWidth
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleResetPassword()}
              sx={{ mb: 2 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              fullWidth
              variant="contained"
              onClick={handleResetPassword}
              disabled={loading || resetCode.length !== 6 || !newPassword}
              size="large"
              sx={{ mb: 2 }}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>

            <Link
              component="button"
              variant="body2"
              onClick={() => setTab('login')}
              sx={{ cursor: 'pointer' }}
            >
              Back to Login
            </Link>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LoginDialog;
