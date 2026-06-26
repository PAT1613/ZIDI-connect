import { useState } from 'react';
import { Menu, LogOut, User as UserIcon, Bell } from 'lucide-react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { listNotifications } from '../../api/notifications';

export default function Topbar({ onMenuClick }) {
  const { user, logout, roleName } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: notif } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => listNotifications({ page_size: 1 }),
    refetchInterval: 60_000,
  });

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <header className="flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4">
      <button
        type="button"
        className="rounded p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        onClick={onMenuClick}
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex-1" />
      <button
        type="button"
        onClick={handleLogout}
        className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
        aria-label="Sign out"
      >
        <LogOut className="h-4 w-4" />
        <span>Sign out</span>
      </button>
      <NavLink
        to="/notifications"
        className="relative rounded p-2 text-slate-600 hover:bg-slate-100"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {notif?.count ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {notif.count > 99 ? '99+' : notif.count}
          </span>
        ) : null}
      </NavLink>
      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-slate-100"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <UserIcon className="h-4 w-4" />
          </div>
          <div className="hidden md:block">
            <div className="text-xs font-semibold text-slate-900">{user?.full_name || user?.email}</div>
            <div className="text-[10px] text-slate-500">{roleName || (user?.is_superuser ? 'Super Admin' : 'User')}</div>
          </div>
        </button>
        {menuOpen ? (
          <div
            className="absolute right-0 top-full z-30 mt-1 w-44 rounded-md border border-slate-200 bg-white py-1 shadow-lg"
            onMouseLeave={() => setMenuOpen(false)}
          >
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
