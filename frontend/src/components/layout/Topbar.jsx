import { useEffect, useRef, useState } from 'react';
import { Menu, LogOut, User as UserIcon, Bell, ChevronDown, Search } from 'lucide-react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { listNotifications } from '../../api/notifications';

export default function Topbar({ onMenuClick }) {
  const { user, logout, roleName } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const { data: notif } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => listNotifications({ page_size: 1 }),
    refetchInterval: 60_000,
  });

  useEffect(() => {
    function onClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const initial = (user?.full_name || user?.email || 'U').slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink-200/70 bg-white/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-white/70 md:px-6">
      <button
        type="button"
        className="rounded-md p-2 text-ink-600 hover:bg-ink-100 lg:hidden"
        onClick={onMenuClick}
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden flex-1 md:flex">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="search"
            placeholder="Search customers, invoices, services…"
            className="w-full rounded-lg border border-ink-200 bg-ink-50/60 py-2 pl-10 pr-3 text-sm text-ink-800 placeholder-ink-400 transition focus:border-brand-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-600/15"
          />
        </div>
      </div>
      <div className="flex-1 md:hidden" />

      <NavLink
        to="/notifications"
        className="relative rounded-md p-2 text-ink-600 hover:bg-ink-100"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {notif?.count ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white ring-2 ring-white">
            {notif.count > 99 ? '99+' : notif.count}
          </span>
        ) : null}
      </NavLink>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-transparent px-1.5 py-1.5 text-left transition hover:border-ink-200 hover:bg-ink-50"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gradient text-sm font-semibold text-white shadow-sm">
            {initial}
          </div>
          <div className="hidden md:block leading-tight">
            <div className="text-xs font-semibold text-ink-900">{user?.full_name || user?.email}</div>
            <div className="text-[10px] uppercase tracking-wide text-ink-500">
              {roleName || (user?.is_superuser ? 'Super Admin' : 'User')}
            </div>
          </div>
          <ChevronDown className="hidden h-4 w-4 text-ink-400 md:block" />
        </button>
        {menuOpen ? (
          <div className="absolute right-0 top-full z-30 mt-1.5 w-56 origin-top-right animate-fade-in rounded-lg border border-ink-200 bg-white py-1 shadow-soft">
            <div className="border-b border-ink-100 px-3 py-2">
              <div className="truncate text-xs font-semibold text-ink-900">{user?.full_name || user?.email}</div>
              <div className="truncate text-[11px] text-ink-500">{user?.email}</div>
            </div>
            <button
              type="button"
              onClick={() => { setMenuOpen(false); navigate('/settings'); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-ink-50"
            >
              <UserIcon className="h-4 w-4 text-ink-500" />
              Account
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
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
