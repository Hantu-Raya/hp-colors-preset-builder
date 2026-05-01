import React, { useCallback, useRef, useState } from 'react';
import { Slider } from './ui/slider.jsx';
import { Input } from './ui/input.jsx';
import { Label } from './ui/label.jsx';
import { normalizeHexColor, parsePositionValue, formatPositionValue, clampNumber } from './schema-control-utils.js';

function ToggleControl({ field, value, onChange }) {
  const checked = !!value;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-labelledby={`${field.id}-label`}
      className={`anita-toggle${checked ? ' is-checked' : ''}`}
      onClick={() => onChange(field.id, !checked)}
    />
  );
}

function SliderControl({ field, value, onChange }) {
  const min = field.bounds?.min ?? 0;
  const max = field.bounds?.max ?? 100;
  const step = field.bounds?.step ?? 1;
  const numericValue = clampNumber(Number(value), min, max, field.defaultValue ?? min);

  const handleSliderChange = useCallback(([next]) => {
    onChange(field.id, next);
  }, [field.id, onChange]);

  const handleInputChange = useCallback((e) => {
    const clamped = clampNumber(e.target.value, min, max, field.defaultValue ?? min);
    onChange(field.id, clamped);
  }, [field.id, onChange, min, max, field.defaultValue]);

  return (
    <div className="anita-slider-group">
      <Slider
        id={field.id}
        aria-labelledby={`${field.id}-label`}
        min={min}
        max={max}
        step={step}
        value={[numericValue]}
        onValueChange={handleSliderChange}
      />
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={numericValue}
        onChange={handleInputChange}
        className="anita-value-input"
      />
    </div>
  );
}

function CyclerControl({ field, value, onChange }) {
  const options = field.options || [];
  const activeIndex = Number(value) || 0;

  return (
    <div className="anita-cycler" role="radiogroup" aria-labelledby={`${field.id}-label`}>
      {options.map((option, index) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={index === activeIndex}
          className={`anita-cycler-segment${index === activeIndex ? ' is-active' : ''}`}
          onClick={() => onChange(field.id, index)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function ColorControl({ field, value, onChange }) {
  const normalized = normalizeHexColor(value, field.defaultValue || '#FFFFFF');
  const [draft, setDraft] = useState(null);
  const draftRef = useRef(null);

  const handleNativeChange = useCallback((e) => {
    const next = normalizeHexColor(e.target.value, field.defaultValue || '#FFFFFF');
    onChange(field.id, next);
  }, [field.id, onChange, field.defaultValue]);

  const handleHexChange = useCallback((e) => {
    const raw = e.target.value;
    setDraft(raw);
    draftRef.current = raw;
    const next = normalizeHexColor(raw, null);
    if (next) {
      onChange(field.id, next);
    }
  }, [field.id, onChange]);

  const handleHexBlur = useCallback(() => {
    const raw = draftRef.current;
    if (raw != null) {
      const next = normalizeHexColor(raw, normalized);
      setDraft(null);
      draftRef.current = null;
      onChange(field.id, next);
    }
  }, [normalized, onChange]);

  const displayValue = draft != null ? draft : normalized;

  return (
    <div className="anita-color-group">
      <label className="anita-color-swatch" style={{ backgroundColor: normalized }}>
        <input
          type="color"
          value={normalized}
          onChange={handleNativeChange}
        />
      </label>
      <Input
        type="text"
        value={displayValue}
        onChange={handleHexChange}
        onBlur={handleHexBlur}
        className="anita-hex-input"
      />
    </div>
  );
}

function PositionControl({ field, value, onChange }) {
  const pos = parsePositionValue(value);
  const minX = field.bounds?.minX ?? 0;
  const maxX = field.bounds?.maxX ?? 400;
  const minY = field.bounds?.minY ?? -50;
  const maxY = field.bounds?.maxY ?? 400;

  function handleAxisChange(axis, raw) {
    const clamped = clampNumber(raw, axis === 'x' ? minX : minY, axis === 'x' ? maxX : maxY, axis === 'x' ? pos.x : pos.y);
    const next = { ...pos, [axis]: clamped };
    onChange(field.id, formatPositionValue(next));
  }

  function handleSliderChange(axis, [next]) {
    const nextPos = { ...pos, [axis]: next };
    onChange(field.id, formatPositionValue(nextPos));
  }

  return (
    <div className="anita-position-group">
      {['x', 'y'].map((axis) => (
        <div key={axis} className="anita-position-axis">
          <span className="anita-axis-label">{axis.toUpperCase()}</span>
          <Slider
            min={axis === 'x' ? minX : minY}
            max={axis === 'x' ? maxX : maxY}
            step={1}
            value={[pos[axis]]}
            onValueChange={(v) => handleSliderChange(axis, v)}
          />
          <Input
            type="number"
            value={pos[axis]}
            onChange={(e) => handleAxisChange(axis, e.target.value)}
            className="anita-position-value"
          />
        </div>
      ))}
    </div>
  );
}

export function SchemaField({ field, value, onChange }) {
  if (!field) return null;

  const labelId = `${field.id}-label`;

  let control;
  if (field.type === 'toggle') control = <ToggleControl field={field} value={value} onChange={onChange} />;
  else if (field.type === 'slider') control = <SliderControl field={field} value={value} onChange={onChange} />;
  else if (field.type === 'cycler') control = <CyclerControl field={field} value={value} onChange={onChange} />;
  else if (field.type === 'colorpicker') control = <ColorControl field={field} value={value} onChange={onChange} />;
  else if (field.type === 'positionpicker') control = <PositionControl field={field} value={value} onChange={onChange} />;
  else control = <span>Unsupported</span>;

  return (
    <div className="schema-field-row">
      <div className="schema-field-meta">
        <Label id={labelId} className="schema-field-label">{field.label}</Label>
      </div>
      <div className="schema-field-control">
        {control}
      </div>
    </div>
  );
}