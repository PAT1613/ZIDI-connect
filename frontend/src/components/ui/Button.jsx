import clsx from 'clsx';
import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

const Button = forwardRef(function Button(
  {
    type = 'button',
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    className,
    children,
    leftIcon,
    rightIcon,
    ...props
  },
  ref,
) {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    accent: 'btn-accent',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
  }[variant];

  const sizeClass = { sm: 'btn-sm', md: 'btn-md', lg: 'btn-lg' }[size];

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={clsx('btn', variantClass, sizeClass, className)}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});

export default Button;
