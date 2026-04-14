import React, { useMemo } from 'react';
import { RouterProvider } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { useTranslation } from 'react-i18next';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import AuthProvider from './contexts/AuthContext';
import { SetupProvider } from './contexts/SetupContext';
import { ThemeProvider } from './contexts/ThemeContext';
//import { DialogProvider } from './contexts/DialogContext';
import { DialogProvider, DialogRenderer } from './contexts/DialogContext'; 
import { ToastProvider } from './contexts/ToastContext';
import { LoadingProvider } from './contexts/LoadingContext';
import { LoadingSpinner } from './components/LoadingSpinner';
import { usePwa } from './pwa/usePwa';
import router from './Routes';
import config from '@/config';

// Import here all locales we support
import 'dayjs/locale/it';
import 'dayjs/locale/en';
import 'dayjs/locale/fr';
import 'dayjs/locale/zh';
import { itIT } from '@mui/x-date-pickers/locales';
import { enUS } from '@mui/x-date-pickers/locales';
import { frFR } from '@mui/x-date-pickers/locales';
import { zhCN } from '@mui/x-date-pickers/locales';

console.log(`🎭 App ${config.app.name} is starting`);

const PwaInitializer: React.FC = () => {
  usePwa();
  return null;
};

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
      // Add all supported languages here
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

  return (
    <LocalizationProvider
      dateAdapter={AdapterDayjs}
      adapterLocale={adapterLocale(i18n.language)}
      localeText={muiLocale}
      key={adapterLocale(i18n.language)}
    >
      <SetupProvider>
        <ThemeProvider>
          <LoadingProvider>
            <LoadingSpinner />
            <ToastProvider>
              <PwaInitializer />
              <CssBaseline />
              <DialogProvider>
                <AuthProvider>
                  <DialogRenderer />
                  {/*
                    ConsentProvider, OAuthHandler, and ToastRouteHandler have moved into
                    RootLayout so they remain inside the router and can use router hooks.
                    v7_startTransition stays here on RouterProvider; v7_relativeSplatPath
                    is passed to createBrowserRouter in Routes.tsx.
                  */}
                  <RouterProvider router={router} future={{ v7_startTransition: true }} />
                </AuthProvider>
              </DialogProvider>
            </ToastProvider>
          </LoadingProvider>
        </ThemeProvider>
      </SetupProvider>
    </LocalizationProvider>
  );
};

export default App;
