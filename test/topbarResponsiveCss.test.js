import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("top bar switches to an uncramped low-DPI layout before mobile width", async () => {
  const css = await readFile(new URL("../src/styles/global.css", import.meta.url), "utf8");
  const lowDpiStart = css.indexOf("@media (max-width: 1240px)");
  const nextBreakpoint = css.indexOf("@media (max-width: 860px)");

  assert.notEqual(lowDpiStart, -1);
  assert.notEqual(nextBreakpoint, -1);

  const lowDpiCss = css.slice(lowDpiStart, nextBreakpoint);
  assert.match(lowDpiCss, /\.panorama-topbar[\s\S]*grid-template-columns:\s*1fr;/);
  assert.match(lowDpiCss, /\.panorama-header-actions[\s\S]*flex-wrap:\s*wrap;/);
  assert.match(lowDpiCss, /\.topbar-profile-controls[\s\S]*flex:\s*1 1 260px;/);
});
