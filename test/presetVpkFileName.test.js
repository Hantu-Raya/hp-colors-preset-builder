import assert from 'node:assert/strict';
import test from 'node:test';
import { buildConvertedVpkFileName, buildPresetVpkFileName } from '../src/presetVpkFileName.js';

test('buildPresetVpkFileName uses the preset name as the VPK filename', () => {
  assert.equal(buildPresetVpkFileName('Web Builder Preset'), 'Web Builder Preset.vpk');
});

test('buildPresetVpkFileName keeps a provided vpk extension', () => {
  assert.equal(buildPresetVpkFileName('pak96_dir.vpk'), 'pak96_dir.vpk');
});

test('buildPresetVpkFileName sanitizes unsafe filename characters', () => {
  assert.equal(buildPresetVpkFileName('HP: Colors / Low HP*'), 'HP_ Colors _ Low HP_.vpk');
});

test('buildPresetVpkFileName falls back when preset name is blank', () => {
  assert.equal(buildPresetVpkFileName('   '), 'Web Builder Preset.vpk');
});

test('buildConvertedVpkFileName keeps the uploaded VPK filename instead of the preset name', () => {
  assert.equal(buildConvertedVpkFileName('pak96_dir.vpk'), 'pak96_dir.vpk');
  assert.equal(buildConvertedVpkFileName('PAK96'), 'PAK96.vpk');
});
