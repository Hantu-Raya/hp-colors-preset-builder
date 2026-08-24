import { compileSource2Resource, extractSource2Resource, SOURCE2_RESOURCE_CODECS } from "./source2ResourceCodec.js";
import { decodeRewriteTransfer } from "./rewritePresetCodec.js";
import { createVpkArchive, normalizeVpkPath, readVpkArchive, writeVpkArchive } from "./vpkArchive.js";

export const REWRITE_PRESET_ARCHIVE_PATH = "panorama/layout/hud_escape_menu.vxml_c";
export const REWRITE_PRESET_VPK_FILE_NAME = "pak96_dir.vpk";
export const REWRITE_PRESET_TEMPLATE_PATH = "templates/hp_colors_rewrite/panorama/layout/hud_escape_menu.xml";
export const REWRITE_PRESET_CONTRACT = "HPCRP1";
export const REWRITE_PRESET_CONTRACT_VERSION = "1";
export const REWRITE_PRESET_STORE_PANEL_ID = "HPColorsRewritePresetStore";
export const REWRITE_PRESET_STORE_LABEL_ID = "HPColorsRewritePreset_001";
export const REWRITE_PRESET_STORE_LABEL_CLASS = "hp_colors_rewrite_preset_entry";
const REWRITE_PRESET_MAX_CODE_BYTES = 64 * 1024;

const REWRITE_PRESET_STYLE_INCLUDES = Object.freeze([
  "s2r://panorama/styles/citadel_base_styles.vcss_c",
  "s2r://panorama/styles/hud_escape_menu.vcss_c",
  "s2r://panorama/styles/hp_colors_menu.vcss_c"
]);
const REWRITE_PRESET_SCRIPT_INCLUDES = Object.freeze([
  "s2r://panorama/scripts/hp_colors_contract.vjs_c",
  "s2r://panorama/scripts/hp_colors_state.vjs_c",
  "s2r://panorama/scripts/hp_colors_menu.vjs_c"
]);
const REWRITE_PRESET_REQUIRED_PANEL_IDS = Object.freeze([
  "HPColorsMenuButton",
  "HPColorsEditorRoot",
  "HPColorsReadoutMaxTeamColorToggle",
  "HPColorsAllyTeamHighToggle",
  REWRITE_PRESET_STORE_PANEL_ID
]);
export const REWRITE_SHOWRANKS_PRESET_VPK_FILE_NAME = "pak01_dir.vpk";
const REWRITE_SHOWRANKS_SCRIPT_INCLUDE = "s2r://panorama/scripts/showrank_barebones.vjs_c";
const REWRITE_SHOWRANKS_SCRIPT_INCLUDES = Object.freeze([
  ...REWRITE_PRESET_SCRIPT_INCLUDES,
  REWRITE_SHOWRANKS_SCRIPT_INCLUDE
]);
const REWRITE_SHOWRANKS_OPEN_HOOK = "if ($.ShowRankBarebonesEscapeOpen) $.ShowRankBarebonesEscapeOpen();";
const REWRITE_SHOWRANKS_OUT_HOOK = "if ($.ShowRankBarebonesEscapeOut) $.ShowRankBarebonesEscapeOut();";
const REWRITE_SHOWRANKS_MENU_ONLOAD = `$.HPColorsMenuBoot(); ${REWRITE_SHOWRANKS_OPEN_HOOK}`;
const REWRITE_SHOWRANKS_MENU_ONMOUSEOVER = REWRITE_SHOWRANKS_OPEN_HOOK;
const REWRITE_SHOWRANKS_MENU_ONMOUSEOUT = REWRITE_SHOWRANKS_OUT_HOOK;

export const REWRITE_QOLLOCK_PRESET_VPK_FILE_NAME = "pak01_dir.vpk";
export const REWRITE_QOLLOCK_PRESET_TEMPLATE_PATH = "templates/hp_colors_rewrite_qollock/panorama/layout/hud_escape_menu.xml";
export const REWRITE_QOLLOCK_PRESET_STYLE_INCLUDES = Object.freeze([
  "s2r://panorama/styles/citadel_base_styles.vcss_c",
  "s2r://panorama/styles/hud_escape_menu.vcss_c",
  "s2r://panorama/styles/ql_settings.vcss_c",
  "s2r://panorama/styles/hp_colors_menu.vcss_c"
]);
export const REWRITE_QOLLOCK_PRESET_SCRIPT_INCLUDES = Object.freeze([
  "s2r://panorama/scripts/ql_utils.vjs_c",
  "s2r://panorama/scripts/ql_shared_presets.vjs_c",
  "s2r://panorama/scripts/ql_bridge.vjs_c",
  "s2r://panorama/scripts/ql_config.vjs_c",
  "s2r://panorama/scripts/ql_custom_announcer_pack_meta.vjs_c",
  "s2r://panorama/scripts/ql_settings_loc/ql_settings_loc_en.vjs_c",
  "s2r://panorama/scripts/ql_settings_loc/ql_settings_loc_ko.vjs_c",
  "s2r://panorama/scripts/ql_settings_loc/ql_settings_loc_it.vjs_c",
  "s2r://panorama/scripts/ql_settings_loc/ql_settings_loc_tr.vjs_c",
  "s2r://panorama/scripts/ql_settings_loc/ql_settings_loc_ru.vjs_c",
  "s2r://panorama/scripts/ql_settings_loc/ql_settings_loc_uk.vjs_c",
  "s2r://panorama/scripts/ql_settings_loc/ql_settings_loc_pl.vjs_c",
  "s2r://panorama/scripts/ql_settings_loc/ql_settings_loc_bg.vjs_c",
  "s2r://panorama/scripts/ql_settings_loc/ql_settings_loc_by.vjs_c",
  "s2r://panorama/scripts/ql_settings_loc/ql_settings_loc_ja.vjs_c",
  "s2r://panorama/scripts/ql_settings_loc/ql_settings_loc_zh.vjs_c",
  "s2r://panorama/scripts/ql_settings_loc/ql_settings_loc_fr.vjs_c",
  "s2r://panorama/scripts/ql_settings_loc/ql_settings_loc_pt.vjs_c",
  "s2r://panorama/scripts/ql_settings_loc/ql_settings_loc_pt_br.vjs_c",
  "s2r://panorama/scripts/ql_settings_loc/ql_settings_loc_es.vjs_c",
  "s2r://panorama/scripts/ql_arcade_games.vjs_c",
  "s2r://panorama/scripts/ql_settings_previews.vjs_c",
  "s2r://panorama/scripts/ql_settings_tooltips.vjs_c",
  "s2r://panorama/scripts/ql_settings_persistence.vjs_c",
  "s2r://panorama/scripts/ql_update_checker.vjs_c",
  "s2r://panorama/scripts/ql_settings.vjs_c",
  "s2r://panorama/scripts/hp_colors_contract.vjs_c",
  "s2r://panorama/scripts/hp_colors_state.vjs_c",
  "s2r://panorama/scripts/hp_colors_menu.vjs_c",
  "s2r://panorama/scripts/qollock_hp_colors_bridge.vjs_c"
]);
export const REWRITE_QOLLOCK_PRESET_REQUIRED_PANEL_IDS = Object.freeze([
  "SettingsWindow",
  "SettingsList",
  "ModSettingsBtn",
  "newgame",
  "watchgame",
  "guides",
  "HPColorsMenuButton",
  "HPColorsEditorRoot",
  "HPColorsReadoutMaxTeamColorToggle",
  "HPColorsAllyTeamHighToggle",
  "HPColorsSupporterTicker",
  REWRITE_PRESET_STORE_PANEL_ID
]);
const REWRITE_MENU_ONCANCEL = "if (!$.HPColorsMenuCancel()) $.DispatchEvent('CitadelResumePlaying', $.GetContextPanel())";
const REWRITE_MENU_ONCANCEL_XML = REWRITE_MENU_ONCANCEL.replaceAll("'", "&apos;");
const REWRITE_QOLLOCK_MENU_ONCANCEL = "if ($.HPColorsMenuCancel && $.HPColorsMenuCancel()) {} else if ($.ForceCloseModSettings) { $.ForceCloseModSettings(); } else { $.DispatchEvent('CitadelResumePlaying', $.GetContextPanel()); }";

const XML_TOKEN = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<![\s\S]*?>|<[^>]*>|[^<]+/g;
const XML_NAME = /^[A-Za-z_:][A-Za-z0-9_.:-]*$/;
const HEX = /^[0-9A-F]+$/;
const CONTROL_TEXT = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const XML_ENTITIES = Object.freeze({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" });

function asText(input) {
  if (typeof input !== "string") throw new Error("Rewrite preset template must be XML text");
  return input;
}

function decodeXmlEntities(value) {
  return String(value).replace(/&(#x[0-9A-Fa-f]+|#[0-9]+|[A-Za-z][A-Za-z0-9]+);/g, (full, entity) => {
    if (entity.startsWith("#x")) return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
    if (entity.startsWith("#")) return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
    return XML_ENTITIES[entity] ?? full;
  });
}

function parseAttributes(raw, rawOffset) {
  const attrs = Object.create(null);
  const ranges = Object.create(null);
  let cursor = 0;
  while (cursor < raw.length) {
    while (/\s/.test(raw[cursor] || "")) cursor += 1;
    if (cursor >= raw.length) break;
    const nameStart = cursor;
    while (cursor < raw.length && !/[\s=]/.test(raw[cursor])) cursor += 1;
    const name = raw.slice(nameStart, cursor);
    if (!XML_NAME.test(name) || Object.hasOwn(attrs, name)) throw new Error("Malformed rewrite XML attribute list");
    while (/\s/.test(raw[cursor] || "")) cursor += 1;
    if (raw[cursor] !== "=") throw new Error("Malformed rewrite XML attribute list");
    cursor += 1;
    while (/\s/.test(raw[cursor] || "")) cursor += 1;
    const quote = raw[cursor];
    if (quote !== '"' && quote !== "'") throw new Error("Malformed rewrite XML attribute list");
    cursor += 1;
    const valueStart = cursor;
    const end = raw.indexOf(quote, cursor);
    if (end < 0) throw new Error("Malformed rewrite XML attribute list");
    const encoded = raw.slice(valueStart, end);
    if (CONTROL_TEXT.test(encoded)) throw new Error("Rewrite XML contains control characters");
    attrs[name] = decodeXmlEntities(encoded);
    ranges[name] = { start: rawOffset + valueStart, end: rawOffset + end };
    cursor = end + 1;
  }
  return { attrs, ranges };
}

function parseRewriteXml(source) {
  const text = asText(source);
  if (!text || CONTROL_TEXT.test(text)) throw new Error("Invalid rewrite XML template");
  const stack = [];
  let root = null;
  let rootCount = 0;
  let cursor = 0;
  let match;
  XML_TOKEN.lastIndex = 0;
  while ((match = XML_TOKEN.exec(text))) {
    if (match.index !== cursor && text.slice(cursor, match.index).trim()) throw new Error("Malformed rewrite XML");
    cursor = XML_TOKEN.lastIndex;
    const token = match[0];
    if (token.startsWith("<!--")) {
      if (!token.endsWith("-->")) throw new Error("Malformed rewrite XML comment");
      continue;
    }
    if (token.startsWith("<?")) {
      if (!token.endsWith("?>")) throw new Error("Malformed rewrite XML declaration");
      continue;
    }
    if (token.startsWith("<!")) {
      if (!token.endsWith(">")) throw new Error("Malformed rewrite XML declaration");
      continue;
    }
    if (!token.startsWith("<")) continue;
    if (token.startsWith("</")) {
      const closing = token.slice(2, -1).trim();
      if (!XML_NAME.test(closing) || !stack.length || stack[stack.length - 1].name !== closing) throw new Error("Malformed rewrite XML nesting");
      stack.pop();
      continue;
    }
    const selfClosing = /\/\s*>$/.test(token);
    const body = token.slice(1, selfClosing ? -2 : -1);
    const nameMatch = body.match(/^\s*([A-Za-z_:][A-Za-z0-9_.:-]*)([\s\S]*)$/);
    if (!nameMatch) throw new Error("Malformed rewrite XML tag");
    const name = nameMatch[1];
    const attrStart = match.index + 1 + nameMatch[0].indexOf(name) + name.length;
    const parsed = parseAttributes(nameMatch[2], attrStart);
    const node = {
      name,
      attrs: parsed.attrs,
      ranges: parsed.ranges,
      parent: stack[stack.length - 1] || null,
      children: []
    };
    if (node.parent) node.parent.children.push(node);
    else {
      rootCount += 1;
      if (rootCount > 1) throw new Error("Rewrite XML must contain exactly one root");
      root = node;
    }
    if (!selfClosing) stack.push(node);
  }
  if (cursor !== text.length && text.slice(cursor).trim()) throw new Error("Malformed rewrite XML");
  if (stack.length || rootCount !== 1 || root?.name !== "root") throw new Error("Rewrite XML must contain one root element named root");
  return { text, root };
}

function directChildren(node, name) {
  return (node?.children || []).filter((child) => child.name === name);
}

function requireIncludes(root, name, expected, label) {
  const groups = directChildren(root, name);
  if (groups.length !== 1) throw new Error(`Rewrite XML must contain exactly one ${label} block`);
  const includes = groups[0].children;
  if (includes.length !== expected.length || includes.some((node) => node.name !== "include")) {
    throw new Error(`Rewrite XML ${label} include contract is stale or incompatible`);
  }
  const values = includes.map((node) => node.attrs.src);
  if (values.some((value, index) => value !== expected[index])) {
    throw new Error(`Rewrite XML ${label} include contract is stale or incompatible`);
  }
  return values;
}
function requireMenuContract(
  root,
  {
    expectedOnload = "$.HPColorsMenuBoot()",
    expectedOncancel = REWRITE_MENU_ONCANCEL,
    expectedMenuAttributes = null,
    requiredPanelIds = REWRITE_PRESET_REQUIRED_PANEL_IDS
  } = {}
) {
  const escapeMenus = directChildren(root, "CitadelHudEscapeMenu");
  if (escapeMenus.length !== 1) {
    throw new Error("Rewrite XML must contain exactly one CitadelHudEscapeMenu");
  }
  if (escapeMenus[0].attrs.onload !== expectedOnload || escapeMenus[0].attrs.oncancel !== expectedOncancel) {
    throw new Error("Rewrite XML menu lifecycle contract is stale or incompatible");
  }
  if (expectedMenuAttributes) {
    for (const [attribute, value] of Object.entries(expectedMenuAttributes)) {
      if (escapeMenus[0].attrs[attribute] !== value) {
        throw new Error("Rewrite XML menu lifecycle contract is stale or incompatible");
      }
    }
  }
  const ids = new Set();
  const walk = (node) => {
    if (!node) return;
    if (node.attrs.id) ids.add(node.attrs.id);
    node.children.forEach(walk);
  };
  walk(escapeMenus[0]);
  if (requiredPanelIds.some((id) => !ids.has(id))) {
    throw new Error("Rewrite XML menu panel contract is stale or incompatible");
  }
  return escapeMenus[0];
}


function requireStoreLabel(root, { requireEmpty = true } = {}) {
  const panels = [];
  const walk = (node) => {
    if (!node) return;
    if (node.name === "Panel" && node.attrs.id === REWRITE_PRESET_STORE_PANEL_ID) panels.push(node);
    node.children.forEach(walk);
  };
  walk(root);
  if (panels.length !== 1) throw new Error("Rewrite XML must contain exactly one HPColorsRewritePresetStore panel");
  const panel = panels[0];
  if (panel.attrs.hp_colors_rewrite_preset_contract !== REWRITE_PRESET_CONTRACT || panel.attrs.hp_colors_rewrite_preset_version !== REWRITE_PRESET_CONTRACT_VERSION) {
    throw new Error("Rewrite XML store contract version is stale or incompatible");
  }
  if (panel.parent?.name !== "CitadelHudEscapeMenu") {
    throw new Error("Rewrite XML store must be a direct CitadelHudEscapeMenu child");
  }
  const labels = panel.children.filter((node) => node.name === "Label");
  if (labels.length !== 1) throw new Error("Rewrite XML store must contain exactly one preset label");
  const label = labels[0];
  if (label.attrs.id !== REWRITE_PRESET_STORE_LABEL_ID) throw new Error("Rewrite XML store label has an unexpected ID");
  if (!String(label.attrs.class || "").split(/\s+/).includes(REWRITE_PRESET_STORE_LABEL_CLASS)) {
    throw new Error("Rewrite XML store label has an unexpected class");
  }
  if (!Object.hasOwn(label.attrs, "text")) throw new Error("Rewrite XML store label is missing text");
  if (requireEmpty && label.attrs.text !== "") throw new Error("Rewrite XML store label must be empty in the checked-in template");
  if (!requireEmpty && label.attrs.text === "") throw new Error("Rewrite XML store label is missing HPCRP1 data");
  const textRange = label.ranges.text;
  if (!textRange) throw new Error("Rewrite XML store label text cannot be located");
  return { panel, label, textRange };
}

function inspectRewriteXml(
  source,
  {
    requireEmpty = true,
    styleIncludes = REWRITE_PRESET_STYLE_INCLUDES,
    scriptIncludes = REWRITE_PRESET_SCRIPT_INCLUDES,
    requiredPanelIds = REWRITE_PRESET_REQUIRED_PANEL_IDS,
    expectedOnload = "$.HPColorsMenuBoot()",
    expectedOncancel = REWRITE_MENU_ONCANCEL,
    expectedMenuAttributes = null
  } = {}
) {
  const text = asText(source);
  if (/anita/i.test(text)) throw new Error("Rewrite XML must not reference Anita assets");
  const parsed = parseRewriteXml(text);
  const styles = requireIncludes(parsed.root, "styles", styleIncludes, "style");
  const scripts = requireIncludes(parsed.root, "scripts", scriptIncludes, "script");
  const store = requireStoreLabel(parsed.root, { requireEmpty });
  requireMenuContract(parsed.root, { expectedOnload, expectedOncancel, expectedMenuAttributes, requiredPanelIds });
  let code = "";
  if (store.label.attrs.text) {
    code = decodeUtf16Hex(store.label.attrs.text);
    validatePresetCode(code);
  }
  return {
    text,
    contract: REWRITE_PRESET_CONTRACT,
    contractVersion: REWRITE_PRESET_CONTRACT_VERSION,
    styleIncludes: styles,
    scriptIncludes: scripts,
    storePanelId: store.panel.attrs.id,
    labelId: store.label.attrs.id,
    labelClass: store.label.attrs.class,
    labelText: store.label.attrs.text,
    labelTextStart: store.textRange.start,
    labelTextEnd: store.textRange.end,
    presetCode: code
  };
}

function encodeUtf16Hex(value) {
  let encoded = "";
  for (let index = 0; index < value.length; index += 1) {
    encoded += value.charCodeAt(index).toString(16).padStart(4, "0").toUpperCase();
  }
  return encoded;
}

function decodeUtf16Hex(value) {
  if (typeof value !== "string" || value.length % 4 !== 0 || (value && (!HEX.test(value) || value !== value.toUpperCase()))) {
    throw new Error("Rewrite XML store contains invalid UTF-16 hex");
  }
  let decoded = "";
  for (let index = 0; index < value.length; index += 4) {
    decoded += String.fromCharCode(Number.parseInt(value.slice(index, index + 4), 16));
  }
  return decoded;
}

function validatePresetCode(rawCode) {
  const code = String(rawCode ?? "").trim();
  if (!code.startsWith("HPCRP1")) throw new Error("Rewrite preset package requires an HPCRP1 code");
  if (new TextEncoder().encode(code).byteLength > REWRITE_PRESET_MAX_CODE_BYTES) {
    throw new Error("HPCRP1 code exceeds the 64 KiB limit");
  }
  try {
    const decoded = decodeRewriteTransfer(code);
    if (!decoded || decoded.format !== "HPCRP1" || !decoded.profiles?.length) throw new Error("invalid");
  } catch {
    throw new Error("Invalid HPCRP1 code");
  }

  return code;
}

export { encodeUtf16Hex };

function inspectRewritePresetTemplate(templateText) {
  return inspectRewriteXml(templateText, { requireEmpty: true });
}

export function validateRewritePresetTemplate(templateText) {
  return inspectRewritePresetTemplate(templateText);
}

export function inspectRewriteQollockPresetTemplate(templateText) {
  return inspectRewriteXml(templateText, {
    requireEmpty: true,
    styleIncludes: REWRITE_QOLLOCK_PRESET_STYLE_INCLUDES,
    scriptIncludes: REWRITE_QOLLOCK_PRESET_SCRIPT_INCLUDES,
    requiredPanelIds: REWRITE_QOLLOCK_PRESET_REQUIRED_PANEL_IDS,
    expectedOnload: "$.HPColorsMenuBoot()",
    expectedOncancel: REWRITE_QOLLOCK_MENU_ONCANCEL
  });
}

export const validateRewriteQollockPresetTemplate = inspectRewriteQollockPresetTemplate;

function sourceTextFromResource(input) {
  if (typeof input === "string") return input;
  if (input instanceof Uint8Array || input instanceof ArrayBuffer || ArrayBuffer.isView(input)) {
    return extractSource2Resource({ bytes: input, codec: SOURCE2_RESOURCE_CODECS.PANORAMA_LAYOUT });
  }
  throw new Error("Invalid rewrite XML resource bytes");
}

export function readRewritePresetCode(input) {
  const source = sourceTextFromResource(input);
  const inspected = inspectRewriteXml(source, { requireEmpty: false });
  if (!inspected.presetCode) throw new Error("Rewrite XML store is empty");
  return validatePresetCode(inspected.presetCode);
}

function patchRewritePresetTemplate({ templateText, templateXml, template, presetCode, code = presetCode } = {}) {
  const source = templateText ?? templateXml ?? template;
  const normalizedCode = validatePresetCode(code);
  const inspected = inspectRewritePresetTemplate(source);
  const encoded = encodeUtf16Hex(normalizedCode);
  const patchedText = inspected.text.slice(0, inspected.labelTextStart) + encoded + inspected.text.slice(inspected.labelTextEnd);
  const reread = inspectRewriteXml(patchedText, { requireEmpty: false });
  if (reread.presetCode !== normalizedCode) throw new Error("Rewrite XML store patch failed payload round-trip");
  if (inspected.text.slice(0, inspected.labelTextStart) !== patchedText.slice(0, inspected.labelTextStart) || inspected.text.slice(inspected.labelTextEnd) !== patchedText.slice(inspected.labelTextStart + encoded.length)) {
    throw new Error("Rewrite XML patch changed bytes outside the store label");
  }
  return {
    text: patchedText,
    xmlText: patchedText,
    code: normalizedCode,
    presetCode: normalizedCode,
    template: reread
  };
}

export function readRewriteQollockPresetCode(input) {
  const source = sourceTextFromResource(input);
  const inspected = inspectRewriteXml(source, {
    requireEmpty: false,
    styleIncludes: REWRITE_QOLLOCK_PRESET_STYLE_INCLUDES,
    scriptIncludes: REWRITE_QOLLOCK_PRESET_SCRIPT_INCLUDES,
    requiredPanelIds: REWRITE_QOLLOCK_PRESET_REQUIRED_PANEL_IDS,
    expectedOnload: "$.HPColorsMenuBoot()",
    expectedOncancel: REWRITE_QOLLOCK_MENU_ONCANCEL
  });
  if (!inspected.presetCode) throw new Error("Rewrite QOLLOCK XML store is empty");
  return validatePresetCode(inspected.presetCode);
}

function patchRewriteQollockPresetTemplate({ templateText, templateXml, template, presetCode, code = presetCode } = {}) {
  const source = templateText ?? templateXml ?? template;
  const normalizedCode = validatePresetCode(code);
  const inspected = inspectRewriteQollockPresetTemplate(source);
  const encoded = encodeUtf16Hex(normalizedCode);
  const patchedText = inspected.text.slice(0, inspected.labelTextStart) + encoded + inspected.text.slice(inspected.labelTextEnd);
  const reread = inspectRewriteXml(patchedText, {
    requireEmpty: false,
    styleIncludes: REWRITE_QOLLOCK_PRESET_STYLE_INCLUDES,
    scriptIncludes: REWRITE_QOLLOCK_PRESET_SCRIPT_INCLUDES,
    requiredPanelIds: REWRITE_QOLLOCK_PRESET_REQUIRED_PANEL_IDS,
    expectedOnload: "$.HPColorsMenuBoot()",
    expectedOncancel: REWRITE_QOLLOCK_MENU_ONCANCEL
  });
  if (reread.presetCode !== normalizedCode) throw new Error("Rewrite QOLLOCK XML store patch failed payload round-trip");
  if (inspected.text.slice(0, inspected.labelTextStart) !== patchedText.slice(0, inspected.labelTextStart) || inspected.text.slice(inspected.labelTextEnd) !== patchedText.slice(inspected.labelTextStart + encoded.length)) {
    throw new Error("Rewrite QOLLOCK XML patch changed bytes outside the store label");
  }
  return {
    text: patchedText,
    xmlText: patchedText,
    code: normalizedCode,
    presetCode: normalizedCode,
    template: reread
  };
}

export function validateRewritePresetVpk(vpkBytes) {
  const archive = readVpkArchive(vpkBytes);
  if (archive.files.length !== 1) throw new Error("Rewrite preset VPK must contain exactly one file");
  const [file] = archive.files;
  if (normalizeVpkPath(file.path) !== REWRITE_PRESET_ARCHIVE_PATH) throw new Error("Rewrite preset VPK contains an unexpected file");
  if (!(file.bytes instanceof Uint8Array)) throw new Error("Rewrite preset VPK contains invalid bytes");
  const sourceText = extractSource2Resource({ bytes: file.bytes, codec: SOURCE2_RESOURCE_CODECS.PANORAMA_LAYOUT });
  const inspected = inspectRewriteXml(sourceText, { requireEmpty: false });
  if (!inspected.presetCode) throw new Error("Rewrite preset VPK store is empty");
  return archive;
}

export function buildRewritePresetPackage(input, positionalTemplateText = null) {
  const options = typeof input === "string"
    ? { presetCode: input, templateText: positionalTemplateText }
    : (input || {});
  const presetCode = options.presetCode ?? options.code;
  const templateText = options.templateText ?? options.templateXml ?? options.template;
  const patched = patchRewritePresetTemplate({ templateText, presetCode });
  const bytes = compileSource2Resource({ sourceText: patched.text, codec: SOURCE2_RESOURCE_CODECS.PANORAMA_LAYOUT });
  const archive = createVpkArchive([{ path: REWRITE_PRESET_ARCHIVE_PATH, bytes }]);
  const vpkBytes = writeVpkArchive(archive);
  const rereadArchive = validateRewritePresetVpk(vpkBytes);
  const file = rereadArchive.files[0];
  const rereadText = extractSource2Resource({ bytes: file.bytes, codec: SOURCE2_RESOURCE_CODECS.PANORAMA_LAYOUT });
  const rereadCode = readRewritePresetCode(rereadText);
  if (rereadCode !== patched.code) throw new Error("Rewrite preset VPK payload failed round-trip");
  return {
    vpkBytes,
    bytes: file.bytes,
    sourceText: rereadText,
    xmlText: rereadText,
    presetCode: patched.code,
    template: inspectRewriteXml(rereadText, { requireEmpty: false }),
    archive: rereadArchive
  };
}

function mergeRewriteShowranksTemplate(templateText) {
  const inspected = inspectRewritePresetTemplate(templateText);
  const canonicalMenuTag = `<CitadelHudEscapeMenu onload="$.HPColorsMenuBoot()" oncancel="${REWRITE_MENU_ONCANCEL_XML}">`;
  const lastScriptInclude = `    <include src="${REWRITE_PRESET_SCRIPT_INCLUDES[REWRITE_PRESET_SCRIPT_INCLUDES.length - 1]}" />`;
  const showrankInclude = `    <include src="${REWRITE_SHOWRANKS_SCRIPT_INCLUDE}" />`;
  const newline = inspected.text.includes("\r\n") ? "\r\n" : "\n";
  const showranksMenuTag = `<CitadelHudEscapeMenu onload="${REWRITE_SHOWRANKS_MENU_ONLOAD}" oncancel="${REWRITE_MENU_ONCANCEL_XML}" onmouseover="${REWRITE_SHOWRANKS_MENU_ONMOUSEOVER}" onmouseout="${REWRITE_SHOWRANKS_MENU_ONMOUSEOUT}">`;
  if (!inspected.text.includes(canonicalMenuTag)) {
    throw new Error("Rewrite XML menu lifecycle contract is stale or incompatible");
  }
  if (!inspected.text.includes(lastScriptInclude)) {
    throw new Error("Rewrite XML script include contract is stale or incompatible");
  }
  return inspected.text
    .replace(canonicalMenuTag, showranksMenuTag)
    .replace(`${lastScriptInclude}${newline}`, `${lastScriptInclude}${newline}${showrankInclude}${newline}`);
}

export function inspectRewriteShowranksPresetTemplate(templateText, { requireEmpty = true } = {}) {
  return inspectRewriteXml(templateText, {
    requireEmpty,
    scriptIncludes: REWRITE_SHOWRANKS_SCRIPT_INCLUDES,
    expectedOnload: REWRITE_SHOWRANKS_MENU_ONLOAD,
    expectedMenuAttributes: {
      onmouseover: REWRITE_SHOWRANKS_MENU_ONMOUSEOVER,
      onmouseout: REWRITE_SHOWRANKS_MENU_ONMOUSEOUT
    }
  });
}


export function readRewriteShowranksPresetCode(input) {
  const source = sourceTextFromResource(input);
  const inspected = inspectRewriteShowranksPresetTemplate(source, { requireEmpty: false });
  if (!inspected.presetCode) throw new Error("Rewrite showranks XML store is empty");
  return validatePresetCode(inspected.presetCode);
}

function patchRewriteShowranksPresetTemplate({ templateText, templateXml, template, presetCode, code = presetCode } = {}) {
  const source = templateText ?? templateXml ?? template;
  const normalizedCode = validatePresetCode(code);
  const mergedText = mergeRewriteShowranksTemplate(source);
  const inspected = inspectRewriteShowranksPresetTemplate(mergedText);
  const encoded = encodeUtf16Hex(normalizedCode);
  const patchedText = inspected.text.slice(0, inspected.labelTextStart) + encoded + inspected.text.slice(inspected.labelTextEnd);
  const reread = inspectRewriteShowranksPresetTemplate(patchedText, { requireEmpty: false });
  if (reread.presetCode !== normalizedCode) throw new Error("Rewrite showranks XML store patch failed payload round-trip");
  if (inspected.text.slice(0, inspected.labelTextStart) !== patchedText.slice(0, inspected.labelTextStart) || inspected.text.slice(inspected.labelTextEnd) !== patchedText.slice(inspected.labelTextStart + encoded.length)) {
    throw new Error("Rewrite showranks XML patch changed bytes outside the store label");
  }
  return {
    text: patchedText,
    xmlText: patchedText,
    code: normalizedCode,
    presetCode: normalizedCode,
    template: reread
  };
}

export function validateRewriteShowranksPresetVpk(vpkBytes) {
  const archive = readVpkArchive(vpkBytes);
  if (archive.files.length !== 1) throw new Error("Rewrite showranks preset VPK must contain exactly one file");
  const [file] = archive.files;
  if (normalizeVpkPath(file.path) !== REWRITE_PRESET_ARCHIVE_PATH) throw new Error("Rewrite showranks preset VPK contains an unexpected file");
  if (!(file.bytes instanceof Uint8Array)) throw new Error("Rewrite showranks preset VPK contains invalid bytes");
  const sourceText = extractSource2Resource({ bytes: file.bytes, codec: SOURCE2_RESOURCE_CODECS.PANORAMA_LAYOUT });
  const inspected = inspectRewriteShowranksPresetTemplate(sourceText, { requireEmpty: false });
  if (!inspected.presetCode) throw new Error("Rewrite showranks preset VPK store is empty");
  return archive;
}

export function buildRewriteShowranksPresetPackage(input, positionalTemplateText = null) {
  const options = typeof input === "string"
    ? { presetCode: input, templateText: positionalTemplateText }
    : (input || {});
  const presetCode = options.presetCode ?? options.code;
  const templateText = options.templateText ?? options.templateXml ?? options.template;
  const patched = patchRewriteShowranksPresetTemplate({ templateText, presetCode });
  const bytes = compileSource2Resource({ sourceText: patched.text, codec: SOURCE2_RESOURCE_CODECS.PANORAMA_LAYOUT });
  const archive = createVpkArchive([{ path: REWRITE_PRESET_ARCHIVE_PATH, bytes }]);
  const vpkBytes = writeVpkArchive(archive);
  const rereadArchive = validateRewriteShowranksPresetVpk(vpkBytes);
  const file = rereadArchive.files[0];
  const rereadText = extractSource2Resource({ bytes: file.bytes, codec: SOURCE2_RESOURCE_CODECS.PANORAMA_LAYOUT });
  const rereadCode = readRewriteShowranksPresetCode(rereadText);
  if (rereadCode !== patched.code) throw new Error("Rewrite showranks preset VPK payload failed round-trip");
  return {
    vpkBytes,
    bytes: file.bytes,
    sourceText: rereadText,
    xmlText: rereadText,
    presetCode: patched.code,
    template: inspectRewriteShowranksPresetTemplate(rereadText, { requireEmpty: false }),
    archive: rereadArchive
  };
}

export function validateRewriteQollockPresetVpk(vpkBytes) {
  const archive = readVpkArchive(vpkBytes);
  if (archive.files.length !== 1) throw new Error("Rewrite QOLLOCK preset VPK must contain exactly one file");
  const [file] = archive.files;
  if (normalizeVpkPath(file.path) !== REWRITE_PRESET_ARCHIVE_PATH) throw new Error("Rewrite QOLLOCK preset VPK contains an unexpected file");
  if (!(file.bytes instanceof Uint8Array)) throw new Error("Rewrite QOLLOCK preset VPK contains invalid bytes");
  const sourceText = extractSource2Resource({ bytes: file.bytes, codec: SOURCE2_RESOURCE_CODECS.PANORAMA_LAYOUT });
  const inspected = inspectRewriteXml(sourceText, {
    requireEmpty: false,
    styleIncludes: REWRITE_QOLLOCK_PRESET_STYLE_INCLUDES,
    scriptIncludes: REWRITE_QOLLOCK_PRESET_SCRIPT_INCLUDES,
    requiredPanelIds: REWRITE_QOLLOCK_PRESET_REQUIRED_PANEL_IDS,
    expectedOnload: "$.HPColorsMenuBoot()",
    expectedOncancel: REWRITE_QOLLOCK_MENU_ONCANCEL
  });
  if (!inspected.presetCode) throw new Error("Rewrite QOLLOCK preset VPK store is empty");
  return archive;
}

export function buildRewriteQollockPresetPackage(input, positionalTemplateText = null) {
  const options = typeof input === "string"
    ? { presetCode: input, templateText: positionalTemplateText }
    : (input || {});
  const presetCode = options.presetCode ?? options.code;
  const templateText = options.templateText ?? options.templateXml ?? options.template;
  const patched = patchRewriteQollockPresetTemplate({ templateText, presetCode });
  const bytes = compileSource2Resource({ sourceText: patched.text, codec: SOURCE2_RESOURCE_CODECS.PANORAMA_LAYOUT });
  const archive = createVpkArchive([{ path: REWRITE_PRESET_ARCHIVE_PATH, bytes }]);
  const vpkBytes = writeVpkArchive(archive);
  const rereadArchive = validateRewriteQollockPresetVpk(vpkBytes);
  const file = rereadArchive.files[0];
  const rereadText = extractSource2Resource({ bytes: file.bytes, codec: SOURCE2_RESOURCE_CODECS.PANORAMA_LAYOUT });
  const rereadCode = readRewriteQollockPresetCode(rereadText);
  if (rereadCode !== patched.code) throw new Error("Rewrite QOLLOCK preset VPK payload failed round-trip");
  return {
    vpkBytes,
    bytes: file.bytes,
    sourceText: rereadText,
    xmlText: rereadText,
    presetCode: patched.code,
    template: inspectRewriteXml(rereadText, {
      requireEmpty: false,
      styleIncludes: REWRITE_QOLLOCK_PRESET_STYLE_INCLUDES,
      scriptIncludes: REWRITE_QOLLOCK_PRESET_SCRIPT_INCLUDES,
      requiredPanelIds: REWRITE_QOLLOCK_PRESET_REQUIRED_PANEL_IDS,
      expectedOnload: "$.HPColorsMenuBoot()",
      expectedOncancel: REWRITE_QOLLOCK_MENU_ONCANCEL
    }),
    archive: rereadArchive
  };
}

