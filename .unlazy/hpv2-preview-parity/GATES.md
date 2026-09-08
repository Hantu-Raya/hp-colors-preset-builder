# Gates: HPv2 preview parity

OWNS: src/pages/v2.astro, src/components/V2ImportConverter.jsx, src/components/HealthbarPreview.jsx, src/styles/v2.css, src/healthbarPreviewModel.js, src/hpSchema.js, test/healthbarPreviewModel.test.js, test/presetBuilderV2UiSource.test.js, test/rewritePackageBuilder.test.js, public/templates/hp_colors_rewrite/panorama/layout/hud_escape_menu.xml, public/templates/hp_colors_rewrite_qollock/panorama/layout/hud_escape_menu.xml

Scope: Make the existing HPv2 web preview match the current Rewrite V2 healthbar composition, preserve requested enemy gradient defaults, prove QOLLOCK and ShowRank package compatibility, and turn /v2/ into a focused legacy-import converter for /hpv2/.

- [ ] G1: Rewrite defaults resolve to enemy red, yellow-orange, and green without changing codec order
  CHECK: npm test
  EXPECT: # fail 0
  CWD: D:/web/hp-colors-preset-builder
  EVIDENCE: pending

- [ ] G2: Preview renders the current V2 readout, level badge, ultimate icon, bar segmentation, pips, and foreground order
  CHECK: npm test
  EXPECT: # fail 0
  CWD: D:/web/hp-colors-preset-builder
  EVIDENCE: pending

- [ ] G3: Base Rewrite generated XML mirrors the canonical V2 menu
  CHECK: node -e "const f=require('fs');const a=f.readFileSync('public/templates/hp_colors_rewrite/panorama/layout/hud_escape_menu.xml');const b=f.readFileSync('F:/Users/FoxOS_User/Desktop/Deadlock-mods-collection/hp_colors_rewrite_v2/panorama/layout/hud_escape_menu.xml');if(!a.equals(b))process.exit(1);console.log('base XML mirror verified')"
  EXPECT: base XML mirror verified
  CWD: D:/web/hp-colors-preset-builder
  EVIDENCE: pending

- [ ] G4: QOLLOCK generated XML mirrors the canonical compatibility menu
  CHECK: node -e "const f=require('fs');const a=f.readFileSync('public/templates/hp_colors_rewrite_qollock/panorama/layout/hud_escape_menu.xml');const b=f.readFileSync('F:/Users/FoxOS_User/Desktop/Deadlock-mods-collection/hp_colors_rewrite_qollock/panorama/layout/hud_escape_menu.xml');if(!a.equals(b))process.exit(1);console.log('QOLLOCK XML mirror verified')"
  EXPECT: QOLLOCK XML mirror verified
  CWD: D:/web/hp-colors-preset-builder
  EVIDENCE: pending

- [ ] G5: Production web build succeeds
  CHECK: npm run build
  EXPECT: Complete!
  CWD: D:/web/hp-colors-preset-builder
  EVIDENCE: pending

- [ ] G6: Runtime V2 contracts remain green when shared defaults or XML change
  CHECK: node --test scripts/validate-hp-colors-rewrite-v2-state.test.js scripts/validate-hp-colors-rewrite-v2-editor.test.js scripts/validate-hp-colors-rewrite-v2-baseline.test.js scripts/validate-hp-colors-rewrite-v2-parity.test.js
  EXPECT: # fail 0
  CWD: F:/Users/FoxOS_User/Desktop/Deadlock-mods-collection
  EVIDENCE: pending

- [ ] G7: Built HPv2 page visually matches the supplied desktop healthbar composition
  EVIDENCE: pending

- [ ] G8: Built HPv2 page remains usable at the repository mobile viewport
  EVIDENCE: pending

- [ ] G9: The v2 converter imports legacy data and hands the converted profile to hpv2
  CHECK: npm test
  EXPECT: # fail 0
  CWD: D:/web/hp-colors-preset-builder
  EVIDENCE: pending
