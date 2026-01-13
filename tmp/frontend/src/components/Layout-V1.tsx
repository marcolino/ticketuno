import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Container,
  Button,
} from '@mui/material';
import {
  EventSeat as EventSeatIcon,
  Login as LoginIcon,
  Logout as LogoutIcon,
  Add as AddIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import LanguageSelector from './LanguageSelector';
import LoginDialog from './LoginDialog';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout } = useAuth();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  const handleAddTheater = () => {
    if (!isAuthenticated) {
      setLoginDialogOpen(true);
    } else {
      navigate('/new-theater');
    }
  };

  const isHomePage = location.pathname === '/';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar position="static">
        <Toolbar>
          <IconButton
            color="inherit"
            onClick={() => navigate('/')}
            edge="start"
            sx={{ mr: 2 }}
          >
            <EventSeatIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t('Theater Reservation System')}
          </Typography>
          
          {!isHomePage && (
            <Button
              color="inherit"
              startIcon={<HomeIcon />}
              onClick={() => navigate('/')}
              sx={{ mr: 2 }}
            >
              Home
            </Button>
          )}
          
          {isAuthenticated && (
            <Button
              color="inherit"
              startIcon={<AddIcon />}
              onClick={handleAddTheater}
              sx={{ mr: 2 }}
            >
              Add Theater
            </Button>
          )}
          
          {isAuthenticated ? (
            <IconButton color="inherit" onClick={logout} sx={{ mr: 2 }}>
              <LogoutIcon />
            </IconButton>
          ) : (
            <IconButton color="inherit" onClick={() => setLoginDialogOpen(true)} sx={{ mr: 2 }}>
              <LoginIcon />
            </IconButton>
          )}
          
          <LanguageSelector />
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default' }}>
        {children}
      </Box>

      {/* Footer */}
      <Box
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
          backgroundColor: (theme) =>
            theme.palette.mode === 'light'
              ? theme.palette.grey[200]
              : theme.palette.grey[800],
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            © {new Date().getFullYear()} Theater Reservation System. All rights reserved.
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
            Built with React, TypeScript, Material-UI & Node.js
          </Typography>
        </Container>
      </Box>

      <LoginDialog
        open={loginDialogOpen}
        onClose={() => setLoginDialogOpen(false)}
      />
    </Box>
  );
};

export default Layout;
