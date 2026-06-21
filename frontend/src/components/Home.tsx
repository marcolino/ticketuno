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
  Tooltip,
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
  ConfirmationNumber as ConfirmationNumberIcon,
  Group as GroupIcon,
  QrCode as QrCodeIcon,
} from '@mui/icons-material';
import useNavigate from '@/hooks/useNavigate';
import Header from './Header';
import Body from './Body';
import Footer from './Footer';
import { useAuth } from '@/contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';
import { useThemeMode } from '@/contexts/ThemeContext';
import { ThemePreference } from '@ticketuno/shared/types/theme';
import { UserProfile } from '@ticketuno/shared/types/user';
import AuthDialog from './AuthDialog';
import { userApi } from '@/services/api';
import config from '../config';

//console.log('CONFIG is:', config);

// interface HomeProps {
//   children: React.ReactNode;
// }

//const Home: React.FC<HomeProps> = ({ children }) => {
const Home: React.FC = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  //const location = useLocation();
  const { user, updateUser, isAuthenticated, isOperator, isAdmin, logout } = useAuth();
  //const { mode, toggleMode } = useThemeMode();
  //const { mode, changeThemeMode } = useThemeMode();
  const { themePreference, setThemePreference, effectiveMode } = useThemeMode();
  //const { themeType, setThemeType, platform } = useThemeMode();
  
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  //const [langDialogOpen, setLangDialogOpen] = useState(false);

  const [authDialogInitialTab, setAuthDialogInitialTab] = useState<"login" | "register">("login");

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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const authModeParam = params.get("authMode"); // "login" or "register"
    const legacyLoginParam = params.get("login");

    let initialTab: "login" | "register" | null = null;
    if (authModeParam === "login" || legacyLoginParam === "true") {
      initialTab = "login";
    } else if (authModeParam === "register") {
      initialTab = "register";
    }

    if (initialTab) {
      setAuthDialogInitialTab(initialTab);
      setAuthDialogOpen(true);

      // Remove both possible params from URL
      params.delete("authMode");
      params.delete("login");
      navigate(
        {
          pathname: location.pathname,
          search: params.toString(),
        },
        { replace: true }
      );
    }
  }, [location.search, navigate]);
  
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

  const handleBookings = () => {
    handleClose();
    navigate('/bookings');
  };

  const handleMyBookings = () => {
    handleClose();
    navigate('/bookings/my');
  };

  const handleUsers = () => {
    //alert("Work in progress...");
    handleClose();
    navigate('/users');
  };

  const handleBookingsValidate = () => {
    handleClose();
    navigate('/booking/validate');
  };
  const handleProfile = () => {
    handleClose();
    navigate('/user/edit');
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

  const handleLanguageChange = async (lang: string) => {
    i18n.changeLanguage(lang);
    //setLangDialogOpen(false);

    if (user) {
      try {
        const updates: Partial<UserProfile> = {
          language: lang
        };
        await userApi.updateProfile(user.id, updates);
        updateUser({ ...user, language: lang });
      } catch (e) {
        console.error("Failed to update language", e);
      }
    }
  };

  const openGeneralSetup = () => {
    handleClose();
    navigate('/generalSetup');
  }

  //const isHomePage = location.pathname === '/';
  const menuOpen = Boolean(anchorEl);

  const getInitials = () => {
    if (user) {
      return `
${(user.firstName && user.firstName.length && user.firstName[0]) ?? '?'}\
${(user.lastName && user.lastName.length && user.lastName[0]) ?? '?'}\
`.toUpperCase();
    }
    return '';
  };

  //{config.app.languages[i18n.language ?? config.app.defaultLanguage].flag ?? '🏳️' }
  //const languageFlag = '🏳️';
  let lang = config.app.languages[i18n.language];
  if (!lang) {
    lang = config.app.languages[config.app.defaultLanguage];
  }
  const languageFlag = lang.flag ?? '🏳️';

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh' // Only set this on the container, to fill viewport
      //height: '100vh' // Only set this on the container, to fill viewport
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
            alt={t('Logo')}
            style={{ 
              width: 48, 
              height: 48,
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
            {config.app.name}
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
              MenuListProps={{ dense: true }}
            >
              <MenuItem sx={{ fontWeight: 'bold', pb: 0, minHeight: 'unset' }}>
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

              {isOperator && (
                <MenuItem onClick={() => { handleClose(); handleTheaters(); }}>
                  <ListItemIcon>
                    <CurtainsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>{t('Theaters')}</ListItemText>
                </MenuItem>
              )}

              {isOperator && (
                <MenuItem onClick={() => { handleClose(); handleLayouts(); }}>
                  <ListItemIcon>
                    <ViewCompactIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>{t('Layouts')}</ListItemText>
                </MenuItem>
              )}

              <MenuItem onClick={() => { handleClose(); handleEvents(); }}>
                <ListItemIcon>
                  <TheaterComedyIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{t('Events')}</ListItemText>
              </MenuItem>

              <Divider />

              {isOperator && (
                <MenuItem onClick={() => { handleClose(); handleBookingsValidate(); }}>
                  <ListItemIcon>
                    <QrCodeIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>
                    {t('Validate Bookings')}
                  </ListItemText>
                </MenuItem>
              )}

              <MenuItem onClick={() => {
                handleClose();
                if (isOperator || isAdmin) {
                  handleBookings();
                } else {
                  handleMyBookings();
                }
              }}>
                <ListItemIcon>
                  <ConfirmationNumberIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>
                  {isOperator || isAdmin ? t('Bookings') : t('My bookings')}
                </ListItemText>
              </MenuItem>

              <Divider />

              {isOperator && (
                <>
                  <MenuItem onClick={() => { handleClose(); handleUsers(); }}>
                    <ListItemIcon>
                      <GroupIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>
                      {t('Users')}
                    </ListItemText>
                  </MenuItem>

                  <Divider />
                </>
              )}

              <MenuItem onClick={handleProfile}>
                <ListItemIcon>
                  <PersonIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{t('Profile')}</ListItemText>
              </MenuItem>

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
                  <Tooltip title={t('Use "system" theme: your device \'s default theme will be used')}>
                    <ToggleButton value="system" sx={{ py: 0.5, textTransform: 'lowercase' }}>
                      <SettingsSuggestIcon fontSize="small" />{themePreference === 'system' ? ` (${t(effectiveMode)})` : ''}
                    </ToggleButton>
                  </Tooltip>

                  <Tooltip title={t('Use "light" theme: light colors will be used')}>
                    <ToggleButton value="light" sx={{py: 0}}>
                      <LightModeIcon fontSize="small" />
                    </ToggleButton>
                  </Tooltip>
  
                  <Tooltip title={t('Use "dark" theme: dark colors will be used')}>
                    <ToggleButton value="dark" sx={{ py: 0 }}>
                      <DarkModeIcon fontSize="small" />
                    </ToggleButton>
                  </Tooltip>

                </ToggleButtonGroup>
              </MenuItem>
              
              <MenuItem onClick={handleLanguage}>
                <ListItemIcon>
                  <LanguageIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{t('Language')} &nbsp; {languageFlag}</ListItemText>
              </MenuItem>

              {isOperator && (
                <MenuItem onClick={openGeneralSetup}>
                  <ListItemIcon>
                    <SettingsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>{t('Setup')}</ListItemText>
                </MenuItem>
              )}

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
        initialTab={authDialogInitialTab}
      />

    </Box>
  );
};

export default Home;
