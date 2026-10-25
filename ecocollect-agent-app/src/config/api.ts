/**
 * EcoCollect Agent App Configuration
 * Change BACKEND_BASE_URL to your development computer's LAN IP when testing with Expo Go
 */

export const CONFIG = {
  BACKEND_BASE_URL: 'http://10.0.2.2:5000',
  CLASSIFIER_URL: 'http://10.0.2.2:8000/classify',
  APP_NAME: 'EcoCollect Field Agent',
  DEFAULT_SCALE_ID: 'ESP32-HX711-UNIT-01'
};

export const API_ENDPOINTS = {
  LOGIN: `${CONFIG.BACKEND_BASE_URL}/api/auth/login`,
  PICKUPS: `${CONFIG.BACKEND_BASE_URL}/api/pickups`,
  VERIFY_PICKUP: (id: string) => `${CONFIG.BACKEND_BASE_URL}/api/pickups/${id}/verify`,
  IOT_WEIGHT_POLL: `${CONFIG.BACKEND_BASE_URL}/api/iot/logs?limit=1`
};
