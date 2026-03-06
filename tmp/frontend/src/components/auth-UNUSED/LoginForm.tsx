import {
  Box,
  TextField,
  Button,
  Link
} from "@mui/material";
import { useTranslation } from 'react-i18next';

const LoginForm = ({ flow }: any) => {

  return (
    <Box sx={{ pt: 2 }} component="form" autoComplete="on">
      <TextField
        name="loginEmail"
        label={t('Email')}
        type="email"
        value={loginEmail}
        onChange={(e) => setLoginEmail(e.target.value)}
        sx={{ mb: 2 }}
        fullWidth
        autoFocus
        required
        autoComplete="email"
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
        {loading ? t('Logging in...') : t('Login')}
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
  );

  /*
  return (
    <Box sx={{ pt: 2 }}>

      <TextField
        label="Email"
        fullWidth
        value={flow.loginEmail}
        onChange={(e) => flow.setLoginEmail(e.target.value)}
        sx={{ mb: 2 }}
      />

      <TextField
        label="Password"
        type="password"
        fullWidth
        value={flow.loginPassword}
        onChange={(e) => flow.setLoginPassword(e.target.value)}
        sx={{ mb: 2 }}
      />

      <Button
        fullWidth
        variant="contained"
        onClick={flow.handleLogin}
        disabled={flow.loading}
        sx={{ mb: 2 }}
      >
        Login
      </Button>

      <Box display="flex" justifyContent="space-between">
        <Link component="button" onClick={() => flow.setTab("forgot")}>
          Forgot password?
        </Link>

        <Link component="button" onClick={() => flow.setTab("register")}>
          Create account
        </Link>
      </Box>

    </Box>
  );
  */
};

export default LoginForm;
