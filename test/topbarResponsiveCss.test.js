import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function readStylesheet(name) {
  return readFile(new URL(`../src/styles/${name}`, import.meta.url), "utf8");
}

test("global.css switches to an uncramped low-DPI layout before mobile width", async () => {
  const css = await readStylesheet("global.css");
  const lowDpiStart = css.indexOf("@media (max-width: 1540px)");
  const nextBreakpoint = css.indexOf("@media (max-width: 860px)");

  assert.notEqual(lowDpiStart, -1);
  assert.notEqual(nextBreakpoint, -1);

  const lowDpiCss = css.slice(lowDpiStart, nextBreakpoint);
  assert.match(lowDpiCss, /\.panorama-topbar[\s\S]*grid-template-columns:\s*1fr;/);
  assert.match(lowDpiCss, /\.panorama-header-actions[\s\S]*flex-wrap:\s*wrap;/);
  assert.match(lowDpiCss, /\.topbar-profile-controls[\s\S]*flex:\s*1 1 260px;/);
});

test("global.css keeps wide profile controls within their flex allocation", async () => {
  const css = await readStylesheet("global.css");
  const wideStart = css.indexOf("@media (min-width: 1541px)");
  const narrowStart = css.indexOf("@media (max-width: 1540px)");

  assert.notEqual(wideStart, -1);
  assert.notEqual(narrowStart, -1);

  const wideCss = css.slice(wideStart, narrowStart);
  assert.match(wideCss, /\.topbar-profile-controls[\s\S]*flex-basis:\s*245px;[\s\S]*min-width:\s*245px;/);
  assert.match(wideCss, /\.profile-selector[\s\S]*min-width:\s*0;/);
  assert.match(wideCss, /\.target-mode-trigger[\s\S]*min-width:\s*130px;/);
  assert.match(wideCss, /\.hero-selector[\s\S]*min-width:\s*180px;/);
});

test("v2.css assigns each header group to a stable two-row grid area", async () => {
  const css = await readStylesheet("v2.css");

  assert.match(css, /grid-template-areas:\s*"brand workflow"\s*"utility profile";/);
  assert.match(css, /\.panorama-brand-block\s*\{[\s\S]*grid-area:\s*brand;/);
  assert.match(css, /\.topbar-workflow-actions\s*\{[\s\S]*grid-area:\s*workflow;/);
  assert.match(css, /\.topbar-profile-workspace\s*\{[\s\S]*grid-area:\s*profile;/);
  assert.match(css, /\.topbar-utility-bar\s*\{[\s\S]*grid-area:\s*utility;/);
  assert.match(css, /\.panorama-header-actions\s*\{[\s\S]*display:\s*contents;/);
});

test("v2.css stacks grouped controls before mobile width", async () => {
  const css = await readStylesheet("v2.css");
  const compactStart = css.indexOf("@media (max-width: 1180px)");
  const mobileStart = css.indexOf("@media (max-width: 740px)");

  assert.notEqual(compactStart, -1);
  assert.notEqual(mobileStart, -1);

  const compactCss = css.slice(compactStart, mobileStart);
  assert.match(compactCss, /\.panorama-topbar[\s\S]*grid-template-columns:\s*1fr;/);
  assert.match(compactCss, /\.topbar-workflow-actions,[\s\S]*\.topbar-profile-workspace[\s\S]*flex-wrap:\s*wrap;/);

  const mobileCss = css.slice(mobileStart);
  assert.match(mobileCss, /\.topbar-workflow-actions[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(mobileCss, /\.topbar-profile-workspace[\s\S]*grid-template-columns:\s*1fr;/);
});

test("v2.css gives healthbar preview its own rail and mobile-first ordering", async () => {
  const css = await readStylesheet("v2.css");
  assert.match(css, /\.anita-page-body\.has-preview[\s\S]*grid-template-areas:\s*"settings preview";/);
  assert.match(css, /\.anita-page-body\.has-preview > \.healthbar-preview-rail[\s\S]*grid-area:\s*preview;/);
  const mobileStart = css.lastIndexOf("@media (max-width: 740px)");
  assert.notEqual(mobileStart, -1);
  const mobileCss = css.slice(mobileStart);
  assert.match(mobileCss, /\.anita-page-body\.has-preview[\s\S]*grid-template-areas:[\s\S]*"preview"[\s\S]*"settings";/);
  assert.match(mobileCss, /\.healthbar-preview\.is-mobile-collapsed[\s\S]*\.healthbar-preview-content[\s\S]*display:\s*none;/);
});

test("v2.css keeps the supporter ticker clipped, pausable, static-safe, and mobile-safe", async () => {
  const css = await readStylesheet("v2.css");

  assert.match(css, /\.topbar-supporter-strip\s*\{[^}]*display:\s*flex;[^}]*min-width:\s*0;/);
  assert.match(css, /\.topbar-supporter-window\s*\{[^}]*min-width:\s*0;[^}]*overflow:\s*hidden;[^}]*border-inline:\s*1px/);
  assert.match(css, /\.topbar-supporter-track\s*\{[^}]*animation:\s*topbar-supporter-scroll var\(--topbar-supporter-duration,\s*18s\) linear infinite;/);
  assert.match(css, /@keyframes\s+topbar-supporter-scroll[\s\S]*translate3d\(0,\s*0,\s*0\)[\s\S]*translate3d\(-50%,\s*0,\s*0\)/);
  assert.match(css, /\.topbar-supporter-strip:hover[\s\S]*\.topbar-supporter-strip:focus-within[\s\S]*\.topbar-supporter-strip\.is-paused[\s\S]*animation-play-state:\s*paused;/);
  assert.match(css, /\.topbar-supporter-strip\.is-static[\s\S]*\.topbar-supporter-track[\s\S]*display:\s*none;/);
  assert.match(css, /\.topbar-supporter-strip\.is-static[\s\S]*\.topbar-supporter-pause[\s\S]*display:\s*none;/);
  assert.match(css, /\.topbar-supporter-strip\.is-static[\s\S]*\.topbar-supporter-loading[\s\S]*display:\s*none;/);

  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*\.topbar-supporter-track\s*\{[^}]*animation:\s*none\s*!important;/);
  assert.match(css, /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*\.topbar-supporter-sequence\s*\+\s*\.topbar-supporter-sequence\s*\{[^}]*display:\s*none\s*!important;/);
  const mobileStart = css.indexOf("@media (max-width: 740px)");
  assert.notEqual(mobileStart, -1);
  const mobileCss = css.slice(mobileStart);
  assert.match(mobileCss, /\.panorama-title-row\s*\{[\s\S]*grid-template-areas:\s*"title commit"\s*"ticker actions";/);
  assert.match(mobileCss, /\.panorama-brand\s*\{[^}]*grid-area:\s*title;/);
  assert.match(mobileCss, /\.commit-version-link\s*\{[^}]*grid-area:\s*commit;/);
  assert.match(mobileCss, /\.topbar-supporter-strip\s*\{[^}]*grid-area:\s*ticker;/);
  assert.match(mobileCss, /\.topbar-support-actions\s*\{[^}]*grid-area:\s*actions;/);
});
