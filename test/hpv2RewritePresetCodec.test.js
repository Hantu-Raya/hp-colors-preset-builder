import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { HP_FIELD_CATALOG, HPV2_EXTENSION_FIELD_BINDINGS, REWRITE_CODEC_FIELD_BINDINGS, REWRITE_FIELD_BINDINGS, REWRITE_FIELD_CATALOG } from '../src/hpv2HpSchema.js';
import {
  createRewritePresetBundle,
  createRewritePresetCode,
  createRewriteProfileMetadata,
  createRewriteSettingsCode,
  decodeRewriteTransfer
} from '../src/hpv2RewritePresetCodec.js';

const FIXTURE = 'HPCRP1{"records":[{"id":"user_0001","kind":"user","name":"Shiv","mode":"selected","heroes":["hero_shiv"],"values":[[7,"fixed"],[11,true],[12,true],[13,true],[30,167],[31,"oracle"],[34,"custom"],[37,"#FFFFFF"],[42,18],[45,18],[52,true],[53,true],[54,205],[56,440],[63,true],[64,18],[65,31],[67,true]],"conditions":{"lowThreshold":{"slot":4,"minTier":3,"value":28},"enemyPulseThreshold":{"slot":4,"minTier":3,"value":28},"enemyKillMarkerThreshold":{"slot":4,"minTier":3,"value":28}}}],"selectedPresetId":"user_0001"}';

const WIRE_MANIFEST_SHA256 = '743988f126566f6327d5b104740553f7769407af1c42b523ca278e87d6dfa16b';
const WIRE_CORPUS_SHA256 = '1a6e60cf7e93cc655a84a47b140f4a8e43b19b6ace742cf89626591031862f31';
const wireManifestSource = readFileSync(
  new URL('../src/fixtures/hp-colors-rewrite-wire-v1.json', import.meta.url)
);
const wireManifest = JSON.parse(wireManifestSource);
const wireCorpusSource = readFileSync(
  new URL('../src/fixtures/hp-colors-rewrite-wire-v1-corpus.json', import.meta.url)
);
const wireCorpus = JSON.parse(wireCorpusSource);

function normalizedSha256(source) {
  return createHash('sha256')
    .update(source.toString('utf8').replaceAll('\r\n', '\n'))
    .digest('hex');
}

test('wire manifest matches the approved byte contract', () => {
  assert.equal(normalizedSha256(wireManifestSource), WIRE_MANIFEST_SHA256);
  assert.equal(normalizedSha256(wireCorpusSource), WIRE_CORPUS_SHA256);
});

test('wire manifest owns builder slot order and metadata', () => {
  function row(binding, slot, retired = false) {
    return {
      slot,
      key: binding.canonicalKey,
      codecDefault: binding.defaultValue,
      type: binding.canonicalType === 'enum-toggle'
        ? 'enum'
        : binding.canonicalType,
      bounds: binding.bounds
        ? [binding.bounds.min, binding.bounds.max]
        : null,
      enum: binding.canonicalOptions.length
        ? [...binding.canonicalOptions]
        : null,
      retired,
      conditionEligible: binding.conditionEligible
    };
  }
  assert.deepEqual(
    REWRITE_CODEC_FIELD_BINDINGS.map((binding, slot) =>
      row(binding, slot, !REWRITE_FIELD_BINDINGS.includes(binding))
    ),
    wireManifest.legacySlots
  );
  assert.deepEqual(
    HPV2_EXTENSION_FIELD_BINDINGS.map((binding, slot) => row(binding, slot)),
    wireManifest.extensionSlots
  );
});

test('cross-repository HPCR2 corpus decodes and exports canonical bytes', () => {
  const decoded = decodeRewriteTransfer(wireCorpus.hpcr2.inputCode);
  assert.equal(decoded.format, 'HPCR2');
  assert.equal(decoded.profiles.length, 1);
  const profile = decoded.profiles[0];
  for (const slot of wireManifest.legacySlots) {
    assert.equal(
      profile.rewrite.values[slot.slot],
      slot.retired ? slot.codecDefault : wireCorpus.hpcr2.activeValues[slot.key],
      slot.key
    );
  }
  assert.deepEqual(profile.rewrite.conditions, wireCorpus.hpcr2.conditions);
  assert.equal(
    createRewriteSettingsCode(profile),
    wireCorpus.hpcr2.canonicalCode
  );
});

test('cross-repository HPCRP1 corpus decodes and exports canonical bytes', () => {
  const decoded = decodeRewriteTransfer(wireCorpus.hpcrp1.inputCode);
  assert.equal(decoded.format, 'HPCRP1');
  const profile = decoded.profiles.find(
    (candidate) => candidate.rewrite.id === wireCorpus.hpcrp1.selectedPresetId
  );
  assert.ok(profile);
  for (const slot of wireManifest.legacySlots) {
    assert.equal(
      profile.rewrite.values[slot.slot],
      slot.retired ? slot.codecDefault : wireCorpus.hpcrp1.activeValues[slot.key],
      slot.key
    );
  }
  for (const slot of wireManifest.extensionSlots) {
    assert.equal(
      profile.rewrite.values[wireManifest.legacySlots.length + slot.slot],
      wireCorpus.hpcrp1.activeValues[slot.key],
      slot.key
    );
  }
  assert.deepEqual(profile.rewrite.conditions, wireCorpus.hpcrp1.conditions);
  assert.equal(
    createRewritePresetBundle(decoded.profiles, profile.id),
    wireCorpus.hpcrp1.canonicalCode
  );
});

test('cross-repository malformed corpus preserves builder acceptance and errors', async (t) => {
  for (const fixture of wireCorpus.malformed) {
    await t.test(fixture.id, () => {
      if (fixture.builderError === null) {
        assert.doesNotThrow(() => decodeRewriteTransfer(fixture.code));
        return;
      }
      assert.throws(
        () => decodeRewriteTransfer(fixture.code),
        (error) => error.message === fixture.builderError
      );
    });
  }
});

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
  assert.equal(webValues.hp_readout_offset_x, -30);
  assert.equal(webValues.hp_readout_offset_y, 434);

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
  assert.ok(record.values.some(([index, value]) => index === 32 && value === -30));
  assert.ok(record.values.some(([index, value]) => index === 33 && value === 434));
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
  const code = 'HPCRP1{"records":[{"id":"baked_default","kind":"baked","name":"Rewrite Default","mode":"off","heroes":[],"values":[[8,"#FD4949"],[20,"#FFEFD7"],[21,"#FFEFD7"],[22,"#FFEFD7"],[32,-30],[33,434]],"conditions":null}],"selectedPresetId":"baked_default"}';
  const profile = decodeRewriteTransfer(code).profiles[0];
  const record = payload(createRewritePresetCode(profile), 'HPCRP1').records[0];
  assert.deepEqual(record, {
    id: 'baked_default',
    kind: 'baked',
    name: 'Rewrite Default',
    mode: 'off',
    heroes: [],
    values: [[8, '#FD4949'], [20, '#FFEFD7'], [21, '#FFEFD7'], [22, '#FFEFD7'], [32, -30], [33, 434]],
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
  const expected = [...REWRITE_CODEC_FIELD_BINDINGS, ...HPV2_EXTENSION_FIELD_BINDINGS].map((binding) => {
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
  assert.equal(decoded.rewrite.values[72], 40);
  assert.equal(decoded.rewrite.values[73], 16);
  assert.equal(decoded.rewrite.values[74], -300);
  assert.equal(decoded.rewrite.values[75], -200);
  assert.equal(decoded.rewrite.values[76], true);
  assert.equal(decoded.rewrite.values[77], '#123456');
  assert.equal(decoded.rewrite.values[78], 'gradient');
  assert.equal(decoded.rewrite.values[79], false);
  assert.equal(decoded.rewrite.values[80], -300);
  assert.equal(decoded.rewrite.values[81], -200);
  assert.equal(decoded.rewrite.values[82], -300);
  assert.equal(decoded.rewrite.values[83], -200);
  const pairs = payload(code, 'HPCRP1').records[0].values;
  for (const retiredIndex of [12, 13, 67])
    assert.equal(pairs.some(([index]) => index === retiredIndex), false);
  assert.equal(pairs.some(([index]) => index === 68), true);
  assert.equal(pairs.some(([index]) => index === 69), true);
  assert.deepEqual(payload(code, 'HPCRP1').records[0].hpv2, {
    v: 1,
    values: [
      [0, 40],
      [1, 16],
      [2, -300],
      [3, -200],
      [4, true],
      [5, '#123456'],
      [6, 'gradient'],
      [7, false],
      [8, -300],
      [9, -200],
      [10, -300],
      [11, -200]
    ],
    conditions: {}
  });
});

test('HPv2-only settings round-trip through the preset extension but not HPCR2', () => {
  const values = {
    ...REWRITE_FIELD_CATALOG.createDefaultState(),
    hpv2_stamina_width: 150,
    hpv2_stamina_height: 52.5,
    hpv2_stamina_offset_x: 24,
    hpv2_stamina_offset_y: -18,
    hpv2_enemy_stamina_color_enabled: true,
    hpv2_enemy_stamina_color: '#123456',
    hpv2_friend_pulse_color_mode: 1,
    hpv2_accessory_anchor_enabled: false,
    hpv2_ult_offset_x: 12,
    hpv2_ult_offset_y: -7,
    hpv2_level_offset_x: -20,
    hpv2_level_offset_y: 9,
  };
  const profile = {
    id: 'stamina',
    name: 'Stamina',
    values: HP_FIELD_CATALOG.createDefaultState(),
    heroMode: 'all',
    heroes: [],
    overrides: {},
    rewrite: createRewriteProfileMetadata({
      id: 'stamina',
      name: 'Stamina',
      values,
      heroMode: 'all',
      heroes: [],
      overrides: {
        hpv2_stamina_width: { slot: 4, minTier: 3, value: 180 }
      }
    }, { valuesAreRewrite: true })
  };

  const presetCode = createRewritePresetCode(profile);
  assert.deepEqual(payload(presetCode, 'HPCRP1').records[0].hpv2, {
    v: 1,
    values: [
      [0, 150],
      [1, 52.5],
      [2, 24],
      [3, -18],
      [4, true],
      [5, '#123456'],
      [6, 'gradient'],
      [7, false],
      [8, 12],
      [9, -7],
      [10, -20],
      [11, 9]
    ],
    conditions: {
      staminaWidth: { slot: 4, minTier: 3, value: 180 }
    }
  });

  const decoded = decodeRewriteTransfer(presetCode).profiles[0];
  assert.equal(decoded.rewrite.webValues.hpv2_stamina_width, 150);
  assert.equal(decoded.rewrite.webValues.hpv2_stamina_height, 52.5);
  assert.equal(decoded.rewrite.webValues.hpv2_stamina_offset_x, 24);
  assert.equal(decoded.rewrite.webValues.hpv2_stamina_offset_y, -18);
  assert.equal(decoded.rewrite.webValues.hpv2_enemy_stamina_color_enabled, true);
  assert.equal(decoded.rewrite.webValues.hpv2_enemy_stamina_color, '#123456');
  assert.equal(decoded.rewrite.webValues.hpv2_friend_pulse_color_mode, 1);
  assert.equal(decoded.rewrite.webValues.hpv2_accessory_anchor_enabled, false);
  assert.equal(decoded.rewrite.webValues.hpv2_ult_offset_x, 12);
  assert.equal(decoded.rewrite.webValues.hpv2_ult_offset_y, -7);
  assert.equal(decoded.rewrite.webValues.hpv2_level_offset_x, -20);
  assert.equal(decoded.rewrite.webValues.hpv2_level_offset_y, 9);
  assert.deepEqual(decoded.rewrite.webOverrides.hpv2_stamina_width, {
    slot: 4,
    minTier: 3,
    value: 180
  });

  const settingsPayload = payload(createRewriteSettingsCode(profile), 'HPCR2');
  assert.deepEqual(Object.keys(settingsPayload).sort(), ['c', 'v']);
  assert.equal(settingsPayload.v.some(([index]) => index >= 72), false);
  assert.equal(Object.hasOwn(settingsPayload.c, 'staminaWidth'), false);

  const legacy = decodeRewriteTransfer(FIXTURE).profiles[0];
  assert.equal(legacy.rewrite.webValues.hpv2_stamina_width, 110);
  assert.equal(legacy.rewrite.webValues.hpv2_stamina_height, 44.8);
  assert.equal(legacy.rewrite.webValues.hpv2_enemy_stamina_color_enabled, false);
  assert.equal(legacy.rewrite.webValues.hpv2_friend_pulse_color_mode, 0);
  assert.equal(legacy.rewrite.webValues.hpv2_accessory_anchor_enabled, true);
  assert.equal(legacy.rewrite.webValues.hpv2_ult_offset_x, 0);
  assert.equal(legacy.rewrite.webValues.hpv2_ult_offset_y, 0);
  assert.equal(legacy.rewrite.webValues.hpv2_level_offset_x, 0);
  assert.equal(legacy.rewrite.webValues.hpv2_level_offset_y, 0);

  assert.throws(
    () => decodeRewriteTransfer('HPCRP1{"records":[{"id":"user_0001","kind":"user","name":"Bad","mode":"all","heroes":[],"values":[],"conditions":null,"hpv2":{"v":2,"values":[],"conditions":{}}}],"selectedPresetId":"user_0001"}'),
    /INVALID HPV2 PRESET EXTENSION/
  );
});
