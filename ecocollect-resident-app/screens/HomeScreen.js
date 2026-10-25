import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { AuthContext } from '../App';
import { API_BASE_URL } from '../config';

export default function HomeScreen({ navigation }) {
  const { user, token, logout } = useContext(AuthContext);
  const [pickups, setPickups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPickups = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/pickups`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setPickups(res.data.pickups);
      }
    } catch (err) {
      // Mock historical list for testing
      setPickups([
        {
          _id: 'pickup_demo_1',
          pickupCode: 'ECO-882190',
          categoryDeclared: 'plastic',
          categoryVerified: 'plastic',
          status: 'completed',
          pickupType: 'routine',
          scheduledDate: new Date(),
          timeSlot: '09:00 - 11:00 AM',
          weightKg: 4.8,
          isSegregated: true,
          pricing: { isPayout: true, settlementAmount: 86.4, recyclablePayoutTotal: 86.4 }
        },
        {
          _id: 'pickup_demo_2',
          pickupCode: 'ECO-994102',
          categoryDeclared: 'e_waste',
          status: 'assigned',
          pickupType: 'e_waste_special',
          scheduledDate: new Date(),
          timeSlot: '02:00 - 04:00 PM',
          weightKg: 0,
          agent: { name: 'Rahul Varma (Field Agent)', phone: '+91 98765 00101' }
        }
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPickups();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'requested': return { label: 'Requested', bg: '#fef3c7', text: '#d97706' };
      case 'assigned': return { label: 'Agent En Route', bg: '#e0e7ff', text: '#4338ca' };
      case 'collected': return { label: 'Weighed / Collected', bg: '#e0f2fe', text: '#0284c7' };
      case 'verified': return { label: 'Under Review', bg: '#fee2e2', text: '#dc2626' };
      case 'priced': return { label: 'Invoice Ready', bg: '#dcfce7', text: '#15803d' };
      case 'completed': return { label: 'Settled & Completed', bg: '#f3f4f6', text: '#374151' };
      default: return { label: status, bg: '#f1f5f9', text: '#475569' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Resident Profile Header Card */}
      <View style={styles.userCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user ? user.name : 'Resident'}</Text>
          <Text style={styles.userAddress}>{user?.address?.street || 'Bengaluru'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Recyclables Buyback Incentive Banner */}
      <View style={styles.cashbackBanner}>
        <Text style={styles.cashbackTitle}>💰 Earn Instant UPI Cashback</Text>
        <Text style={styles.cashbackDesc}>
          Clean plastics: ₹18/kg • Paper/Cartons: ₹12/kg • E-Waste: ₹45/kg
        </Text>
      </View>

      {/* Action Button: Book New Pickup */}
      <TouchableOpacity
        style={styles.bookButton}
        onPress={() => navigation.navigate('BookPickup')}
      >
        <Text style={styles.bookButtonText}>+ Schedule Doorstep Waste Pickup</Text>
      </TouchableOpacity>

      {/* Pickups History Section */}
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Your Pickup Requests</Text>
        <TouchableOpacity onPress={fetchPickups}>
          <Text style={styles.refreshLink}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={pickups}
          keyExtractor={(item) => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPickups(); }} />}
          renderItem={({ item }) => {
            const badge = getStatusBadge(item.status);
            return (
              <TouchableOpacity
                style={styles.pickupCard}
                onPress={() => navigation.navigate('PickupDetail', { pickupId: item._id, pickupData: item })}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.codeText}>{item.pickupCode}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                </View>

                <Text style={styles.categoryText}>Category: {item.categoryDeclared.toUpperCase()}</Text>
                <Text style={styles.timeText}>Slot: {item.timeSlot}</Text>

                {item.weightKg > 0 && (
                  <View style={styles.weightRow}>
                    <Text style={styles.weightLabel}>IoT Scale Weight:</Text>
                    <Text style={styles.weightValue}>{item.weightKg} kg</Text>
                  </View>
                )}

                {item.pricing && (
                  <View style={styles.pricingRow}>
                    {item.pricing.isPayout ? (
                      <Text style={styles.payoutText}>+ ₹{item.pricing.settlementAmount} (Cashback Payout)</Text>
                    ) : (
                      <Text style={styles.feeText}>Fee: ₹{item.pricing.settlementAmount}</Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No pickups scheduled yet.</Text>
              <Text style={styles.emptySub}>Tap above to request your first waste collection!</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  userCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', shadowOpacity: 0.04, elevation: 1, marginBottom: 12 },
  greeting: { fontSize: 12, color: '#64748b' },
  userName: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  userAddress: { fontSize: 12, color: '#475569', marginTop: 2 },
  logoutBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fee2e2', borderRadius: 8 },
  logoutText: { color: '#dc2626', fontSize: 12, fontWeight: '600' },
  cashbackBanner: { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 14 },
  cashbackTitle: { fontSize: 13, fontWeight: '700', color: '#065f46' },
  cashbackDesc: { fontSize: 12, color: '#047857', marginTop: 2 },
  bookButton: { backgroundColor: '#10b981', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16, shadowColor: '#10b981', shadowOpacity: 0.25, shadowRadius: 6, elevation: 3 },
  bookButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  historyTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  refreshLink: { fontSize: 13, color: '#059669', fontWeight: '600' },
  pickupCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, marginBottom: 10, shadowOpacity: 0.03, elevation: 1, borderWidth: 1, borderColor: '#f1f5f9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  codeText: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '700' },
  categoryText: { fontSize: 13, color: '#334155', fontWeight: '600' },
  timeText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  weightRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  weightLabel: { fontSize: 12, color: '#475569' },
  weightValue: { fontSize: 13, fontWeight: '700', color: '#0284c7', marginLeft: 4 },
  pricingRow: { marginTop: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 6 },
  payoutText: { fontSize: 13, fontWeight: '700', color: '#16a34a' },
  feeText: { fontSize: 13, fontWeight: '700', color: '#dc2626' },
  emptyBox: { alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  emptySub: { fontSize: 13, color: '#94a3b8', marginTop: 4 }
});
