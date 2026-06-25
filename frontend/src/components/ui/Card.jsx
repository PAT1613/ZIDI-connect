import clsx from 'clsx';

export default function Card({ title, subtitle, actions, footer, children, className, padded = true }) {
  return (
    <div className={clsx('card-base', className)}>
      {(title || subtitle || actions) && (
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-3">
          <div>
            {title ? <h3 className="text-sm font-semibold text-slate-900">{title}</h3> : null}
            {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      )}
      <div className={clsx(padded && 'p-5')}>{children}</div>
      {footer ? <div className="border-t border-slate-200 px-5 py-3">{footer}</div> : null}
    </div>
  );
}
