import clsx from 'clsx';
import { forwardRef } from 'react';

const Textarea = forwardRef(function Textarea({ className, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={clsx('input-base resize-y min-h-[80px]', className)}
      {...props}
    />
  );
});

export default Textarea;
