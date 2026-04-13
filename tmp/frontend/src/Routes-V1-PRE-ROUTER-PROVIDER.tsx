import React from 'react';
import { Route, Routes as ReactRoutes } from 'react-router-dom';
import { ProtectedRoute as PR } from './components/ProtectedRoute';
import Home from './components/Home';
import PerformanceList from './components/PerformanceList';
import EventList from './components/EventList';
import EventEdit from './components/EventEdit';
import TheatersList from './components/TheatersList';
import PerformanceBooking from './components/PerformanceBooking';
import TheaterEdit from './components/TheaterEdit';
import LayoutEdit from './components/LayoutEdit';
import LayoutList from './components/LayoutList';
import BookingsList from './components/BookingsList';
import BookingValidate from './components/BookingValidate';
import UsersList from './components/UsersList';
import UserEdit from './components/UserEdit';
import Unsubscribe from './components/Unsubscribe';
import ConsentEntry from './components/ConsentEntry';
import GeneralSetup from './components/GeneralSetup';
import Maintenance from './components/Maintenance';
import NotFound from './components/NotFound';

const Routes: React.FC = () => {
  //const navigate = useNavigate();
  return (
    <ReactRoutes>
      <Route element={<Home />}>
        <Route path="/" element={<EventList />} />
        <Route path="/events" element={<EventList />} />
        <Route path="/event/new" element={<PR requireOperator={true}><EventEdit /></PR>} />
        <Route path="/event/:id" element={<PerformanceList />} />
        <Route path="/event/edit/:id" element={<PR requireOperator={true}><EventEdit /></PR>} />
        <Route path="/event/:eventId/performance/:performanceId/book" element={<PerformanceBooking />} />
        <Route path="/theaters" element={<PR requireOperator={true}><TheatersList /></PR>} />
        <Route path="/theater/new" element={<PR requireOperator={true}><TheaterEdit /></PR>} />
        <Route path="/theater/edit/:id" element={<PR requireOperator={true}><TheaterEdit /></PR>} />
        <Route path="/layout/new/:theaterId?" element={<PR requireOperator={true}><LayoutEdit /></PR>} />
        <Route path="/layout/edit/:id" element={<PR requireOperator={true}><LayoutEdit /></PR>} />
        <Route path="/layouts" element={<PR requireOperator={true}><LayoutList /></PR>} />
        {/* This is not a protected route because users can handle their own bookings too */}
        <Route path="/bookings" element={<BookingsList />} />
        <Route path="/booking/validate" element={<BookingValidate />} />
        <Route path="/users" element={<PR requireOperator={true}><UsersList /></PR>} />
        <Route path="/profile/:id?" element={<UserEdit />} /> {/* TODO:  /profile => /user/edit */}
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
