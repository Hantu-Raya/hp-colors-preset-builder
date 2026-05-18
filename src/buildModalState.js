import { HP_COLORS_MOD_VARIANTS } from './hpModVariants.js';

const BUILD_VARIANTS = new Set(Object.values(HP_COLORS_MOD_VARIANTS));

export function canChooseBuildMod({ installValidated }) {
  return installValidated === true;
}

export function canConfirmBuild({ installValidated, buildVariant }) {
  return canChooseBuildMod({ installValidated }) && BUILD_VARIANTS.has(buildVariant);
}

export function getBuildChoiceVisibility({ installValidated }) {
  const isValidated = installValidated === true;
  return {
    showDescription: isValidated,
    showDownload: !isValidated
  };
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
    buildVariant: BUILD_VARIANTS.has(buildVariant) ? buildVariant : null
  };
}

export function getBuildVariantWarning({ buildVariant, profileCount, firstPresetName }) {
  const count = Number(profileCount);
  if (buildVariant !== HP_COLORS_MOD_VARIANTS.MINIMAL || !Number.isFinite(count) || count <= 1) {
    return null;
  }

  const presetName = String(firstPresetName || '').trim() || 'the top preset';
  return {
    title: 'Minimal uses the top preset first',
    message: `Minimal mod will load ${presetName} first instead of switching through the full ${count}-preset list.`
  };
}
