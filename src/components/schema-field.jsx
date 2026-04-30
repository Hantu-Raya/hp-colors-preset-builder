import React from 'react';
import { Button } from './ui/button.jsx';
import { Input } from './ui/input.jsx';
import { Label } from './ui/label.jsx';
import { Select } from './ui/select.jsx';
import { Slider } from './ui/slider.jsx';
import { Switch } from './ui/switch.jsx';

export function SchemaField({ field, value, onChange }) {
  if (!field) return null;
  const labelId = `${field.id}-label`;
  if (field.type === 'toggle') return <div className="field-row"><Label id={labelId} htmlFor={field.id}>{field.label}</Label><Switch id={field.id} aria-labelledby={labelId} checked={!!value} onCheckedChange={(next) => onChange(field.id, next)} /></div>;
  if (field.type === 'cycler') return <div className="field-row"><Label htmlFor={field.id}>{field.label}</Label><Select id={field.id} value={String(value)} onChange={(e) => onChange(field.id, Number(e.target.value))}>{(field.options || []).map((option, index) => <option key={option} value={index}>{option}</option>)}</Select></div>;
  if (field.type === 'slider') return <div className="field-stack"><div className="field-row"><Label id={labelId} htmlFor={field.id}>{field.label}</Label><span className="field-value">{String(value)}</span></div><Slider id={field.id} aria-labelledby={labelId} min={field.bounds?.min ?? 0} max={field.bounds?.max ?? 100} step={field.bounds?.step ?? 1} value={[Number(value) || 0]} onValueChange={([next]) => onChange(field.id, next)} /></div>;
  if (field.type === 'colorpicker') return <div className="field-row"><Label htmlFor={field.id}>{field.label}</Label><Input id={field.id} type="color" value={value} onChange={(e) => onChange(field.id, e.target.value)} className="h-9 w-16 p-1" /></div>;
  if (field.type === 'positionpicker') return <div className="field-row"><Label htmlFor={field.id}>{field.label}</Label><Input id={field.id} value={value} onChange={(e) => onChange(field.id, e.target.value)} /></div>;
  return <div className="field-row"><Label htmlFor={field.id}>{field.label}</Label><Button variant="outline" size="sm">Unsupported</Button></div>;
}
