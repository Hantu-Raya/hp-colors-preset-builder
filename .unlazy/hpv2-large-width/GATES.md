# Gates: HPv2 builder large healthbar width

OWNS: src/hpv2HpSchema.js, src/hpv2HealthbarPreviewModel.js, test/hpv2HpMenuNavigation.test.js, test/hpv2HealthbarPreviewModel.test.js

Scope: match Rewrite V2's legacy-compatible 230% healthbar width limit in the web schema and preview without changing the original HP Colors target

- [x] B1: the HPv2 schema exposes a 230% width maximum
  CHECK: node --test test/hpv2HpMenuNavigation.test.js
  EXPECT: /ℹ tests [1-9][0-9]*[\s\S]*ℹ pass [1-9][0-9]*[\s\S]*ℹ fail 0/
  EVIDENCE: exit=0; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\web\hp-colors-preset-builder; path=f2358d4e12fb/32 entries; EXPECT=matched; output-sha256=7c459603b4a3410c8e6b385787c8129938c1c6095aa761a3a0c8fdc985d28b97; output-bytes=342

- [x] B2: the HPv2 preview renders the 230% width from Rewrite V2 dimensions
  CHECK: node --test --test-name-pattern="geometry follows Rewrite V2 dimensions" test/hpv2HealthbarPreviewModel.test.js
  EXPECT: /ℹ tests [1-9][0-9]*[\s\S]*ℹ pass [1-9][0-9]*[\s\S]*ℹ fail 0/
  EVIDENCE: exit=0; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\web\hp-colors-preset-builder; path=f2358d4e12fb/32 entries; EXPECT=matched; output-sha256=3ad67b5f54ddac767558a635607369a2007dd0f0ad4e9c66f4ebdb7d6c944f0e; output-bytes=190

- [x] B3: all web tests and the production build pass
  CHECK: npm test >NUL 2>&1 && npm run build
  EXPECT: Complete!
  EVIDENCE: exit=0; shell=C:\WINDOWS\system32\cmd.exe; cwd=D:\web\hp-colors-preset-builder; path=f2358d4e12fb/32 entries; EXPECT=matched; output-sha256=74ea3a788fbcd4aaa986d040aa9875d50270ca35d2085171d162eed692d75314; output-bytes=835
