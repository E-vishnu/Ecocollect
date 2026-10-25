import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { AuthScreen } from './src/screens/AuthScreen';
import { BookPickupScreen } from './src/screens/BookPickupScreen';
import { TrackingScreen } from './src/screens/TrackingScreen';
import { BillPayoutScreen } from './src/screens/BillPayoutScreen';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'book' | 'tracking' | 'bill'>('book');
  const [activePickup, setActivePickup] = useState<any>(null);

  const handleLogin = (loggedUser: any, userToken: string) => {
    setUser(loggedUser);
    setToken(userToken);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    setActivePickup(null);
  };

  if (!token) {
    return <AuthScreen onLoginSuccess={handleLogin} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Top App Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.brandTitle}>EcoCollect</Text>
          <Text style={styles.userName}>Hello, {user?.name || 'Resident'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Main Screen Body */}
      <View style={styles.body}>
        {activeTab === 'book' && (
          <BookPickupScreen
            token={token}
            user={user}
            onPickupBooked={(pickup) => {
              setActivePickup(pickup);
              setActiveTab('tracking');
            }}
          />
        )}

        {activeTab === 'tracking' && (
          <TrackingScreen
            pickup={activePickup}
            onViewBillPayout={() => setActiveTab('bill')}
            onRefresh={() => {}}
          />
        )}

        {activeTab === 'bill' && (
          <BillPayoutScreen
            pickup={activePickup}
            token={token}
            onPaymentSettled={() => {
              if (activePickup) {
                setActivePickup({ ...activePickup, status: 'completed', paymentStatus: 'payout_settled' });
              }
            }}
          />
        )}
      </View>

      {/* Bottom Tab Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'book' && styles.navItemActive]}
          onPress={() => setActiveTab('book')}
        >
          <Text style={[styles.navLabel, activeTab === 'book' && styles.navLabelActive]}>
            Book Pickup
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'tracking' && styles.navItemActive]}
          onPress={() => setActiveTab('tracking')}
        >
          <Text style={[styles.navLabel, activeTab === 'tracking' && styles.navLabelActive]}>
            Live Tracking
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'bill' && styles.navItemActive]}
          onPress={() => setActiveTab('bill')}
        >
          <Text style={[styles.navLabel, activeTab === 'bill' && styles.navLabelActive]}>
            Bill & Payout
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff'
  },
  brandTitle: { fontSize: 18, fontWeight: '900', color: '#059669' },
  userName: { fontSize: 12, color: '#64748b' },
  logoutBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  logoutText: { fontSize: 12, color: '#ef4444', fontWeight: '600' },
  body: { flex: 1, backgroundColor: '#f8fafc' },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingVertical: 10,
    paddingHorizontal: 16
  },
  navItem: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 8 },
  navItemActive: { backgroundColor: '#ecfdf5' },
  navLabel: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  navLabelActive: { color: '#059669', fontWeight: '800' }
});
