import assert from "node:assert/strict";
import test from "node:test";

import { parseHpColorsImportProfiles } from "../src/hpImportCode.js";
import { HP_FIELD_CATALOG } from "../src/hpSchema.js";
import { createProfile } from "../src/profileStore.js";
import {
  createAllProfileCodes,
  createProfileCode,
  createProfilesJsonExport,
  createProfilesJsonFileName
} from "../src/presetBuilderExport.js";

const defaults = HP_FIELD_CATALOG.createDefaultState();
const profiles = [
  createProfile({ id: "one", name: "Lane", values: { ...defaults, hp_color_low: "#112233" }, heroMode: "all" }),
  createProfile({ id: "two", name: "Fight", values: { ...defaults, hp_color_low: "#445566" }, heroMode: "selected", heroes: ["hero_haze"] })
];

test("current and all-profile codes round trip through the current importer", () => {
  assert.equal(parseHpColorsImportProfiles(createProfileCode(profiles[0]))[0].name, "Lane");

  const imported = parseHpColorsImportProfiles(createAllProfileCodes(profiles));
  assert.deepEqual(imported.map((profile) => profile.name), ["Lane", "Fight"]);
  assert.equal(imported[1].values.hp_color_low, "#445566");
  assert.deepEqual(imported[1].heroes, ["hero_haze"]);
});

test("JSON export uses the importer bundle contract", () => {
  const exported = createProfilesJsonExport(profiles);
  const parsed = JSON.parse(exported);
  const imported = parseHpColorsImportProfiles(exported);

  assert.equal(parsed.version, 1);
  assert.equal(parsed.profiles.length, 2);
  assert.deepEqual(imported.map((profile) => profile.name), ["Lane", "Fight"]);
  assert.equal(createProfilesJsonFileName("  Lane / Fight  "), "lane-fight.json");
});
