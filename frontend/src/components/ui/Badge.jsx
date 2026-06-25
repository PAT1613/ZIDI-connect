import clsx from 'clsx';
import { STATUS_COLORS } from '../../lib/constants';

const COLOR_CLASSES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
};

export default function Badge({ status, color, children, className }) {
  const key = (color || (status ? STATUS_COLORS[status] : null) || 'slate').toLowerCase();
  const classes = COLOR_CLASSES[key] || COLOR_CLASSES.slate;
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset capitalize',
        classes,
        className,
      )}
    >
      {children ?? (status ? String(status).replace(/_/g, ' ') : '')}
    </span>
  );
}
