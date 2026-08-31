import assert from "node:assert/strict";
import test from "node:test";

import { HP_COLORS_MOD_VARIANTS } from "../src/hpModVariants.js";
import { V2_STORAGE_KEY } from "../src/profileStore.js";
import { V2_TARGET_MODE_STORAGE_KEY } from "../src/targetModeStore.js";
import { convertImportTextToHpv2 } from "../src/v2ImportConverter.js";

function createStorage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    snapshot() {
      return Object.fromEntries(values);
    }
  };
}

test("v2 converter imports a legacy profile into V2 storage", () => {
  const storage = createStorage();
  const importText = JSON.stringify({
    version: 1,
    profiles: [{
      name: "Enemy gradient",
      values: {
        hp_mode: 1,
        hp_color_low: "#FD4949",
        hp_color_mid: "#FF7B00",
        hp_color_high: "#00FF00"
      },
      heroMode: "selected",
      heroes: ["hero_shiv"]
    }]
  });

  const result = convertImportTextToHpv2({ importText, storage });
  const saved = JSON.parse(storage.getItem(V2_STORAGE_KEY));

  assert.equal(result.importedCount, 1);
  assert.equal(result.activeProfileId, saved.activeProfileId);
  assert.equal(result.href, "/v2/");
  assert.equal(saved.profiles[0].name, "Enemy gradient");
  assert.equal(saved.profiles[0].heroMode, "selected");
  assert.deepEqual(saved.profiles[0].heroes, ["hero_shiv"]);
  assert.equal(saved.profiles[0].rewrite.webValues.hp_color_low, "#FD4949");
  assert.equal(saved.profiles[0].rewrite.webValues.hp_color_mid, "#FF7B00");
  assert.equal(saved.profiles[0].rewrite.webValues.hp_color_high, "#00FF00");
  assert.equal(storage.getItem(V2_TARGET_MODE_STORAGE_KEY), HP_COLORS_MOD_VARIANTS.FULL);
});

test("v2 converter leaves V2 storage untouched when import parsing fails", () => {
  const original = JSON.stringify({ profiles: [{ id: "keep" }] });
  const storage = createStorage({ [V2_STORAGE_KEY]: original });

  assert.throws(
    () => convertImportTextToHpv2({ importText: "not an HP Colors import", storage }),
    /Invalid|Unsupported|Expected/
  );
  assert.equal(storage.getItem(V2_STORAGE_KEY), original);
});
