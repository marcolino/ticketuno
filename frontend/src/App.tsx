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
import Design from './components/Design';
import EventDetails from './components/EventDetails';
import EventList from './components/EventList';
import EventEdit from './components/EventEdit';
import TheaterList from './components/TheaterList';
import TheaterSeating from './components/TheaterSeating';
import TheaterEdit from './components/TheaterEdit';
import LayoutList from './components/LayoutList';
import LayoutEditor from './components/LayoutEditor';
// import LayoutPreviewSVG from './components/LayoutPreviewSVG';
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
              <Design>
                <Routes>
                  <Route path="/" element={<LayoutList />} />
                  {/* <Route path="/" element={<EventList />} /> */}
                  <Route path="/events" element={<EventList />} />
                  <Route path="/event/new" element={<EventEdit />} />
                  <Route path="/event/:id" element={<EventDetails />} />
                  <Route path="/event/edit/:id" element={<PR requireAdmin={true}><EventEdit /></PR>} />
                  <Route path="/theaters" element={<TheaterList />} />
                  <Route path="/theater/new" element={<PR requireAdmin={true}><TheaterEdit /></PR>} />
                  <Route path="/theater/:id" element={<TheaterSeating />} />
                  <Route path="/theater/edit/:id" element={<PR requireAdmin={true}><TheaterEdit /></PR>} />
                  <Route path="/layout/new" element={<PR requireAdmin={false}><LayoutEditor /></PR>} />
                  <Route path="/layout/edit/:id" element={<PR requireAdmin={false}><LayoutEditor /></PR>} />
                  <Route path="/layouts" element={<PR requireAdmin={false}><LayoutList /></PR>} />
                  {/* <Route path="/layout/:json" element={<PR requireAdmin={true}><LayoutPreviewSVG /></PR>} /> */}
                  <Route path="/performance/:eventId/:performanceId" element={<TheaterSeating />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Design>
            </Router>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </LoadingProvider>
  );
};

export default App;
