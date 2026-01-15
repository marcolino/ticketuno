import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { LoadingProvider } from './contexts/LoadingContext';
import OAuthHandler from './components/OAuthHandler';
import { ProtectedRoute as PR } from './components/ProtectedRoute';
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
              <OAuthHandler />
              <Layout>
                <Routes>
                  <Route path="/" element={<ShowList />} />
                  <Route path="/shows" element={<ShowList />} />
                  <Route path="/show/new" element={<ShowEdit />} />
                  <Route path="/show/:id" element={<ShowDetails />} />
                  <Route path="/show/edit/:id" element={<PR requireAdmin={true}><ShowEdit /></PR>} />
                  <Route path="/theaters" element={<TheaterList />} />
                  <Route path="/theater/new" element={<PR requireAdmin={true}><TheaterEdit /></PR>} />
                  <Route path="/theater/:id" element={<TheaterSeating />} />
                  <Route path="/theater/edit/:id" element={<PR requireAdmin={true}><TheaterEdit /></PR>} />
                  <Route path="/performance/:showId/:performanceId" element={<TheaterSeating />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Layout>
            </Router>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </LoadingProvider>
  );
};

export default App;
