import assert from 'node:assert/strict';
import test from 'node:test';
import { HP_COLORS_MOD_VARIANTS } from '../src/packageBuilder.js';
import {
  canChooseBuildMod,
  canConfirmBuild,
  getBuildChoiceVisibility,
  getNextInstallValidationState
} from '../src/buildModalState.js';

test('build modal keeps mod choices locked until install validation', () => {
  assert.equal(canChooseBuildMod({ installValidated: false }), false);
  assert.equal(canChooseBuildMod({ installValidated: true }), true);
});

test('build modal requires install validation and a selected target before confirming', () => {
  assert.equal(canConfirmBuild({ installValidated: false, buildVariant: HP_COLORS_MOD_VARIANTS.FULL }), false);
  assert.equal(canConfirmBuild({ installValidated: true, buildVariant: null }), false);
  assert.equal(canConfirmBuild({ installValidated: true, buildVariant: HP_COLORS_MOD_VARIANTS.MINIMAL }), true);
});

test('build modal swaps download links for descriptions after validation', () => {
  assert.deepEqual(getBuildChoiceVisibility({ installValidated: false }), {
    showDescription: false,
    showDownload: true
  });
  assert.deepEqual(getBuildChoiceVisibility({ installValidated: true }), {
    showDescription: true,
    showDownload: false
  });
});

test('unvalidating clears the selected build target', () => {
  assert.deepEqual(getNextInstallValidationState({
    installValidated: false,
    buildVariant: null
  }), {
    installValidated: true,
    buildVariant: null
  });
  assert.deepEqual(getNextInstallValidationState({
    installValidated: true,
    buildVariant: HP_COLORS_MOD_VARIANTS.FULL
  }), {
    installValidated: false,
    buildVariant: null
  });
});
