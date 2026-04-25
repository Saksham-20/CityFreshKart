/**
 * Returns a safe in-app path for post-login redirects, or null if untrusted.
 */
export function getSafeReturnPath(pathname) {
  if (!pathname || typeof pathname !== 'string') return null;
  const trimmed = pathname.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null;
  if (trimmed === '/login') return null;
  return trimmed;
}
