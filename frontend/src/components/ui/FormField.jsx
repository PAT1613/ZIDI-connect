import clsx from 'clsx';

export default function FormField({ label, htmlFor, error, hint, required, className, children }) {
  return (
    <div className={clsx('flex flex-col', className)}>
      {label ? (
        <label htmlFor={htmlFor} className="label-base">
          {label}
          {required ? <span className="text-red-600 ml-0.5">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}
