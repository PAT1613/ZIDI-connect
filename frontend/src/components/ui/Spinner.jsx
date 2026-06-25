import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

export default function Spinner({ size = 'md', className }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-8 w-8' };
  return <Loader2 className={clsx('animate-spin text-brand-700', sizes[size], className)} />;
}
