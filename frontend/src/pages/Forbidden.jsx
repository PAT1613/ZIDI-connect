import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { ShieldAlert } from 'lucide-react';

export default function Forbidden() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <ShieldAlert className="h-12 w-12 text-red-600" />
      <h1 className="mt-3 text-lg font-semibold text-slate-900">Access denied</h1>
      <p className="mt-1 text-sm text-slate-500">You don't have permission to view this page.</p>
      <Link to="/" className="mt-4"><Button>Go to dashboard</Button></Link>
    </div>
  );
}
