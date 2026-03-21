/**
 * Public origin for API and uploads. Uses REACT_APP_API_URL when set at build time;
 * otherwise same browser origin (works for Docker / single-host deploys without rebuild).
 */
export function getPublicApiOrigin() {
  if (process.env.REACT_APP_API_URL) {
    return String(process.env.REACT_APP_API_URL).replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://localhost:5000';
}
