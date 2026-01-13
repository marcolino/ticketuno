import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';

import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
//import { useToast } from './context/ToastContext';
import { ToastProvider } from './contexts/ToastContext';

import { LoadingProvider } from './contexts/LoadingContext';
import { LoadingSpinner } from './components/LoadingSpinner';

import Layout from './components/Layout';
import ShowDetails from './components/ShowDetails';
import ShowList from './components/ShowList';
import ShowEdit from './components/ShowEdit';
import TheaterList from './components/TheaterList';
import TheaterSeating from './components/TheaterSeating';
import TheaterEdit from './components/TheaterEdit';
import Profile from './components/Profile';
import NotFound from './components/NotFound';
//import { Toaster } from './utils/toast';
// import { ToastProvider } from './utils/toast';
import './i18n/config';


console.log('🎭 App is starting');

const App: React.FC = () => {
  return (
    <LoadingProvider /*minLoadingTime={3000}*/>
      <LoadingSpinner />
      <ThemeProvider>
        <ToastProvider>
          <CssBaseline />
          <AuthProvider>
            <Router future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true,
            }}>
              <Layout>
                <Routes>
                  <Route path="/" element={<ShowList />} />
                  <Route path="/shows" element={<ShowList />} />{/* TODO: is it used in code? */}
                  <Route path="/show/new" element={<ShowEdit />} />
                  <Route path="/show/:id" element={<ShowDetails />} />
                  <Route path="/show/edit/:id" element={<ShowEdit />} />
                  <Route path="/theaters" element={<TheaterList />} />
                  <Route path="/theater/new" element={<TheaterEdit />} />
                  <Route path="/theater/:id" element={<TheaterSeating />} />
                  <Route path="/theater/edit/:id" element={<TheaterEdit />} />
                  <Route path="/performance/:showId/:performanceId" element={<TheaterSeating />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
            </Router>
          </AuthProvider>
          {/* <Toaster /> */}
        </ToastProvider>
      </ThemeProvider>
    </LoadingProvider>
  );
};

export default App;
