'use client';

import React, { useEffect, useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface RiderRow {
  id: string;
  userId: string;
  cnicNumber: string;
  licenseNumber: string;
  plateNumber: string;
  kycStatus: 'pending' | 'approved' | 'rejected';
  user: { name: string; phone: string };
}

interface RequestRow {
  id: string;
  biltyNumber: string;
  status: string;
  totalPayable: number;
  isToPay: boolean;
  toPayAmount: number;
  dropoffAddress: string;
  terminal: { name: string; city: string };
  customer: { name: string; phone: string };
  rider?: { name: string; phone: string } | null;
  docAccessLogs: { id: string; viewedAt: string }[];
}

interface TerminalRow {
  id: string;
  name: string;
  city: string;
  address: string;
}

export default function AdminDashboard() {
  const [riders, setRiders] = useState<RiderRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [terminals, setTerminals] = useState<TerminalRow[]>([]);
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('Islamabad');
  const [newAddress, setNewAddress] = useState('');

  const loadAll = async () => {
    try {
      const [rRes, reqRes, tRes] = await Promise.all([
        fetch(`${API_URL}/riders`),
        fetch(`${API_URL}/requests`),
        fetch(`${API_URL}/terminals`),
      ]);
      if (rRes.ok) setRiders(await rRes.json());
      if (reqRes.ok) setRequests(await reqRes.json());
      if (tRes.ok) setTerminals(await tRes.json());
    } catch {
      // ignore transient error
    }
  };

  useEffect(() => {
    loadAll();
    const timer = setInterval(loadAll, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleKycDecision = async (userId: string, status: 'approved' | 'rejected') => {
    await fetch(`${API_URL}/riders/${userId}/kyc-status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await loadAll();
  };

  const handleAddTerminal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newAddress.trim()) return;
    await fetch(`${API_URL}/terminals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName.trim(),
        city: newCity.trim(),
        address: newAddress.trim(),
        lat: 33.6844,
        lng: 73.0479,
      }),
    });
    setNewName('');
    setNewAddress('');
    await loadAll();
  };

  const pendingKycCount = riders.filter((r) => r.kycStatus === 'pending').length;
  const activeReqCount = requests.filter((r) => r.status !== 'delivered' && r.status !== 'cancelled').length;

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 32, maxWidth: 1100, margin: '0 auto', color: '#0F172A' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>Cargo Pickup — Operations Admin (Islamabad / Pindi)</h1>
          <p style={{ color: '#475569', marginTop: 4 }}>
            Live Rider KYC approvals, Bilty pickup requests, document access audit logs, and cargo terminals.
          </p>
        </div>
        <button onClick={loadAll} style={btnSecondary}>Refresh</button>
      </div>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 20 }}>
        <div style={statCard}>
          <div style={{ fontSize: 13, color: '#64748B' }}>Pending Rider KYC</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{pendingKycCount}</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 13, color: '#64748B' }}>Active Cargo Pickups</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{activeReqCount}</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 13, color: '#64748B' }}>Cargo Terminals</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{terminals.length}</div>
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Rider KYC Queue ({riders.length})</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {riders.length === 0 && <p style={{ color: '#64748B' }}>No riders registered yet.</p>}
          {riders.map((r) => (
            <div key={r.id} style={rowCard}>
              <div>
                <strong>{r.user.name}</strong> ({r.user.phone}) • Plate: <code>{r.plateNumber}</code>
                <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>
                  CNIC: {r.cnicNumber} • License: {r.licenseNumber} • Status:{' '}
                  <strong>{r.kycStatus.toUpperCase()}</strong>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {r.kycStatus !== 'approved' && (
                  <button onClick={() => handleKycDecision(r.userId, 'approved')} style={btnApprove}>
                    Approve
                  </button>
                )}
                {r.kycStatus !== 'rejected' && (
                  <button onClick={() => handleKycDecision(r.userId, 'rejected')} style={btnReject}>
                    Reject
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Cargo Pickup Requests & ID Access Audit ({requests.length})</h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {requests.length === 0 && <p style={{ color: '#64748B' }}>No cargo requests yet.</p>}
          {requests.map((req) => (
            <div key={req.id} style={rowCard}>
              <div>
                <strong>Bilty #{req.biltyNumber}</strong> — {req.terminal.name} → {req.dropoffAddress}
                <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>
                  Customer: {req.customer.name} ({req.customer.phone}) • Rider:{' '}
                  {req.rider ? `${req.rider.name} (${req.rider.phone})` : 'Unassigned'}
                </div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                  Total: Rs. {req.totalPayable} {req.isToPay ? `(includes Rs. ${req.toPayAmount} To-Pay)` : ''} •
                  ID/Bilty Views Logged: <strong>{req.docAccessLogs.length}</strong>
                </div>
              </div>
              <span style={statusBadge}>{req.status.replace('_', ' ').toUpperCase()}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h2>Islamabad & Rawalpindi Cargo Terminals ({terminals.length})</h2>
        <form onSubmit={handleAddTerminal} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            placeholder="Terminal Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            style={inputStyle}
          />
          <input
            placeholder="City"
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
            style={{ ...inputStyle, maxWidth: 160 }}
          />
          <input
            placeholder="Address"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            style={inputStyle}
          />
          <button type="submit" style={btnApprove}>Add Terminal</button>
        </form>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {terminals.map((t) => (
            <div key={t.id} style={statCard}>
              <strong>{t.name}</strong>
              <div style={{ fontSize: 13, color: '#475569' }}>{t.city} — {t.address}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

const statCard: React.CSSProperties = {
  border: '1px solid #E2E8F0',
  borderRadius: 12,
  padding: 16,
  background: '#FFF',
};

const rowCard: React.CSSProperties = {
  border: '1px solid #E2E8F0',
  borderRadius: 12,
  padding: 14,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: '#FFF',
};

const btnApprove: React.CSSProperties = {
  background: '#16A34A',
  color: '#FFF',
  border: 'none',
  borderRadius: 8,
  padding: '8px 14px',
  fontWeight: 600,
  cursor: 'pointer',
};

const btnReject: React.CSSProperties = {
  background: '#DC2626',
  color: '#FFF',
  border: 'none',
  borderRadius: 8,
  padding: '8px 14px',
  fontWeight: 600,
  cursor: 'pointer',
};

const btnSecondary: React.CSSProperties = {
  background: '#0F172A',
  color: '#FFF',
  border: 'none',
  borderRadius: 8,
  padding: '8px 14px',
  fontWeight: 600,
  cursor: 'pointer',
};

const statusBadge: React.CSSProperties = {
  background: '#FEF3C7',
  color: '#92400E',
  padding: '4px 10px',
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 700,
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  border: '1px solid #CBD5E1',
  borderRadius: 8,
  padding: '8px 12px',
  fontSize: 14,
};
