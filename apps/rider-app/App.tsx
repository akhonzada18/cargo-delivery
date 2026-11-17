import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CargoTerminal, KycStatus, RequestStatus, SecureDocumentPayload } from '@cargo/shared';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

interface RiderUser {
  id: string;
  name: string;
  phone: string;
}

interface RiderProfileData {
  kycStatus: KycStatus;
  plateNumber: string;
  cnicNumber: string;
}

interface AvailableJob {
  id: string;
  terminal: CargoTerminal;
  dropoffAddress: string;
  deliveryFee: number;
  isToPay: boolean;
  toPayAmount: number;
  itemNotes?: string;
}

interface ActiveJob {
  id: string;
  biltyNumber: string;
  status: RequestStatus;
  dropoffAddress: string;
  deliveryFee: number;
  terminal: CargoTerminal;
  customer?: { name: string; phone: string };
}

export default function App() {
  const [user, setUser] = useState<RiderUser | null>(null);
  const [phone, setPhone] = useState('03129876543');
  const [name, setName] = useState('Ali Raza (Rider)');
  const [authLoading, setAuthLoading] = useState(false);

  const [profile, setProfile] = useState<RiderProfileData | null>(null);
  const [cnicNumber, setCnicNumber] = useState('61101-1234567-1');
  const [licenseNumber, setLicenseNumber] = useState('ISB-DL-88412');
  const [plateNumber, setPlateNumber] = useState('RIL-4421');
  const [cnicKey, setCnicKey] = useState('');
  const [selfieKey, setSelfieKey] = useState('');

  const [availableJobs, setAvailableJobs] = useState<AvailableJob[]>([]);
  const [activeJob, setActiveJob] = useState<ActiveJob | null>(null);
  const [secureDocs, setSecureDocs] = useState<SecureDocumentPayload | null>(null);
  const [pickupProofKey, setPickupProofKey] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const refreshRiderState = async (riderId: string) => {
    try {
      const profRes = await fetch(`${API_URL}/riders/profile/${riderId}`);
      if (profRes.ok) {
        const profText = await profRes.text();
        setProfile(profText ? JSON.parse(profText) : null);
      }

      const myJobsRes = await fetch(`${API_URL}/requests/rider/${riderId}`);
      if (myJobsRes.ok) {
        const myJobs: ActiveJob[] = await myJobsRes.json();
        const current = myJobs.find((j) => j.status !== 'delivered' && j.status !== 'cancelled') ?? null;
        setActiveJob(current);
      }

      const availRes = await fetch(`${API_URL}/requests/available`);
      if (availRes.ok) {
        setAvailableJobs(await availRes.json());
      }
    } catch {
      // ignore transient poll error
    }
  };

  useEffect(() => {
    if (!user) return;
    refreshRiderState(user.id);
    const timer = setInterval(() => refreshRiderState(user.id), 4000);
    return () => clearInterval(timer);
  }, [user]);

  const handleLogin = async () => {
    setErrorMsg('');
    setAuthLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), name: name.trim(), role: 'rider' }),
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

  const pickAndUpload = async (prefix: string, onDone: (key: string) => void) => {
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
      onDone(data.objectKey);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Upload failed');
    }
  };

  const handleSubmitKyc = async () => {
    if (!user) return;
    setErrorMsg('');
    try {
      const res = await fetch(`${API_URL}/riders/kyc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          cnicNumber,
          licenseNumber,
          plateNumber,
          cnicFrontKey: cnicKey || 'demo-rider-cnic',
          selfieKey: selfieKey || 'demo-rider-selfie',
        }),
      });
      if (!res.ok) throw new Error('KYC submission failed');
      await refreshRiderState(user.id);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'KYC failed');
    }
  };

  const handleAcceptJob = async (jobId: string) => {
    if (!user) return;
    setErrorMsg('');
    const res = await fetch(`${API_URL}/requests/${jobId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ riderId: user.id }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorMsg(data.message ?? 'Could not accept job');
      return;
    }
    await refreshRiderState(user.id);
  };

  const handleAtTerminal = async () => {
    if (!user || !activeJob) return;
    await fetch(`${API_URL}/requests/${activeJob.id}/at-terminal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ riderId: user.id }),
    });
    await refreshRiderState(user.id);
  };

  const handleLoadSecureDocs = async () => {
    if (!user || !activeJob) return;
    setErrorMsg('');
    const res = await fetch(`${API_URL}/requests/${activeJob.id}/secure-documents/${user.id}`);
    const data = await res.json();
    if (!res.ok) {
      setErrorMsg(data.message ?? 'Cannot load secure documents');
      return;
    }
    setSecureDocs(data);
  };

  const handleConfirmPickup = async () => {
    if (!user || !activeJob) return;
    setErrorMsg('');
    const res = await fetch(`${API_URL}/requests/${activeJob.id}/pickup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        riderId: user.id,
        pickupProofKey: pickupProofKey || 'pickup-proof-photo',
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      setErrorMsg(data.message ?? 'Pickup confirmation failed');
      return;
    }
    setSecureDocs(null);
    setPickupProofKey('');
    await refreshRiderState(user.id);
  };

  const handleCompleteDelivery = async () => {
    if (!user || !activeJob) return;
    setErrorMsg('');
    const res = await fetch(`${API_URL}/requests/${activeJob.id}/deliver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ riderId: user.id, otp: otpInput.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorMsg(data.message ?? 'Invalid OTP');
      return;
    }
    setOtpInput('');
    await refreshRiderState(user.id);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <Text style={styles.title}>CargoRider — Motorbike</Text>
          <Text style={styles.subtitle}>Sign in to view Islamabad & Rawalpindi pickup jobs.</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Rider Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} />
            <Text style={styles.label}>Phone Number</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            {!!errorMsg && <Text style={styles.error}>{errorMsg}</Text>}
            <TouchableOpacity style={styles.primaryBtn} onPress={handleLogin} disabled={authLoading}>
              {authLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Continue as Rider</Text>}
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
            <Text style={styles.title}>CargoRider</Text>
            <Text style={styles.subtitle}>
              {user.name} • KYC: {profile ? profile.kycStatus.toUpperCase() : 'NOT SUBMITTED'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setUser(null)}>
            <Text style={styles.linkText}>Switch Rider</Text>
          </TouchableOpacity>
        </View>

        {!!errorMsg && <Text style={styles.error}>{errorMsg}</Text>}

        {!profile ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Complete Rider KYC</Text>
            <Text style={styles.info}>Submit your details for Admin approval before accepting cargo.</Text>
            <Text style={styles.label}>CNIC Number</Text>
            <TextInput style={styles.input} value={cnicNumber} onChangeText={setCnicNumber} />
            <Text style={styles.label}>Driving License #</Text>
            <TextInput style={styles.input} value={licenseNumber} onChangeText={setLicenseNumber} />
            <Text style={styles.label}>Motorbike Plate #</Text>
            <TextInput style={styles.input} value={plateNumber} onChangeText={setPlateNumber} />
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.uploadBtn, !!cnicKey && styles.uploadDone]}
                onPress={() => pickAndUpload('rider-cnic', setCnicKey)}
              >
                <Text style={styles.uploadText}>{cnicKey ? 'CNIC Uploaded' : '+ Upload CNIC'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.uploadBtn, !!selfieKey && styles.uploadDone]}
                onPress={() => pickAndUpload('rider-selfie', setSelfieKey)}
              >
                <Text style={styles.uploadText}>{selfieKey ? 'Selfie Uploaded' : '+ Upload Selfie'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmitKyc}>
              <Text style={styles.btnText}>Submit KYC for Approval</Text>
            </TouchableOpacity>
          </View>
        ) : profile.kycStatus !== 'approved' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>KYC Status: {profile.kycStatus.toUpperCase()}</Text>
            <Text style={styles.info}>
              Open Admin Web (http://localhost:3000) and click Approve for {user.name}. This screen updates automatically.
            </Text>
          </View>
        ) : activeJob ? (
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.cardTitle}>Active Job • Bilty #{activeJob.biltyNumber}</Text>
              <Text style={styles.badge}>{activeJob.status.replace('_', ' ').toUpperCase()}</Text>
            </View>
            <Text style={styles.info}>Terminal: {activeJob.terminal.name}</Text>
            <Text style={styles.info}>Address: {activeJob.terminal.address}</Text>
            <Text style={styles.info}>Drop-off: {activeJob.dropoffAddress}</Text>
            {activeJob.customer && (
              <Text style={styles.info}>
                Customer: {activeJob.customer.name} ({activeJob.customer.phone})
              </Text>
            )}
            <Text style={styles.payout}>Delivery Payout: Rs. {activeJob.deliveryFee}</Text>

            {activeJob.status === 'accepted' && (
              <TouchableOpacity style={styles.primaryBtn} onPress={handleAtTerminal}>
                <Text style={styles.btnText}>Mark Arrived at Cargo Terminal</Text>
              </TouchableOpacity>
            )}

            {activeJob.status === 'at_terminal' && (
              <View style={styles.section}>
                <TouchableOpacity style={styles.secBtn} onPress={handleLoadSecureDocs}>
                  <Text style={styles.btnText}>Show Secure Bilty & ID to Cargo Counter</Text>
                </TouchableOpacity>

                {secureDocs && (
                  <View style={styles.secureViewer}>
                    <Text style={styles.watermark}>{secureDocs.watermarkText}</Text>
                    <Text style={styles.docLabel}>Bilty #{secureDocs.biltyNumber}</Text>
                    <Image source={{ uri: secureDocs.biltyImageUrl }} style={styles.docImage} resizeMode="contain" />
                    <Text style={styles.docLabel}>Customer CNIC (Front & Back)</Text>
                    <Image source={{ uri: secureDocs.idCardFrontUrl }} style={styles.docImage} resizeMode="contain" />
                    <Image source={{ uri: secureDocs.idCardBackUrl }} style={styles.docImage} resizeMode="contain" />
                    <Text style={styles.watermark}>
                      Expires at {new Date(secureDocs.expiresAt).toLocaleTimeString()} • Revoked on pickup
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.uploadBtn, !!pickupProofKey && styles.uploadDone]}
                  onPress={() => pickAndUpload('pickup-proof', setPickupProofKey)}
                >
                  <Text style={styles.uploadText}>
                    {pickupProofKey ? 'Pickup Photo Ready' : '+ Upload Received Cargo Photo'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.primaryBtn} onPress={handleConfirmPickup}>
                  <Text style={styles.btnText}>Confirm Cargo Received & Revoke ID Access</Text>
                </TouchableOpacity>
              </View>
            )}

            {activeJob.status === 'picked_up' && (
              <View style={styles.section}>
                <Text style={styles.label}>Enter Customer 4-Digit Delivery OTP</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  maxLength={4}
                  value={otpInput}
                  onChangeText={setOtpInput}
                  placeholder="4-digit OTP"
                />
                <TouchableOpacity style={styles.primaryBtn} onPress={handleCompleteDelivery}>
                  <Text style={styles.btnText}>Verify OTP & Complete Delivery</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <Text style={styles.sectionTitle}>Available Cargo Pickups ({availableJobs.length})</Text>
            {availableJobs.length === 0 && (
              <View style={styles.card}>
                <Text style={styles.info}>No open pickup jobs right now. Create one in CargoUser (port 8081).</Text>
              </View>
            )}
            {availableJobs.map((job) => (
              <View key={job.id} style={styles.card}>
                <Text style={styles.cardTitle}>{job.terminal.name}</Text>
                <Text style={styles.info}>Drop-off: {job.dropoffAddress}</Text>
                {!!job.itemNotes && <Text style={styles.info}>Notes: {job.itemNotes}</Text>}
                <Text style={styles.info}>
                  To-Pay: {job.isToPay ? `Rs. ${job.toPayAmount} (Pre-paid by Customer)` : 'Already Paid'}
                </Text>
                <Text style={styles.payout}>Your Payout: Rs. {job.deliveryFee}</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => handleAcceptJob(job.id)}>
                  <Text style={styles.btnText}>Accept Pickup Job</Text>
                </TouchableOpacity>
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
  subtitle: { fontSize: 13, color: '#16A34A', fontWeight: '600', marginBottom: 14 },
  linkText: { color: '#2563EB', fontWeight: '600', fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 16, gap: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  info: { fontSize: 13, color: '#334155' },
  payout: { fontSize: 17, fontWeight: '800', color: '#15803D', marginVertical: 2 },
  badge: {
    backgroundColor: '#DBEAFE',
    color: '#1E40AF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    fontWeight: '700',
    fontSize: 11,
  },
  row: { flexDirection: 'row', gap: 8 },
  uploadBtn: {
    flex: 1,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#2563EB',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  uploadDone: { backgroundColor: '#EFF6FF', borderStyle: 'solid' },
  uploadText: { color: '#1D4ED8', fontWeight: '600', fontSize: 12 },
  section: { gap: 10, marginTop: 6 },
  primaryBtn: { backgroundColor: '#16A34A', borderRadius: 12, padding: 14, alignItems: 'center' },
  secBtn: { backgroundColor: '#2563EB', borderRadius: 12, padding: 14, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  secureViewer: { backgroundColor: '#0F172A', borderRadius: 12, padding: 14, gap: 10, alignItems: 'center' },
  watermark: { color: '#FACC15', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  docLabel: { color: '#E2E8F0', fontSize: 12, fontWeight: '700', alignSelf: 'flex-start' },
  docImage: { width: '100%', height: 180, borderRadius: 8, backgroundColor: '#1E293B' },
  label: { fontSize: 13, fontWeight: '600', color: '#334155' },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, fontSize: 14, backgroundColor: '#FFF' },
  error: { color: '#DC2626', fontSize: 13, fontWeight: '600', marginBottom: 6 },
});
