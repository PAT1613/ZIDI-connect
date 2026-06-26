import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  ClipboardList,
  Receipt,
  Wallet,
  MessageSquare,
  Bell,
  AlertTriangle,
  BarChart3,
  ShieldCheck,
  History,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../lib/constants';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/customers', label: 'Customers', icon: Users, roles: [ROLES.SUPER_ADMIN, ROLES.CS_OFFICER, ROLES.FINANCE, ROLES.OPERATIONS, ROLES.MANAGER] },
  { to: '/services', label: 'Services', icon: Briefcase, roles: [ROLES.SUPER_ADMIN, ROLES.OPERATIONS, ROLES.MANAGER, ROLES.CS_OFFICER, ROLES.FINANCE] },
  { to: '/subscriptions', label: 'Subscriptions', icon: ClipboardList },
  { to: '/invoices', label: 'Invoices', icon: Receipt },
  { to: '/payments', label: 'Payments', icon: Wallet, roles: [ROLES.SUPER_ADMIN, ROLES.FINANCE, ROLES.MANAGER] },
  { to: '/communications', label: 'Communications', icon: MessageSquare, roles: [ROLES.SUPER_ADMIN, ROLES.CS_OFFICER, ROLES.OPERATIONS, ROLES.MANAGER] },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/escalations', label: 'Escalations', icon: AlertTriangle },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/users', label: 'Users', icon: ShieldCheck, roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER] },
  { to: '/audit-logs', label: 'Audit Logs', icon: History, roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER] },
];

export default function Sidebar({ open, onClose }) {
  const { hasRole, user } = useAuth();

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
          onClick={onClose}
        />
      ) : null}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 w-64 transform bg-slate-900 text-slate-200 transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-14 items-center gap-2 border-b border-slate-800 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-700 text-white font-bold">
            Z
          </div>
          <div>
            <div className="text-sm font-semibold text-white">ZIDI Connect</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">v1.0</div>
          </div>
        </div>
        <nav className="px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV.filter((item) => !item.roles || hasRole(item.roles) || user?.is_superuser).map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition',
                    isActive
                      ? 'bg-brand-700 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
