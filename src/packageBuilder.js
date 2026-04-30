import { HP_SCHEMA } from "./hpSchema.js";
import { createDefaultFormState } from "./hpFormModel.js";
import { injectPresetStoreIntoBaseHudXml } from "./presetStoreXml.js";
import { compilePanoramaLayoutResource, compileTextResource } from "./source2ResourceWriter.js";

function randomFloat(random) {
  return typeof random === "function" ? Number(random()) : Math.random();
}

function randomColor(random) {
  const value = Math.floor(randomFloat(random) * 0xffffff);
  return `#${value.toString(16).padStart(6, "0").toUpperCase()}`;
}

function randomInteger(min, max, random) {
  return Math.floor(Number(min) + randomFloat(random) * (Number(max) - Number(min) + 1));
}

function randomPosition(random) {
  const x = Math.round(randomFloat(random) * 400);
  const y = Math.round(randomFloat(random) * 400);
  return `${x},${y}`;
}

function randomSlider(spec, random) {
  const bounds = spec.bounds || {};
  const min = Number(bounds.min);
  const max = Number(bounds.max);
  const step = Number(bounds.step);
  if (Number.isInteger(step) && step > 0) {
    return randomInteger(min, max, random);
  }
  return Number((min + randomFloat(random) * (max - min)).toFixed(2));
}

export function createRandomPreset(random = Math.random) {
  const values = {};

  for (const [key, spec] of Object.entries(HP_SCHEMA)) {
    if (!spec) continue;
    if (spec.type === "toggle") {
      values[key] = spec.defaultValue;
      continue;
    }
    if (spec.type === "colorpicker") {
      values[key] = randomColor(random);
      continue;
    }
    if (spec.type === "slider") {
      values[key] = randomSlider(spec, random);
      continue;
    }
    if (spec.type === "cycler") {
      const count = Array.isArray(spec.options) ? spec.options.length : 0;
      values[key] = count > 0 ? randomInteger(0, count - 1, random) : spec.defaultValue;
      continue;
    }
    if (spec.type === "positionpicker") {
      values[key] = randomPosition(random);
      continue;
    }
    if (spec.type === "boolean" || spec.type === "color" || spec.type === "number") {
      values[key] = spec.defaultValue;
    }
  }

  return {
    name: "Web Builder Preset",
    version: 1,
    values
  };
}

function toOutputPath(sourcePath) {
  return String(sourcePath)
    .replace(/^templates\/hp_colors\//, "")
    .replace(/\.js$/i, ".vjs_c")
    .replace(/\.css$/i, ".vcss_c")
    .replace(/\.xml$/i, ".vxml_c");
}

function compileSourceFile(sourcePath, sourceText) {
  if (/\.xml$/i.test(sourcePath)) {
    return compilePanoramaLayoutResource(sourceText);
  }
  return compileTextResource(sourceText);
}

export function buildHpColorsPackage({ sourceTexts, random = Math.random, preset = null }) {
  const activePreset = preset || { name: "Web Builder Preset", version: 1, values: createDefaultFormState(HP_SCHEMA) };
  const baseHudSourcePath = "templates/hp_colors/panorama/layout/base_hud.xml";
  const baseHudXml = sourceTexts && sourceTexts[baseHudSourcePath];
  if (!baseHudXml) {
    throw new Error(`Missing source text: ${baseHudSourcePath}`);
  }

  const patchedBaseHudXml = injectPresetStoreIntoBaseHudXml(baseHudXml, [activePreset]);
  const files = [{
    path: toOutputPath(baseHudSourcePath),
    bytes: compileSourceFile(baseHudSourcePath, patchedBaseHudXml)
  }];

  return {
    preset: activePreset,
    baseHudXml: patchedBaseHudXml,
    files
  };
}
