import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { CONFIG } from '../config/api';

interface IoTWeightEntryProps {
  pickup: any;
  onWeightConfirmed: (weightKg: number, source: 'iot_loadcell' | 'manual_override') => void;
}

export const IoTWeightEntryScreen: React.FC<IoTWeightEntryProps> = ({
  pickup,
  onWeightConfirmed
}) => {
  const [scaleReading, setScaleReading] = useState<number>(4.85);
  const [isManual, setIsManual] = useState(false);
  const [manualInput, setManualInput] = useState('4.85');
  const [scaleStatus, setScaleStatus] = useState('Connected via Wi-Fi');
  const [loading, setLoading] = useState(false);

  // Poll simulated IoT scale
  const handleTare = () => {
    setScaleReading(0.0);
    setManualInput('0.0');
    Alert.alert('Scale Zeroed', 'ESP32 HX711 digital tare executed.');
  };

  const handleSimulateLoad = (kg: number) => {
    setScaleReading(kg);
    setManualInput(kg.toString());
  };

  const handleConfirm = () => {
    const finalWeight = isManual ? parseFloat(manualInput) : scaleReading;
    if (isNaN(finalWeight) || finalWeight <= 0) {
      Alert.alert('Invalid Weight', 'Please record a valid weight greater than 0 kg.');
      return;
    }
    onWeightConfirmed(finalWeight, isManual ? 'manual_override' : 'iot_loadcell');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>IoT Scale Telemetry</Text>
      <Text style={styles.sub}>Scale: {CONFIG.DEFAULT_SCALE_ID} (ESP32 + HX711)</Text>

      {/* Digital Scale LED Display */}
      <View style={styles.ledDisplay}>
        <Text style={styles.ledLabel}>ESP32 LOAD CELL ACTIVE WEIGHT</Text>
        <Text style={styles.ledWeight}>{isManual ? manualInput : scaleReading.toFixed(2)}</Text>
        <Text style={styles.ledUnit}>KILOGRAMS (KG)</Text>
        
        <View style={styles.ledStatusRow}>
          <Text style={styles.ledStatusDot}>●</Text>
          <Text style={styles.ledStatusText}>{scaleStatus}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.scaleBtn} onPress={handleTare}>
          <Text style={styles.scaleBtnText}>Zero / Tare</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.scaleBtn} onPress={() => handleSimulateLoad(5.4)}>
          <Text style={styles.scaleBtnText}>Sample +5.4kg</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.scaleBtn} onPress={() => handleSimulateLoad(12.8)}>
          <Text style={styles.scaleBtnText}>Sample +12.8kg</Text>
        </TouchableOpacity>
      </View>

      {/* Manual Override Option */}
      <View style={styles.manualCard}>
        <TouchableOpacity onPress={() => setIsManual(!isManual)} style={styles.toggleRow}>
          <Text style={styles.toggleText}>
            {isManual ? '☑ Manual Fallback Active' : '☐ Enable Manual Fallback'}
          </Text>
        </TouchableOpacity>

        {isManual && (
          <TextInput
            style={styles.manualInput}
            value={manualInput}
            onChangeText={setManualInput}
            keyboardType="decimal-pad"
            placeholder="Enter weight in kg"
            placeholderTextColor="#64748b"
          />
        )}
      </View>

      <TouchableOpacity style={styles.nextBtn} onPress={handleConfirm}>
        <Text style={styles.nextBtnText}>Lock Weight & Proceed to Waste Photo →</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  title: { fontSize: 20, fontWeight: '800', color: '#f8fafc' },
  sub: { fontSize: 12, color: '#64748b', marginTop: 2, marginBottom: 20 },
  ledDisplay: {
    backgroundColor: '#022c22',
    borderColor: '#059669',
    borderWidth: 2,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20
  },
  ledLabel: { color: '#34d399', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  ledWeight: { color: '#10b981', fontSize: 56, fontWeight: '900', fontFamily: 'monospace', marginVertical: 8 },
  ledUnit: { color: '#059669', fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  ledStatusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  ledStatusDot: { color: '#10b981', fontSize: 12, marginRight: 6 },
  ledStatusText: { color: '#34d399', fontSize: 11, fontWeight: '600' },
  buttonRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  scaleBtn: { flex: 1, backgroundColor: '#1e293b', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  scaleBtnText: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  manualCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155', marginBottom: 24 },
  toggleRow: { paddingVertical: 4 },
  toggleText: { color: '#cbd5e1', fontSize: 13, fontWeight: '600' },
  manualInput: { backgroundColor: '#0f172a', color: '#f8fafc', borderRadius: 10, padding: 12, fontSize: 16, marginTop: 10, borderWidth: 1, borderColor: '#475569' },
  nextBtn: { backgroundColor: '#10b981', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  nextBtnText: { color: '#0f172a', fontSize: 14, fontWeight: '800' }
});
