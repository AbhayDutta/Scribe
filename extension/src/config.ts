/**
 * Scribe Extension Configuration
 * Default production backend URL on Render
 */

export const ENV_BACKEND_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_URL) ||
  'https://scribe-w2xi.onrender.com';

export const APP_VERSION = '1.0.0';
