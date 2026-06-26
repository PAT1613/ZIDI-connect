import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="text-6xl font-bold text-brand-700">404</div>
      <h1 className="mt-2 text-lg font-semibold text-slate-900">Page not found</h1>
      <p className="mt-1 text-sm text-slate-500">The page you're looking for doesn't exist.</p>
      <Link to="/" className="mt-4"><Button>Go home</Button></Link>
    </div>
  );
}
