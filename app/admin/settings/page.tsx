'use client';

import { useState } from 'react';
import { Save, RefreshCw, Shield, Globe, Database } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminSettingsPage() {
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    siteName: 'ExamKaro',
    siteDescription: "India's Best Mock Test Platform",
    maintenanceMode: false,
    freeTestLimit: 5,
    registrationEnabled: true,
    defaultNegativeMarking: 0.25,
    supportEmail: 'support@examkaro.com',
    razorpayEnabled: true,
  });

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise(r => setTimeout(r, 800));
    toast.success('Settings saved successfully');
    setSaving(false);
  };

  const Field = ({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) => (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-surface-100 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-semibold text-surface-800">{label}</p>
        {description && <p className="text-xs text-surface-500 mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!value)}
      className={`w-11 h-6 rounded-full transition-colors relative ${value ? 'bg-brand-500' : 'bg-surface-300'}`}
    >
      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${value ? 'left-6' : 'left-1'}`} />
    </button>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-display font-bold text-surface-900">Settings</h1>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
          <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid gap-5">
        {/* General */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={16} className="text-brand-500" />
            <h2 className="font-semibold text-surface-800">General Settings</h2>
          </div>
          <Field label="Site Name" description="Displayed in browser tab and emails">
            <input
              value={settings.siteName}
              onChange={e => setSettings(p => ({ ...p, siteName: e.target.value }))}
              className="input-base text-sm w-48"
            />
          </Field>
          <Field label="Support Email" description="Where user support requests go">
            <input
              value={settings.supportEmail}
              onChange={e => setSettings(p => ({ ...p, supportEmail: e.target.value }))}
              className="input-base text-sm w-48"
              type="email"
            />
          </Field>
          <Field label="Maintenance Mode" description="Disables the site for non-admins">
            <Toggle value={settings.maintenanceMode} onChange={v => setSettings(p => ({ ...p, maintenanceMode: v }))} />
          </Field>
          <Field label="New Registrations" description="Allow new users to sign up">
            <Toggle value={settings.registrationEnabled} onChange={v => setSettings(p => ({ ...p, registrationEnabled: v }))} />
          </Field>
        </div>

        {/* Test Settings */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Database size={16} className="text-brand-500" />
            <h2 className="font-semibold text-surface-800">Test Settings</h2>
          </div>
          <Field label="Default Negative Marking" description="Applied when not specified per test">
            <input
              type="number" step="0.25" min="0" max="2"
              value={settings.defaultNegativeMarking}
              onChange={e => setSettings(p => ({ ...p, defaultNegativeMarking: parseFloat(e.target.value) }))}
              className="input-base text-sm w-28"
            />
          </Field>
          <Field label="Free Test Limit" description="Max free tests a guest user can preview">
            <input
              type="number" min="0" max="50"
              value={settings.freeTestLimit}
              onChange={e => setSettings(p => ({ ...p, freeTestLimit: parseInt(e.target.value) }))}
              className="input-base text-sm w-28"
            />
          </Field>
        </div>

        {/* Payment */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-brand-500" />
            <h2 className="font-semibold text-surface-800">Payment Settings</h2>
          </div>
          <Field label="Razorpay Payments" description="Enable/disable payment gateway">
            <Toggle value={settings.razorpayEnabled} onChange={v => setSettings(p => ({ ...p, razorpayEnabled: v }))} />
          </Field>
          <Field label="Razorpay Key ID" description="Set in environment variables (.env.local)">
            <span className="text-xs text-surface-400 bg-surface-100 px-3 py-2 rounded-lg font-mono">
              {process.env.NEXT_PUBLIC_APP_URL ? 'Configured via ENV' : 'RAZORPAY_KEY_ID'}
            </span>
          </Field>
        </div>

        {/* Danger zone */}
        <div className="card p-5 border-danger-200">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-danger-500" />
            <h2 className="font-semibold text-danger-700">Danger Zone</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-surface-800">Clear Attempt Cache</p>
              <p className="text-xs text-surface-500">Clears expired in-progress attempts older than 24 hours</p>
            </div>
            <button className="flex items-center gap-2 text-sm border border-danger-200 text-danger-600 hover:bg-danger-50 px-3 py-1.5 rounded-lg transition-colors">
              <RefreshCw size={13} /> Run Cleanup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
