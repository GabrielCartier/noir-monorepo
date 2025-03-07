import type { ButtonHTMLAttributes } from 'react';
import { cn } from 'src/lib/utils';

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

export const PrimaryButton = ({
  className,
  children,
  ...props
}: PrimaryButtonProps) => {
  return (
    <button
      className={cn(
        'bg-gradient-primary text-white px-4 py-2 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 font-medium group',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};
