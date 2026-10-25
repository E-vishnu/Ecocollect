/**
 * EcoCollect Resident App Configuration
 * Change BACKEND_BASE_URL to your development computer's LAN IP when testing on a physical phone with Expo Go
 * Example: 'http://192.168.1.100:5000'
 */

export const CONFIG = {
  BACKEND_BASE_URL: 'http://10.0.2.2:5000', // Standard Android emulator loopback or LAN IP for physical device
  API_TIMEOUT_MS: 10000,
  APP_NAME: 'EcoCollect Resident',
  VERSION: '1.0.0'
};

export const API_ENDPOINTS = {
  SIGNUP: `${CONFIG.BACKEND_BASE_URL}/api/auth/signup`,
  LOGIN: `${CONFIG.BACKEND_BASE_URL}/api/auth/login`,
  ME: `${CONFIG.BACKEND_BASE_URL}/api/auth/me`,
  PICKUPS: `${CONFIG.BACKEND_BASE_URL}/api/pickups`,
  SETTLE_PAYMENT: (id: string) => `${CONFIG.BACKEND_BASE_URL}/api/pickups/${id}/settle`
};
