import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { calculateMotorbikeFare, CargoTerminal, RequestStatus } from '@cargo/shared';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

interface UserSession {
  id: string;
  name: string;
  phone: string;
}

interface RequestEventItem {
  id: string;
  status: RequestStatus;
  note?: string;
  createdAt: string;
}

interface CustomerRequestItem {
  id: string;
  biltyNumber: string;
  status: RequestStatus;
  isToPay: boolean;
  toPayAmount: number;
  toPayPrepaid: boolean;
  totalPayable: number;
  dropoffAddress: string;
  deliveryOtp: string;
  terminal: CargoTerminal;
  rider?: {
    id: string;
    name: string;
    phone: string;
    riderProfile?: { plateNumber: string };
  } | null;
  events: RequestEventItem[];
}

export default function App() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [phone, setPhone] = useState('03001234567');
  const [name, setName] = useState('Usman (Islamabad)');
  const [authLoading, setAuthLoading] = useState(false);

  const [terminals, setTerminals] = useState<CargoTerminal[]>([]);
  const [selectedTerminalId, setSelectedTerminalId] = useState<string>('');
  const [biltyNumber, setBiltyNumber] = useState('');
  const [itemNotes, setItemNotes] = useState('');
  const [biltyUpload, setBiltyUpload] = useState<{ key: string; uri: string } | null>(null);
  const [idFrontUpload, setIdFrontUpload] = useState<{ key: string; uri: string } | null>(null);
  const [idBackUpload, setIdBackUpload] = useState<{ key: string; uri: string } | null>(null);

  const [isToPay, setIsToPay] = useState(false);
  const [toPayAmount, setToPayAmount] = useState('0');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [distanceKm, setDistanceKm] = useState('6');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [requests, setRequests] = useState<CustomerRequestItem[]>([]);
  const [tab, setTab] = useState<'new' | 'track'>('new');

  const fare = calculateMotorbikeFare({
    distanceKm: Number(distanceKm) || 1,
    toPayAmount: isToPay ? Number(toPayAmount) || 0 : 0,
  });

  useEffect(() => {
    fetch(`${API_URL}/terminals`)
      .then((r) => r.json())
      .then((data: CargoTerminal[]) => {
        setTerminals(data);
        if (data.length > 0) setSelectedTerminalId(data[0].id);
      })
      .catch(() => setErrorMsg('Could not load terminals from API'));
  }, []);

  const loadMyRequests = async (customerId: string) => {
    try {
      const res = await fetch(`${API_URL}/requests/customer/${customerId}`);
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch {
      // ignore transient poll error
    }
  };

  useEffect(() => {
    if (!user) return;
    loadMyRequests(user.id);
    const timer = setInterval(() => loadMyRequests(user.id), 4000);
    return () => clearInterval(timer);
  }, [user]);

  const handleLogin = async () => {
    setErrorMsg('');
    setAuthLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), name: name.trim(), role: 'customer' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Login failed');
      setUser(data.user);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const pickAndUpload = async (
    prefix: string,
    setter: (val: { key: string; uri: string }) => void,
  ) => {
    setErrorMsg('');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.6,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const dataUrl = asset.base64
      ? `data:${asset.mimeType ?? 'image/jpeg'};base64,${asset.base64}`
      : asset.uri;

    try {
      const res = await fetch(`${API_URL}/storage/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, prefix }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Upload failed');
      setter({ key: data.objectKey, uri: asset.uri });
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Image upload failed');
    }
  };

  const handleCreateRequest = async () => {
    if (!user) return;
    if (!selectedTerminalId || !biltyNumber.trim() || !dropoffAddress.trim()) {
      setErrorMsg('Please select a terminal, enter Bilty #, and drop-off address.');
      return;
    }
    if (!biltyUpload || !idFrontUpload || !idBackUpload) {
      setErrorMsg('Please upload Bilty photo and both sides of your ID card (CNIC).');
      return;
    }
    setErrorMsg('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: user.id,
          terminalId: selectedTerminalId,
          biltyNumber: biltyNumber.trim(),
          biltyImageKey: biltyUpload.key,
          idCardFrontKey: idFrontUpload.key,
          idCardBackKey: idBackUpload.key,
          itemNotes: itemNotes.trim() || undefined,
          isToPay,
          toPayAmount: isToPay ? Number(toPayAmount) || 0 : 0,
          dropoffAddress: dropoffAddress.trim(),
          dropoffLat: 33.6844,
          dropoffLng: 73.0479,
          distanceKm: Number(distanceKm) || 6,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Could not create request');
      setBiltyNumber('');
      setItemNotes('');
      setDropoffAddress('');
      setBiltyUpload(null);
      setIdFrontUpload(null);
      setIdBackUpload(null);
      await loadMyRequests(user.id);
      setTab('track');
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmToPay = async (requestId: string) => {
    if (!user) return;
    await fetch(`${API_URL}/requests/${requestId}/confirm-topay`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerId: user.id }),
    });
    await loadMyRequests(user.id);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.title}>CargoUser — Islamabad / Pindi</Text>
          <Text style={styles.subtitle}>Sign in with your phone to request a cargo pickup.</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Your Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} />
            <Text style={styles.label}>Phone Number</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            {!!errorMsg && <Text style={styles.error}>{errorMsg}</Text>}
            <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin} disabled={authLoading}>
              {authLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Continue</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>CargoUser</Text>
            <Text style={styles.subtitle}>Hi {user.name} • {user.phone}</Text>
          </View>
          <TouchableOpacity onPress={() => setUser(null)}>
            <Text style={styles.linkText}>Switch User</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'new' && styles.tabActive]}
            onPress={() => setTab('new')}
          >
            <Text style={[styles.tabText, tab === 'new' && styles.tabTextActive]}>New Pickup</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'track' && styles.tabActive]}
            onPress={() => setTab('track')}
          >
            <Text style={[styles.tabText, tab === 'track' && styles.tabTextActive]}>
              My Requests ({requests.length})
            </Text>
          </TouchableOpacity>
        </View>

        {!!errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

        {tab === 'new' ? (
          <View style={styles.card}>
            <Text style={styles.label}>1. Select Cargo Terminal (Islamabad / Pindi)</Text>
            <View style={styles.terminalList}>
              {terminals.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.terminalChip, selectedTerminalId === t.id && styles.terminalChipActive]}
                  onPress={() => setSelectedTerminalId(t.id)}
                >
                  <Text
                    style={[
                      styles.terminalChipText,
                      selectedTerminalId === t.id && styles.terminalChipTextActive,
                    ]}
                  >
                    {t.name}
                  </Text>
                  <Text style={styles.terminalCity}>{t.city}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>2. Bilty Number & Parcel Notes</Text>
            <TextInput
              style={styles.input}
              value={biltyNumber}
              onChangeText={setBiltyNumber}
              placeholder="e.g. BLT-9021"
            />
            <TextInput
              style={styles.input}
              value={itemNotes}
              onChangeText={setItemNotes}
              placeholder="Parcel details (e.g. 1 small carton, fragile)"
            />

            <Text style={styles.label}>3. Upload Bilty & ID Card (CNIC)</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.uploadBtn, biltyUpload && styles.uploadDone]}
                onPress={() => pickAndUpload('bilty', setBiltyUpload)}
              >
                {biltyUpload && <Image source={{ uri: biltyUpload.uri }} style={styles.thumb} />}
                <Text style={styles.uploadText}>{biltyUpload ? 'Bilty Ready' : '+ Bilty Photo'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.uploadBtn, idFrontUpload && styles.uploadDone]}
                onPress={() => pickAndUpload('cnic-front', setIdFrontUpload)}
              >
                {idFrontUpload && <Image source={{ uri: idFrontUpload.uri }} style={styles.thumb} />}
                <Text style={styles.uploadText}>{idFrontUpload ? 'CNIC Front' : '+ CNIC Front'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.uploadBtn, idBackUpload && styles.uploadDone]}
                onPress={() => pickAndUpload('cnic-back', setIdBackUpload)}
              >
                {idBackUpload && <Image source={{ uri: idBackUpload.uri }} style={styles.thumb} />}
                <Text style={styles.uploadText}>{idBackUpload ? 'CNIC Back' : '+ CNIC Back'}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.label}>Unpaid To-Pay Bilty? (Pre-pay in app)</Text>
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

            <Text style={styles.label}>4. Drop-off Address & Approx. Distance (km)</Text>
            <TextInput
              style={styles.input}
              value={dropoffAddress}
              onChangeText={setDropoffAddress}
              placeholder="House / Shop #, Sector (e.g. G-10/4 Islamabad)"
            />
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={distanceKm}
              onChangeText={setDistanceKm}
              placeholder="Distance in km"
            />

            <View style={styles.fareBox}>
              <Text style={styles.fareText}>
                Motorbike Delivery Fee: Rs. {fare.baseFare + fare.distanceFare + fare.serviceFee}
              </Text>
              {isToPay && <Text style={styles.fareText}>To-Pay Pre-payment: Rs. {fare.toPayAmount}</Text>}
              <Text style={styles.fareTotal}>Total Payable: Rs. {fare.totalPayable}</Text>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateRequest} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.btnText}>
                  {isToPay ? 'Create & Proceed to Pre-Pay' : 'Request Motorbike Rider'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {requests.length === 0 && (
              <View style={styles.card}>
                <Text style={styles.info}>No cargo pickup requests yet.</Text>
              </View>
            )}
            {requests.map((req) => (
              <View key={req.id} style={styles.card}>
                <View style={styles.headerRow}>
                  <Text style={styles.cardTitle}>Bilty #{req.biltyNumber}</Text>
                  <Text style={styles.badge}>{req.status.replace('_', ' ').toUpperCase()}</Text>
                </View>
                <Text style={styles.info}>Terminal: {req.terminal.name}</Text>
                <Text style={styles.info}>Drop-off: {req.dropoffAddress}</Text>
                <Text style={styles.info}>Total Payable: Rs. {req.totalPayable}</Text>

                {req.rider && (
                  <View style={styles.riderBox}>
                    <Text style={styles.riderTitle}>Assigned Rider: {req.rider.name}</Text>
                    <Text style={styles.info}>
                      Phone: {req.rider.phone} • Plate: {req.rider.riderProfile?.plateNumber ?? 'N/A'}
                    </Text>
                  </View>
                )}

                {req.status === 'pending_payment' && (
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => handleConfirmToPay(req.id)}
                  >
                    <Text style={styles.btnText}>
                      Pre-Pay Rs. {req.totalPayable} & Broadcast to Riders
                    </Text>
                  </TouchableOpacity>
                )}

                {req.status !== 'pending_payment' && req.status !== 'delivered' && (
                  <View style={styles.otpBox}>
                    <Text style={styles.otpLabel}>Delivery Handover OTP (Share with Rider on arrival)</Text>
                    <Text style={styles.otpValue}>{req.deliveryOtp}</Text>
                  </View>
                )}

                <View style={styles.timeline}>
                  {req.events.map((ev) => (
                    <Text key={ev.id} style={styles.timelineItem}>
                      • {ev.status.replace('_', ' ')} — {ev.note}
                    </Text>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { padding: 20, maxWidth: 680, width: '100%', alignSelf: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#475569', marginTop: 2, marginBottom: 12 },
  linkText: { color: '#2563EB', fontWeight: '600', fontSize: 13 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tabBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#0F172A' },
  tabText: { fontWeight: '600', color: '#334155' },
  tabTextActive: { color: '#FFF' },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, gap: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginTop: 4 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, fontSize: 14, backgroundColor: '#FFF' },
  terminalList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  terminalChip: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 10, minWidth: '47%', flex: 1 },
  terminalChipActive: { borderColor: '#16A34A', backgroundColor: '#ECFDF5' },
  terminalChipText: { fontSize: 12, fontWeight: '700', color: '#0F172A' },
  terminalChipTextActive: { color: '#047857' },
  terminalCity: { fontSize: 11, color: '#64748B', marginTop: 2 },
  row: { flexDirection: 'row', gap: 8, marginTop: 4 },
  uploadBtn: {
    flex: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#2563EB',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 6,
  },
  uploadDone: { backgroundColor: '#EFF6FF', borderStyle: 'solid' },
  uploadText: { color: '#1D4ED8', fontWeight: '600', fontSize: 12, textAlign: 'center' },
  thumb: { width: 44, height: 44, borderRadius: 6 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  fareBox: { backgroundColor: '#F1F5F9', padding: 12, borderRadius: 10, gap: 4 },
  fareText: { fontSize: 13, color: '#334155' },
  fareTotal: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginTop: 4 },
  primaryBtn: { backgroundColor: '#16A34A', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  badge: {
    backgroundColor: '#FEF3C7',
    color: '#92400E',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontWeight: '700',
    fontSize: 11,
  },
  info: { fontSize: 13, color: '#334155' },
  riderBox: { backgroundColor: '#EFF6FF', padding: 10, borderRadius: 8 },
  riderTitle: { fontSize: 13, fontWeight: '700', color: '#1E40AF' },
  otpBox: { backgroundColor: '#ECFDF5', padding: 12, borderRadius: 10, alignItems: 'center' },
  otpLabel: { fontSize: 12, color: '#065F46', fontWeight: '600' },
  otpValue: { fontSize: 26, fontWeight: '800', color: '#047857', letterSpacing: 6, marginTop: 2 },
  timeline: { marginTop: 4, gap: 3 },
  timelineItem: { fontSize: 12, color: '#64748B' },
  error: { color: '#DC2626', fontSize: 13, fontWeight: '600', marginBottom: 6 },
});
