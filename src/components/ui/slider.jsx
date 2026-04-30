import React from 'react';

export function Slider({ value = [0], onValueChange, min = 0, max = 100, step = 1, ...props }) {
  return <input type="range" min={min} max={max} step={step} value={Array.isArray(value) ? value[0] : value} onChange={(e) => onValueChange?.([Number(e.target.value)])} className="h-2 w-full appearance-none rounded-full bg-secondary accent-primary" {...props} />;
}
