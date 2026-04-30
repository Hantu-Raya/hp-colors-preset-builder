import React from 'react';
import { cn } from '../../lib/utils.js';

export function Button({ className, variant = 'default', size = 'default', ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        variant === 'outline' && 'border border-border bg-transparent hover:bg-accent hover:text-accent-foreground',
        variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        variant === 'ghost' && 'hover:bg-accent hover:text-accent-foreground',
        variant === 'destructive' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        size === 'sm' && 'h-8 px-3',
        size === 'lg' && 'h-11 px-8',
        size === 'icon' && 'h-9 w-9',
        size === 'default' && 'h-9 px-4 py-2',
        className
      )}
      {...props}
    />
  );
}
