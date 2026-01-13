import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Container,
  Menu,
  MenuItem,
  Avatar,
  Divider,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
} from '@mui/material';
import {
  //EventSeat as EventSeatIcon,
  Login as LoginIcon,
  //Add as AddIcon,
  //Home as HomeIcon,
  //AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Language as LanguageIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode } from '../contexts/ThemeContext';
import LoginDialog from './LoginDialog';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  //const location = useLocation();
  const { user, isAuthenticated, /*isAdmin, */logout } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [langDialogOpen, setLangDialogOpen] = useState(false);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
    navigate('/');
  };

  const handleProfile = () => {
    handleClose();
    navigate('/profile');
  };

  // const handleAddTheater = () => {
  //   if (!isAuthenticated) {
  //     setLoginDialogOpen(true);
  //   } else {
  //     navigate('/theater/new');
  //   }
  // };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setLangDialogOpen(false);
  };

  //const isHomePage = location.pathname === '/';
  const menuOpen = Boolean(anchorEl);

  const getInitials = () => {
    if (user) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return '';
  };

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
            <img 
              src="/images/theater.png" 
              alt="Theater" 
              style={{ 
                width: 24, 
                height: 24,
                filter: mode === 'dark' ? 'invert(0.7)' : '', // Optional: makes white in dark theme
              }} 
            />
          </IconButton>
          {/* <IconButton
            color="inherit"
            onClick={() => navigate('/')}
            edge="start"
            sx={{ mr: 2 }}
          >
            <EventSeatIcon />
          </IconButton> */}
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {t('TicketUno')}
          </Typography>
{/* 
          {!isHomePage && (
            <Button
              color="inherit"
              startIcon={<HomeIcon />}
              onClick={() => navigate('/')}
              sx={{ mr: 2 }}
            >
              Home
            </Button>
          )} */}

          {/* {isAdmin && (
            <Button
              color="inherit"
              startIcon={<AddIcon />}
              onClick={handleAddTheater}
              sx={{ mr: 2 }}
            >
              Add Theater
            </Button>
          )} */}

          {isAuthenticated ? (
            <>
              <IconButton
                onClick={handleMenu}
                color="inherit"
              >
                <Avatar sx={{ width: 42, height: 42, bgcolor: 'secondary.main' }}>
                  {getInitials()}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={menuOpen}
                onClose={handleClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem disabled sx={{ my: 1, py: 0, }}>
                  <Typography variant="body2">
                    {user?.firstName} {user?.lastName} ({user?.role})
                  </Typography>
                </MenuItem>
                <MenuItem disabled sx={{ my: 1, py: 0, }}>
                  <Typography variant="caption" color="text.primary">
                    {user?.email}
                  </Typography>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleProfile}>
                  <ListItemIcon>
                    <PersonIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Profile</ListItemText>
                </MenuItem>
                <MenuItem onClick={toggleTheme}>
                  <ListItemIcon>
                    {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                  </ListItemIcon>
                  <ListItemText>{mode === 'dark' ? 'Light Mode' : 'Dark Mode'}</ListItemText>
                </MenuItem>
                <MenuItem onClick={() => { handleClose(); setLangDialogOpen(true); }}>
                  <ListItemIcon>
                    <LanguageIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Language</ListItemText>
                </MenuItem>
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>Logout</ListItemText>
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Button
              variant="contained"
              size="small"
              color="secondary"
              onClick={() => setLoginDialogOpen(true)}
              disabled={loginDialogOpen} 
            >
              {t("Join !")}
            </Button>
            // <IconButton color="inherit" onClick={() => setLoginDialogOpen(true)}>
            //   <LoginIcon />
            // </IconButton>
          )}
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
            © {new Date().getFullYear()} TicketUno. All rights reserved.
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

      {/* Language Selection Dialog */}
      <Dialog open={langDialogOpen} onClose={() => setLangDialogOpen(false)}>
        <DialogTitle>Select Language</DialogTitle>
        <DialogContent>
          <List>
            <ListItem disablePadding>
              <ListItemButton onClick={() => handleLanguageChange('en')}>
                <ListItemText primary="English" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => handleLanguageChange('it')}>
                <ListItemText primary="Italiano" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton onClick={() => handleLanguageChange('fr')}>
                <ListItemText primary="Français" />
              </ListItemButton>
            </ListItem>
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Layout;
