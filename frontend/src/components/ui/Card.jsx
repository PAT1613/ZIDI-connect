import clsx from 'clsx';

export default function Card({ title, subtitle, actions, footer, children, className, padded = true }) {
  return (
    <div className={clsx('card-base', className)}>
      {(title || subtitle || actions) && (
        <div className="flex items-start justify-between gap-4 border-b border-ink-200/70 px-5 py-3.5">
          <div className="min-w-0">
            {title ? <h3 className="text-sm font-semibold text-ink-900">{title}</h3> : null}
            {subtitle ? <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      )}
      <div className={clsx(padded && 'p-5')}>{children}</div>
      {footer ? <div className="border-t border-ink-200/70 bg-ink-50/40 px-5 py-3">{footer}</div> : null}
    </div>
  );
}
