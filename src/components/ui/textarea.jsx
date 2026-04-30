import React from 'react';
import { cn } from '../../lib/utils.js';

export function Textarea({ className, ...props }) {
  return <textarea className={cn('flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} />;
}
