// One-time "new settings" notice. Change `id` for the next announcement so
// users who dismissed the previous one see the new one once.
export const WHATS_NEW = Object.freeze({
  id: "2026-09-ally-hp-text",
  storageKey: "hpv2-whats-new-acknowledged",
  categoryKey: "ALLY|HP TEXT"
});

export function isWhatsNewAcknowledged(storage) {
  try {
    return storage?.getItem(WHATS_NEW.storageKey) === WHATS_NEW.id;
  } catch {
    return true; // Unreadable storage: never nag on every visit.
  }
}

export function acknowledgeWhatsNew(storage) {
  try {
    storage?.setItem(WHATS_NEW.storageKey, WHATS_NEW.id);
  } catch {}
}
