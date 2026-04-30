import React from 'react';
import { cn } from '../../lib/utils.js';

export function Select({ className, children, ...props }) {
  return <select className={cn('flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', className)} {...props}>{children}</select>;
}
