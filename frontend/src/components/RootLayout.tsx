import React from 'react';
import { Outlet } from 'react-router-dom';
import { ConsentProvider } from '@/contexts/ConsentContext';
import OAuthHandler from './OAuthHandler';
import ToastRouteHandler from './ToastRouteHandler';

/**
 * RootLayout is the outermost route element rendered by createBrowserRouter.
 * It replaces the inline wrapper that used to sit inside <Router> in App.tsx.
 * Providers that consume router hooks (useLocation, useNavigate, etc.)
 * must live here rather than outside <RouterProvider>.
 */
const RootLayout: React.FC = () => (
  <ConsentProvider>
    <OAuthHandler />
    <ToastRouteHandler />
    <Outlet />
  </ConsentProvider>
);

export default RootLayout;