//import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { ProtectedRoute as PR } from './components/ProtectedRoute';
import RootLayout from './components/RootLayout';
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

const router = createBrowserRouter(
  [
    {
      // RootLayout renders ConsentProvider + OAuthHandler + ToastRouteHandler + <Outlet />
      element: <RootLayout />,
      children: [
        {
          // Home is the persistent layout shell (nav, drawer, etc.) with <Outlet />
          element: <Home />,
          children: [
            { index: true,                                                    element: <EventList /> },
            { path: 'events',                                                 element: <EventList /> },
            { path: 'event/new',                                              element: <PR requireOperator={true}><EventEdit /></PR> },
            { path: 'event/:id',                                              element: <PerformanceList /> },
            { path: 'event/edit/:id',                                         element: <PR requireOperator={true}><EventEdit /></PR> },
            { path: 'event/:eventId/performance/:performanceId/book',         element: <PerformanceBooking /> },
            { path: 'theaters',                                               element: <PR requireOperator={true}><TheatersList /></PR> },
            { path: 'theater/new',                                            element: <PR requireOperator={true}><TheaterEdit /></PR> },
            { path: 'theater/edit/:id',                                       element: <PR requireOperator={true}><TheaterEdit /></PR> },
            { path: 'layout/new/:theaterId?',                                 element: <PR requireOperator={true}><LayoutEdit /></PR> },
            { path: 'layout/edit/:id',                                        element: <PR requireOperator={true}><LayoutEdit /></PR> },
            { path: 'layouts',                                                element: <PR requireOperator={true}><LayoutList /></PR> },
            // This is not a protected route because users can handle their own bookings too
            { path: 'bookings',                                               element: <BookingsList /> },
            { path: 'booking/validate',                                       element: <BookingValidate /> },
            { path: 'users',                                                  element: <PR requireOperator={true}><UsersList /></PR> },
            { path: 'profile/:id?',                                           element: <UserEdit /> }, // TODO: /profile => /user/edit
            { path: 'unsubscribe/:token/:type?',                              element: <Unsubscribe /> },
            { path: 'consent/:token/:type?',                                  element: <ConsentEntry /> },
            { path: 'generalSetup',                                           element: <GeneralSetup /> },
            { path: 'maintenance',                                            element: <Maintenance /> },
            { path: '*',                                                      element: <NotFound /> },
          ],
        },
      ],
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
    },
  }
);

export default router;
