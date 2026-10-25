export type Role = 'resident' | 'agent' | 'admin';

export type WasteCategory = 
  | 'organic'
  | 'biodegradable'
  | 'plastic'
  | 'paper_cardboard'
  | 'dry_recyclable'
  | 'glass'
  | 'metal'
  | 'e_waste'
  | 'textile'
  | 'hazardous'
  | 'other_recyclable'
  | 'mixed';

export type PickupType = 'routine' | 'bulk' | 'commercial' | 'e_waste_special' | 'off_schedule';

export type PickupStatus = 
  | 'requested' 
  | 'confirmed'
  | 'assigned' 
  | 'en_route'
  | 'in_progress' 
  | 'collected' 
  | 'verified' 
  | 'priced' 
  | 'completed' 
  | 'recycling_processing'
  | 'cancelled';

export type WeightSource = 'iot_loadcell' | 'manual_override' | 'pending';

export type PaymentStatus = 'pending' | 'paid' | 'payout_credited' | 'exempt_free';

export interface WasteItemDetail {
  id: string;
  category: WasteCategory;
  itemType?: string; // e.g. "PET Bottles", "Corrugated Boxes", "Old Smartphone", "Kitchen scraps"
  condition?: string; // e.g. "Clean & Dry", "Working", "Damaged", "Scrap"
  quantity?: number;
  quantityUnit?: string; // "kg", "items", "liters", "bags"
  weightKg?: number;
  frequency?: string; // for organic ("one-time", "daily", "alternate_days")
  photoUrl?: string;
  hazardType?: string;
  packagingStatus?: string;
  specialInstructions?: string;
  estimatedRatePerKg?: number;
  estimatedBuyback?: number;
  verifiedWeightKg?: number;
  verifiedCategory?: WasteCategory;
  verifiedValue?: number;
}

export interface WasteCategoryFieldDef {
  key: string;
  label: string;
  type: 'select' | 'number' | 'text' | 'boolean';
  options?: string[];
  unit?: string;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
}

export interface WasteCategoryConfig {
  id: WasteCategory;
  name: string;
  tagline: string;
  badgeClass: string;
  colorHex: string;
  iconName: string;
  baseProcessingRate: number; // INR / kg
  buybackRate: number; // INR / kg
  recyclingFacility: string;
  environmentalBenefit: string;
  isSubsidized?: boolean;
  requiresSpecialHandling?: boolean;
  acceptedItems: string[];
  fieldDefinitions: WasteCategoryFieldDef[];
}

export interface EnvironmentalImpact {
  wasteDivertedKg: number;
  recyclablesCollectedKg: number;
  co2PreventedKg: number;
  treesSavedEquivalent: number;
  waterSavedLiters: number;
  recyclingScore: number;
}

export interface AppNotification {
  id: string;
  userId: string;
  pickupId?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'pickup_update' | 'reward';
  timestamp: string;
  read: boolean;
}

export interface AgentDetails {
  agentCode: string;
  vehicleNumber: string;
  vehicleType: string;
  assignedArea: string;
  isOnline: boolean;
  rating: number;
  totalPickupsCompleted: number;
  todayPickupsCount: number;
  monthlyEarnings: number;
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: Role;
  phone: string;
  address: {
    street: string;
    area: string;
    city: string;
    pincode: string;
    lat: number;
    lng: number;
  };
  upiId?: string;
  rewardPoints: number;
  walletBalance: number;
  passwordHash?: string;
  agentDetails?: AgentDetails;
  savedAddresses?: {
    id: string;
    label: string;
    street: string;
    area: string;
    city: string;
    pincode: string;
    isDefault: boolean;
  }[];
}

export interface Pickup {
  id: string;
  pickupCode: string;
  residentId: string;
  residentName: string;
  residentPhone: string;
  residentAddress: string;
  residentCoordinates: { lat: number; lng: number };
  agentId?: string;
  agentName?: string;
  agentPhone?: string;
  agentVehicle?: string;
  category: WasteCategory;
  categoriesList?: WasteCategory[];
  items?: WasteItemDetail[];
  pickupType: PickupType;
  scheduledDate: string;
  timeSlot: string;
  status: PickupStatus;
  isSegregated: boolean;
  segregationFactor: number; // Si: 0.8 for segregated, 1.5 for mixed
  weightKg: number;
  weightSource: WeightSource;
  rawAdcReading?: number;
  wastePhotoUrl?: string;
  cnnCategory?: WasteCategory;
  cnnConfidence?: number;
  mismatchFlagged: boolean;
  adminReviewed?: boolean;
  notes?: string;
  
  // Category-specific details recorded on booking
  itemDetails?: Record<string, any>;
  
  // Agent verification record
  verifiedAt?: string;
  verifiedByAgentId?: string;
  verifiedWeightKg?: number;
  verifiedNotes?: string;
  recyclingDestinationFacility?: string;
  
  // Pricing formulation fields
  processingFee: number; // P
  recyclablePayout: number; // Rp
  netSettlement: number; // Rp - P
  paymentStatus: PaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  upiTxnId?: string;
  createdAt: string;
  completedAt?: string;
}

export interface DynamicPricingResult {
  weightKg: number;
  category: WasteCategory;
  pickupType: PickupType;
  isSegregated: boolean;
  baseProcessingRate: number; // Ri
  segregationFactor: number; // Si
  fixedSurcharge: number; // F
  processingFee: number; // P = (W * Ri * Si) + F
  buybackRate: number; // Vj
  recyclablePayout: number; // Rp = W * Vj
  netSettlement: number; // Rp - P (positive: payout to user, negative: user owes processing fee)
  isNetPayout: boolean;
  settlementAmount: number;
}

export interface WeightLog {
  id: string;
  scaleId: string;
  weightKg: number;
  rawADC: number;
  batteryVoltage: number;
  wifiRssi: number;
  pickupCode?: string;
  timestamp: string;
}

export interface CNNPrediction {
  category: WasteCategory;
  confidence: number;
  scores: {
    biodegradable: number;
    dry_recyclable: number;
    plastic: number;
    e_waste: number;
  };
  sampleImage: string;
  analysisDescription: string;
}
