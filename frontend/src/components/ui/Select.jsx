import clsx from 'clsx';
import { forwardRef } from 'react';

const Select = forwardRef(function Select(
  { className, options = [], placeholder, children, ...props },
  ref,
) {
  return (
    <select ref={ref} className={clsx('input-base pr-8', className)} {...props}>
      {placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
      {children}
    </select>
  );
});

export default Select;
