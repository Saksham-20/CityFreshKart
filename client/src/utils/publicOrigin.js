/**
 * Base URL for API calls and static uploads (/uploads).
 *
 * - REACT_APP_API_URL: use when set at build time (split API subdomain, or local prod preview
 *   against http://localhost:5000).
 * - Production (NODE_ENV=production): always same origin — SPA, API, and /uploads are served
 *   together (e.g. Express static or nginx).
 * - Development: on localhost, if the dev server port differs from the API port (default 5000),
 *   point to the API origin so /uploads URLs hit Express, not the React dev server.
 */
export function getPublicApiOrigin() {
  const explicit = process.env.REACT_APP_API_URL;
  if (explicit) {
    return String(explicit).replace(/\/+$/, '');
  }

  if (typeof window === 'undefined' || !window.location?.origin) {
    return 'http://localhost:5000';
  }

  const { hostname, port, protocol, origin } = window.location;
  const isLocal =
    hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';

  // Built app in production: same browser origin serves the UI and (typically) /uploads.
  if (process.env.NODE_ENV === 'production') {
    return origin;
  }

  // Local dev: CRA / Vite on :3000, :5173, etc. — API + uploads on REACT_APP_API_PORT or 5000
  const apiPort = process.env.REACT_APP_API_PORT || '5000';
  const apiPortNum = parseInt(apiPort, 10);
  const devPortNum = port === '' || port === null ? NaN : parseInt(port, 10);

  if (
    isLocal &&
    Number.isFinite(devPortNum) &&
    Number.isFinite(apiPortNum) &&
    devPortNum !== apiPortNum
  ) {
    return `${protocol}//${hostname}:${apiPort}`;
  }

  return origin;
}
