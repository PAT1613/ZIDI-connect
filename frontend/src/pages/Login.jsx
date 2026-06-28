import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LogIn, ShieldCheck, BarChart3, Users, Receipt } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import FormField from '../components/ui/FormField';
import { extractError } from '../api/client';

const FEATURES = [
  { icon: Users, title: 'Customer & service management', desc: 'A single book of record for every customer, subscription and renewal date.' },
  { icon: Receipt, title: 'Automated invoicing', desc: 'Generate, send and track invoices — branded PDF exports out of the box.' },
  { icon: BarChart3, title: 'Live operational dashboards', desc: 'Revenue, escalations and engagement at a glance, refreshed every minute.' },
  { icon: ShieldCheck, title: 'Role-based access', desc: 'Five roles, full audit trail, JWT-secured API.' },
];

export default function Login() {
  const { login, isAuthenticated, initializing } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (!initializing && isAuthenticated) {
    const to = location.state?.from?.pathname || '/';
    return <Navigate to={to} replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back');
      const to = location.state?.from?.pathname || '/';
      navigate(to, { replace: true });
    } catch (err) {
      toast.error(extractError(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-5">
      <div className="relative hidden overflow-hidden bg-brand-gradient lg:col-span-2 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(at 20% 30%, rgba(255,255,255,0.18) 0px, transparent 50%), radial-gradient(at 80% 80%, rgba(245,158,11,0.25) 0px, transparent 50%)',
          }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-xl font-bold text-white ring-1 ring-white/20 backdrop-blur">
              Z
            </div>
            <div>
              <div className="text-lg font-semibold text-white">ZIDI Connect</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-brand-200">Operations Suite</div>
            </div>
          </div>
        </div>

        <div className="relative">
          <h2 className="text-3xl font-semibold leading-tight text-white">
            Run your customer operations from one calm dashboard.
          </h2>
          <p className="mt-3 max-w-md text-sm text-brand-100/90">
            Customer records, services, billing, communications and reporting — wired together with role-based access and a real audit trail.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="mt-2 text-sm font-semibold text-white">{title}</div>
                <div className="mt-1 text-xs leading-relaxed text-brand-100/80">{desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-xs text-brand-200/70">
          © {new Date().getFullYear()} ZIDI Connect. All rights reserved.
        </div>
      </div>

      <div className="flex items-center justify-center bg-auth-mesh px-4 py-10 lg:col-span-3">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-gradient text-base font-bold text-white shadow-md">
              Z
            </div>
            <div>
              <div className="text-base font-semibold text-ink-900">ZIDI Connect</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-brand-700">Operations Suite</div>
            </div>
          </div>

          <h1 className="text-2xl font-semibold text-ink-900">Welcome back</h1>
          <p className="mt-1 text-sm text-ink-500">Sign in to continue to your dashboard.</p>

          <form onSubmit={onSubmit} className="mt-8 card-base p-6 shadow-soft space-y-4">
            <FormField label="Email" htmlFor="email" required>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@zidi.local"
                required
              />
            </FormField>
            <FormField label="Password" htmlFor="password" required>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </FormField>
            <Button
              type="submit"
              loading={loading}
              size="lg"
              className="w-full"
              leftIcon={<LogIn className="h-4 w-4" />}
            >
              Sign in
            </Button>
            <p className="rounded-md border border-dashed border-ink-200 bg-ink-50 px-3 py-2 text-center text-[11px] text-ink-500">
              Demo credentials: <span className="font-mono text-ink-700">admin@zidi.local</span> /
              <span className="font-mono text-ink-700"> ChangeMe!123</span>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
