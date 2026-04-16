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
  Close as CloseIcon,
} from '@mui/icons-material';
import { isAxiosError } from 'axios';
import useNavigate from '@/hooks/useNavigate';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '@/contexts/DialogContext';
import { toast } from '@/contexts/ToastContext';
import { getErrorMessage } from '@/shared/utils/misc';
import GoogleIconColored from '@/components/icons/GoogleIconColored';
import { AuthDialogProps, TabValue } from '@/shared/types/auth';
import config from '@/shared/config';

const AuthDialog: React.FC<AuthDialogProps> = ({ open, onClose, initialTab = "login" }) => {
  const { login, register, verifyEmail, resendVerification, forgotPassword, resetPassword/*, googleLogin*/ } = useAuth();
  const navigate = useNavigate();
  const showDialog = useDialog();

  const [tab, setTab] = useState<TabValue>(initialTab);
  const [loading, setLoading] = useState(false);
  const [eventPassword, setEventPassword] = useState(false);
  const [eventPasswordConfirmation, setEventPasswordConfirmation] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerPasswordConfirmation, setRegisterPasswordConfirmation] = useState('');
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

  // i18n
  const { t, i18n } = useTranslation();
  
  useEffect(() => {
    if (!open) {
      resetForms();
    }
  }, [open]);

  // Sync when initialTab changes (e.g., dialog re-opened with different tab)
  useEffect(() => {
    if (open) {
      setTab(initialTab);
    }
  }, [open, initialTab]);
  
  const handleLogin = async () => {
    try {
      setLoading(true);
      const response = await login({
        email: loginEmail,
        password: loginPassword,
      });
      if (response.requiresVerification) {
        setVerifyEmailAddress(response.email);
        setTab('verify');
        toast.warning(response?.error || t('Please verify your email first'));
      } else {
        toast.success(t('Login successful!'));
        onClose();
        resetForms();

        const redirect = localStorage.getItem('redirectAfterLogin');
        localStorage.removeItem('redirectAfterLogin');
        if (redirect) {
          navigate(redirect);
        } else {
          navigate('/', { replace: true });
        }
      }
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.reason === 'RETRY_WITH_GOOGLE_OAUTH') {
        showDialog({
          title: t('It looks like you did register via Google'),
          content: t('Retry to login with Google, or set a password'),
          buttons: [
            {
              text: 'Continue with Google',
              onClick: handleGoogleLogin,
              variant: 'outlined',
            },
            {
              text: 'Set a password',
              onClick: () => setTab('forgot'),
              variant: 'outlined',
            }
          ],
        });
      } else {
        toast.warning(t('Login failed: {{err}}', { err: getErrorMessage(error) }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      setLoading(true);
      const response = await register({
        email: registerEmail,
        password: registerPassword,
        firstName: registerFirstName,
        lastName: registerLastName,
        phone: registerPhone,
        language: i18n.language,
      });
      if (response.verificationCode) { // The verificaztion code is shown in console ONLY in development mode
        console.info(
          'Verification code is %c' + response.verificationCode,
          'color: white; background: red; font-size: 48px; font-weight: bold; padding: 2px;'
        );
      }
      setVerifyEmailAddress(response.email);
      setTab('verify');
      toast.success('Registration successful! Please check your email for verification code.');
    } catch (error) {
      toast.error(t('Registration failed ({{err}})', { err: getErrorMessage(error) }));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    try {
      setLoading(true);
      await verifyEmail({ email: verifyEmailAddress, code: verifyCode });
      toast.success('Email verified! You are now logged in.');
      onClose();
      resetForms();
      navigate('/', { replace: true });
    } catch (error) {
      toast.error(t('Email verification failed ({{err}})', { err: getErrorMessage(error) }));
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setLoading(true);
      const response = await resendVerification(verifyEmailAddress);
      if (response.verificationCode) {
        console.log( // The verificaztion code is shown in console ONLY in development mode
          'Verification code is %c' + response.verificationCode,
          'color: white; background: red; font-size: 48px; font-weight: bold; padding: 2px;'
        );
      }
      toast.success('Verification code resent! Check your email.');
    } catch (error) {
      toast.error(t('Code resend failed ({{err}})', { err: getErrorMessage(error) }));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    try {
      setLoading(true);
      const response = await forgotPassword({ email: forgotEmail });
      if (response.error) {
        console.log( // The verificaztion code is shown in console ONLY in development mode
          'Forgot password error: %c' + response.error,
          'color: white; background: red; font-size: 48px; font-weight: bold; padding: 2px;'
        );
      }
      if (response.resetPasswordCode) {
        console.log(  // The verificaztion code is shown in console ONLY in development mode
          'Reset password code is: %c' + response.resetPasswordCode,
          'color: white; background: red; font-size: 48px; font-weight: bold; padding: 2px;'
        );
      }
      setResetEmail(forgotEmail);
      setTab('reset');
      toast.success('Reset code sent! Check your email.');
    } catch (error) {
      toast.error(t('Reset code failed ({{err}})', { err: getErrorMessage(error) }));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    try {
      setLoading(true);
      await resetPassword({ email: resetEmail, code: resetCode, newPassword });
      setTab('login');
      toast.success('Password reset successful! Please login.');
    } catch (error) {
      toast.error(t('Password reset failed ({{err}})', { err: getErrorMessage(error) }));
    } finally {
      setLoading(false);
    }
  };

  
  const handleGoogleLogin = async () => {
    setLoading(true);
    // Open popup synchronously
    const width = 500, height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open('', 'Google Login', `width=${width},height=${height},left=${left},top=${top}`);
    if (!popup) {
      toast.error(t('Popup blocked! Please allow popups for this site'));
      setLoading(false);
      return;
    }

    try {
      // Now fetch the URL asynchronously
      const response = await fetch(`${config.app.api.prefix}/${config.app.api.version}/users/auth/google`);
      const { authUrl } = await response.json();

      // Navigate popup to auth URL
      popup.location.href = authUrl;
    } catch (error) {
      popup.close();
      toast.error(t('Failed to start Google login: {{err}}', { err: getErrorMessage(error) }));
      setLoading(false);
    }
  };

  // Listen for the message FROM the popup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Check the origin
      if (
        event.origin !== window.location.origin && 
        event.origin !== config.app.baseUrlBackendDevelopment && 
        event.origin !== config.app.baseUrlStaging &&
        event.origin !== config.app.baseUrlProduction
      ) {
        toast.error(t('Invalid message origin: {{origin}}', {origin: event.origin}));
        return;
      }

      if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        const token = event.data.token;
        console.log('Received Google auth token:', token);

        try {
          setLoading(true);
          
          // Call login with token
          await login({ token: token });
          toast.success('Logged in with Google!');
          onClose();
          resetForms();
          const redirect = localStorage.getItem('redirectAfterLogin');
          localStorage.removeItem('redirectAfterLogin');
          if (redirect) {
            navigate(redirect);
          } else {
            navigate('/', { replace: true });
          }
        } catch (error) {
          toast.error(t('Google login error: {{err}}', {err: getErrorMessage(error)}));
          // Clear token if login fails
          localStorage.removeItem('authToken');
        } finally {
          setLoading(false);
        }
      }

      if (event.data.type === 'GOOGLE_AUTH_ERROR') {
        toast.error(t('Google login failed: {{err}}', {err: getErrorMessage(event.data.error)}));
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
          position: 'relative',
          _mx: { xs: 5, sm: 10 },
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

          <IconButton
            size="small"
            onClick={handleClose}
            sx={{
              position: 'absolute',
              right: 20,
              top: 20,
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>

        </Box>
      </DialogTitle>
      <DialogContent
        sx={{
          mx: { xs: 1, sm: 10 }
        }}
      >
        {/* Login Tab */}
        {tab === 'login' && (
          <Box sx={{ pt: 2 }} component="form" autoComplete="on">
            <TextField
              name="loginEmail"
              label={t('Email')}
              type="email"
              value={loginEmail}
              onChange={(e) => { setLoginEmail(e.target.value) }}
              sx={{ mb: 2 }}
              fullWidth
              autoFocus
              required
              autoComplete="username"
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
              autoComplete="current-password"
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Link
                component="button"
                type="button" // <-- Thuis is crucial to avoid Android Chrome email autocomplete selection triggers a click!
                variant="body2"
                onClick={() => setTab('forgot')}
                sx={{ cursor: 'pointer' }}
              >
                {t('Forgot password?')}
              </Link>
              <Link
                component="button"
                type="button" 
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
              // startIcon={<GoogleIcon />}
              // startIcon={<ColoredGoogleIcon />}
              startIcon={<GoogleIconColored />}
              onClick={handleGoogleLogin}
              disabled={loading}
              size="large"
            >
              {loading ? t('Connecting with Google...') : t('Continue with Google')}
            </Button>

            <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 3 }}>
              <Typography component="h6" variant="caption" color="textSecondary" align="center">
                {t('By accessing')} {t('you agree to our')} {' '}
                <Link
                  type="button"
                  component="button"
                  onClick={async () => await showDialog({
                    title: t('Terms of Service'),
                    content: <iframe src="/terms?embed=1" title="Terms of Service" style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} />,
                    showCloseIcon : true,
                    shrinkToContent: false,
                    paperSx: { width: { xs: '90vw', sm: '50vw' }, maxWidth: '90vw', height: '90%' },
                  })}
                  underline="always"
                >
                  {t('Terms of Service')}
                </Link>{' '}
                {t('and')} {' '}
                <Link
                  type="button"
                  component="button"
                  onClick={async () => await showDialog({
                    title: t('Privacy Policy'),
                    content: <iframe src="/privacy?embed=1" title="PrivacyPolicy" style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} />,
                    showCloseIcon : true,
                    paperSx: { width: { xs: '90vw', sm: '50vw' }, maxWidth: '90vw',  height: '90%' },
                  })}
                  underline="always"
                >
                  {t('Privacy Policy')}
                </Link>
              </Typography>
            </Box>

          </Box>
        )}

        {/* Register Tab */}
        {tab === 'register' && (
          <Box sx={{ pt: 2 }} component="form" autoComplete="on">
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
              name="Register Email"
              label={t('Email')}
              type="email"
              value={registerEmail}
              onChange={(e) => setRegisterEmail(e.target.value)}
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
              autoComplete="new-password"
            />
            <TextField
              name="PasswordConfirmation"
              label={t('Confirm Password')}
              type={eventPasswordConfirmation ? 'text' : 'password'}
              value={registerPasswordConfirmation}
              onChange={(e) => setRegisterPasswordConfirmation(e.target.value)}
              sx={{ mb: 2 }}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setEventPasswordConfirmation(!eventPasswordConfirmation)} edge="end">
                      {eventPasswordConfirmation ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              name="Phone"
              label={`${t('Phone')} (${t('optional')})`}
              value={registerPhone}
              onChange={(e) => setRegisterPhone(e.target.value)}
              sx={{ mb: 2 }}
              fullWidth
              autoComplete="phone"
            />

            <Typography
              variant="caption"
              color="text.secondary"
              component="span" // render as inline element
              sx={{ display: 'block', mb: 0.5, lineHeight: 1.33 }}
            >
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

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => setTab('login')}
                sx={{ cursor: 'pointer' }}
              >
                {t('Already have an account? Login')}
              </Link>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 3 }}>
              <Typography component="h6" variant="caption" color="textSecondary" align="center">
                {t('By signing up')} {t('you agree to our')} {' '}
                <Link
                  type="button"
                  component="button"
                  onClick={async () => await showDialog({
                    title: t('Terms of Service'),
                    content: <iframe src="/terms?embed=1" title="Terms of Service" style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} />,
                    showCloseIcon : true,
                    shrinkToContent: false,
                    paperSx: { width: { xs: '90vw', sm: '50vw' }, maxWidth: '90vw', height: '90%' },
                  })}
                  underline="always"
                >
                  {t('Terms of Service')}
                </Link>{' '}
                {t('and')} {' '}
                <Link
                  type="button"
                  component="button"
                  onClick={async () => await showDialog({
                    title: t('Privacy Policy'),
                    content: <iframe src="/privacy?embed=1" title="PrivacyPolicy" style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} />,
                    showCloseIcon : true,
                    paperSx: { width: { xs: '90vw', sm: '50vw' }, maxWidth: '90vw',  height: '90%' },
                  })}
                  underline="always"
                >
                  {t('Privacy Policy')}
                </Link>
              </Typography>
            </Box>

            {/* <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 2 }}>
              <Typography component="h6" variant="caption" color="textSecondary" align="center">
                {t("By signing up")} {t("you agree to our")} <Link _href="/terms" color="textPrimary" onCLick="alert('t')" target="_blank" rel="noopener noreferrer" >{t("terms of use")}</Link> {" "}
                {t("and you confirm you have read our")} <Link href="/privacy" color="textPrimary">{t("privacy policy")}</Link>.
              </Typography>
          </Box> */}
        
            {/* <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/privacy')}
                sx={{ cursor: 'pointer' }}
              >
                {t('Privacy')}
              </Link>
            </Box> */}
          </Box>
        )}

        {/* Verify Email Tab */}
        {tab === 'verify' && (
          <Box sx={{ pt: 2 }} component="form" autoComplete="on">
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
              autoComplete=""
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
          <Box sx={{ pt: 2 }} component="form" autoComplete="on">
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t('Enter your email address and we\'ll send you a code to reset your password')}
            </Typography>
            
            <TextField
              name="forgotEmail"
              label={t('Email')}
              type="email"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              // onKeyPress={(e) => e.key === 'Enter' && handleForgotPassword()}
              sx={{ mb: 2 }}
              fullWidth
              autoFocus
              autoComplete="forgot-email"
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
              ⬅ {t('Back to Login')}
            </Link>
          </Box>
        )}

        {/* Reset Password Tab */}
        {tab === 'reset' && (
          <Box sx={{ pt: 2 }} component="form" autoComplete="on">
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
              autoComplete=""
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
              autoComplete=""
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
              ⬅ {t('Back to Login')}
            </Link>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
