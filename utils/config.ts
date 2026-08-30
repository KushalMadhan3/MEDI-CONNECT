/// <reference types="vite/client" />

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function stripApiSuffix(url: string): string {
  return url.replace(/\/api\/?$/, '');
}

/**
 * Backend API configuration.
 *
 * Reads the deployed backend URL from VITE_API_URL (or the older/alias
 * VITE_API_BASE_URL). Provide just the origin, e.g. https://medi-connect-api.up.railway.app
 * (the /api suffix is appended here so both var names behave the same way).
 */
const raw = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

/** Base origin, no trailing slash, no /api — for building full /api/... paths. */
export const API_BASE_URL = stripApiSuffix(stripTrailingSlash(raw));

/** Base origin + /api — for axios and other /api...-relative calls. */
export const API_URL = `${API_BASE_URL}/api`;
