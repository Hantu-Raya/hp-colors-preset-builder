import assert from 'node:assert/strict';
import test from 'node:test';
import { HP_FIELD_CATALOG, REWRITE_CODEC_FIELD_BINDINGS, REWRITE_FIELD_BINDINGS, REWRITE_FIELD_CATALOG } from '../src/hpSchema.js';
import {
  createRewritePresetBundle,
  createRewritePresetCode,
  createRewriteProfileMetadata,
  createRewriteSettingsCode,
  decodeRewriteTransfer
} from '../src/rewritePresetCodec.js';

const FIXTURE = 'HPCRP1{"records":[{"id":"user_0001","kind":"user","name":"Shiv","mode":"selected","heroes":["hero_shiv"],"values":[[7,"fixed"],[11,true],[12,true],[13,true],[30,167],[31,"oracle"],[34,"custom"],[37,"#FFFFFF"],[42,18],[45,18],[52,true],[53,true],[54,205],[56,440],[63,true],[64,18],[65,31],[67,true]],"conditions":{"lowThreshold":{"slot":4,"minTier":3,"value":28},"enemyPulseThreshold":{"slot":4,"minTier":3,"value":28},"enemyKillMarkerThreshold":{"slot":4,"minTier":3,"value":28}}}],"selectedPresetId":"user_0001"}';

function payload(code, prefix) {
  assert.equal(code.slice(0, prefix.length), prefix);
  return JSON.parse(code.slice(prefix.length));
}

test('web shipped defaults retain the HPCRP1 codec baseline', () => {
  const webValues = REWRITE_FIELD_CATALOG.createDefaultState();
  const enemyLowBinding = REWRITE_CODEC_FIELD_BINDINGS.find((binding) => binding.canonicalKey === 'enemyLow');
  assert.equal(enemyLowBinding.defaultValue, '#E16161');
  assert.equal(webValues.hp_color_low, '#FD4949');
  assert.equal(webValues.hp_friend_color_low, '#FFEFD7');
  assert.equal(webValues.hp_friend_color_mid, '#FFEFD7');
  assert.equal(webValues.hp_friend_color_high, '#FFEFD7');

  const profile = {
    id: 'profile-1',
    name: 'Rewrite default',
    values: HP_FIELD_CATALOG.createDefaultState(),
    heroMode: 'all',
    heroes: [],
    overrides: {},
    rewrite: createRewriteProfileMetadata({
      id: 'profile-1',
      values: webValues,
      heroMode: 'all',
      heroes: [],
      overrides: {}
    }, { valuesAreRewrite: true })
  };
  const record = payload(createRewritePresetCode(profile), 'HPCRP1').records[0];
  assert.ok(record.values.some(([index, value]) => index === 8 && value === '#FD4949'));
});

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
  assert.equal(profile.rewrite.webValues.hp_pulse_readout_offset_x, 27);
  assert.equal(profile.rewrite.webValues.hp_pulse_readout_offset_y, 440);
  assert.equal(profile.rewrite.values[31], 'oracle');
  assert.equal(profile.rewrite.values[53], true);
  assert.equal(profile.rewrite.values[56], 440);
  assert.deepEqual(profile.rewrite.webOverrides.hp_low_threshold, { slot: 4, minTier: 3, value: 28 });
  assert.equal(Object.hasOwn(profile.rewrite.webValues, 'hp_exclude_ghouls'), false);
  assert.equal(profile.rewrite.webValues.hp_ghoul_opacity_enabled, false);
  assert.equal(profile.rewrite.webValues.hp_ghoul_opacity, 100);
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
  for (const retiredIndex of [12, 13, 67])
    assert.equal(record.values.some(([index]) => index === retiredIndex), false);
  assert.deepEqual(record.conditions, {
    lowThreshold: { slot: 4, minTier: 3, value: 28 },
    enemyPulseThreshold: { slot: 4, minTier: 3, value: 28 },
    enemyKillMarkerThreshold: { slot: 4, minTier: 3, value: 28 }
  });
  assert.equal(decodeRewriteTransfer(createRewritePresetCode(profile)).profiles[0].rewrite.values[56], 440);
});

test('web edits override mapped values while rewrite-only values survive', () => {
  const profile = decodeRewriteTransfer(FIXTURE).profiles[0];
  const {
    hp_pulse_threshold: _removed,
    ...remainingOverrides
  } = profile.rewrite.webOverrides;
  profile.rewrite = createRewriteProfileMetadata({
    ...profile,
    values: { ...profile.rewrite.webValues, hp_pulse_threshold: 33 },
    overrides: remainingOverrides
  }, { valuesAreRewrite: true });
  const record = payload(createRewritePresetCode(profile), 'HPCRP1').records[0];
  assert.ok(record.values.some(([index, value]) => index === 45 && value === 33));
  assert.ok(record.values.some(([index, value]) => index === 31 && value === 'oracle'));
  assert.ok(record.values.some(([index, value]) => index === 56 && value === 440));
  assert.equal(record.conditions?.enemyPulseThreshold, undefined);
  assert.deepEqual(record.conditions?.lowThreshold, { slot: 4, minTier: 3, value: 28 });
});

test('imports and exports HPCR2 settings separately from preset bundles', () => {
  const code = 'HPCR2{"v":[[7,"fixed"],[12,"retired"],[31,"pulp"],[56,700],[67,{"ignored":true}],[70,true],[71,true]],"c":{"enemyPulseThreshold":{"slot":2,"minTier":1,"value":20}}}';
  const profile = decodeRewriteTransfer(code).profiles[0];
  assert.equal(profile.rewrite.values[31], 'pulp');
  assert.equal(profile.rewrite.webValues.hp_readout_max_team_color, true);
  assert.equal(profile.rewrite.webValues.hp_friend_team_colors, true);
  const exported = payload(createRewriteSettingsCode(profile), 'HPCR2');
  assert.ok(exported.v.some(([index, value]) => index === 56 && value === 700));
  assert.ok(exported.v.some(([index, value]) => index === 70 && value === true));
  assert.ok(exported.v.some(([index, value]) => index === 71 && value === true));
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

test('All Heroes preset exports hide the baked default', () => {
  const allHeroes = {
    id: 'all-heroes',
    name: 'All Heroes',
    values: HP_FIELD_CATALOG.createDefaultState(),
    heroMode: 'all',
    heroes: [],
    overrides: {}
  };
  const selectedHero = {
    ...allHeroes,
    id: 'shiv',
    name: 'Shiv',
    heroMode: 'selected',
    heroes: ['hero_shiv']
  };
  assert.deepEqual(
    payload(createRewritePresetCode(allHeroes), 'HPCRP1').hiddenBakedPresetIds,
    ['baked_default']
  );
  assert.deepEqual(
    payload(createRewritePresetBundle([selectedHero, allHeroes]), 'HPCRP1').hiddenBakedPresetIds,
    ['baked_default']
  );
  assert.deepEqual(
    payload(createRewritePresetCode(selectedHero), 'HPCRP1').hiddenBakedPresetIds,
    []
  );
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
  const code = 'HPCRP1{"records":[{"id":"baked_default","kind":"baked","name":"Rewrite Default","mode":"off","heroes":[],"values":[[8,"#FD4949"],[20,"#FFEFD7"],[21,"#FFEFD7"],[22,"#FFEFD7"]],"conditions":null}],"selectedPresetId":"baked_default"}';
  const profile = decodeRewriteTransfer(code).profiles[0];
  const record = payload(createRewritePresetCode(profile), 'HPCRP1').records[0];
  assert.deepEqual(record, {
    id: 'baked_default',
    kind: 'baked',
    name: 'Rewrite Default',
    mode: 'off',
    heroes: [],
    values: [[8, '#FD4949'], [20, '#FFEFD7'], [21, '#FFEFD7'], [22, '#FFEFD7']],
    conditions: null
  });
});

test('returns null for V1 text and rejects malformed rewrite values', () => {
  assert.equal(decodeRewriteTransfer('[ANITA-v1-hp_colors]:abc'), null);
  assert.throws(() => decodeRewriteTransfer('HPCRP1{"records":[]}'), /INVALID HPCRP1 PAYLOAD/);
  assert.throws(() => decodeRewriteTransfer('HPCR2[[31,"comic-sans"]]'), /INVALID SETTING: readoutFont/);
});

test('fresh Rewrite web values retain every canonical setting in HPCRP1', () => {
  const values = REWRITE_FIELD_CATALOG.createDefaultState();
  for (const binding of REWRITE_FIELD_BINDINGS) {
    const field = REWRITE_FIELD_CATALOG.schema[binding.webId];
    if (field.type === 'toggle') {
      values[binding.webId] = !field.defaultValue;
    } else if (field.type === 'colorpicker') {
      values[binding.webId] = '#123456';
    } else if (field.type === 'cycler') {
      const last = field.options.length - 1;
      values[binding.webId] = field.defaultValue === 0 ? last : 0;
    } else {
      values[binding.webId] = field.bounds.min;
    }
  }
  values.hp_low_threshold = 20;
  values.hp_high_threshold = 80;

  const profile = {
    name: 'Every Rewrite setting',
    values: HP_FIELD_CATALOG.createDefaultState(),
    heroMode: 'all',
    heroes: [],
    overrides: {},
    rewrite: createRewriteProfileMetadata({
      name: 'Every Rewrite setting',
      values,
      overrides: {}
    }, { valuesAreRewrite: true })
  };
  const code = createRewritePresetCode(profile);
  const decoded = decodeRewriteTransfer(code).profiles[0];
  const expected = REWRITE_CODEC_FIELD_BINDINGS.map((binding) => {
    if (binding.webId === null) return false;
    const value = values[binding.webId];
    if (binding.canonicalType === 'enum') return binding.canonicalOptions[value];
    if (binding.canonicalType === 'enum-toggle') return value ? 'follow' : 'custom';
    return value;
  });

  assert.deepEqual(decoded.rewrite.values, expected);
  assert.equal(decoded.rewrite.values[12], false);
  assert.equal(decoded.rewrite.values[13], false);
  assert.equal(decoded.rewrite.values[67], false);
  assert.equal(decoded.rewrite.values[68], true);
  assert.equal(decoded.rewrite.values[69], 0);
  const pairs = payload(code, 'HPCRP1').records[0].values;
  for (const retiredIndex of [12, 13, 67])
    assert.equal(pairs.some(([index]) => index === retiredIndex), false);
  assert.equal(pairs.some(([index]) => index === 68), true);
  assert.equal(pairs.some(([index]) => index === 69), true);
});
