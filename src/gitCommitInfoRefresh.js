export function buildGitCommitInfoRequestUrl(baseUrl = "/", cacheKey = Date.now()) {
  const normalizedBase = String(baseUrl || "/").endsWith("/") ? String(baseUrl || "/") : `${baseUrl}/`;
  return `${normalizedBase}commit-info.json?v=${encodeURIComponent(String(cacheKey))}`;
}

export function isGitCommitInfoPayload(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof value.url === "string" &&
    value.url &&
    typeof value.shortHash === "string" &&
    value.shortHash
  );
}
