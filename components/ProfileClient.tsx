'use client';

import { useState } from 'react';
import Image from 'next/image';
import { User, Mail, Phone, Crown, Camera, Save, Shield } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import toast from 'react-hot-toast';
import type { User as UserType } from '@/types';
import dayjs from 'dayjs';

export function ProfileClient({ user }: { user: UserType }) {
  const { refreshUser } = useAuth();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      await refreshUser();
      toast.success('Profile updated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-surface-900 mb-6">My Profile</h1>

      <div className="grid gap-5">
        {/* Avatar & Plan */}
        <div className="card p-5 flex items-center gap-5">
          <div className="relative">
            {user.avatar ? (
              <Image src={user.avatar} alt={user.name} width={72} height={72} className="rounded-full" />
            ) : (
              <div className="w-18 h-18 w-[72px] h-[72px] bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-bold text-2xl">
                {user.name[0]}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-surface-900 text-lg">{user.name}</h2>
            <p className="text-surface-500 text-sm">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`badge ${user.plan === 'premium' ? 'badge-premium' : 'bg-surface-100 text-surface-500'}`}>
                {user.plan === 'premium' ? <><Crown size={10} /> Premium</> : 'Free Plan'}
              </span>
              {user.planExpiry && user.plan === 'premium' && (
                <span className="text-xs text-surface-400">
                  Expires {dayjs(user.planExpiry).format('DD MMM YYYY')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="card p-5">
          <h3 className="font-semibold text-surface-800 mb-4">Edit Profile</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Full Name</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input-base pl-9 text-sm"
                  placeholder="Your name"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Email</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input value={user.email} disabled className="input-base pl-9 text-sm bg-surface-50 text-surface-400 cursor-not-allowed" />
              </div>
              <p className="text-xs text-surface-400 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-surface-700 mb-1">Phone Number</label>
              <div className="relative">
                <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="input-base pl-9 text-sm"
                  placeholder="+91 XXXXXXXX"
                  type="tel"
                />
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2 text-sm"
            >
              <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Security */}
        <div className="card p-5">
          <h3 className="font-semibold text-surface-800 mb-3 flex items-center gap-2">
            <Shield size={15} className="text-brand-500" /> Security
          </h3>
          <div className="space-y-3 text-sm text-surface-600">
            <div className="flex items-center justify-between py-2 border-b border-surface-100">
              <span>Login Method</span>
              <span className="font-medium">Google OAuth</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-surface-100">
              <span>Member Since</span>
              <span className="font-medium">{dayjs(user.createdAt).format('MMMM YYYY')}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span>Account Role</span>
              <span className="font-medium capitalize">{user.role}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
