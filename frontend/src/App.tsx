import React, { useMemo } from 'react';
import { BrowserRouter as Router, /*Routes, Route*/ } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { useTranslation } from 'react-i18next';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
// TODO: Automatically import all locales we support, if possible
import 'dayjs/locale/it';
import 'dayjs/locale/en';
import 'dayjs/locale/fr';
import 'dayjs/locale/zh';
import { itIT } from '@mui/x-date-pickers/locales';
import { enUS } from '@mui/x-date-pickers/locales';
import { frFR } from '@mui/x-date-pickers/locales';
import { zhCN } from '@mui/x-date-pickers/locales';
import AuthProvider from './contexts/AuthContext';
import { SetupProvider } from './contexts/SetupContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { DialogProvider } from './contexts/DialogContext';
import { ToastProvider } from './contexts/ToastContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { ConsentProvider } from './contexts/ConsentContext';
import OAuthHandler from './components/OAuthHandler';
import ToastRouteHandler from './components/ToastRouteHandler';
import { LoadingSpinner } from './components/LoadingSpinner';
//import Home from './components/Home';
//import { globalApi } from '@/services/api';
import Routes from './Routes';
import config from '@/config';

console.log(`🎭 App ${config.app.name} is starting`);

const App: React.FC = () => {
const { i18n } = useTranslation();  
  
  // Map i18next language codes to dayjs locale codes if needed
  const adapterLocale = (lang: string) => {
    // Handle language codes like 'en-US' -> 'en'
    return lang.split('-')[0];
  };

  // Map language to MUI locale
  const muiLocale = useMemo(() => {
    const lang = i18n.language.split('-')[0];
    switch (lang) {
      // TODO: add all supported languages
      case 'it':
        return itIT.components.MuiLocalizationProvider.defaultProps.localeText;
      case 'en':
        return enUS.components.MuiLocalizationProvider.defaultProps.localeText;
      case 'fr':
        return frFR.components.MuiLocalizationProvider.defaultProps.localeText;
      case 'zh':
        return zhCN.components.MuiLocalizationProvider.defaultProps.localeText;
      default:
        return undefined; // English is default
    }
  }, [i18n.language]);

  // useEffect(() => {
  //   //fetch('/api/v1/health', { timeout: 3000 })
  //   (async () => {
  //     try {
  //       await globalApi.health();
  //     } catch (error: any) {
  //       if (error.response?.status === 503) {
  //         window.location.href = '/maintenance.html';
  //       }
  //     }
  //   })();
  // }, []);
  //   fetch('/api/v1/health', { signal: AbortSignal.timeout(3 * 1000) })
  //     .catch(err => {
  //       if (err.response?.status === 503) {
  //         window.location.href = '/maintenance.html';
  //       }
  //     });
  // }, []);

  return (
    <LocalizationProvider
      dateAdapter={AdapterDayjs}
      adapterLocale={adapterLocale(i18n.language)}
      localeText={muiLocale}
      key={adapterLocale(i18n.language)}
    >
      <SetupProvider>
        <ThemeProvider>
          <LoadingProvider /*minLoadingTime={3000}*/>
            <LoadingSpinner />
            <DialogProvider>
              <ToastProvider>
                <CssBaseline />
                <AuthProvider>
                  <Router future={{
                    v7_startTransition: true,
                    v7_relativeSplatPath: true,
                  }}>
                    <ConsentProvider>
                      <OAuthHandler />
                      <ToastRouteHandler />
                      <Routes />
                    </ConsentProvider>
                  </Router>
                </AuthProvider>
              </ToastProvider>
            </DialogProvider>
          </LoadingProvider>
        </ThemeProvider>
      </SetupProvider>
    </LocalizationProvider>
  );
};

export default App; 
