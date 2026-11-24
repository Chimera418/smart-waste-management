import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [msg, setMsg] = useState('');

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    await api.patch('/auth/profile', { name, phone, address });
    await refreshUser();
    setMsg('Profile saved.');
  };

  return (
    <div className="max-w-xl space-y-5">
      <div className="border-b border-[#E2E0D5] pb-5">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#14533C]">
          Account Settings
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#141917]">Profile</h1>
        <p className="mt-1 text-sm text-[#5C6460]">
          Update your contact details and default address for waste reports and email notifications.
        </p>
      </div>

      {msg && (
        <div className="rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-2.5 text-sm font-medium text-[#065F46]">
          {msg}
        </div>
      )}

      <form onSubmit={handleSave} className="civic-card space-y-4 p-6">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#141917]">Registered Email</label>
          <input
            disabled
            value={user?.email || ''}
            className="civic-input cursor-not-allowed bg-[#F5F4EF] font-mono text-[#5C6460]"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#141917]">Full Name</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} className="civic-input" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#141917]">Phone Number</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="civic-input" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#141917]">Default Street Address</label>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="14 MG Road, Bengaluru" className="civic-input" />
        </div>
        <button className="civic-btn-primary px-5 py-2">Save Changes</button>
      </form>
    </div>
  );
}
