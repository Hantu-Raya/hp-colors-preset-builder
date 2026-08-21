import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const stylesheets = [
  { name: "global.css", narrowMax: 1540, wideMin: 1541 },
  { name: "v2.css", narrowMax: 1620, wideMin: 1621 }
];

async function readStylesheet(name) {
  return readFile(new URL(`../src/styles/${name}`, import.meta.url), "utf8");
}

for (const { name, narrowMax, wideMin } of stylesheets) {
  test(`${name} switches to an uncramped low-DPI layout before mobile width`, async () => {
    const css = await readStylesheet(name);
    const lowDpiStart = css.indexOf(`@media (max-width: ${narrowMax}px)`);
    const nextBreakpoint = css.indexOf("@media (max-width: 860px)");

    assert.notEqual(lowDpiStart, -1);
    assert.notEqual(nextBreakpoint, -1);

    const lowDpiCss = css.slice(lowDpiStart, nextBreakpoint);
    assert.match(lowDpiCss, /\.panorama-topbar[\s\S]*grid-template-columns:\s*1fr;/);
    assert.match(lowDpiCss, /\.panorama-header-actions[\s\S]*flex-wrap:\s*wrap;/);
    assert.match(lowDpiCss, /\.topbar-profile-controls[\s\S]*flex:\s*1 1 260px;/);
  });

  test(`${name} keeps wide profile controls within their flex allocation`, async () => {
    const css = await readStylesheet(name);
    const wideStart = css.indexOf(`@media (min-width: ${wideMin}px)`);
    const narrowStart = css.indexOf(`@media (max-width: ${narrowMax}px)`);

    assert.notEqual(wideStart, -1);
    assert.notEqual(narrowStart, -1);

    const wideCss = css.slice(wideStart, narrowStart);
    assert.match(wideCss, /\.topbar-profile-controls[\s\S]*flex-basis:\s*245px;[\s\S]*min-width:\s*245px;/);
    assert.match(wideCss, /\.profile-selector[\s\S]*min-width:\s*0;/);
    assert.match(wideCss, /\.target-mode-trigger[\s\S]*min-width:\s*130px;/);
    assert.match(wideCss, /\.hero-selector[\s\S]*min-width:\s*180px;/);
  });
}
