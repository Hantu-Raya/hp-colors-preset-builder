import assert from "node:assert/strict";
import test from "node:test";

import { HP_FIELD_CATALOG } from "../src/hpSchema.js";
import { HP_COLORS_MOD_VARIANTS } from "../src/hpModVariants.js";
import {
  createPresetBuilderSession,
  reducePresetBuilderSession,
  selectPresetBuilderSession
} from "../src/presetBuilderSession.js";

const defaultState = HP_FIELD_CATALOG.createDefaultState();
const groups = HP_FIELD_CATALOG.splitCategoryGroups();

function selection(session, activeKey = null) {
  return selectPresetBuilderSession(session, defaultState, groups, activeKey);
}

test("session selector requires install validation and a selected target before confirming", () => {
  const session = createPresetBuilderSession(defaultState);

  assert.equal(selection(session).canConfirmBuildVariant, false);
  assert.equal(selection({ ...session, installValidated: true, targetMode: null }).canConfirmBuildVariant, false);
  assert.equal(selection({ ...session, installValidated: true, targetMode: HP_COLORS_MOD_VARIANTS.MINIMAL }).canConfirmBuildVariant, true);
});

test("new session profiles apply all-hero defaults without overriding imported off", () => {
  const session = createPresetBuilderSession(defaultState);
  assert.equal(session.profiles[0].heroMode, "all");

  const imported = reducePresetBuilderSession(session, {
    type: "IMPORT_PROFILES_SUCCEEDED",
    importedProfiles: [{ name: "Disabled", values: defaultState, heroMode: "off", heroes: [] }]
  }, { defaultState, groups });

  assert.equal(imported.profiles[0].heroMode, "off");
  assert.deepEqual(imported.profiles[0].heroes, []);
});

test("minimal import feedback identifies omitted precise pips and signature conditions", () => {
  const session = {
    ...createPresetBuilderSession(defaultState),
    targetMode: HP_COLORS_MOD_VARIANTS.MINIMAL
  };
  const imported = reducePresetBuilderSession(session, {
    type: "IMPORT_PROFILES_SUCCEEDED",
    importedProfiles: [{
      name: "pak96_dir",
      values: defaultState,
      heroMode: "all",
      heroes: [],
      importFeatures: { precisePips: null, signatureConditionCount: 0 }
    }]
  }, { defaultState, groups });

  assert.equal(
    imported.feedback.message,
    "Imported pak96_dir. The source code omitted ppe (More Precise HP Pips; Game default selected) and o (signature-tier conditions)."
  );
});

test("build validation toggles through the session reducer", () => {
  const session = createPresetBuilderSession(defaultState);
  const validated = reducePresetBuilderSession(
    { ...session, targetMode: null },
    { type: "TOGGLE_INSTALL_VALIDATION" }
  );

  assert.equal(validated.installValidated, true);
  assert.equal(validated.targetMode, HP_COLORS_MOD_VARIANTS.MINIMAL);

  const unvalidated = reducePresetBuilderSession(
    { ...validated, targetMode: HP_COLORS_MOD_VARIANTS.FULL },
    { type: "TOGGLE_INSTALL_VALIDATION" }
  );

  assert.equal(unvalidated.installValidated, false);
  assert.equal(unvalidated.targetMode, HP_COLORS_MOD_VARIANTS.FULL);
});

test("build warning stays null for multi-profile minimal and full targets", () => {
  const session = {
    ...createPresetBuilderSession(defaultState),
    profiles: [
      { id: "profile-1", name: "Lane", values: defaultState, heroMode: "off", heroes: [] },
      { id: "profile-2", name: "Teamfight", values: defaultState, heroMode: "off", heroes: [] },
      { id: "profile-3", name: "Late", values: defaultState, heroMode: "off", heroes: [] }
    ]
  };

  assert.equal(selection({ ...session, targetMode: HP_COLORS_MOD_VARIANTS.MINIMAL }).buildVariantWarning, null);
  assert.equal(selection({ ...session, targetMode: HP_COLORS_MOD_VARIANTS.FULL }).buildVariantWarning, null);
});

test("committing a target mode clears picker and validation state", () => {
  const session = {
    ...createPresetBuilderSession(defaultState),
    installValidated: true,
    modePickerOpen: true,
    modePickerRequired: true,
    modePickerUpgrade: true,
    profileMenuOpen: true,
    heroMenuOpen: true
  };

  const next = reducePresetBuilderSession(session, {
    type: "COMMIT_TARGET_MODE",
    targetMode: HP_COLORS_MOD_VARIANTS.FULL
  });

  assert.equal(next.targetMode, HP_COLORS_MOD_VARIANTS.FULL);
  assert.equal(next.installValidated, false);
  assert.equal(next.modePickerOpen, false);
  assert.equal(next.modePickerRequired, false);
  assert.equal(next.modePickerUpgrade, false);
  assert.equal(next.profileMenuOpen, false);
  assert.equal(next.heroMenuOpen, false);
  assert.equal(next.targetModeLoaded, true);
});

test("importing multiple profiles appends and activates the first imported profile", () => {
  const session = createPresetBuilderSession(defaultState);
  const next = reducePresetBuilderSession(session, {
    type: "IMPORT_PROFILES_SUCCEEDED",
    importedProfiles: [
      { name: "Lane", values: { ...defaultState, hp_color_low: "#111111" }, heroMode: "selected", heroes: ["hero_shiv"] },
      { name: "Global", values: { ...defaultState, hp_color_low: "#222222" }, heroMode: "all", heroes: [] }
    ]
  }, { defaultState, groups });

  assert.equal(next.profiles.length, 3);
  assert.deepEqual(next.profiles.slice(1).map((profile) => profile.name), ["Lane", "Global"]);
  assert.equal(next.activeProfileId, "profile-2");
  assert.equal(next.profileMenuOpen, true);
  assert.equal(next.status, "Imported 2 profiles from preset codes.");
});

test("failed imports keep existing profiles", () => {
  const session = createPresetBuilderSession(defaultState);
  const next = reducePresetBuilderSession(session, { type: "IMPORT_FAILED", message: "bad import" });

  assert.deepEqual(next.profiles, session.profiles);
  assert.equal(next.status, "bad import");
});

test("build actions prevent double submit and retain the completed result", () => {
  const session = reducePresetBuilderSession(createPresetBuilderSession(defaultState), { type: "BUILD_STARTED" });
  assert.equal(session.busy, true);
  assert.equal(selection({ ...session, installValidated: true }).canConfirmBuildVariant, false);
  assert.strictEqual(reducePresetBuilderSession(session, { type: "BUILD_STARTED" }), session);

  const result = {
    filename: "pak96_dir.vpk",
    byteLength: 2048,
    sha256: "abc123",
    profileCount: 1,
    modVariant: HP_COLORS_MOD_VARIANTS.MINIMAL,
    installDirectory: "Deadlock/game/citadel/addons"
  };
  const completed = reducePresetBuilderSession(session, { type: "BUILD_SUCCEEDED", result });
  assert.equal(completed.busy, false);
  assert.deepEqual(completed.buildResult, result);
  assert.equal(completed.feedback.type, "success");
});

test("profile movement and build summary are reducer-owned", () => {
  let session = createPresetBuilderSession(defaultState);
  session = reducePresetBuilderSession(session, { type: "ADD_PROFILE", defaultState });
  session = reducePresetBuilderSession(session, { type: "MOVE_PROFILE", profileId: "profile-2", direction: -1 });
  assert.deepEqual(session.profiles.map((profile) => profile.id), ["profile-2", "profile-1"]);

  session = reducePresetBuilderSession(session, { type: "DISABLE_HERO_SELECTION" });
  const summary = selection(session);
  assert.equal(summary.presetVpkFileName, "pak96_dir.vpk");
  assert.equal(summary.profileScopeCounts.off, 1);
  assert.equal(summary.profileScopeCounts.all, 1);
  assert.equal(summary.allProfilesOff, false);
});

test("menus and feedback are reducer-owned transient state", () => {
  let session = createPresetBuilderSession(defaultState);
  session = reducePresetBuilderSession(session, { type: "TOGGLE_PROFILE_MENU" });
  assert.equal(session.profileMenuOpen, true);
  session = reducePresetBuilderSession(session, { type: "TOGGLE_HERO_MENU" });
  assert.equal(session.profileMenuOpen, false);
  assert.equal(session.heroMenuOpen, true);
  session = reducePresetBuilderSession(session, { type: "SET_FEEDBACK", feedback: { type: "error", message: "Storage blocked" } });
  assert.equal(session.feedback.message, "Storage blocked");
});

test("both dialogs can close through reducer actions", () => {
  const session = {
    ...createPresetBuilderSession(defaultState),
    warningOpen: true,
    modePickerOpen: true,
    modePickerRequired: true
  };
  const warningClosed = reducePresetBuilderSession(session, { type: "CLOSE_BUILD_WARNING" });
  const pickerClosed = reducePresetBuilderSession(session, { type: "CLOSE_TARGET_MODE_PICKER" });

  assert.equal(warningClosed.warningOpen, false);
  assert.equal(pickerClosed.modePickerOpen, false);
});
