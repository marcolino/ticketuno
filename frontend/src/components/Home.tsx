import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  // AppBar,
  // Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  // Container,
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
  //Login as LoginIcon,
  //Add as AddIcon,
  //Home as HomeIcon,
  //AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Language as LanguageIcon,
  Person as PersonIcon,
  ViewCompact as ViewCompactIcon,
  Curtains as CurtainsIcon,
  TheaterComedy as TheaterComedyIcon,
  //Theaters as TheatersIcon,
} from '@mui/icons-material';
import Header from './Header';
import Body from './Body';
import Footer from './Footer';
import { useAuth } from '../contexts/AuthContext';
import { useThemeMode } from '../contexts/ThemeContext';
import LoginDialog from './LoginDialog';

interface HomeProps {
  children: React.ReactNode;
}

const Home: React.FC<HomeProps> = ({ children }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  //const location = useLocation();
  const { user, isAuthenticated, /*isAdmin, */logout } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [langDialogOpen, setLangDialogOpen] = useState(false);

  const languages = [ // TODO: to config
    { code: 'en', name: 'English', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' }
  ];

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

  const handleTheaters = () => {
    handleClose();
    navigate('/theaters');
  };

  const handleLayouts = () => {
    handleClose();
    navigate('/layouts');
  };

  const handleEvents = () => {
    handleClose();
    navigate('/events');
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

  // Header: AppBar position="static"
  // Body: <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default' }}></Box>
  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh' // Only set this on the container
    }}>
      <Header>
        <IconButton
          color="inherit"
          onClick={() => navigate('/')}
          edge="start"
          sx={{ mr: 2 }}
        >
          <img 
            src="/images/masks.png" 
            alt="Theater" 
            style={{ 
              width: 48, 
              height: 48,
              filter: mode === 'dark' ? 'invert(0.7)' : '', // Optional: makes white in dark theme
            }} 
          />
        </IconButton>
        
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          {t('TicketUno')} {/* TODO: from config */}
        </Typography>

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
              // transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              // anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
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

              <MenuItem onClick={() => { handleClose(); handleTheaters(); }}>
                <ListItemIcon>
                  <CurtainsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{t('Theaters')}</ListItemText>
              </MenuItem>

              <MenuItem onClick={() => { handleClose(); handleLayouts(); }}>
                <ListItemIcon>
                  <ViewCompactIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{t('Layouts')}</ListItemText>
              </MenuItem>

              <MenuItem onClick={() => { handleClose(); handleEvents(); }}>
                <ListItemIcon>
                  <TheaterComedyIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{t('Events')}</ListItemText>
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
      </Header>

      {/* Main Body Content */}
      <Body>
        {children}
      </Body>

      {/* Footer */}
      <Footer>
        <Typography variant="body2" color="text.secondary" align="center">
          © {new Date().getFullYear()} TicketUno. All rights reserved. {/* TODO: from config */}
        </Typography>
      </Footer>

      <LoginDialog
        open={loginDialogOpen}
        onClose={() => setLoginDialogOpen(false)}
      />

      {/* Language Selection Dialog */}
      <Dialog open={langDialogOpen} onClose={() => setLangDialogOpen(false)}>
        <DialogTitle>{t('Select Language')}</DialogTitle>
        <DialogContent>
          <List>
            {languages.map(({ code, name, flag }) => (
              <ListItem key={code} disablePadding>
                <ListItemButton 
                  onClick={() => handleLanguageChange(code)}
                  selected={i18n.language === code}
                >
                  <ListItemText primary={`${flag} ${name}`} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Home;
