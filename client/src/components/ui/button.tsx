import * as React from 'react';
import { cn } from '../../lib/utils.ts';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, ...props }, ref) => {
    const variantClasses = {
      primary: 'bg-primary text-white hover:bg-primary/90 border border-transparent',
      outline: 'border border-border bg-card text-foreground hover:bg-muted',
      ghost: 'bg-transparent text-foreground hover:bg-muted border border-transparent',
      destructive: 'bg-destructive text-white hover:bg-destructive/90 border border-transparent',
    };

    const sizeClasses = {
      sm: 'h-8 px-2.5 text-xs rounded-lg',
      md: 'h-9 px-3.5 text-sm rounded-lg',
      lg: 'h-10 px-4 text-sm rounded-lg',
      icon: 'h-8 w-8 p-0 rounded-lg inline-flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
