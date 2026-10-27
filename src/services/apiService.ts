import { Pickup, User, AppNotification, WeightLog, WasteCategory, PickupStatus, WeightSource } from '../types';

export const apiService = {
  // PICKUPS
  async getPickups(userId?: string): Promise<Pickup[]> {
    try {
      const res = await fetch('/api/pickups', {
        headers: userId ? { 'x-user-id': userId } : {}
      });
      if (!res.ok) throw new Error('Failed to fetch pickups');
      const data = await res.json();
      return data.pickups;
    } catch (e) {
      console.warn('API getPickups fallback:', e);
      return [];
    }
  },

  async createPickup(pickupData: Partial<Pickup>, userId?: string): Promise<Pickup | null> {
    try {
      const res = await fetch('/api/pickups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userId ? { 'x-user-id': userId } : {})
        },
        body: JSON.stringify(pickupData)
      });
      if (!res.ok) throw new Error('Failed to create pickup');
      const data = await res.json();
      return data.pickup;
    } catch (e) {
      console.warn('API createPickup fallback:', e);
      return null;
    }
  },

  async updatePickupStatus(pickupId: string, status: PickupStatus, notes?: string, agentId?: string): Promise<Pickup | null> {
    try {
      const res = await fetch(`/api/pickups/${pickupId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes, agentId })
      });
      if (!res.ok) throw new Error('Failed to update pickup status');
      const data = await res.json();
      return data.pickup;
    } catch (e) {
      console.warn('API updatePickupStatus fallback:', e);
      return null;
    }
  },

  async verifyPickup(pickupId: string, verificationData: {
    weightKg: number;
    weightSource: WeightSource;
    wastePhotoUrl?: string;
    cnnCategory?: WasteCategory;
    cnnConfidence?: number;
    mismatchFlagged?: boolean;
    notes?: string;
    recyclingFacility?: string;
  }): Promise<Pickup | null> {
    try {
      const res = await fetch(`/api/pickups/${pickupId}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verificationData)
      });
      if (!res.ok) throw new Error('Failed to verify pickup');
      const data = await res.json();
      return data.pickup;
    } catch (e) {
      console.warn('API verifyPickup fallback:', e);
      return null;
    }
  },

  async settlePickup(pickupId: string, txnId: string, isPayout: boolean): Promise<any> {
    try {
      const res = await fetch(`/api/pickups/${pickupId}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txnId, isPayout })
      });
      if (!res.ok) throw new Error('Failed to settle pickup');
      return await res.json();
    } catch (e) {
      console.warn('API settlePickup fallback:', e);
      return null;
    }
  },

  // AI MULTI-WASTE CLASSIFIER (Multimodal Server-side Gemini)
  async analyzeWasteWithAI(payload: {
    imageBase64?: string;
    imageUrl?: string;
    declaredCategory?: WasteCategory;
  }): Promise<{
    success: boolean;
    source: string;
    isRealAi?: boolean;
    isEstimate?: boolean;
    error?: string;
    analysis?: {
      mainObjectDescription?: string;
      materialDescription?: string;
      detectedItem: string;
      category: WasteCategory;
      condition: string;
      confidence: number;
      topGuesses?: Array<{ category: WasteCategory; confidence: number }>;
      estimatedWeightKg: number;
      isRecyclable?: boolean;
      recyclabilityGrade: string;
      disposalGuideline: string;
      declaredMatch: boolean;
    };
  }> {
    try {
      const res = await fetch('/api/verification/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || !data.success) {
        return {
          success: false,
          source: data?.source || 'Unavailable',
          isRealAi: false,
          error: data?.error || 'AI unavailable. Please choose the category manually and let the agent verify.'
        };
      }
      return data;
    } catch (e: any) {
      console.warn('API analyzeWasteWithAI error:', e);
      return {
        success: false,
        source: 'Unavailable',
        isRealAi: false,
        error: 'AI unavailable. Please choose the category manually and let the agent verify.'
      };
    }
  },

  // NOTIFICATIONS
  async getNotifications(userId: string): Promise<AppNotification[]> {
    try {
      const res = await fetch('/api/notifications', {
        headers: { 'x-user-id': userId }
      });
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = await res.json();
      return data.notifications || [];
    } catch (e) {
      return [];
    }
  },

  async markNotificationRead(notifId: string): Promise<void> {
    try {
      await fetch(`/api/notifications/${notifId}/read`, { method: 'PUT' });
    } catch (e) {
      // ignore
    }
  },

  // ADMIN
  async getAdminMetrics(): Promise<any> {
    try {
      const res = await fetch('/api/admin/metrics');
      if (!res.ok) throw new Error('Failed to fetch admin metrics');
      return await res.json();
    } catch (e) {
      return null;
    }
  },

  async resolveMismatch(pickupId: string, resolution: 'accept_resident' | 'enforce_penalty' | 'manual_adjust'): Promise<Pickup | null> {
    try {
      const res = await fetch(`/api/admin/mismatches/${pickupId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution })
      });
      if (!res.ok) throw new Error('Failed to resolve mismatch');
      const data = await res.json();
      return data.pickup;
    } catch (e) {
      return null;
    }
  },

  // IOT SCALE
  async postWeightReading(reading: Partial<WeightLog>): Promise<WeightLog | null> {
    try {
      const res = await fetch('/api/iot/weight-reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reading)
      });
      if (!res.ok) throw new Error('Failed to post scale reading');
      const data = await res.json();
      return data.log;
    } catch (e) {
      return null;
    }
  },

  async tareScale(): Promise<void> {
    try {
      await fetch('/api/iot/tare', { method: 'POST' });
    } catch (e) {
      // ignore
    }
  }
};
