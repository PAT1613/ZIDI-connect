import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { Home, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-auth-mesh px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-soft">
        <Compass className="h-8 w-8" />
      </div>
      <div className="mt-6 text-6xl font-bold tracking-tight text-brand-700">404</div>
      <h1 className="mt-2 text-xl font-semibold text-ink-900">Page not found</h1>
      <p className="mt-1 max-w-md text-sm text-ink-500">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="mt-6">
        <Button leftIcon={<Home className="h-4 w-4" />}>Back to dashboard</Button>
      </Link>
    </div>
  );
}
