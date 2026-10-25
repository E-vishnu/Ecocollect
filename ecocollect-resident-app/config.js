/**
 * Centralized EcoCollect Backend Configuration
 * Change this single constant to your local IP (e.g., http://192.168.1.50:5000)
 * when testing on a physical iOS/Android device with Expo Go.
 */
export const API_BASE_URL = 'http://192.168.1.50:5000/api';

export const APP_CONFIG = {
  appName: 'EcoCollect Resident',
  version: '1.0.0',
  defaultTimeSlots: [
    '07:00 - 09:00 AM',
    '09:00 - 11:00 AM',
    '11:00 - 01:00 PM',
    '02:00 - 04:00 PM',
    '04:00 - 06:00 PM'
  ],
  categories: [
    { id: 'biodegradable', name: 'Biodegradable (Kitchen/Organic)', color: '#16a34a', icon: 'leaf', payout: 'Composted' },
    { id: 'plastic', name: 'Plastics (PET, HDPE, Containers)', color: '#2563eb', icon: 'package', payout: '₹18/kg Cashback' },
    { id: 'dry_recyclable', name: 'Dry Recyclables (Paper, Cans, Cartons)', color: '#0891b2', icon: 'file-text', payout: '₹12/kg Cashback' },
    { id: 'e_waste', name: 'E-Waste (Electronics, Batteries)', color: '#7c3aed', icon: 'cpu', payout: '₹45/kg Cashback' }
  ]
};
