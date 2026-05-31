import { DEFAULT_HP_COLORS_MOD_VARIANT, HP_COLORS_MOD_VARIANTS } from './hpModVariants.js';

const BUILD_VARIANTS = new Set(Object.values(HP_COLORS_MOD_VARIANTS));

export function canConfirmBuild({ installValidated, buildVariant }) {
  return installValidated === true && BUILD_VARIANTS.has(buildVariant);
}

export function getNextInstallValidationState({ installValidated, buildVariant }) {
  if (installValidated === true) {
    return {
      installValidated: false,
      buildVariant: null
    };
  }
  return {
    installValidated: true,
    buildVariant: BUILD_VARIANTS.has(buildVariant) ? buildVariant : DEFAULT_HP_COLORS_MOD_VARIANT
  };
}

export function getBuildVariantWarning({ buildVariant, profileCount, firstPresetName }) {
  return null;
}
