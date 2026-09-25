import assert from "node:assert/strict";
import test from "node:test";
import { WHATS_NEW, acknowledgeWhatsNew, isWhatsNewAcknowledged } from "../src/whatsNew.js";

function memoryStorage() {
  const map = new Map();
  return { getItem: (key) => (map.has(key) ? map.get(key) : null), setItem: (key, value) => map.set(key, String(value)) };
}

test("new-settings notice shows once per announcement id", () => {
  const storage = memoryStorage();
  assert.equal(isWhatsNewAcknowledged(storage), false);
  acknowledgeWhatsNew(storage);
  assert.equal(isWhatsNewAcknowledged(storage), true);
  storage.setItem(WHATS_NEW.storageKey, "an-older-announcement");
  assert.equal(isWhatsNewAcknowledged(storage), false);
});

test("blocked storage never throws and never nags", () => {
  const blocked = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); } };
  assert.equal(isWhatsNewAcknowledged(blocked), true);
  assert.doesNotThrow(() => acknowledgeWhatsNew(blocked));
});
