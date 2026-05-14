const DEFAULT_PRESET_FILE_NAME = 'Web Builder Preset';
const UNSAFE_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001F]/g;

export function buildPresetVpkFileName(presetName) {
  const cleanedName = String(presetName || '')
    .replace(UNSAFE_FILENAME_CHARS, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/g, '');
  const baseName = cleanedName || DEFAULT_PRESET_FILE_NAME;
  return /\.vpk$/i.test(baseName) ? baseName : `${baseName}.vpk`;
}

export function buildConvertedVpkFileName(sourceFileName) {
  return buildPresetVpkFileName(sourceFileName);
}
