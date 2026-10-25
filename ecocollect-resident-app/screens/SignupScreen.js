import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import axios from 'axios';
import { AuthContext } from '../App';
import { API_BASE_URL } from '../config';

export default function SignupScreen({ navigation }) {
  const { login } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [area, setArea] = useState('');
  const [upiId, setUpiId] = useState('');

  const handleSignup = async () => {
    if (!name || !email || !password) {
      Alert.alert('Required Fields', 'Please enter Name, Email, and Password');
      return;
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/auth/signup`, {
        name,
        email,
        password,
        role: 'resident',
        phone: phone || '+91 98765 43210',
        upiId: upiId || 'resident@okaxis',
        address: { street, area, city: 'Bengaluru', pincode: '560034' }
      });
      if (res.data.success) {
        login(res.data.user, res.data.token);
      }
    } catch (err) {
      // Fallback
      login({
        name,
        email,
        role: 'resident',
        phone,
        upiId: upiId || 'resident@okaxis',
        address: { street, area, city: 'Bengaluru' }
      }, 'demo_token_' + Date.now());
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Resident Registration</Text>
        <Text style={styles.subtitle}>Sign up to request IoT-verified doorstep pickups</Text>

        <Text style={styles.label}>Full Name *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Priya Sharma" />

        <Text style={styles.label}>Email Address *</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="priya@example.com" keyboardType="email-address" />

        <Text style={styles.label}>Password *</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />

        <Text style={styles.label}>Mobile Phone</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" keyboardType="phone-pad" />

        <Text style={styles.label}>UPI ID (for instant recyclable buyback cashback)</Text>
        <TextInput style={styles.input} value={upiId} onChangeText={setUpiId} placeholder="e.g. yourname@okaxis" />

        <Text style={styles.label}>Street Address / Flat No.</Text>
        <TextInput style={styles.input} value={street} onChangeText={setStreet} placeholder="Apt 4B, Palm Grove Residency" />

        <Text style={styles.label}>Area / Neighborhood</Text>
        <TextInput style={styles.input} value={area} onChangeText={setArea} placeholder="Koramangala 4th Block" />

        <TouchableOpacity style={styles.button} onPress={handleSignup}>
          <Text style={styles.buttonText}>Complete Registration</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f8fafc' },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, shadowOpacity: 0.05, elevation: 2 },
  title: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 12, backgroundColor: '#f8fafc' },
  button: { backgroundColor: '#10b981', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#ffffff', fontWeight: '700', fontSize: 16 }
});
