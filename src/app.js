import { downloadBytes } from "./download.js";
import { buildHpColorsPackage } from "./packageBuilder.js";
import { writeVpkWithDeadMod } from "./deadModPacker.js";
import { writeVpk } from "./vpkWriter.js";
import { HP_SCHEMA } from "./hpSchema.js";
import { createDefaultFormState } from "./hpFormModel.js";
import { renderHpForm } from "./hpFormRenderer.js";
import { createHpImportHandler } from "./hpImportController.js";
import { installBuildWarningGate } from "./buildWarning.js";

const UI = {
  build: document.querySelector("#buildBtn"),
  presetName: document.querySelector("#presetName"),
  importButton: document.querySelector("#importBtn"),
  importText: document.querySelector("#importText"),
  status: document.querySelector("#status"),
  preview: document.querySelector("#preview"),
  form: document.querySelector("#builderForm")
};

async function fetchText(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
  return response.text();
}

let currentPreset = createDefaultFormState(HP_SCHEMA);

const formApi = renderHpForm({ document, formRoot: UI.form, previewNode: UI.preview, schema: HP_SCHEMA, state: currentPreset, onChange: (state) => { currentPreset = state; } });

function updatePreview() {
  formApi.setState(currentPreset);
}

async function buildPak() {
  const baseHudXml = await fetchText("templates/hp_colors/panorama/layout/base_hud.xml");
  const presetName = String(UI.presetName?.value || "Web Builder Preset").trim() || "Web Builder Preset";
  const { files } = buildHpColorsPackage({ sourceTexts: { "templates/hp_colors/panorama/layout/base_hud.xml": baseHudXml }, preset: { name: presetName, version: 1, values: currentPreset } });
  try {
    return await writeVpkWithDeadMod(files);
  } catch (error) {
    console.warn("DeadMod packer failed; falling back to local VPK writer.", error);
    return writeVpk(files);
  }
}

async function performBuild() {
  UI.build.disabled = true;
    UI.status.textContent = "Building pak96_dir.vpk...";
  try {
    const pak = await buildPak();
    downloadBytes("pak96_dir.vpk", pak);
    UI.status.textContent = `Built pak96_dir.vpk (${pak.byteLength.toLocaleString()} bytes).`;
  } catch (error) {
    UI.status.textContent = error && error.message ? error.message : String(error);
  } finally {
    updatePreview();
    UI.build.disabled = false;
  }
}

installBuildWarningGate({
  document,
  buildButton: UI.build,
  runBuild: performBuild
});

const applyImportedState = createHpImportHandler({
  importText: UI.importText,
  statusNode: UI.status,
  schema: HP_SCHEMA,
  applyState(nextState) {
    currentPreset = nextState;
    formApi.setState(nextState);
  }
});

UI.importButton.addEventListener("click", applyImportedState);

updatePreview();
