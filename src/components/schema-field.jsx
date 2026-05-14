import React, { useCallback, useRef, useState } from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import { normalizeHexColor, parsePositionValue, formatPositionValue, clampNumber } from './schema-control-utils.js';

function StepButton({ direction, label, onClick }) {
  const Icon = direction === 'up' ? Plus : Minus;
  return (
    <button type="button" className="anita-step-button" aria-label={label} onClick={onClick}>
      <Icon aria-hidden="true" />
    </button>
  );
}

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

  const handleSliderChange = useCallback((e) => {
    const next = clampNumber(e.target.value, min, max, field.defaultValue ?? min);
    onChange(field.id, next);
  }, [field.id, field.defaultValue, max, min, onChange]);

  const handleInputChange = useCallback((e) => {
    const clamped = clampNumber(e.target.value, min, max, field.defaultValue ?? min);
    onChange(field.id, clamped);
  }, [field.id, onChange, min, max, field.defaultValue]);

  const handleStep = useCallback((direction) => {
    const next = clampNumber(numericValue + (direction * step), min, max, field.defaultValue ?? min);
    onChange(field.id, next);
  }, [field.id, field.defaultValue, max, min, numericValue, onChange, step]);

  return (
    <div className="anita-slider-group">
      <div className="anita-stepper">
        <StepButton direction="down" label={`Decrease ${field.label}`} onClick={() => handleStep(-1)} />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={numericValue}
          onChange={handleInputChange}
          className="anita-value-input"
          aria-label={field.label}
        />
        <StepButton direction="up" label={`Increase ${field.label}`} onClick={() => handleStep(1)} />
      </div>
      <input
        type="range"
        className="anita-range"
        id={field.id}
        aria-labelledby={`${field.id}-label`}
        min={min}
        max={max}
        step={step}
        value={numericValue}
        onChange={handleSliderChange}
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
          aria-label={field.label}
        />
      </label>
      <input
        type="text"
        value={displayValue}
        onChange={handleHexChange}
        onBlur={handleHexBlur}
        className="anita-hex-input"
        aria-label={`${field.label} hex value`}
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

  function handleSliderChange(axis, raw) {
    const next = clampNumber(raw, axis === 'x' ? minX : minY, axis === 'x' ? maxX : maxY, pos[axis]);
    const nextPos = { ...pos, [axis]: next };
    onChange(field.id, formatPositionValue(nextPos));
  }

  function handleAxisStep(axis, direction) {
    handleAxisChange(axis, pos[axis] + direction);
  }

  return (
    <div className="anita-position-group">
      {['x', 'y'].map((axis) => (
        <div key={axis} className="anita-position-axis">
          <span className="anita-axis-label">{axis.toUpperCase()}</span>
          <div className="anita-stepper">
            <StepButton direction="down" label={`Decrease ${field.label} ${axis}`} onClick={() => handleAxisStep(axis, -1)} />
            <input
              type="number"
              min={axis === 'x' ? minX : minY}
              max={axis === 'x' ? maxX : maxY}
              step={1}
              value={pos[axis]}
              onChange={(e) => handleAxisChange(axis, e.target.value)}
              className="anita-position-value"
              aria-label={`${field.label} ${axis}`}
            />
            <StepButton direction="up" label={`Increase ${field.label} ${axis}`} onClick={() => handleAxisStep(axis, 1)} />
          </div>
          <input
            type="range"
            className="anita-range"
            min={axis === 'x' ? minX : minY}
            max={axis === 'x' ? maxX : maxY}
            step={1}
            value={pos[axis]}
            onChange={(e) => handleSliderChange(axis, e.target.value)}
            aria-label={`${field.label} ${axis} slider`}
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

  const isModified = String(value) !== String(field.defaultValue);

  return (
    <div className="schema-field-row" data-field-type={field.type}>
      <div className="schema-field-meta">
        <label id={labelId} className="schema-field-label">{field.label}</label>
      </div>
      <div className="schema-field-control">
        {control}
        <button
          type="button"
          className="field-reset-button"
          disabled={!isModified}
          onClick={() => onChange(field.id, field.defaultValue)}
          aria-label={`Reset ${field.label}`}
          title={`Reset ${field.label}`}
        >
          <RotateCcw aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
