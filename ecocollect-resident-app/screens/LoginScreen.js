import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { AuthContext } from '../App';
import { API_BASE_URL } from '../config';

export default function LoginScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('resident.priya@ecocollect.io');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in both email and password');
      return;
    }

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
      if (res.data.success) {
        login(res.data.user, res.data.token);
      }
    } catch (err) {
      // Fallback for offline demo simulation
      console.warn('Backend offline, logging in with demo state');
      login({
        name: 'Priya Sharma',
        email: email,
        role: 'resident',
        phone: '+91 99887 76655',
        upiId: 'priyasharma@okaxis',
        address: { street: 'Apt 4B, Palm Grove Residency', area: 'Koramangala 4th Block', city: 'Bengaluru' }
      }, 'demo_jwt_token_resident_123');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBox}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>🌱 RESIDENT APP</Text>
        </View>
        <Text style={styles.title}>EcoCollect</Text>
        <Text style={styles.subtitle}>On-Demand IoT Smart Waste Collection & Cashback</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="resident@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In to Resident Portal</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.secondaryButton} 
          onPress={() => navigation.navigate('Signup')}
        >
          <Text style={styles.secondaryButtonText}>Don't have an account? Sign Up</Text>
        </TouchableOpacity>

        <View style={styles.demoBox}>
          <Text style={styles.demoTitle}>💡 Pre-filled Demo Account:</Text>
          <Text style={styles.demoText}>Email: resident.priya@ecocollect.io</Text>
          <Text style={styles.demoText}>Password: Password123!</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0fdf4', justifyContent: 'center', padding: 20 },
  headerBox: { alignItems: 'center', marginBottom: 28 },
  badge: { backgroundColor: '#dcfce7', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, marginBottom: 8 },
  badgeText: { color: '#15803d', fontWeight: '700', fontSize: 12 },
  title: { fontSize: 32, fontWeight: '800', color: '#14532d' },
  subtitle: { fontSize: 14, color: '#4b5563', textAlign: 'center', marginTop: 4, paddingHorizontal: 20 },
  formCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 14, fontSize: 15, marginBottom: 16, backgroundColor: '#f9fafb' },
  button: { backgroundColor: '#10b981', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  secondaryButton: { padding: 12, alignItems: 'center', marginTop: 8 },
  secondaryButtonText: { color: '#059669', fontWeight: '600', fontSize: 14 },
  demoBox: { marginTop: 16, padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#10b981' },
  demoTitle: { fontSize: 12, fontWeight: '700', color: '#334155' },
  demoText: { fontSize: 11, color: '#64748b', marginTop: 2 }
});
