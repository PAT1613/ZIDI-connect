import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import AppLayout from '../components/layout/AppLayout';
import ProtectedRoute from './ProtectedRoute';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
import Customers from '../pages/Customers';
import Services from '../pages/Services';
import Subscriptions from '../pages/Subscriptions';
import Invoices from '../pages/Invoices';
import Payments from '../pages/Payments';
import Communications from '../pages/Communications';
import Notifications from '../pages/Notifications';
import Escalations from '../pages/Escalations';
import Reports from '../pages/Reports';
import Users from '../pages/Users';
import AuditLogs from '../pages/AuditLogs';
import NotFound from '../pages/NotFound';
import Forbidden from '../pages/Forbidden';
import { ROLES } from '../lib/constants';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { path: 'login', element: <Login /> },
      { path: 'forbidden', element: <Forbidden /> },
      {
        path: '',
        element: (
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Dashboard /> },
          { path: 'customers', element: <Customers /> },
          { path: 'services', element: <Services /> },
          { path: 'subscriptions', element: <Subscriptions /> },
          { path: 'invoices', element: <Invoices /> },
          {
            path: 'payments',
            element: (
              <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.FINANCE, ROLES.MANAGER]}>
                <Payments />
              </ProtectedRoute>
            ),
          },
          {
            path: 'communications',
            element: (
              <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.CS_OFFICER, ROLES.OPERATIONS, ROLES.MANAGER]}>
                <Communications />
              </ProtectedRoute>
            ),
          },
          { path: 'notifications', element: <Notifications /> },
          { path: 'escalations', element: <Escalations /> },
          { path: 'reports', element: <Reports /> },
          {
            path: 'users',
            element: (
              <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.MANAGER]}>
                <Users />
              </ProtectedRoute>
            ),
          },
          {
            path: 'audit-logs',
            element: (
              <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.MANAGER]}>
                <AuditLogs />
              </ProtectedRoute>
            ),
          },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
