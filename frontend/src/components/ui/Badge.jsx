import clsx from 'clsx';
import { STATUS_COLORS } from '../../lib/constants';

const COLOR_CLASSES = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  slate: 'bg-ink-100 text-ink-700 ring-ink-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
};

const DOT_CLASSES = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  slate: 'bg-ink-400',
  blue: 'bg-blue-500',
  brand: 'bg-brand-500',
  violet: 'bg-violet-500',
};

export default function Badge({ status, color, children, className, dot = true }) {
  const key = (color || (status ? STATUS_COLORS[status] : null) || 'slate').toLowerCase();
  const classes = COLOR_CLASSES[key] || COLOR_CLASSES.slate;
  const dotClass = DOT_CLASSES[key] || DOT_CLASSES.slate;
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset capitalize',
        classes,
        className,
      )}
    >
      {dot ? <span className={clsx('h-1.5 w-1.5 rounded-full', dotClass)} /> : null}
      {children ?? (status ? String(status).replace(/_/g, ' ') : '')}
    </span>
  );
}
