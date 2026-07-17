import { downloadBytes } from "./download.js";
import { DEFAULT_HP_COLORS_MOD_VARIANT, HP_COLORS_MOD_VARIANTS } from "./hpModVariants.js";
import { PRESET_VPK_FILE_NAME } from "./presetVpkFileName.js";
import { HP_COLORS_PACKAGE_LIMITS } from "./packageArtifacts.js";
import { reducePresetBuilderSession } from "./presetBuilderSession.js";
import { getTargetModeDetails, normalizeTargetMode, saveTargetModeState } from "./targetModeStore.js";

export const BASE_HUD_TEMPLATE_PATH = "templates/hp_colors/panorama/layout/base_hud.xml";
export const PRESET_INSTALL_DIRECTORY = "game/citadel/addons";

let buildInFlight = false;
let convertInFlight = false;

export function createBaseHudXmlLoader({ baseUrl = "/", fetchImpl = globalThis.fetch } = {}) {
  let promise = null;
  return function loadBaseHudXml() {
    if (!promise) {
      promise = Promise.resolve(fetchImpl(`${baseUrl}${BASE_HUD_TEMPLATE_PATH}`))
        .then((response) => { if (!response.ok) throw new Error(`Failed to load base_hud.xml (${response.status})`); return response.text(); })
        .catch((error) => { promise = null; throw error; });
    }
    return promise;
  };
}

export function commitPresetBuilderTargetMode({ session, targetMode, storage = null }) {
  const normalizedTargetMode = normalizeTargetMode(targetMode);
  const saved = saveTargetModeState(storage, normalizedTargetMode);
  const nextSession = reducePresetBuilderSession(session, { type: "COMMIT_TARGET_MODE", targetMode: normalizedTargetMode });
  if (saved.ok) return nextSession;
  return reducePresetBuilderSession(nextSession, {
    type: "SET_FEEDBACK",
    feedback: { type: "error", message: saved.error }
  });
}

export async function runPresetImportWorkflow({ importText, defaultState, groups, activeKey = null, dispatch }) {
  try {
    const { parseHpColorsImportProfiles } = await import("./hpImportCode.js");
    const importedProfiles = parseHpColorsImportProfiles(importText);
    dispatch({ type: "IMPORT_PROFILES_SUCCEEDED", importedProfiles }, { defaultState, groups, activeKey });
  } catch (error) {
    dispatch({ type: "IMPORT_FAILED", message: error?.message || String(error) });
  }
}

async function sha256Hex(bytes, digest) {
  const output = digest
    ? await digest(bytes)
    : await globalThis.crypto?.subtle?.digest("SHA-256", bytes);
  if (output == null) throw new Error("SHA-256 digest is unavailable");
  if (typeof output === "string") return output;
  const values = output instanceof ArrayBuffer ? new Uint8Array(output) : new Uint8Array(output.buffer, output.byteOffset, output.byteLength);
  return [...values].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function dispatchStatus(dispatch, type, status) {
  if (dispatch) dispatch({ type, status });
}

export async function runPresetBuildWorkflow({ selection, targetMode, loadBaseHudXml, download = downloadBytes, dispatch, digest = null, installDirectory = PRESET_INSTALL_DIRECTORY }) {
  if (buildInFlight) {
    const message = "A preset build is already in progress.";
    dispatch?.({ type: "BUILD_FAILED", message });
    dispatchStatus(dispatch, "SET_STATUS", message);
    return null;
  }
  buildInFlight = true;
  const activeModVariant = normalizeTargetMode(targetMode);
  const buildPresets = selection?.buildProfilePresets || [];
  dispatch?.({ type: "BUILD_STARTED" });
  dispatchStatus(dispatch, "SET_STATUS", `Building ${PRESET_VPK_FILE_NAME}...`);
  try {
    const [{ buildHpColorsPackage }, { HP_COLORS_PACKAGE_ARTIFACTS }] = await Promise.all([import("./packageBuilder.js"), import("./packageArtifacts.js")]);
    const baseHudXml = await loadBaseHudXml();
    const built = buildHpColorsPackage({ sourceTexts: { [HP_COLORS_PACKAGE_ARTIFACTS.baseHud.sourcePath]: baseHudXml }, presets: buildPresets, modVariant: activeModVariant });
    await download(PRESET_VPK_FILE_NAME, built.vpkBytes);
    const result = {
      filename: PRESET_VPK_FILE_NAME,
      byteLength: built.vpkBytes.byteLength,
      sha256: await sha256Hex(built.vpkBytes, digest),
      profileCount: built.presets.length,
      modVariant: built.modVariant,
      installDirectory
    };
    dispatch?.({ type: "BUILD_SUCCEEDED", result });
    dispatchStatus(dispatch, "SET_STATUS", `Built ${PRESET_VPK_FILE_NAME} for ${getTargetModeDetails(activeModVariant).title.toLowerCase()} (${built.vpkBytes.byteLength.toLocaleString()} bytes, ${built.presets.length} profile${built.presets.length === 1 ? "" : "s"}).`);
    return result;
  } catch (error) {
    const message = error?.message || String(error);
    dispatch?.({ type: "BUILD_FAILED", message });
    dispatchStatus(dispatch, "SET_STATUS", message);
    return null;
  } finally {
    buildInFlight = false;
  }
}

export async function runPresetConvertWorkflow({ convertFile, targetModVariant, loadBaseHudXml, download = downloadBytes, dispatch, digest = null, installDirectory = PRESET_INSTALL_DIRECTORY }) {
  if (!convertFile) {
    dispatchStatus(dispatch, "SET_CONVERT_STATUS", "Select a generated HP Colors preset VPK first.");
    return null;
  }
  if (convertInFlight) {
    const message = "A preset conversion is already in progress.";
    dispatch?.({ type: "CONVERT_FAILED", message });
    dispatchStatus(dispatch, "SET_CONVERT_STATUS", message);
    dispatchStatus(dispatch, "SET_STATUS", message);
    return null;
  }
  const filename = String(convertFile.name || "");
  if (!/\.vpk$/i.test(filename)) {
    const message = "Select a .vpk preset file.";
    dispatch?.({ type: "CONVERT_FAILED", message });
    dispatchStatus(dispatch, "SET_CONVERT_STATUS", message);
    dispatchStatus(dispatch, "SET_STATUS", message);
    return null;
  }
  if (Number.isFinite(convertFile.size) && convertFile.size > HP_COLORS_PACKAGE_LIMITS.MAX_VPK_BYTES) {
    const message = "Selected VPK exceeds the 4 MiB limit.";
    dispatch?.({ type: "CONVERT_FAILED", message });
    dispatchStatus(dispatch, "SET_CONVERT_STATUS", message);
    dispatchStatus(dispatch, "SET_STATUS", message);
    return null;
  }
  convertInFlight = true;
  const activeModVariant = normalizeTargetMode(targetModVariant || DEFAULT_HP_COLORS_MOD_VARIANT);
  const targetLabel = activeModVariant === HP_COLORS_MOD_VARIANTS.MINIMAL ? "minimal mod" : "full mod";
  dispatch?.({ type: "CONVERT_STARTED" });
  dispatchStatus(dispatch, "SET_CONVERT_STATUS", `Converting ${filename} to ${targetLabel}...`);
  try {
    const { convertHpColorsPresetVpk } = await import("./vpkConverter.js");
    const baseHudXml = await loadBaseHudXml();
    const bytes = new Uint8Array(await convertFile.arrayBuffer());
    if (bytes.byteLength > HP_COLORS_PACKAGE_LIMITS.MAX_VPK_BYTES) throw new Error("Selected VPK exceeds the 4 MiB limit.");
    const converted = convertHpColorsPresetVpk({ vpkBytes: bytes, baseHudXml, targetModVariant: activeModVariant });
    await download(PRESET_VPK_FILE_NAME, converted.vpkBytes);
    const result = {
      filename: PRESET_VPK_FILE_NAME,
      byteLength: converted.vpkBytes.byteLength,
      sha256: await sha256Hex(converted.vpkBytes, digest),
      profileCount: converted.presets.length,
      modVariant: converted.modVariant,
      installDirectory
    };
    dispatch?.({ type: "CONVERT_SUCCEEDED", result });
    const status = `Converted ${PRESET_VPK_FILE_NAME} for the ${targetLabel}.`;
    dispatchStatus(dispatch, "SET_CONVERT_STATUS", status);
    dispatchStatus(dispatch, "SET_STATUS", status);
    return result;
  } catch (error) {
    const message = error?.message || String(error);
    dispatch?.({ type: "CONVERT_FAILED", message });
    dispatchStatus(dispatch, "SET_CONVERT_STATUS", message);
    dispatchStatus(dispatch, "SET_STATUS", message);
    return null;
  } finally {
    convertInFlight = false;
  }
}
