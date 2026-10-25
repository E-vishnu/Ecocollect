import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';

interface AssignedPickupsProps {
  pickups: any[];
  onSelectPickup: (pickup: any) => void;
  onRefresh: () => void;
}

export const AssignedPickupsScreen: React.FC<AssignedPickupsProps> = ({
  pickups,
  onSelectPickup,
  onRefresh
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Assigned Route Pickups ({pickups.length})</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh}>
          <Text style={styles.refreshText}>↻ Sync</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={pickups}
        keyExtractor={(item) => item.id || item._id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => onSelectPickup(item)}>
            <View style={styles.cardHeader}>
              <Text style={styles.code}>{item.pickupCode}</Text>
              <Text style={[styles.statusBadge, item.status === 'assigned' ? styles.statusAssigned : styles.statusDone]}>
                {item.status.toUpperCase()}
              </Text>
            </View>

            <Text style={styles.residentName}>{item.residentName}</Text>
            <Text style={styles.address}>{item.residentAddress?.street}, {item.residentAddress?.area}</Text>
            
            <View style={styles.footer}>
              <Text style={styles.categoryBadge}>Declared: {item.categoryDeclared?.toUpperCase()}</Text>
              <Text style={styles.slot}>{item.timeSlot}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '800', color: '#f8fafc' },
  refreshBtn: { backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  refreshText: { color: '#10b981', fontWeight: '700', fontSize: 12 },
  list: { gap: 12 },
  card: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  code: { fontSize: 14, fontWeight: '800', color: '#10b981', fontFamily: 'monospace' },
  statusBadge: { fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusAssigned: { backgroundColor: '#0284c7', color: '#ffffff' },
  statusDone: { backgroundColor: '#059669', color: '#ffffff' },
  residentName: { fontSize: 16, fontWeight: '700', color: '#f8fafc' },
  address: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#334155' },
  categoryBadge: { fontSize: 11, color: '#facc15', fontWeight: '700' },
  slot: { fontSize: 11, color: '#64748b' }
});
