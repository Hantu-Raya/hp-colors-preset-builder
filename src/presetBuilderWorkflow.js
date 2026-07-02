import { downloadBytes } from "./download.js";
import { DEFAULT_HP_COLORS_MOD_VARIANT, HP_COLORS_MOD_VARIANTS } from "./hpModVariants.js";
import { buildConvertedVpkFileName } from "./presetVpkFileName.js";
import { reducePresetBuilderSession } from "./presetBuilderSession.js";
import { getTargetModeDetails, normalizeTargetMode, saveTargetModeState } from "./targetModeStore.js";

export const BASE_HUD_TEMPLATE_PATH = "templates/hp_colors/panorama/layout/base_hud.xml";

export function createBaseHudXmlLoader({ baseUrl = "/", fetchImpl = globalThis.fetch } = {}) {
  let promise = null;
  return function loadBaseHudXml() {
    if (!promise) {
      promise = Promise.resolve(fetchImpl(`${baseUrl}${BASE_HUD_TEMPLATE_PATH}`))
        .then((response) => {
          if (!response.ok) throw new Error(`Failed to load base_hud.xml (${response.status})`);
          return response.text();
        })
        .catch((error) => {
          promise = null;
          throw error;
        });
    }
    return promise;
  };
}

export function commitPresetBuilderTargetMode({ session, targetMode, storage = null }) {
  const normalizedTargetMode = normalizeTargetMode(targetMode);
  saveTargetModeState(storage, normalizedTargetMode);
  return reducePresetBuilderSession(session, { type: "COMMIT_TARGET_MODE", targetMode: normalizedTargetMode });
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

export async function runPresetBuildWorkflow({ selection, targetMode, loadBaseHudXml, download = downloadBytes, dispatch }) {
  const activeModVariant = normalizeTargetMode(targetMode);
  const filename = selection.presetVpkFileName;
  const buildPresets = selection.buildProfilePresets;
  dispatch({ type: "SET_STATUS", status: `Building ${filename}...` });
  try {
    const [{ buildHpColorsPackage }, { HP_COLORS_PACKAGE_ARTIFACTS }] = await Promise.all([
      import("./packageBuilder.js"),
      import("./packageArtifacts.js")
    ]);
    const baseHudXml = await loadBaseHudXml();
    const { vpkBytes } = buildHpColorsPackage({
      sourceTexts: { [HP_COLORS_PACKAGE_ARTIFACTS.baseHud.sourcePath]: baseHudXml },
      presets: buildPresets,
      modVariant: activeModVariant
    });
    download(filename, vpkBytes);
    const modLabel = getTargetModeDetails(activeModVariant).title.toLowerCase();
    const count = buildPresets.length;
    dispatch({ type: "SET_STATUS", status: `Built ${filename} for ${modLabel} (${vpkBytes.byteLength.toLocaleString()} bytes, ${count} profile${count === 1 ? "" : "s"}).` });
  } catch (error) {
    dispatch({ type: "SET_STATUS", status: error?.message || String(error) });
  }
}

export async function runPresetConvertWorkflow({ convertFile, targetModVariant, loadBaseHudXml, download = downloadBytes, dispatch }) {
  if (!convertFile) {
    dispatch({ type: "SET_CONVERT_STATUS", status: "Select a generated HP Colors preset VPK first." });
    return;
  }

  const activeModVariant = normalizeTargetMode(targetModVariant || DEFAULT_HP_COLORS_MOD_VARIANT);
  const targetLabel = activeModVariant === HP_COLORS_MOD_VARIANTS.MINIMAL ? "minimal mod" : "full mod";
  dispatch({ type: "SET_CONVERT_STATUS", status: `Converting ${convertFile.name} to ${targetLabel}...` });
  try {
    const { convertHpColorsPresetVpk } = await import("./vpkConverter.js");
    const baseHudXml = await loadBaseHudXml();
    const converted = convertHpColorsPresetVpk({
      vpkBytes: new Uint8Array(await convertFile.arrayBuffer()),
      baseHudXml,
      targetModVariant: activeModVariant
    });
    const outputName = buildConvertedVpkFileName(convertFile.name);
    download(outputName, converted.vpkBytes);
    const status = `Converted ${outputName} for the ${targetLabel}.`;
    dispatch({ type: "SET_CONVERT_STATUS", status });
    dispatch({ type: "SET_STATUS", status });
  } catch (error) {
    const message = error?.message || String(error);
    dispatch({ type: "SET_CONVERT_STATUS", status: message });
    dispatch({ type: "SET_STATUS", status: message });
  }
}
