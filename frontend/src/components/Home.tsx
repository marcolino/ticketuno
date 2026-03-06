import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from "react-router-dom";
import { useTranslation } from 'react-i18next';
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
  // Dialog,
  // DialogTitle,
  // DialogContent,
  List,
  ListItem,
  ListItemButton,
  ToggleButtonGroup,
  ToggleButton,
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
  SettingsSuggest as SettingsSuggestIcon,
  //Theaters as TheatersIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import useNavigate from '@/hooks/useNavigate';
import Header from './Header';
import Body from './Body';
import Footer from './Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';
import { useThemeMode } from '@/contexts/ThemeContext';
import { ThemePreference } from '@/shared/types/theme';
import AuthDialog from './AuthDialog';
import config from '../config';

console.log('CONFIG is:', config);

// interface HomeProps {
//   children: React.ReactNode;
// }

//const Home: React.FC<HomeProps> = ({ children }) => {
const Home: React.FC = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  //const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
//  const { mode, toggleMode } = useThemeMode();
  //const { mode, changeThemeMode } = useThemeMode();
  const { themePreference, setThemePreference, effectiveMode } = useThemeMode();
  //const { themeType, setThemeType, platform } = useThemeMode();
  
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  //const [langDialogOpen, setLangDialogOpen] = useState(false);

  const showDialog = useDialog();

  // const toggleTheme = () => {
  //   setThemeType(themeType === 'custom' ? 'native' : 'custom');
  // }

  const handleThemeChange = (
    _: React.MouseEvent<HTMLElement>,
    newValue: ThemePreference | null
  ) => {
    if (newValue !== null) {
      setThemePreference(newValue);
    }
  };

  // // TODO: DEBUG ONLY!
  // useEffect(() => {
  //   console.log('xxx Home mounted');
  //   return () => console.log('xxx Home unmounted');
  // }, []);
  // useEffect(() => {
  //   console.log('xxx authDialogOpen changed to:', authDialogOpen);
  // }, [authDialogOpen]);
  // useEffect(() => {
  //   console.log('xxx isAuthenticated changed to:', isAuthenticated);
  // }, [isAuthenticated]);
  // useEffect(() => {
  //   console.log('xxx user changed:', user);
  // }, [user]);
  // useEffect(() => {
  //   console.log('xxx Home mounted, path:', window.location.pathname);
  //   return () => console.log('xxx Home unmounted, path was:', window.location.pathname);
  // }, []);
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldOpenLogin = params.get("login") === "true";

    if (shouldOpenLogin) {
      setAuthDialogOpen(true);

      // remove query param but stay in same page
      params.delete("login");

      navigate(
        {
          pathname: location.pathname,
          search: params.toString(),
        },
        { replace: true }
      );
    }
  }, [location.search]);
  
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
  //     setAuthDialogOpen(true);
  //   } else {
  //     navigate('/theater/new');
  //   }
  // };

  const handleLanguage = () => {
    showDialog({
      title: t('Select Language'),
      content: (
        <List>
          {Object.entries(config.app.languages).map(([code, { name, flag }]) => (
            <ListItem key={code} disablePadding>
              <ListItemButton 
                onClick={() => handleLanguageChange(code)}
                selected={i18n.language === code}
              >
                <ListItemText primary={`${flag} ${name}`} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      ),
      onConfirm: () => { },
      showCloseIcon: true,
      shrinkToContent: true,
    });
  }

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    //setLangDialogOpen(false);
  };

  const openGeneralSetup = () => {
    handleClose();
    navigate('/generalSetup');
  }

  //const isHomePage = location.pathname === '/';
  const menuOpen = Boolean(anchorEl);

  const getInitials = () => {
    if (user) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return '';
  };

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
            src="/images/logo.png" 
            alt={t('Theater')}
            style={{ 
              width: 48, 
              height: 48,
              //filter: mode === 'dark' ? 'invert(0) brightness(0.9) contrast(1.7)' : '', // TODO: use different logo.png icons
            }} 
          />
        </IconButton>
        
        <Typography
          variant="h6"
          component="div"
          sx={{ flexGrow: 1 }}
        >
          <Box 
            onClick={() => navigate('/')} 
            sx={{ display: 'inline', cursor: 'pointer' }}
          >
            {t('TicketUno')} {/* TODO: from config */}
          </Box> 
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
              MenuListProps={{ dense: false }}
            >
              <MenuItem sx={{ fontWeight: 'bold', pb: 0 }}>
                <Typography variant="body2">
                  {user?.firstName} {user?.lastName} ({user?.role})
                </Typography>
              </MenuItem>

              <MenuItem sx={{ fontWeight: 'bold', fontStyle: 'italic', py: 0 }}>
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
                <ListItemText>{t('Profile')}</ListItemText>
              </MenuItem>

              {/* <MenuItem onClick={toggleMode}>
                <ListItemIcon>
                  {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                </ListItemIcon>
                <ListItemText>{mode === 'dark' ? t('Light Mode') : t('Dark Mode')}</ListItemText>
              </MenuItem> */}

              {/* <MenuItem>
                <ListItemIcon>
                  {mode === 'light' ? <LightModeIcon fontSize="small" /> : mode === 'dark' ? <DarkModeIcon fontSize="small" /> :  <SettingsSuggestIcon fontSize="small" />}
                </ListItemIcon>
                <ListItemText>{t('Theme')}</ListItemText>
                &emsp;
                <ToggleButtonGroup size="small" onChange={changeThemeMode} aria-label={t("Theme selection")}>
                  <ToggleButton value="bold" aria-label="bold">
                    <LightModeIcon fontSize="small" />
                  </ToggleButton>
                    <ToggleButton value="bold" aria-label="bold">
                    <DarkModeIcon fontSize="small" />
                  </ToggleButton>
                    <ToggleButton value="bold" aria-label="bold">
                    <SettingsSuggestIcon fontSize="small" />
                  </ToggleButton>
                </ToggleButtonGroup>
              </MenuItem> */}

              <MenuItem>
                <ListItemIcon>
                  {
                    themePreference === 'light' ? <LightModeIcon fontSize="small" /> :
                      themePreference === 'dark' ? <DarkModeIcon fontSize="small" /> :
                        <SettingsSuggestIcon fontSize="small" />
                  }
                </ListItemIcon>
                <ListItemText>{t('Theme')}</ListItemText>
                &emsp;
                <ToggleButtonGroup
                  size="small"
                  value={themePreference}
                  exclusive
                  onChange={handleThemeChange}
                  aria-label={t("Theme selection")}
                  sx={{ my: -0.5 }}
                >
                  <ToggleButton value="system" sx={{ py: 0.5, textTransform: 'lowercase' }}>
                    <SettingsSuggestIcon fontSize="small" />{themePreference === 'system' ? ` (${t(effectiveMode)})` : ''}
                  </ToggleButton>

                  <ToggleButton value="light" sx={{py: 0}}>
                    <LightModeIcon fontSize="small" />
                  </ToggleButton>

                  <ToggleButton value="dark" sx={{py: 0}}>
                    <DarkModeIcon fontSize="small" />
                  </ToggleButton>

                </ToggleButtonGroup>
              </MenuItem>
              
              <MenuItem onClick={handleLanguage}>
                <ListItemIcon>
                  <LanguageIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{t('Language')} &nbsp; {config.app.languages[i18n.language].flag ?? '🏳️' }</ListItemText>
              </MenuItem>

              <MenuItem onClick={openGeneralSetup}>
                <ListItemIcon>
                  <SettingsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{t('Setup')}</ListItemText>
              </MenuItem>

              <Divider />

              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{t('Logout')}</ListItemText>
              </MenuItem>

            </Menu>
          </>
        ) : (
          <Button
            variant="contained"
            size="small"
            color="secondary"
            onClick={() => setAuthDialogOpen(true)}
            disabled={authDialogOpen} 
          >
            {t("Join !")}
          </Button>
        )}
      </Header>

      {/* Main Body Content */}
      <Body>
        <Outlet />
      </Body>

      {/* Footer */}
      <Footer />

      {/* Login dialog */}
      <AuthDialog
        open={authDialogOpen}
        onClose={() => setAuthDialogOpen(false)}
      />

    </Box>
  );
};

export default Home;
