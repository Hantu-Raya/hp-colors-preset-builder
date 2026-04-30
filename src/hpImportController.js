import { HP_SCHEMA } from "./hpSchema.js";
import { parseHpColorsImportCode } from "./hpImportCode.js";

export function createHpImportHandler({ importText, statusNode, schema = HP_SCHEMA, applyState } = {}) {
  if (!importText || !statusNode || typeof applyState !== "function") {
    throw new Error("Missing HP import handler dependencies");
  }

  return () => {
    try {
      applyState(parseHpColorsImportCode(importText.value, schema));
      statusNode.textContent = "Imported preset state.";
    } catch (error) {
      statusNode.textContent = error && error.message ? error.message : String(error);
    }
  };
}
