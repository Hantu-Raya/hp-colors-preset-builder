import assert from 'node:assert/strict';
import test from 'node:test';
import * as buildModalState from '../src/buildModalState.js';
import { HP_COLORS_MOD_VARIANTS } from '../src/packageBuilder.js';
import {
  canConfirmBuild,
  getNextInstallValidationState
} from '../src/buildModalState.js';

test('build modal requires install validation and a selected target before confirming', () => {
  assert.equal(canConfirmBuild({ installValidated: false, buildVariant: HP_COLORS_MOD_VARIANTS.FULL }), false);
  assert.equal(canConfirmBuild({ installValidated: true, buildVariant: null }), false);
  assert.equal(canConfirmBuild({ installValidated: true, buildVariant: HP_COLORS_MOD_VARIANTS.MINIMAL }), true);
});

test('validating defaults to minimal and unvalidating clears the selected build target', () => {
  assert.deepEqual(getNextInstallValidationState({
    installValidated: false,
    buildVariant: null
  }), {
    installValidated: true,
    buildVariant: HP_COLORS_MOD_VARIANTS.MINIMAL
  });
  assert.deepEqual(getNextInstallValidationState({
    installValidated: true,
    buildVariant: HP_COLORS_MOD_VARIANTS.FULL
  }), {
    installValidated: false,
    buildVariant: null
  });
});

test('minimal build allows multi-profile hero routing without a top-preset warning', () => {
  assert.equal(typeof buildModalState.getBuildVariantWarning, 'function');
  assert.equal(buildModalState.getBuildVariantWarning({
    buildVariant: HP_COLORS_MOD_VARIANTS.MINIMAL,
    profileCount: 3,
    firstPresetName: 'Lane'
  }), null);
  assert.equal(buildModalState.getBuildVariantWarning({
    buildVariant: HP_COLORS_MOD_VARIANTS.FULL,
    profileCount: 3,
    firstPresetName: 'Lane'
  }), null);
  assert.equal(buildModalState.getBuildVariantWarning({
    buildVariant: HP_COLORS_MOD_VARIANTS.MINIMAL,
    profileCount: 1,
    firstPresetName: 'Lane'
  }), null);
});
