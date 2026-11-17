import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { calculateMotorbikeFare, RequestStatus } from '@cargo/shared';

export default function App() {
  const [terminalName, setTerminalName] = useState('Daewoo Cargo Terminal');
  const [biltyNumber, setBiltyNumber] = useState('');
  const [biltyAttached, setBiltyAttached] = useState(false);
  const [idAttached, setIdAttached] = useState(false);
  const [isToPay, setIsToPay] = useState(false);
  const [toPayAmount, setToPayAmount] = useState('0');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [activeStatus, setActiveStatus] = useState<RequestStatus | null>(null);
  const [deliveryOtp] = useState('4829');

  const fare = calculateMotorbikeFare({
    distanceKm: 6,
    toPayAmount: isToPay ? Number(toPayAmount) || 0 : 0,
  });

  const handleSubmit = () => {
    setActiveStatus(isToPay ? 'pending_payment' : 'searching_rider');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Local Cargo Pickup</Text>
        <Text style={styles.subtitle}>
          Upload your Bilty & ID Card. A verified motorbike rider will collect and deliver your parcel.
        </Text>

        {activeStatus ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Active Request Status</Text>
            <Text style={styles.badge}>{activeStatus.replace('_', ' ').toUpperCase()}</Text>
            <Text style={styles.info}>Terminal: {terminalName}</Text>
            <Text style={styles.info}>Bilty #: {biltyNumber || 'BLT-9021'}</Text>
            <Text style={styles.info}>Drop-off: {dropoffAddress || 'Main Market'}</Text>

            <View style={styles.otpBox}>
              <Text style={styles.otpLabel}>Delivery Handover OTP (Share with Rider on arrival)</Text>
              <Text style={styles.otpValue}>{deliveryOtp}</Text>
            </View>

            {activeStatus === 'pending_payment' && (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => setActiveStatus('searching_rider')}
              >
                <Text style={styles.btnText}>Pre-Pay Rs. {fare.totalPayable} & Find Rider</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.label}>Cargo Terminal / Adda</Text>
            <TextInput
              style={styles.input}
              value={terminalName}
              onChangeText={setTerminalName}
              placeholder="e.g. Daewoo Terminal, Badami Bagh"
            />

            <Text style={styles.label}>Bilty Number</Text>
            <TextInput
              style={styles.input}
              value={biltyNumber}
              onChangeText={setBiltyNumber}
              placeholder="Enter Bilty / Receipt #"
            />

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.uploadBtn, biltyAttached && styles.uploadDone]}
                onPress={() => setBiltyAttached(true)}
              >
                <Text style={styles.uploadText}>
                  {biltyAttached ? 'Bilty Uploaded' : '+ Upload Bilty Photo'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.uploadBtn, idAttached && styles.uploadDone]}
                onPress={() => setIdAttached(true)}
              >
                <Text style={styles.uploadText}>
                  {idAttached ? 'CNIC Uploaded' : '+ Upload ID Card'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.label}>Unpaid To-Pay Bilty?</Text>
              <Switch value={isToPay} onValueChange={setIsToPay} />
            </View>

            {isToPay && (
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={toPayAmount}
                onChangeText={setToPayAmount}
                placeholder="To-Pay Cargo Amount (PKR)"
              />
            )}

            <Text style={styles.label}>Drop-off Address</Text>
            <TextInput
              style={styles.input}
              value={dropoffAddress}
              onChangeText={setDropoffAddress}
              placeholder="House / Shop #, Street, Area"
            />

            <View style={styles.fareBox}>
              <Text style={styles.fareText}>Delivery Fee: Rs. {fare.baseFare + fare.distanceFare + fare.serviceFee}</Text>
              {isToPay && <Text style={styles.fareText}>To-Pay Pre-payment: Rs. {fare.toPayAmount}</Text>}
              <Text style={styles.fareTotal}>Total Payable: Rs. {fare.totalPayable}</Text>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit}>
              <Text style={styles.btnText}>
                {isToPay ? 'Continue to Pre-Pay' : 'Request Motorbike Rider'}
              </Text>
            </TouchableOpacity>
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
  subtitle: { fontSize: 14, color: '#475569', marginTop: 4, marginBottom: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, gap: 10, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginTop: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#FFF',
  },
  row: { flexDirection: 'row', gap: 10, marginTop: 6 },
  uploadBtn: {
    flex: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#2563EB',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  uploadDone: { backgroundColor: '#DBEAFE', borderStyle: 'solid' },
  uploadText: { color: '#1D4ED8', fontWeight: '600', fontSize: 13 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  fareBox: { backgroundColor: '#F1F5F9', padding: 12, borderRadius: 10, marginTop: 6, gap: 4 },
  fareText: { fontSize: 13, color: '#334155' },
  fareTotal: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginTop: 4 },
  primaryBtn: { backgroundColor: '#16A34A', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontWeight: '700',
    fontSize: 12,
  },
  info: { fontSize: 14, color: '#334155' },
  otpBox: { backgroundColor: '#ECFDF5', padding: 14, borderRadius: 10, alignItems: 'center', marginVertical: 8 },
  otpLabel: { fontSize: 12, color: '#065F46', fontWeight: '600' },
  otpValue: { fontSize: 28, fontWeight: '800', color: '#047857', letterSpacing: 6, marginTop: 4 },
});
