# Gates: HPv2 ally pulse mode parity

OWNS: src/hpv2HpSchema.js, src/hpv2HpMenuNavigation.js, src/hpv2HealthbarPreviewModel.js, public/templates/hpv2_hp_colors_rewrite/panorama/layout/hud_escape_menu.xml, test/hpv2*.test.js, test/presetBuilderHPV2UiSource.test.js

Scope: expose Rewrite V2 ally pulse Fixed and Gradient modes in the web builder, preserve them through HPCRP1, preview them, and keep the packaged menu template synchronized

- [x] B1: HPv2 navigation and schema expose ally pulse color mode
  CHECK: node --test test/hpv2HpMenuNavigation.test.js test/presetBuilderHPV2UiSource.test.js
  EXPECT: /ℹ tests [1-9][0-9]*[\s\S]*ℹ pass [1-9][0-9]*[\s\S]*ℹ fail 0/
  EVIDENCE: exit=0; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\web\hp-colors-preset-builder; path=f2358d4e12fb/32 entries; EXPECT=matched; output-sha256=8b5038f8dccc174ba2839d6759204e71ee2b4d06b0145c1a0b07074da9d31c97; output-bytes=1391

- [x] B2: HPCRP1 round-trips the v2-only ally pulse color mode without changing HPCR2
  CHECK: node --test test/hpv2RewritePresetCodec.test.js
  EXPECT: /ℹ tests [1-9][0-9]*[\s\S]*ℹ pass [1-9][0-9]*[\s\S]*ℹ fail 0/
  EVIDENCE: exit=0; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\web\hp-colors-preset-builder; path=f2358d4e12fb/32 entries; EXPECT=matched; output-sha256=e5840e78b460e87378d333dea3f6451b0523ced879e5e0a4e1d8c27e2273646f; output-bytes=1045

- [x] B3: HPv2 preview distinguishes fixed replacement from gradient overlay color
  CHECK: node --test test/hpv2HealthbarPreviewModel.test.js
  EXPECT: /ℹ tests [1-9][0-9]*[\s\S]*ℹ pass [1-9][0-9]*[\s\S]*ℹ fail 0/
  EVIDENCE: exit=0; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\web\hp-colors-preset-builder; path=f2358d4e12fb/32 entries; EXPECT=matched; output-sha256=344383034afc37bf0acd2b0247c2ad9a2f00d0bac7e0e33cfa5d69a0c3e4d663; output-bytes=2035

- [x] B4: packaged HPv2 Rewrite layout includes the synchronized ally mode controls
  CHECK: node --test test/hpv2RewritePackageBuilder.test.js test/hpv2RewritePresetWorkflow.test.js
  EXPECT: /ℹ tests [1-9][0-9]*[\s\S]*ℹ pass [1-9][0-9]*[\s\S]*ℹ fail 0/
  EVIDENCE: exit=0; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\web\hp-colors-preset-builder; path=f2358d4e12fb/32 entries; EXPECT=matched; output-sha256=6141a382a6f5af94f416cb249ee697cd04038baf9ad931a99483270c5506c9c1; output-bytes=1217

- [x] B5: the production web build succeeds
  CHECK: npm run build
  EXPECT: Complete!
  EVIDENCE: exit=0; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\web\hp-colors-preset-builder; path=f2358d4e12fb/32 entries; EXPECT=matched; output-sha256=19199b290e9266cbc6b2c930c6ce2b63352f277dff2b15d527a139b24ed487ca; output-bytes=834
