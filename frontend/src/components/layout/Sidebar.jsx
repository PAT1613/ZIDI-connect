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
  Settings as SettingsIcon,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../lib/constants';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/customers', label: 'Customers', icon: Users, roles: [ROLES.SUPER_ADMIN, ROLES.CS_OFFICER, ROLES.FINANCE, ROLES.OPERATIONS, ROLES.MANAGER] },
      { to: '/services', label: 'Services', icon: Briefcase, roles: [ROLES.SUPER_ADMIN, ROLES.OPERATIONS, ROLES.MANAGER, ROLES.CS_OFFICER, ROLES.FINANCE] },
      { to: '/subscriptions', label: 'Subscriptions', icon: ClipboardList },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/invoices', label: 'Invoices', icon: Receipt },
      { to: '/payments', label: 'Payments', icon: Wallet, roles: [ROLES.SUPER_ADMIN, ROLES.FINANCE, ROLES.MANAGER] },
    ],
  },
  {
    label: 'Engagement',
    items: [
      { to: '/communications', label: 'Communications', icon: MessageSquare, roles: [ROLES.SUPER_ADMIN, ROLES.CS_OFFICER, ROLES.OPERATIONS, ROLES.MANAGER] },
      { to: '/notifications', label: 'Notifications', icon: Bell },
      { to: '/escalations', label: 'Escalations', icon: AlertTriangle },
    ],
  },
  {
    label: 'Admin',
    items: [
      { to: '/reports', label: 'Reports', icon: BarChart3 },
      { to: '/users', label: 'Users', icon: ShieldCheck, roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER] },
      { to: '/audit-logs', label: 'Audit Logs', icon: History, roles: [ROLES.SUPER_ADMIN, ROLES.MANAGER] },
      { to: '/settings', label: 'Settings', icon: SettingsIcon, roles: [ROLES.SUPER_ADMIN] },
    ],
  },
];

function NavItem({ to, label, icon: Icon, onClose }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClose}
      className={({ isActive }) =>
        clsx(
          'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
          isActive
            ? 'bg-brand-700/95 text-white shadow-sm'
            : 'text-ink-300 hover:bg-white/5 hover:text-white',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? (
            <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r bg-accent-400" />
          ) : null}
          <Icon className={clsx('h-4 w-4 shrink-0 transition', isActive ? 'text-white' : 'text-ink-400 group-hover:text-white')} />
          <span>{label}</span>
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ open, onClose }) {
  const { hasRole, user } = useAuth();
  const canSee = (item) => !item.roles || hasRole(item.roles) || user?.is_superuser;

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-40 bg-ink-900/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      ) : null}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex w-64 transform flex-col bg-ink-900 text-ink-200 transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{
          backgroundImage:
            'linear-gradient(180deg, #0f172a 0%, #0b1325 60%, #0a1023 100%)',
        }}
      >
        <div className="flex h-16 items-center justify-between gap-2 border-b border-white/5 px-5">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-brand-gradient text-base font-bold text-white shadow-lg shadow-brand-900/40">
              Z
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-accent-400 ring-2 ring-ink-900" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-white">ZIDI Connect</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-brand-300">Operations Suite</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-ink-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV_GROUPS.map((group) => {
            const visible = group.items.filter(canSee);
            if (visible.length === 0) return null;
            return (
              <div key={group.label} className="mb-4">
                <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-500">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {visible.map((item) => (
                    <NavItem key={item.to} {...item} onClose={onClose} />
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/5 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-700/30 text-xs font-semibold text-brand-200">
              {(user?.full_name || user?.email || 'U').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-xs font-medium text-white">
                {user?.full_name || user?.email}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-ink-500">
                v1.0.0
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
