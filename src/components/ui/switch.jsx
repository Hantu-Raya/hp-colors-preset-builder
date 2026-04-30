import React from 'react';

export function Switch({ checked, onCheckedChange, ...props }) {
  return <button type="button" role="switch" aria-checked={checked ? 'true' : 'false'} onClick={() => onCheckedChange?.(!checked)} className={`inline-flex h-6 w-11 items-center rounded-full border transition ${checked ? 'bg-primary' : 'bg-secondary'}`} {...props}><span className={`ml-1 h-4 w-4 rounded-full bg-background transition ${checked ? 'translate-x-5' : 'translate-x-0'}`} /></button>;
}
