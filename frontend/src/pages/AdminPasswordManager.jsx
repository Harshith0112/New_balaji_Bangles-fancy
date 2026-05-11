import { useState } from 'react';
import { adminChangePassword } from '../api';

export default function AdminPasswordManager() {
  const [form, setForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.oldPassword || !form.newPassword || !form.confirmPassword) {
      setError('Please fill all fields');
      return;
    }
    if (form.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirm password do not match');
      return;
    }

    setSaving(true);
    try {
      const out = await adminChangePassword(form.oldPassword, form.newPassword);
      setSuccess(out?.message || 'Password changed successfully');
      setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl min-w-0">
      <h1 className="font-display text-xl sm:text-2xl font-bold text-rose-800 mb-2">Password Manager</h1>
      <p className="text-gray-600 text-sm mb-6">Change your admin password by entering your current password.</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-rose-100 p-5 sm:p-6 shadow-sm space-y-4">
        {error ? (
          <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>
        ) : null}
        {success ? (
          <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{success}</div>
        ) : null}

        <div>
          <label htmlFor="old-password" className="block text-sm font-medium text-gray-700 mb-1">
            Old password
          </label>
          <input
            id="old-password"
            type="password"
            value={form.oldPassword}
            onChange={(e) => onChange('oldPassword', e.target.value)}
            className="w-full border border-rose-200 rounded-lg px-3 py-2 text-sm"
            required
            autoComplete="current-password"
          />
        </div>

        <div>
          <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            value={form.newPassword}
            onChange={(e) => onChange('newPassword', e.target.value)}
            className="w-full border border-rose-200 rounded-lg px-3 py-2 text-sm"
            minLength={6}
            required
            autoComplete="new-password"
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            value={form.confirmPassword}
            onChange={(e) => onChange('confirmPassword', e.target.value)}
            className="w-full border border-rose-200 rounded-lg px-3 py-2 text-sm"
            minLength={6}
            required
            autoComplete="new-password"
          />
        </div>

        <div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 disabled:opacity-50"
          >
            {saving ? 'Updating...' : 'Update password'}
          </button>
        </div>
      </form>
    </div>
  );
}
