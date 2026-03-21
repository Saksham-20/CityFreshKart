/**
 * Origins allowed for CSP connect-src when the SPA and API are on different hosts.
 * Parses CLIENT_URL, CORS_ORIGIN, and CSP_CONNECT_SRC (comma-separated URLs).
 */
function parseOrigin(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`).origin;
  } catch {
    return null;
  }
}

function collectCspConnectOrigins() {
  const raw = [
    process.env.CLIENT_URL,
    process.env.CORS_ORIGIN,
    process.env.CSP_CONNECT_SRC,
  ]
    .filter(Boolean)
    .flatMap((s) => s.split(',').map((x) => x.trim()).filter(Boolean));

  const origins = new Set(["'self'"]);
  raw.forEach((entry) => {
    const o = parseOrigin(entry);
    if (o) origins.add(o);
  });
  return [...origins];
}

module.exports = { collectCspConnectOrigins };
