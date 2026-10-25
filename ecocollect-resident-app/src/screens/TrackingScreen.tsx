import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

interface TrackingScreenProps {
  pickup: any;
  onViewBillPayout: () => void;
  onRefresh: () => void;
}

export const TrackingScreen: React.FC<TrackingScreenProps> = ({
  pickup,
  onViewBillPayout,
  onRefresh
}) => {
  if (!pickup) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Active Pickup</Text>
        <Text style={styles.emptySub}>Book a doorstep pickup to track your agent in real-time.</Text>
      </View>
    );
  }

  const steps = [
    { label: 'Pickup Requested', done: true, time: '10:00 AM' },
    { label: 'Agent Dispatched', done: ['assigned', 'collected', 'verified', 'priced', 'completed'].includes(pickup.status), time: '10:15 AM' },
    { label: 'IoT Scale Weighed', done: ['collected', 'verified', 'priced', 'completed'].includes(pickup.status), time: pickup.weightKg ? `${pickup.weightKg} kg` : '--' },
    { label: 'AI CNN Verified', done: ['verified', 'priced', 'completed'].includes(pickup.status), time: pickup.categoryVerified || '--' },
    { label: 'Pricing & Settle', done: ['priced', 'completed'].includes(pickup.status), time: pickup.pricing ? `₹${pickup.pricing.settlementAmount}` : '--' }
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Top Banner */}
      <View style={styles.banner}>
        <View>
          <Text style={styles.codeText}>{pickup.pickupCode || 'ECO-882194'}</Text>
          <Text style={styles.statusBadge}>Status: {pickup.status.toUpperCase()}</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Text style={styles.refreshText}>↻ Live Sync</Text>
        </TouchableOpacity>
      </View>

      {/* Agent Card */}
      <View style={styles.agentCard}>
        <Text style={styles.cardHeader}>Assigned Field Agent</Text>
        <View style={styles.agentRow}>
          <View style={styles.agentAvatar}>
            <Text style={styles.avatarText}>RV</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.agentName}>{pickup.agentName || 'Rahul Varma'}</Text>
            <Text style={styles.agentVehicle}>⚡ {pickup.agentVehicle || 'KA-01-EQ-1002 (EV Trike)'}</Text>
            <Text style={styles.agentContact}>📞 {pickup.agentPhone || '+91 98450 12345'}</Text>
          </View>
        </View>
      </View>

      {/* Lifecycle Progress Bar */}
      <View style={styles.timelineCard}>
        <Text style={styles.cardHeader}>Collection Lifecycle</Text>
        {steps.map((s, idx) => (
          <View key={idx} style={styles.timelineRow}>
            <View style={[styles.timelineDot, s.done && styles.timelineDotActive]} />
            <View style={styles.timelineContent}>
              <Text style={[styles.stepLabel, s.done && styles.stepLabelActive]}>
                {s.label}
              </Text>
              <Text style={styles.stepMeta}>{s.time}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* View Bill & Payout Button */}
      {pickup.pricing && (
        <TouchableOpacity style={styles.billBtn} onPress={onViewBillPayout}>
          <Text style={styles.billBtnText}>
            {pickup.pricing.isPayout ? '🎉 View Cashback Payout (₹' + pickup.pricing.settlementAmount + ')' : 'View Invoice Bill'}
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#334155' },
  emptySub: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 6 },
  banner: {
    flexDirection: 'row',
    justifyContent: 'between',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: 18,
    borderRadius: 16,
    marginBottom: 16
  },
  codeText: { fontSize: 16, fontWeight: '800', color: '#ffffff', fontFamily: 'monospace' },
  statusBadge: { fontSize: 11, color: '#34d399', fontWeight: '700', marginTop: 2 },
  refreshBtn: { backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  refreshText: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
  agentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16
  },
  cardHeader: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 12 },
  agentRow: { flexDirection: 'row', alignItems: 'center' },
  agentAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#059669', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
  agentName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  agentVehicle: { fontSize: 12, color: '#475569', marginTop: 2 },
  agentContact: { fontSize: 12, color: '#059669', fontWeight: '600', marginTop: 2 },
  timelineCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20
  },
  timelineRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#cbd5e1', marginRight: 12 },
  timelineDotActive: { backgroundColor: '#059669' },
  timelineContent: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  stepLabel: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  stepLabelActive: { color: '#0f172a', fontWeight: '700' },
  stepMeta: { fontSize: 12, color: '#059669', fontWeight: '600' },
  billBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4
  },
  billBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 }
});
