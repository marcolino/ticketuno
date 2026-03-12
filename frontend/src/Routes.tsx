import React from 'react';
import { Route, Routes as ReactRoutes } from 'react-router-dom';
import { ProtectedRoute as PR } from './components/ProtectedRoute';
import Home from './components/Home';
import EventDetails from './components/EventDetails';
import EventList from './components/EventList';
import EventEdit from './components/EventEdit';
import TheaterList from './components/TheaterList';
import PerformanceBooking from './components/PerformanceBooking';
import TheaterEdit from './components/TheaterEdit';
import LayoutList from './components/LayoutList';
import LayoutEdit from './components/LayoutEdit';
import Profile from './components/Profile';
import Unsubscribe from './components/Unsubscribe';
import ConsentEntry from './components/ConsentEntry';
import GeneralSetup from './components/GeneralSetup';
import Maintenance from './components/Maintenance';
import NotFound from './components/NotFound';

const Routes: React.FC = () => {
  return (
    <ReactRoutes>
      <Route element={<Home />}>
        <Route path="/" element={<EventList />} />
        <Route path="/events" element={<EventList />} />
        <Route path="/event/new" element={<EventEdit />} />
        <Route path="/event/:id" element={<EventDetails />} />
        <Route path="/event/edit/:id" element={<PR requireOperator={true}><EventEdit /></PR>} />
        <Route path="/event/:eventId/performance/:performanceId/book" element={<PerformanceBooking />} />
        <Route path="/theaters" element={<TheaterList />} />
        <Route path="/theater/new" element={<PR requireOperator={true}><TheaterEdit /></PR>} />
        {/* <Route path="/theater/:id" element={<TheaterSeating />} /> */}
        <Route path="/theater/edit/:id" element={<PR requireOperator={true}><TheaterEdit /></PR>} />
        <Route path="/layout/new/:theaterId?" element={<PR requireOperator={false}><LayoutEdit /></PR>} />
        <Route path="/layout/edit/:id" element={<PR requireOperator={false}><LayoutEdit /></PR>} />
        <Route path="/layouts" element={<PR requireOperator={false}><LayoutList /></PR>} />
        {/* <Route path="/layout/:json" element={<PR requireAdmin={true}><LayoutPreviewSVG /></PR>} /> */}
        {/* <Route path="/performance/:eventId/:performanceId" element={<TheaterSeating />} /> */}
        <Route path="/profile" element={<Profile />} />
        <Route path="/unsubscribe/:token/:type?" element={<Unsubscribe />} />
        <Route path="/consent/:token/:type?" element={<ConsentEntry />} />
        <Route path="/generalSetup" element={<GeneralSetup />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </ReactRoutes>
  );
}

export default Routes;