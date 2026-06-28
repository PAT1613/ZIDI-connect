import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { ShieldAlert, Home } from 'lucide-react';

export default function Forbidden() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-auth-mesh px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600 ring-1 ring-red-200">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h1 className="mt-5 text-xl font-semibold text-ink-900">Access denied</h1>
      <p className="mt-1 max-w-md text-sm text-ink-500">
        Your role does not have permission to view this page. Contact a Super Admin if you believe this is a mistake.
      </p>
      <Link to="/" className="mt-6">
        <Button leftIcon={<Home className="h-4 w-4" />}>Back to dashboard</Button>
      </Link>
    </div>
  );
}
