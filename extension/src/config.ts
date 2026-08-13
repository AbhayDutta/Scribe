/**
 * Scribe Extension Configuration
 * Build-time environment variable support for cloud hosting
 */

export const ENV_BACKEND_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_URL) ||
  'http://localhost:8080';

export const APP_VERSION = '1.0.0';
