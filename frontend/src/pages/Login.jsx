import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import FormField from '../components/ui/FormField';
import { extractError } from '../api/client';

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-brand-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-700 text-2xl font-bold text-white shadow-md">
            Z
          </div>
          <h1 className="mt-3 text-xl font-semibold text-slate-900">ZIDI Connect</h1>
          <p className="text-sm text-slate-500">Sign in to your account</p>
        </div>
        <form onSubmit={onSubmit} className="card-base p-6 space-y-4">
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
          <Button type="submit" loading={loading} className="w-full" leftIcon={<LogIn className="h-4 w-4" />}>
            Sign in
          </Button>
          <p className="text-center text-xs text-slate-500">
            Default: admin@zidi.local / ChangeMe!123
          </p>
        </form>
      </div>
    </div>
  );
}
