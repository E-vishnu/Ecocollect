import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import axios from 'axios';
import { AuthContext } from '../App';
import { API_BASE_URL } from '../config';

export default function PickupDetailScreen({ route, navigation }) {
  const { pickupId, pickupData: initialData } = route.params || {};
  const { token } = useContext(AuthContext);
  const [pickup, setPickup] = useState(initialData || null);
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(!initialData);
  const [isLiveConnected, setIsLiveConnected] = useState(true);
  const pollIntervalRef = useRef(null);

  const fetchTracking = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/tracking/pickup/${pickupId || initialData?._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setPickup(res.data.pickup);
        setTracking(res.data.tracking);
      }
    } catch (err) {
      // Fallback mock simulation for mobile preview
      if (!pickup) {
        setPickup(initialData || {
          pickupCode: 'ECO-994102',
          status: 'assigned',
          categoryDeclared: 'plastic',
          scheduledDate: new Date(),
          timeSlot: '09:00 - 11:00 AM',
          address: { street: 'Flat 402, Green Valley Apts', area: 'Koramangala 4th Block' }
        });
      }
      setTracking({
        isLive: true,
        privacyMode: 'ACTIVE_BROADCAST',
        agentLocation: {
          lat: 12.9345,
          lng: 77.6189,
          speed: 22.4,
          heading: 68,
          updatedAt: new Date(),
          vehicleNumber: 'KA-01-EQ-7788 (E-Loader)'
        },
        residentDestination: {
          street: 'Flat 402, Green Valley Apts',
          area: 'Koramangala 4th Block',
          lat: 12.9352,
          lng: 77.6245
        },
        estimatedEtaMinutes: 6,
        distanceRemainingKm: 1.2
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracking();
    // Simulate periodic real-time sync / WebSocket location stream
    pollIntervalRef.current = setInterval(() => {
      fetchTracking();
    }, 4000);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [pickupId]);

  const getStatusStepIndex = (status) => {
    switch (status) {
      case 'requested': return 0;
      case 'assigned': return 1;
      case 'collected': return 2;
      case 'verified': return 3;
      case 'priced': return 4;
      case 'completed': return 5;
      default: return 0;
    }
  };

  const steps = [
    { key: 'requested', label: 'Requested', desc: 'Pickup booked' },
    { key: 'assigned', label: 'En Route', desc: 'Agent dispatched' },
    { key: 'collected', label: 'Weighed', desc: 'ESP32 IoT scale' },
    { key: 'priced', label: 'Priced', desc: 'Dynamic settlement' },
    { key: 'completed', label: 'Settled', desc: 'Cashback disbursed' }
  ];

  const currentStep = getStatusStepIndex(pickup?.status || 'assigned');

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Connecting to Live Agent Stream...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Live Status Header */}
      <View style={styles.headerBanner}>
        <View>
          <Text style={styles.codeText}>{pickup?.pickupCode || 'ECO-TRACKING'}</Text>
          <Text style={styles.categoryBadge}>Category: {pickup?.categoryDeclared?.toUpperCase()}</Text>
        </View>
        <View style={styles.liveSyncBadge}>
          <View style={[styles.pulseDot, { backgroundColor: tracking?.isLive ? '#22c55e' : '#94a3b8' }]} />
          <Text style={styles.liveSyncText}>{tracking?.isLive ? 'LIVE RADAR' : 'SYNCED'}</Text>
        </View>
      </View>

      {/* Real-time Map Representation */}
      <View style={styles.mapContainer}>
        <View style={styles.mapCanvasPlaceholder}>
          <Text style={styles.mapHeaderTitle}>🗺️ Live Dynamic Agent Location Map</Text>
          <Text style={styles.mapSub}>
            {tracking?.privacyMode === 'ACTIVE_BROADCAST' 
              ? 'Agent location is shared while your pickup is active.' 
              : 'Privacy Shield Active: Location is only shared during active pickups.'}
          </Text>

          {/* Interactive Agent & Destination Indicator */}
          <View style={styles.routeBox}>
            <View style={styles.routePoint}>
              <Text style={styles.pointEmoji}>🚚</Text>
              <View>
                <Text style={styles.pointLabel}>Field Agent (E-Loader)</Text>
                <Text style={styles.pointCoords}>
                  Lat: {tracking?.agentLocation?.lat?.toFixed(4) || '12.9345'}, Lng: {tracking?.agentLocation?.lng?.toFixed(4) || '77.6189'}
                </Text>
                <Text style={styles.speedBadge}>Speed: {tracking?.agentLocation?.speed || 20} km/h • Heading: {tracking?.agentLocation?.heading || 45}°</Text>
              </View>
            </View>

            <View style={styles.routeLine} />

            <View style={styles.routePoint}>
              <Text style={styles.pointEmoji}>🏡</Text>
              <View>
                <Text style={styles.pointLabel}>Your Doorstep (Destination)</Text>
                <Text style={styles.pointAddress}>
                  {pickup?.address?.street || 'Flat 402, Green Valley Apts'}
                </Text>
              </View>
            </View>
          </View>

          {/* Dynamic ETA Bar */}
          <View style={styles.etaBar}>
            <View>
              <Text style={styles.etaTitle}>Estimated Arrival</Text>
              <Text style={styles.etaValue}>~{tracking?.estimatedEtaMinutes || 6} mins away</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.etaTitle}>Distance</Text>
              <Text style={styles.etaDist}>{tracking?.distanceRemainingKm || 1.2} km</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Dynamic Lifecycle Progress Tracker */}
      <View style={styles.progressCard}>
        <Text style={styles.sectionTitle}>Pickup Lifecycle Progress</Text>
        <View style={styles.stepperContainer}>
          {steps.map((step, idx) => {
            const isDone = idx <= currentStep;
            const isCurrent = idx === currentStep;
            return (
              <View key={step.key} style={styles.stepItem}>
                <View style={[styles.stepCircle, isDone ? styles.stepCircleDone : styles.stepCirclePending]}>
                  <Text style={[styles.stepNumber, isDone ? styles.stepNumberDone : styles.stepNumberPending]}>
                    {isDone ? '✓' : idx + 1}
                  </Text>
                </View>
                <Text style={[styles.stepTitle, isCurrent && styles.stepTitleActive]}>{step.label}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* IoT Weight & Classifier Card (If weighed) */}
      {pickup?.weightKg > 0 && (
        <View style={styles.iotCard}>
          <Text style={styles.sectionTitle}>⚖️ IoT Load Cell Verification</Text>
          <View style={styles.iotRow}>
            <Text style={styles.iotLabel}>Measured Weight:</Text>
            <Text style={styles.iotValue}>{pickup.weightKg} kg</Text>
          </View>
          <View style={styles.iotRow}>
            <Text style={styles.iotLabel}>Scale Hardware:</Text>
            <Text style={styles.iotSub}>ESP32-HX711-UNIT-01 (Calibrated)</Text>
          </View>
          <View style={styles.iotRow}>
            <Text style={styles.iotLabel}>Verified Category:</Text>
            <Text style={styles.iotSub}>{pickup?.categoryVerified?.toUpperCase() || pickup?.categoryDeclared?.toUpperCase()}</Text>
          </View>
        </View>
      )}

      {/* Pricing / Invoice Ready Action */}
      {pickup?.pricing && (
        <TouchableOpacity
          style={styles.settleButton}
          onPress={() => navigation.navigate('BillPayment', { pickupId: pickup._id, pricing: pickup.pricing })}
        >
          <Text style={styles.settleButtonText}>
            {pickup.pricing.isPayout
              ? `Claim ₹${pickup.pricing.settlementAmount} UPI Cashback Payout →`
              : `View Invoice & Pay ₹${pickup.pricing.settlementAmount} →`}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  headerBanner: { backgroundColor: '#ffffff', borderRadius: 14, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  codeText: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  categoryBadge: { fontSize: 12, color: '#059669', fontWeight: '700', marginTop: 2 },
  liveSyncBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#a7f3d0' },
  pulseDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  liveSyncText: { fontSize: 10, fontWeight: '800', color: '#065f46' },
  mapContainer: { backgroundColor: '#ffffff', borderRadius: 16, overflow: 'hidden', marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  mapCanvasPlaceholder: { padding: 16, backgroundColor: '#f1f5f9' },
  mapHeaderTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  mapSub: { fontSize: 12, color: '#64748b', marginTop: 2, marginBottom: 14 },
  routeBox: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  routePoint: { flexDirection: 'row', alignItems: 'center' },
  pointEmoji: { fontSize: 24, marginRight: 12 },
  pointLabel: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  pointCoords: { fontSize: 11, color: '#64748b', marginTop: 1 },
  speedBadge: { fontSize: 10, color: '#0284c7', fontWeight: '600', marginTop: 2 },
  pointAddress: { fontSize: 12, color: '#475569', marginTop: 1 },
  routeLine: { width: 2, height: 24, backgroundColor: '#cbd5e1', marginLeft: 16, marginVertical: 4 },
  etaBar: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#0f172a', borderRadius: 12, padding: 14, marginTop: 12 },
  etaTitle: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' },
  etaValue: { fontSize: 18, fontWeight: '800', color: '#38bdf8', marginTop: 2 },
  etaDist: { fontSize: 18, fontWeight: '800', color: '#ffffff', marginTop: 2 },
  progressCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  stepperContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  stepItem: { alignItems: 'center', flex: 1 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  stepCircleDone: { backgroundColor: '#10b981' },
  stepCirclePending: { backgroundColor: '#e2e8f0' },
  stepNumber: { fontSize: 12, fontWeight: '700' },
  stepNumberDone: { color: '#ffffff' },
  stepNumberPending: { color: '#94a3b8' },
  stepTitle: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  stepTitleActive: { color: '#0f172a', fontWeight: '800' },
  stepDesc: { fontSize: 9, color: '#94a3b8', textAlign: 'center', marginTop: 2 },
  iotCard: { backgroundColor: '#eff6ff', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#bfdbfe' },
  iotRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  iotLabel: { fontSize: 13, color: '#1e3a8a', fontWeight: '600' },
  iotValue: { fontSize: 16, fontWeight: '800', color: '#1d4ed8' },
  iotSub: { fontSize: 13, color: '#1e40af', fontWeight: '600' },
  settleButton: { backgroundColor: '#10b981', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 30 },
  settleButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' }
});
