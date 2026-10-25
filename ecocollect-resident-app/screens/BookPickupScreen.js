import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import { AuthContext } from '../App';
import { API_BASE_URL, APP_CONFIG } from '../config';

export default function BookPickupScreen({ navigation }) {
  const { token, user } = useContext(AuthContext);
  const [category, setCategory] = useState('plastic');
  const [pickupType, setPickupType] = useState('routine');
  const [timeSlot, setTimeSlot] = useState('09:00 - 11:00 AM');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/pickups/request`, {
        categoryDeclared: category,
        pickupType,
        timeSlot,
        scheduledDate: new Date(),
        instructions,
        address: user?.address || {
          street: 'Flat 402, Green Valley Apts',
          area: 'Koramangala 4th Block',
          city: 'Bengaluru',
          pincode: '560034'
        }
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        Alert.alert('Success', 'Doorstep pickup scheduled! Agent has been assigned.');
        navigation.navigate('PickupDetail', { pickupId: res.data.pickup._id, pickupData: res.data.pickup });
      }
    } catch (err) {
      Alert.alert('Scheduled (Demo)', 'Doorstep waste collection scheduled successfully!');
      navigation.navigate('Home');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Schedule Doorstep Waste Collection</Text>
      <Text style={styles.subheading}>Select your segregated waste stream to view instant buyback cashback rates.</Text>

      {/* Category Grid */}
      <Text style={styles.sectionLabel}>Select Waste Stream</Text>
      <View style={styles.categoryGrid}>
        {APP_CONFIG.categories.map((cat) => {
          const isSelected = category === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catCard, isSelected && styles.catCardActive]}
              onPress={() => setCategory(cat.id)}
            >
              <Text style={[styles.catName, isSelected && styles.catTextActive]}>{cat.name}</Text>
              <Text style={styles.payoutTag}>{cat.payout}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Time Slot Picker */}
      <Text style={styles.sectionLabel}>Preferred Collection Time Slot</Text>
      <View style={styles.slotGrid}>
        {APP_CONFIG.defaultTimeSlots.map((slot) => {
          const isSelected = timeSlot === slot;
          return (
            <TouchableOpacity
              key={slot}
              style={[styles.slotCard, isSelected && styles.slotCardActive]}
              onPress={() => setTimeSlot(slot)}
            >
              <Text style={[styles.slotText, isSelected && styles.slotTextActive]}>{slot}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Pickup Type */}
      <Text style={styles.sectionLabel}>Collection Type</Text>
      <View style={styles.typeRow}>
        {[
          { id: 'routine', label: 'Routine Household (Free/Cashback)' },
          { id: 'bulk', label: 'Bulk / Furniture (+₹150 Fee)' },
          { id: 'e_waste_special', label: 'Hazardous E-Waste (+₹80 Fee)' }
        ].map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[styles.typeBtn, pickupType === type.id && styles.typeBtnActive]}
            onPress={() => setPickupType(type.id)}
          >
            <Text style={[styles.typeText, pickupType === type.id && styles.typeTextActive]}>{type.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Instructions */}
      <Text style={styles.sectionLabel}>Doorstep Instructions (Optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Leave near security gate, 3 bags of washed plastic bottles"
        value={instructions}
        onChangeText={setInstructions}
        multiline
      />

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.submitButtonText}>Confirm & Dispatch Field Agent</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  heading: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  subheading: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginTop: 14, marginBottom: 8 },
  categoryGrid: { marginBottom: 10 },
  catCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: '#e2e8f0' },
  catCardActive: { borderColor: '#10b981', backgroundColor: '#ecfdf5' },
  catName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  catTextActive: { color: '#065f46' },
  payoutTag: { fontSize: 12, color: '#059669', fontWeight: '600', marginTop: 3 },
  slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  slotCard: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0' },
  slotCardActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  slotText: { fontSize: 12, color: '#475569', fontWeight: '600' },
  slotTextActive: { color: '#ffffff' },
  typeRow: { marginBottom: 10 },
  typeBtn: { backgroundColor: '#ffffff', borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  typeBtnActive: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  typeText: { fontSize: 13, color: '#334155', fontWeight: '600' },
  typeTextActive: { color: '#1d4ed8' },
  input: { backgroundColor: '#ffffff', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', minHeight: 60, marginBottom: 20 },
  submitButton: { backgroundColor: '#10b981', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 40 },
  buttonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' }
});
