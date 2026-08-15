import assert from 'node:assert/strict';
import test from 'node:test';
import { HP_FIELD_CATALOG } from '../src/hpSchema.js';
import {
  createRewritePresetBundle,
  createRewritePresetCode,
  createRewriteSettingsCode,
  decodeRewriteTransfer
} from '../src/rewritePresetCodec.js';

const FIXTURE = 'HPCRP1{"records":[{"id":"user_0001","kind":"user","name":"Shiv","mode":"selected","heroes":["hero_shiv"],"values":[[7,"fixed"],[11,true],[12,true],[13,true],[30,167],[31,"oracle"],[34,"custom"],[37,"#FFFFFF"],[42,18],[45,18],[52,true],[53,true],[54,205],[56,440],[63,true],[64,18],[65,31]],"conditions":{"lowThreshold":{"slot":4,"minTier":3,"value":28},"enemyPulseThreshold":{"slot":4,"minTier":3,"value":28},"enemyKillMarkerThreshold":{"slot":4,"minTier":3,"value":28}}}],"selectedPresetId":"user_0001"}';

function payload(code, prefix) {
  assert.equal(code.slice(0, prefix.length), prefix);
  return JSON.parse(code.slice(prefix.length));
}

test('imports the supplied HPCRP1 preset without losing rewrite-only settings', () => {
  const decoded = decodeRewriteTransfer(FIXTURE, { defaultState: HP_FIELD_CATALOG.createDefaultState() });
  assert.equal(decoded.format, 'HPCRP1');
  assert.equal(decoded.profiles.length, 1);
  const profile = decoded.profiles[0];
  assert.equal(profile.name, 'Shiv');
  assert.equal(profile.heroMode, 'selected');
  assert.deepEqual(profile.heroes, ['hero_shiv']);
  assert.equal(profile.values.hp_mode, 0);
  assert.equal(profile.values.hp_counter_size, 167);
  assert.equal(profile.values.hp_pulse_text_position, '27,400');
  assert.equal(profile.rewrite.values[31], 'oracle');
  assert.equal(profile.rewrite.values[53], true);
  assert.equal(profile.rewrite.values[56], 440);
  assert.deepEqual(profile.overrides.hp_low_threshold, { slot: 4, minTier: 3, value: 28 });
});

test('exports an imported preset as a rewrite-valid semantic round trip', () => {
  const profile = decodeRewriteTransfer(FIXTURE).profiles[0];
  const exported = payload(createRewritePresetCode(profile), 'HPCRP1');
  const record = exported.records[0];
  assert.equal(record.id, 'user_0001');
  assert.equal(record.name, 'Shiv');
  assert.equal(record.mode, 'selected');
  assert.deepEqual(record.heroes, ['hero_shiv']);
  assert.ok(record.values.some(([index, value]) => index === 31 && value === 'oracle'));
  assert.ok(record.values.some(([index, value]) => index === 53 && value === true));
  assert.ok(record.values.some(([index, value]) => index === 56 && value === 440));
  assert.deepEqual(record.conditions, {
    lowThreshold: { slot: 4, minTier: 3, value: 28 },
    enemyPulseThreshold: { slot: 4, minTier: 3, value: 28 },
    enemyKillMarkerThreshold: { slot: 4, minTier: 3, value: 28 }
  });
  assert.equal(decodeRewriteTransfer(createRewritePresetCode(profile)).profiles[0].rewrite.values[56], 440);
});

test('web edits override mapped values while rewrite-only values survive', () => {
  const profile = decodeRewriteTransfer(FIXTURE).profiles[0];
  profile.values = { ...profile.values, hp_pulse_threshold: 33 };
  const { hp_pulse_threshold: _removed, ...remainingOverrides } = profile.overrides;
  profile.overrides = remainingOverrides;
  const record = payload(createRewritePresetCode(profile), 'HPCRP1').records[0];
  assert.ok(record.values.some(([index, value]) => index === 45 && value === 33));
  assert.ok(record.values.some(([index, value]) => index === 31 && value === 'oracle'));
  assert.ok(record.values.some(([index, value]) => index === 56 && value === 440));
  assert.equal(record.conditions?.enemyPulseThreshold, undefined);
  assert.deepEqual(record.conditions?.lowThreshold, { slot: 4, minTier: 3, value: 28 });
});

test('imports and exports HPCR2 settings separately from preset bundles', () => {
  const code = 'HPCR2{"v":[[7,"fixed"],[31,"pulp"],[56,700]],"c":{"enemyPulseThreshold":{"slot":2,"minTier":1,"value":20}}}';
  const profile = decodeRewriteTransfer(code).profiles[0];
  assert.equal(profile.rewrite.values[31], 'pulp');
  const exported = payload(createRewriteSettingsCode(profile), 'HPCR2');
  assert.ok(exported.v.some(([index, value]) => index === 56 && value === 700));
  assert.deepEqual(exported.c.enemyPulseThreshold, { slot: 2, minTier: 1, value: 20 });
});

test('exports ordinary web profiles with canonical rewrite prefixes', () => {
  const profile = {
    name: 'Web preset',
    values: { ...HP_FIELD_CATALOG.createDefaultState(), hp_mode: 0, hp_pulse_threshold: 44 },
    heroMode: 'all',
    heroes: [],
    overrides: {}
  };
  const settings = createRewriteSettingsCode(profile);
  const preset = createRewritePresetCode(profile);
  assert.match(settings, /^HPCR2/);
  assert.match(preset, /^HPCRP1/);
  const settingsPayload = payload(settings, 'HPCR2');
  assert.ok(Array.isArray(settingsPayload.v));
  assert.deepEqual(
    settingsPayload.c,
    {},
    'condition-free settings exports must explicitly clear conditions on import'
  );
  const record = payload(preset, 'HPCRP1').records[0];
  assert.ok(record.values.some(([index, value]) => index === 7 && value === 'fixed'));
  assert.ok(record.values.some(([index, value]) => index === 45 && value === 44));
});

test('copies multiple profiles with unique rewrite user IDs', () => {
  const profile = decodeRewriteTransfer(FIXTURE).profiles[0];
  const second = { ...profile, id: 'profile-2', name: 'Second' };
  const bundle = payload(createRewritePresetBundle([profile, second], second.id), 'HPCRP1');
  assert.equal(bundle.records.length, 2);
  assert.notEqual(bundle.records[0].id, bundle.records[1].id);
  assert.equal(bundle.selectedPresetId, bundle.records[1].id);
});

test('preserves an unchanged baked preset record in a copied bundle', () => {
  const code = 'HPCRP1{"records":[{"id":"baked_default","kind":"baked","name":"Rewrite Default","mode":"off","heroes":[],"values":[],"conditions":null}],"selectedPresetId":"baked_default"}';
  const profile = decodeRewriteTransfer(code).profiles[0];
  const record = payload(createRewritePresetCode(profile), 'HPCRP1').records[0];
  assert.deepEqual(record, {
    id: 'baked_default',
    kind: 'baked',
    name: 'Rewrite Default',
    mode: 'off',
    heroes: [],
    values: [],
    conditions: null
  });
});

test('returns null for V1 text and rejects malformed rewrite values', () => {
  assert.equal(decodeRewriteTransfer('[ANITA-v1-hp_colors]:abc'), null);
  assert.throws(() => decodeRewriteTransfer('HPCRP1{"records":[]}'), /INVALID HPCRP1 PAYLOAD/);
  assert.throws(() => decodeRewriteTransfer('HPCR2[[31,"comic-sans"]]'), /INVALID SETTING: readoutFont/);
});
