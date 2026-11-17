import React from 'react';

export default function AdminDashboard() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 32, maxWidth: 960, margin: '0 auto' }}>
      <h1>Cargo Pickup — Operations Admin</h1>
      <p style={{ color: '#475569' }}>
        Manage Motorbike Rider KYC approvals, Cargo Terminals, and live Bilty pickup requests.
      </p>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 24 }}>
        <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 13, color: '#64748B' }}>Pending Rider KYC</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>4</div>
        </div>
        <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 13, color: '#64748B' }}>Active Cargo Pickups</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>12</div>
        </div>
        <div style={{ border: '1px solid #E2E8F0', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 13, color: '#64748B' }}>Cargo Terminals</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>8</div>
        </div>
      </section>
    </main>
  );
}
