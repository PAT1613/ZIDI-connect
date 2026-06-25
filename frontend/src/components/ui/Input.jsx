import clsx from 'clsx';
import { forwardRef } from 'react';

const Input = forwardRef(function Input({ className, type = 'text', ...props }, ref) {
  return <input ref={ref} type={type} className={clsx('input-base', className)} {...props} />;
});

export default Input;
