import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, StatusBar } from 'react-native';
import { AgentAuthScreen } from './src/screens/AgentAuthScreen';
import { AssignedPickupsScreen } from './src/screens/AssignedPickupsScreen';
import { IoTWeightEntryScreen } from './src/screens/IoTWeightEntryScreen';
import { PhotoCaptureScreen } from './src/screens/PhotoCaptureScreen';
import { ConfirmCollectionScreen } from './src/screens/ConfirmCollectionScreen';

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [agent, setAgent] = useState<any>(null);
  const [step, setStep] = useState<'list' | 'weigh' | 'photo' | 'confirm'>('list');
  const [selectedPickup, setSelectedPickup] = useState<any>(null);
  const [capturedWeight, setCapturedWeight] = useState<number>(4.8);
  const [weightSource, setWeightSource] = useState<'iot_loadcell' | 'manual_override'>('iot_loadcell');
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string>('');
  const [cnnResult, setCnnResult] = useState<any>(null);

  const [pickups, setPickups] = useState<any[]>([
    {
      id: 'pick-01',
      pickupCode: 'ECO-882194',
      residentName: 'Priya Sharma',
      residentAddress: { street: 'Flat 402, Green Glen', area: 'Bellandur' },
      categoryDeclared: 'plastic',
      status: 'assigned',
      timeSlot: '09:00 AM - 10:30 AM'
    },
    {
      id: 'pick-02',
      pickupCode: 'ECO-441209',
      residentName: 'Ananya Deshmukh',
      residentAddress: { street: 'Villa 14, Palm Meadows', area: 'Whitefield' },
      categoryDeclared: 'biodegradable',
      status: 'assigned',
      timeSlot: '11:00 AM - 12:30 PM'
    }
  ]);

  if (!token) {
    return (
      <AgentAuthScreen
        onLoginSuccess={(loggedAgent, agentToken) => {
          setAgent(loggedAgent);
          setToken(agentToken);
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Top Agent Bar */}
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.title}>EcoCollect Terminal</Text>
          <Text style={styles.agentInfo}>
            {agent?.name} • ⚡ {agent?.agentDetails?.vehicleNumber || 'KA-01-EQ-1002'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => {
            setToken(null);
            setAgent(null);
            setStep('list');
          }}
        >
          <Text style={styles.logoutText}>End Shift</Text>
        </TouchableOpacity>
      </View>

      {/* Workflow Step Routing */}
      <View style={styles.body}>
        {step === 'list' && (
          <AssignedPickupsScreen
            pickups={pickups}
            onSelectPickup={(pickup) => {
              setSelectedPickup(pickup);
              setStep('weigh');
            }}
            onRefresh={() => {}}
          />
        )}

        {step === 'weigh' && selectedPickup && (
          <IoTWeightEntryScreen
            pickup={selectedPickup}
            onWeightConfirmed={(weight, source) => {
              setCapturedWeight(weight);
              setWeightSource(source);
              setStep('photo');
            }}
          />
        )}

        {step === 'photo' && selectedPickup && (
          <PhotoCaptureScreen
            pickup={selectedPickup}
            onPhotoVerified={(url, result) => {
              setCapturedPhotoUrl(url);
              setCnnResult(result);
              setStep('confirm');
            }}
          />
        )}

        {step === 'confirm' && selectedPickup && (
          <ConfirmCollectionScreen
            pickup={selectedPickup}
            weightKg={capturedWeight}
            weightSource={weightSource}
            photoUrl={capturedPhotoUrl}
            cnnResult={cnnResult}
            token={token}
            onComplete={() => {
              // Update local pickup status
              setPickups(
                pickups.map((p) =>
                  p.id === selectedPickup.id ? { ...p, status: 'verified', weightKg: capturedWeight } : p
                )
              );
              setStep('list');
              setSelectedPickup(null);
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0f172a' },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a'
  },
  title: { fontSize: 16, fontWeight: '900', color: '#10b981' },
  agentInfo: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  logoutBtn: { backgroundColor: '#1e293b', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  logoutText: { color: '#ef4444', fontSize: 11, fontWeight: '700' },
  body: { flex: 1, backgroundColor: '#0f172a' }
});
