import test from 'node:test';
import assert from 'node:assert/strict';
import { clampNumber, formatPositionValue, isDefaultValue, normalizeHexColor, parsePositionValue } from '../src/components/schema-control-utils.js';

test('normalizeHexColor returns uppercase six-digit hex colors', () => {
  assert.equal(normalizeHexColor('#e16161', '#FFFFFF'), '#E16161');
  assert.equal(normalizeHexColor('66cc99', '#FFFFFF'), '#66CC99');
  assert.equal(normalizeHexColor('#abc', '#FFFFFF'), '#AABBCC');
});

test('normalizeHexColor falls back for invalid colors', () => {
  assert.equal(normalizeHexColor('not-a-color', '#112233'), '#112233');
  assert.equal(normalizeHexColor('', '#112233'), '#112233');
});

test('parsePositionValue reads strings, arrays, and objects', () => {
  assert.deepEqual(parsePositionValue('27,20'), { x: 27, y: 20 });
  assert.deepEqual(parsePositionValue([12, 34]), { x: 12, y: 34 });
  assert.deepEqual(parsePositionValue({ x: '7', y: '9' }), { x: 7, y: 9 });
});

test('parsePositionValue uses safe defaults for invalid input', () => {
  assert.deepEqual(parsePositionValue('bad'), { x: 0, y: 200 });
  assert.deepEqual(parsePositionValue(null), { x: 0, y: 200 });
});

test('formatPositionValue rounds and joins x and y', () => {
  assert.equal(formatPositionValue({ x: 20.4, y: 196.6 }), '20,197');
});

test('clampNumber respects min, max, and fallback', () => {
  assert.equal(clampNumber(150, 0, 100, 25), 100);
  assert.equal(clampNumber(-5, 0, 100, 25), 0);
  assert.equal(clampNumber('bad', 0, 100, 25), 25);
});

test('isDefaultValue compares values by string form', () => {
  assert.equal(isDefaultValue(25, '25'), true);
  assert.equal(isDefaultValue('#E16161', '#e16161'), false);
});