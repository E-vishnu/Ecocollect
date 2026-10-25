import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { API_ENDPOINTS } from '../config/api';

interface AgentAuthProps {
  onLoginSuccess: (agent: any, token: string) => void;
}

export const AgentAuthScreen: React.FC<AgentAuthProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('rahul.agent@ecocollect.in');
  const [password, setPassword] = useState('password123');
  const [vehicleNumber, setVehicleNumber] = useState('KA-01-EQ-1002');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const json = await response.json();
      if (json.success) {
        onLoginSuccess(json.data.user, json.token);
      } else {
        Alert.alert('Login Failed', json.message || 'Check email or password.');
      }
    } catch (err) {
      // Offline testing fallback
      onLoginSuccess(
        {
          id: 'agent-01',
          name: 'Rahul Varma',
          email,
          role: 'agent',
          phone: '+91 98450 12345',
          agentDetails: {
            vehicleNumber,
            vehicleType: 'Euler HiLoad EV Cargo',
            batteryPercent: 88,
            assignedArea: 'Koramangala Ward'
          }
        },
        'mock_agent_jwt_token'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.brandTitle}>EcoCollect Field</Text>
        <Text style={styles.subtitle}>Municipal Fleet & Smart Collection Portal</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Agent Terminal Login</Text>

        <Text style={styles.label}>Municipal Agent Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Text style={styles.label}>Assigned EV Cargo Vehicle</Text>
        <TextInput
          style={styles.input}
          value={vehicleNumber}
          onChangeText={setVehicleNumber}
        />

        <TouchableOpacity style={styles.submitBtn} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Start Field Shift</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 28 },
  brandTitle: { fontSize: 28, fontWeight: '900', color: '#10b981' },
  subtitle: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  card: { backgroundColor: '#1e293b', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#334155' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#f8fafc', marginBottom: 18 },
  label: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#f8fafc', borderWidth: 1, borderColor: '#334155' },
  submitBtn: { backgroundColor: '#10b981', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  submitBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 15 }
});
