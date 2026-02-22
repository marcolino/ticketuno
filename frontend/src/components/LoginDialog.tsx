import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  LockPerson,
  Visibility,
  VisibilityOff,
  Google as GoogleIcon,
} from '@mui/icons-material';
import useNavigate from '@/hooks/useNavigate';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/contexts/ToastContext';

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
}

type TabValue = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

const LoginDialog: React.FC<LoginDialogProps> = ({ open, onClose }) => {
  const { login, register, verifyEmail, resendVerification, forgotPassword, resetPassword/*, googleLogin*/ } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab] = useState<TabValue>('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [eventPassword, setEventPassword] = useState(false);

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

  const { t } = useTranslation();
  
  useEffect(() => {
    if (!open) {
      resetForms();
    }
  }, [open]);
  
  const handleLogin = async () => {
    try {
      setError('');
      setLoading(true);
      const response = await login({
        email: loginEmail,
        password: loginPassword,
      });
      if (response.requiresVerification) {
        setVerifyEmailAddress(response.email); // TODO: was: setVerifyEmailAddress(response.email!);
        setTab('verify');
        setError('Please verify your email first');
      } else {
        toast.success(t('Login successful!'));
        onClose();
        resetForms();

        const redirect = localStorage.getItem("redirectAfterLogin");
        localStorage.removeItem("redirectAfterLogin");
        if (redirect) {
          navigate(redirect);
        };
      }
    } catch (error: any) {
      console.error('Login error response:', error.response);
      console.error('Error data:', error.response?.data);
      console.error('Error message:', error.response?.data?.error);
      
      setError(error.response?.data?.error || t('Login failed'));
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
    } catch (error: any) {
      setError(error.response?.data?.error || 'Registration failed');
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
    } catch (error: any) {
      setError(error.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setError('');
      setLoading(true);
      const response = await resendVerification(verifyEmailAddress);
      if (response.verificationCode) { // this happens only in development
        console.log( // TODO: use a custom function...
          'Verification code is %c' + response.verificationCode,
          'color: white; background: red; font-size: 48px; font-weight: bold; padding: 2px;'
        );
      }
      toast.success('Verification code resent! Check your email.');
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    try {
      setError('');
      setLoading(true);
      const response = await forgotPassword({ email: forgotEmail });
      if (response.error) { // this happens only in development
        console.log( // TODO: use a custom function...
          'Forgot password error: %c' + response.error,
          'color: white; background: red; font-size: 48px; font-weight: bold; padding: 2px;'
        );
      }
      if (response.resetPasswordCode) { // this happens only in development
        console.log( // TODO: use a custom function...
          'Reset password code is: %c' + response.resetPasswordCode,
          'color: white; background: red; font-size: 48px; font-weight: bold; padding: 2px;'
        );
      }
      setResetEmail(forgotEmail);
      setTab('reset');
      toast.success('Reset code sent! Check your email.');
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      setError('');
      setLoading(true);
      await resetPassword({ email: resetEmail, code: resetCode, newPassword });
      // TODO: ...
      // if (response.error) { // this happens only in development
      //   console.log( // TODO: use a custom function...
      //     'Error resetting password: %c' + response.error,
      //     'color: white; background: red; font-size: 48px; font-weight: bold; padding: 2px;'
      //   );
      // }
      setTab('login');
      toast.success('Password reset successful! Please login.');
    } catch (error: any) {
      setError(error.response?.data?.error || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      // 1. Get the Google auth URL from your backend
      const response = await fetch('/api/v1/users/auth/google'); // TODO: to shared config
      const { authUrl } = await response.json();

      // 2. Configure and open the popup
      const width = 500, height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        authUrl,
        'Google Login',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        setError('Popup blocked! Please allow popups for this site.');
        setLoading(false);
        return;
      }
    } catch (error: any) {
      //console.error('Failed to start Google login:', err);
      setError(t('Failed to start Google login: {{err}}', {err: error.message}));
    } finally {
      setLoading(false);
    }
  };

   // Listen for the message FROM the popup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Check the origin
      if (
        event.origin !== window.location.origin && 
        event.origin !== 'http://localhost:3001' &&  // TODO: from config
        event.origin !== 'https://ticketuno.fly.dev' // TODO: from config
      ) {
        console.error('Invalid message origin:', event.origin);
        return;
      }

      if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        const token = event.data.token;
        console.log('Received Google auth token:', token);

        try {
          setLoading(true);
          setError('');
          
          // Call login with token
          await login({ token: token });
          
          console.log('Google login successful');
          toast.success('Logged in with Google!');
          onClose();
          resetForms();
        } catch (error: any) {
          console.error('Google login error:', error);
          setError(error.response?.data?.error || 'Google login failed');
          // Clear token if login fails
          localStorage.removeItem('authToken');
          //setAuthToken(null); // TODO ...
        } finally {
          setLoading(false);
        }
        //   console.log('Received Google auth token:', token);
        //   // Use the token (store, validate, etc.)
        //   localStorage.setItem('authToken', token);
        //   //await login({ token: token }); // Standard login logic
        //   onClose(); // Close the login dialog
        //   toast.success('Logged in with Google!');
      }

      if (event.data.type === 'GOOGLE_AUTH_ERROR') {
        console.error('Google auth error from popup:', event.data.error);
        setError(event.data.error || 'Google login failed');
        setLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onClose, login, t]);

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
    setEventPassword(false);
    setTab('login');
  };

  const handleClose = () => {
    // Prevent closing during critical flows
    if (tab === 'verify' && verifyEmailAddress) {
      toast.warning('Please complete email verification first');
      return;
    }
    if (tab === 'reset' && resetCode) {
      toast.warning('Please complete password reset first');
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
      disableEscapeKeyDown={tab === 'verify' || tab === 'reset'} // Prevent ESC key during authentication flow
    >
      <DialogTitle
        sx={{
          mx: { xs: 5, sm: 10 },
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'center' 
        }}
      >
        <IconButton color="primary">
          <LockPerson fontSize="large" />
        </IconButton>
        <Box>
          {tab === 'login' && 'Login'}
          {tab === 'register' && 'Register'}
          {tab === 'verify' && 'Verify Email'}
          {tab === 'forgot' && 'Forgot Password'}
          {tab === 'reset' && 'Reset Password'}
        </Box>
      </DialogTitle>
      <DialogContent
        sx={{
          mx: { xs: 1, sm: 10 }
        }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Login Tab */}
        {tab === 'login' && (
          <Box sx={{ pt: 2 }}>
            <TextField
              name="Email"
              label={t('Email')}
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              sx={{ mb: 2 }}
              fullWidth
              autoFocus
              required
            />
            <TextField
              name="Password"
              label={t('Password')}
              type={eventPassword ? 'text' : 'password'}
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              // onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              sx={{ mb: 2 }}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setEventPassword(!eventPassword)} edge="end">
                      {eventPassword ? <VisibilityOff /> : <Visibility />}
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
                {t('Forgot password?')}
              </Link>
              <Link
                component="button"
                variant="body2"
                onClick={() => setTab('register')}
                sx={{ cursor: 'pointer' }}
              >
                {t('Create account')}
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
              {loading ? t('Logging in...') : t('Login') }
            </Button>

            <Divider sx={{ my: 2 }}>{t('OR')}</Divider>

            <Button
              fullWidth
              variant="outlined"
              startIcon={<GoogleIcon />}
              onClick={handleGoogleLogin}
              disabled={loading}
              size="large"
            >
              {loading ? t('Connecting with Google...') : t('Continue with Google')}
            </Button>
          </Box>
        )}

        {/* Register Tab */}
        {tab === 'register' && (
          <Box sx={{ pt: 2 }}>
            <TextField
              name="First Name"
              label={t('First Name')}
              value={registerFirstName}
              onChange={(e) => setRegisterFirstName(e.target.value)}
              sx={{ mb: 2 }}
              fullWidth
              autoFocus
            />
            <TextField
              name="Last Name"
              label={t('Last Name')}
              value={registerLastName}
              onChange={(e) => setRegisterLastName(e.target.value)}
              sx={{ mb: 2 }}
              fullWidth
            />
            <TextField
              name="Email"
              label={t('Email')}
              type="email"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
              sx={{ mb: 2 }}
              fullWidth
            />
            <TextField
              name="Phone"
              label={t('Phone (optional)')}
              value={registerPhone}
              onChange={(e) => setRegisterPhone(e.target.value)}
              sx={{ mb: 2 }}
              fullWidth
            />
            <TextField
              name="Password"
              label={t('Password')}
              type={eventPassword ? 'text' : 'password'}
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              sx={{ mb: 2 }}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setEventPassword(!eventPassword)} edge="end">
                      {eventPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Typography variant="caption" color="text.secondary" sx={{ mb: 2/*, display: 'block' TODO: WHY???*/ }}>
              {t('A verification code will be sent to your email')}
            </Typography>

            <Button
              variant="contained"
              onClick={handleRegister}
              disabled={loading || !registerEmail || !registerPassword || !registerFirstName || !registerLastName}
              size="large"
              sx={{ mb: 2 }}
              fullWidth
            >
              {loading ? t('Registering...') : t('Register')}
            </Button>

            <Link
              component="button"
              variant="body2"
              onClick={() => setTab('login')}
              sx={{ cursor: 'pointer' }}
            >
              {t('Already have an account? Login')}
            </Link>
          </Box>
        )}

        {/* Verify Email Tab */}
        {tab === 'verify' && (
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              {t('A 6-digit verification code has been sent to')} <strong>{verifyEmailAddress}</strong>
            </Alert>
            
            <TextField
              name="Verification Code"
              label={t('Verification Code')}
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyPress={(e) => e.key === 'Enter' && handleVerifyEmail()}
              sx={{ mb: 2 }}
              fullWidth
              autoFocus
              inputProps={{ maxLength: 6, style: { fontSize: '24px', textAlign: 'center', letterSpacing: '8px' } }}
            />

            <Button
              variant="contained"
              onClick={handleVerifyEmail}
              disabled={loading || verifyCode.length !== 6}
              size="large"
              sx={{ mb: 2 }}
              fullWidth
            >
              {loading ? t('Verifying...') : t('Verify Email')}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {t('Didn\'t receive the code?')}
              </Typography>
              <Link
                component="button"
                variant="body2"
                onClick={handleResendCode}
                disabled={loading}
                sx={{ cursor: 'pointer' }}
              >
                {t('Resend Code')}
              </Link>
            </Box>
          </Box>
        )}

        {/* Forgot Password Tab */}
        {tab === 'forgot' && (
          <Box sx={{ pt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('Enter your email address and we\'ll send you a code to reset your password')}
            </Typography>
            
            <TextField
              name="Email"
              label={t('Email')}
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              // onKeyPress={(e) => e.key === 'Enter' && handleForgotPassword()}
              sx={{ mb: 2 }}
              fullWidth
              autoFocus
            />

            <Button
              variant="contained"
              onClick={handleForgotPassword}
              disabled={loading || !forgotEmail}
              size="large"
              sx={{ mb: 2 }}
              fullWidth
            >
              {loading ? t('Sending...') : t('Send Reset Code')}
            </Button>

            <Link
              component="button"
              variant="body2"
              onClick={() => setTab('login')}
              sx={{ cursor: 'pointer' }}
            >
              {t('Back to Login')}
            </Link>
          </Box>
        )}

        {/* Reset Password Tab */}
        {tab === 'reset' && (
          <Box sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              {t('A reset code has been sent to')} <strong>{resetEmail}</strong>
            </Alert>
            
            <TextField
              name="Reset Code"
              label={t('Reset Code')}
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              sx={{ mb: 2 }}
              fullWidth
              autoFocus
              inputProps={{ maxLength: 6 }}
            />
            
            <TextField
              name="New Password"
              label={t('New Password')}
              type={eventPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              // onKeyPress={(e) => e.key === 'Enter' && handleResetPassword()}
              sx={{ mb: 2 }}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setEventPassword(!eventPassword)} edge="end">
                      {eventPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              variant="contained"
              onClick={handleResetPassword}
              disabled={loading || resetCode.length !== 6 || !newPassword}
              size="large"
              sx={{ mb: 2 }}
              fullWidth
            >
              {loading ? t('Resetting...') : t('Reset Password')}
            </Button>

            <Link
              component="button"
              variant="body2"
              onClick={() => setTab('login')}
              sx={{ cursor: 'pointer' }}
            >
              {t('Back to Login')}
            </Link>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LoginDialog;
