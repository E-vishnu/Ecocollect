import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image
} from 'react-native';

interface PhotoCaptureProps {
  pickup: any;
  onPhotoVerified: (photoUrl: string, cnnResult: any) => void;
}

const SAMPLE_WASTE_PHOTOS = [
  {
    name: 'Plastic Bottles (Clean PET)',
    url: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=600&q=80',
    detectedClass: 'plastic',
    confidence: 0.96,
    isMismatch: false
  },
  {
    name: 'Mixed Packaging Film (Mismatch Sample)',
    url: 'https://images.unsplash.com/photo-1605600659873-d808a13e4d2a?auto=format&fit=crop&w=600&q=80',
    detectedClass: 'plastic',
    confidence: 0.89,
    isMismatch: true
  },
  {
    name: 'Dry Cardboard / Paper Boxes',
    url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
    detectedClass: 'dry_recyclable',
    confidence: 0.94,
    isMismatch: false
  }
];

export const PhotoCaptureScreen: React.FC<PhotoCaptureProps> = ({
  pickup,
  onPhotoVerified
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState(SAMPLE_WASTE_PHOTOS[0]);
  const [analyzing, setAnalyzing] = useState(false);
  const [cnnResult, setCnnResult] = useState<any>(null);

  const handleRunCNN = async () => {
    setAnalyzing(true);
    // Simulate MobileNetV2 inference network latency
    setTimeout(() => {
      const isMismatch = selectedPhoto.detectedClass !== pickup.categoryDeclared;
      const result = {
        predictedClass: selectedPhoto.detectedClass,
        confidence: selectedPhoto.confidence,
        probabilities: {
          [selectedPhoto.detectedClass]: selectedPhoto.confidence,
          [pickup.categoryDeclared]: isMismatch ? 0.08 : selectedPhoto.confidence
        },
        mismatchFlagged: isMismatch,
        flagReason: isMismatch
          ? `Resident declared '${pickup.categoryDeclared}' but MobileNet CNN detected '${selectedPhoto.detectedClass}'.`
          : undefined
      };
      setCnnResult(result);
      setAnalyzing(false);
    }, 1200);
  };

  const handleProceed = () => {
    if (!cnnResult) {
      Alert.alert('Analysis Required', 'Run MobileNet CNN classification before continuing.');
      return;
    }
    onPhotoVerified(selectedPhoto.url, cnnResult);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Visual Verification</Text>
      <Text style={styles.sub}>
        MobileNetV2 CNN cross-checks resident declared category: ({pickup.categoryDeclared?.toUpperCase()})
      </Text>

      {/* Photo Preview */}
      <View style={styles.photoFrame}>
        <Image source={{ uri: selectedPhoto.url }} style={styles.imagePreview} />
        <View style={styles.photoOverlay}>
          <Text style={styles.overlayText}>{selectedPhoto.name}</Text>
        </View>
      </View>

      {/* Sample photo toggles */}
      <View style={styles.sampleGrid}>
        {SAMPLE_WASTE_PHOTOS.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.sampleBtn, selectedPhoto.name === item.name && styles.sampleBtnActive]}
            onPress={() => {
              setSelectedPhoto(item);
              setCnnResult(null);
            }}
          >
            <Text style={[styles.sampleText, selectedPhoto.name === item.name && styles.sampleTextActive]}>
              {idx === 0 ? 'PET Plastic' : idx === 1 ? 'Mismatch Sample' : 'Cardboard'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* CNN Inferences Card */}
      {cnnResult && (
        <View style={[styles.resultCard, cnnResult.mismatchFlagged ? styles.mismatchBorder : styles.matchBorder]}>
          <View style={styles.resultHeader}>
            <Text style={styles.resultTitle}>
              {cnnResult.mismatchFlagged ? '⚠️ AI Category Discrepancy Flagged' : '✓ Category Verified by CNN'}
            </Text>
            <Text style={styles.confidenceText}>
              {(cnnResult.confidence * 100).toFixed(0)}% Match
            </Text>
          </View>
          <Text style={styles.resultDesc}>
            {cnnResult.mismatchFlagged
              ? cnnResult.flagReason
              : `Sample matched declared '${pickup.categoryDeclared}' stream.`}
          </Text>
        </View>
      )}

      {/* Actions */}
      {!cnnResult ? (
        <TouchableOpacity style={styles.actionBtn} onPress={handleRunCNN} disabled={analyzing}>
          {analyzing ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text style={styles.actionBtnText}>⚡ Run MobileNet CNN Inference</Text>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.confirmBtn} onPress={handleProceed}>
          <Text style={styles.confirmBtnText}>Confirm Verification & Review Pricing →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  title: { fontSize: 20, fontWeight: '800', color: '#f8fafc' },
  sub: { fontSize: 12, color: '#94a3b8', marginTop: 2, marginBottom: 16 },
  photoFrame: { height: 180, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#334155', position: 'relative', marginBottom: 12 },
  imagePreview: { width: '100%', height: '100%' },
  photoOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', padding: 8 },
  overlayText: { color: '#f8fafc', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  sampleGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  sampleBtn: { flex: 1, backgroundColor: '#1e293b', paddingVertical: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  sampleBtnActive: { borderColor: '#10b981', backgroundColor: '#064e3b' },
  sampleText: { color: '#94a3b8', fontSize: 11, fontWeight: '600' },
  sampleTextActive: { color: '#34d399', fontWeight: '800' },
  resultCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1.5, marginBottom: 20 },
  matchBorder: { borderColor: '#10b981' },
  mismatchBorder: { borderColor: '#f59e0b' },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resultTitle: { fontSize: 13, fontWeight: '800', color: '#f8fafc' },
  confidenceText: { fontSize: 12, fontWeight: '800', color: '#10b981' },
  resultDesc: { fontSize: 12, color: '#94a3b8', marginTop: 6 },
  actionBtn: { backgroundColor: '#10b981', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 10 },
  actionBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 14 },
  confirmBtn: { backgroundColor: '#0284c7', borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
  confirmBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 14 }
});
