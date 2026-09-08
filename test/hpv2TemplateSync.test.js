import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { composeHpv2QollockTemplate } from "../scripts/sync-hpv2-templates.js";
import {
  buildRewritePresetPackage,
  buildRewriteShowranksPresetPackage,
  buildRewriteQollockPresetPackage,
  readRewritePresetCode,
  readRewriteShowranksPresetCode,
  readRewriteQollockPresetCode
} from "../src/hpv2RewritePackageBuilder.js";
import { extractSource2Resource, SOURCE2_RESOURCE_CODECS } from "../src/source2ResourceCodec.js";

const canonical = await readFile(new URL("../public/templates/hpv2_hp_colors_rewrite/panorama/layout/hud_escape_menu.xml", import.meta.url), "utf8");
const presetCode = 'HPCRP1{"records":[{"id":"user_0001","kind":"user","name":"Shared layout","mode":"all","heroes":[],"values":[],"conditions":null}],"selectedPresetId":"user_0001"}';

test("one canonical edit reaches all three compiled preset layouts without losing compatibility", () => {
  const changed = canonical
    .replace('text="HP COLORS V2"', 'text="Shared menu update"')
    .replace('<Panel id="HPColorsEditorRoot"', '<Panel id="SharedLayoutAddition" /><Panel id="HPColorsEditorRoot"')
    .replace('text="#menu_changehero"', 'text="Shared stock update"');
  const variants = [
    [buildRewritePresetPackage, readRewritePresetCode, changed],
    [buildRewriteShowranksPresetPackage, readRewriteShowranksPresetCode, changed],
    [buildRewriteQollockPresetPackage, readRewriteQollockPresetCode, composeHpv2QollockTemplate(changed)]
  ];
  for (const [build, read, templateText] of variants) {
    const result = build({ templateText, presetCode });
    const xml = extractSource2Resource({ bytes: result.bytes, codec: SOURCE2_RESOURCE_CODECS.PANORAMA_LAYOUT });
    assert.match(xml, /text="Shared menu update"/);
    assert.match(xml, /id="SharedLayoutAddition"/);
    assert.match(xml, /text="Shared stock update"/);
    assert.equal(read(xml), presetCode);
  }
});

test("QOLLOCK generation fails on missing, duplicate, or conflicting insertion targets", () => {
  assert.throws(() => composeHpv2QollockTemplate(canonical.replace('id="LeftStripeBlur"', 'id="RenamedStripe"')), /settings window anchor: expected exactly one target, found 0/);
  assert.throws(() => composeHpv2QollockTemplate(canonical.replace('<Panel id="LeftStripeBlur" />', '<Panel id="LeftStripeBlur" /><Panel id="LeftStripeBlur" />')), /settings window anchor: expected exactly one target, found 2/);
  assert.throws(() => composeHpv2QollockTemplate(canonical.replace('<Panel id="LeftStripeBlur" />', '<Panel id="LeftStripeBlur" /><Button id="newgame" />')), /already contains newgame/);
});

test("QOLLOCK generation preserves CRLF layouts and literal replacement characters", () => {
  const changed = canonical.replace(/\r?\n/g, "\r\n").replace('text="HP COLORS V2"', () => 'text="$&amp; $\' $$"');
  const generated = composeHpv2QollockTemplate(changed);
  assert.match(generated, /text="\$&amp; \$' \$\$"/);
  assert.doesNotMatch(generated, /(?<!\r)\n/);
});
