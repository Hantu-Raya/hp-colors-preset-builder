import React from 'react';
import { cn } from '../../lib/utils.js';

export function Card({ className, ...props }) { return <div className={cn('rounded-xl border border-border bg-card text-card-foreground shadow-sm', className)} {...props} />; }
export function CardHeader({ className, ...props }) { return <div className={cn('flex flex-col gap-1.5 p-4', className)} {...props} />; }
export function CardTitle({ className, ...props }) { return <h3 className={cn('text-base font-semibold leading-none tracking-tight', className)} {...props} />; }
export function CardDescription({ className, ...props }) { return <p className={cn('text-sm text-muted-foreground', className)} {...props} />; }
export function CardContent({ className, ...props }) { return <div className={cn('p-4 pt-0', className)} {...props} />; }
