import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RequestStatus } from '@cargo/shared';

export default function App() {
  const [status, setStatus] = useState<RequestStatus>('searching_rider');
  const [showDocs, setShowDocs] = useState(false);
  const [otpInput, setOtpInput] = useState('');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>CargoRider — Motorbike</Text>
        <Text style={styles.subtitle}>KYC Verified • Online</Text>

        {status === 'searching_rider' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>New Cargo Pickup Request</Text>
            <Text style={styles.info}>Terminal: Daewoo Cargo Terminal</Text>
            <Text style={styles.info}>Drop-off: Gulberg III (6 km)</Text>
            <Text style={styles.info}>To-Pay Status: Pre-paid by Customer</Text>
            <Text style={styles.payout}>Your Payout: Rs. 460</Text>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => setStatus('accepted')}
            >
              <Text style={styles.btnText}>Accept Pickup Job</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Active Job</Text>
            <Text style={styles.badge}>{status.replace('_', ' ').toUpperCase()}</Text>
            <Text style={styles.info}>Terminal: Daewoo Cargo Terminal</Text>
            <Text style={styles.info}>Bilty #: BLT-9021</Text>

            {status === 'accepted' && (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => setStatus('at_terminal')}
              >
                <Text style={styles.btnText}>Arrived at Cargo Terminal</Text>
              </TouchableOpacity>
            )}

            {status === 'at_terminal' && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.secBtn}
                  onPress={() => setShowDocs(!showDocs)}
                >
                  <Text style={styles.btnText}>
                    {showDocs ? 'Hide Bilty & ID Card' : 'Show Bilty & ID to Cargo Counter'}
                  </Text>
                </TouchableOpacity>

                {showDocs && (
                  <View style={styles.secureViewer}>
                    <Text style={styles.watermark}>
                      PICKUP ONLY • Order #9021 • Rider: Ali • Screenshots Blocked
                    </Text>
                    <Text style={styles.docPlaceholder}>[ Secure Bilty Image #BLT-9021 ]</Text>
                    <Text style={styles.docPlaceholder}>[ Secure User CNIC Front / Back ]</Text>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => {
                    setShowDocs(false);
                    setStatus('picked_up');
                  }}
                >
                  <Text style={styles.btnText}>Confirm Cargo Received & Upload Photo</Text>
                </TouchableOpacity>
              </View>
            )}

            {status === 'picked_up' && (
              <View style={styles.section}>
                <Text style={styles.label}>Enter Customer Delivery OTP</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  maxLength={4}
                  value={otpInput}
                  onChangeText={setOtpInput}
                  placeholder="4-digit OTP"
                />
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => setStatus('delivered')}
                >
                  <Text style={styles.btnText}>Complete Delivery</Text>
                </TouchableOpacity>
              </View>
            )}

            {status === 'delivered' && (
              <Text style={styles.doneText}>Delivery Completed! Payout added to wallet.</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { padding: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#16A34A', fontWeight: '600', marginBottom: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, gap: 10, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  info: { fontSize: 14, color: '#334155' },
  payout: { fontSize: 18, fontWeight: '800', color: '#15803D', marginVertical: 4 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontWeight: '700',
    fontSize: 12,
  },
  section: { gap: 10, marginTop: 6 },
  primaryBtn: { backgroundColor: '#16A34A', borderRadius: 12, padding: 15, alignItems: 'center' },
  secBtn: { backgroundColor: '#2563EB', borderRadius: 12, padding: 15, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  secureViewer: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    alignItems: 'center',
  },
  watermark: { color: '#FACC15', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  docPlaceholder: {
    color: '#E2E8F0',
    borderWidth: 1,
    borderColor: '#475569',
    padding: 20,
    width: '100%',
    textAlign: 'center',
    borderRadius: 8,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#334155' },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, fontSize: 16 },
  doneText: { fontSize: 16, fontWeight: '700', color: '#15803D', marginTop: 8 },
});
