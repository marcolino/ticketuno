import React, { useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { useTranslation } from 'react-i18next';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/it'; // TODO: Import all locales we support
import 'dayjs/locale/en';
import 'dayjs/locale/fr';
import { itIT } from '@mui/x-date-pickers/locales';
import { enUS } from '@mui/x-date-pickers/locales';
import { frFR } from '@mui/x-date-pickers/locales';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { DialogProvider } from './contexts/DialogContext';
import { ToastProvider } from './contexts/ToastContext';
import { LoadingProvider } from './contexts/LoadingContext';
import OAuthHandler from './components/OAuthHandler';
import { ProtectedRoute as PR } from './components/ProtectedRoute';
import { LoadingSpinner } from './components/LoadingSpinner';
import Home from './components/Home';
import EventDetails from './components/EventDetails';
import EventList from './components/EventList';
import EventEdit from './components/EventEdit';
import TheaterList from './components/TheaterList';
//import TheaterSeating from './components/TheaterSeating';
import PerformanceBooking from './components/PerformanceBooking';
import TheaterEdit from './components/TheaterEdit';
import LayoutList from './components/LayoutList';
import LayoutEdit from './components/LayoutEdit';
import Profile from './components/Profile';
import NotFound from './components/NotFound';
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
                  <OAuthHandler />
                  <Home>
                    <Routes>{/* TODO: move routes in Route component... */}
                      <Route path="/" element={<EventList />} />
                      <Route path="/events" element={<EventList />} />
                      <Route path="/event/new" element={<EventEdit />} />
                      <Route path="/event/:id" element={<EventDetails />} />
                      <Route path="/event/edit/:id" element={<PR requireAdmin={true}><EventEdit /></PR>} />
                      <Route path="/theaters" element={<TheaterList />} />
                      <Route path="/theater/new" element={<PR requireAdmin={true}><TheaterEdit /></PR>} />
                      {/* <Route path="/theater/:id" element={<TheaterSeating />} /> */}
                      <Route path="/theater/edit/:id" element={<PR requireAdmin={true}><TheaterEdit /></PR>} />
                      <Route path="/layout/new/:theaterId?" element={<PR requireAdmin={false}><LayoutEdit /></PR>} />
                      <Route path="/layout/edit/:id" element={<PR requireAdmin={false}><LayoutEdit /></PR>} />
                      <Route path="/layouts" element={<PR requireAdmin={false}><LayoutList /></PR>} />
                      {/* <Route path="/layout/:json" element={<PR requireAdmin={true}><LayoutPreviewSVG /></PR>} /> */}
                      {/* <Route path="/performance/:eventId/:performanceId" element={<TheaterSeating />} /> */}
                      <Route path="/event/:eventId/performance/:performanceId/book" element={<PerformanceBooking />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Home>
                </Router>
              </AuthProvider>
            </ToastProvider>
          </DialogProvider>
        </LoadingProvider>
      </ThemeProvider>
    </LocalizationProvider>
  );
};

export default App;
