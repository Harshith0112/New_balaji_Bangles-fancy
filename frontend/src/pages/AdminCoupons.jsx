import { useEffect, useState } from 'react';
import { adminCreateCoupon, adminDeleteCoupon, adminGetCoupons, adminUpdateCoupon } from '../api';

function formatDate(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('en-IN', { dateStyle: 'medium' });
  } catch {
    return '—';
  }
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    code: '',
    description: '',
    discountType: 'percent',
    discountValue: '10',
    minOrderAmount: '0',
    maxDiscountAmount: '0',
    enabled: true,
    expiresAt: '',
    usageLimit: '0',
  });

  const load = () => {
    setLoading(true);
    adminGetCoupons()
      .then(setCoupons)
      .catch(() => setCoupons([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setEditing(null);
    setForm({
      code: '',
      description: '',
      discountType: 'percent',
      discountValue: '10',
      minOrderAmount: '0',
      maxDiscountAmount: '0',
      enabled: true,
      expiresAt: '',
      usageLimit: '0',
    });
    setError('');
  };

  const openEdit = (c) => {
    setEditing(c._id);
    setForm({
      code: c.code || '',
      description: c.description || '',
      discountType: c.discountType || 'percent',
      discountValue: String(c.discountValue ?? ''),
      minOrderAmount: String(c.minOrderAmount ?? 0),
      maxDiscountAmount: String(c.maxDiscountAmount ?? 0),
      enabled: c.enabled !== false,
      expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 16) : '',
      usageLimit: String(c.usageLimit ?? 0),
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        code: form.code.trim(),
        description: form.description.trim(),
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        minOrderAmount: Number(form.minOrderAmount) || 0,
        maxDiscountAmount: Number(form.maxDiscountAmount) || 0,
        enabled: form.enabled,
        expiresAt: form.expiresAt || null,
        usageLimit: Number(form.usageLimit) || 0,
      };
      if (editing) {
        await adminUpdateCoupon(editing, payload);
      } else {
        await adminCreateCoupon(payload);
      }
      resetForm();
      load();
    } catch (err) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this coupon?')) return;
    try {
      await adminDeleteCoupon(id);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl min-w-0">
      <h1 className="font-display text-xl sm:text-2xl font-bold text-rose-800 mb-6">Coupons</h1>
      <p className="text-gray-600 text-sm mb-6">
        Customers can apply these codes on the checkout review step. Discounts are shown on invoices and order confirmations.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-rose-100 p-5 mb-8 space-y-4 shadow-sm"
      >
        <h2 className="font-semibold text-gray-800">{editing ? 'Edit coupon' : 'New coupon'}</h2>
        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
            <input
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
              className="w-full border border-rose-200 rounded-lg px-3 py-2 text-sm uppercase"
              placeholder="SAVE10"
              required
              disabled={!!editing}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full border border-rose-200 rounded-lg px-3 py-2 text-sm"
              placeholder="Festive sale"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Discount type</label>
            <select
              value={form.discountType}
              onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value }))}
              className="w-full border border-rose-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="percent">Percent off</option>
              <option value="fixed">Fixed ₹ off</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {form.discountType === 'percent' ? 'Percent (1–100)' : 'Amount (₹)'}
            </label>
            <input
              type="number"
              min="0"
              max={form.discountType === 'percent' ? 100 : undefined}
              step={form.discountType === 'percent' ? 1 : 0.01}
              value={form.discountValue}
              onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
              className="w-full border border-rose-200 rounded-lg px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Minimum order (₹)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.minOrderAmount}
              onChange={(e) => setForm((f) => ({ ...f, minOrderAmount: e.target.value }))}
              className="w-full border border-rose-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max discount (₹, percent only; 0 = no cap)</label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.maxDiscountAmount}
              onChange={(e) => setForm((f) => ({ ...f, maxDiscountAmount: e.target.value }))}
              className="w-full border border-rose-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expires (optional)</label>
            <input
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              className="w-full border border-rose-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usage limit (0 = unlimited)</label>
            <input
              type="number"
              min="0"
              value={form.usageLimit}
              onChange={(e) => setForm((f) => ({ ...f, usageLimit: e.target.value }))}
              className="w-full border border-rose-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="coupon-enabled"
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
              className="rounded border-rose-300 text-rose-600"
            />
            <label htmlFor="coupon-enabled" className="text-sm text-gray-700">
              Enabled
            </label>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : editing ? 'Update coupon' : 'Create coupon'}
          </button>
          {editing && (
            <button type="button" onClick={resetForm} className="px-4 py-2 rounded-xl border border-gray-300 text-sm font-medium">
              Cancel edit
            </button>
          )}
        </div>
      </form>

      {loading ? (
        <p className="text-gray-500">Loading coupons…</p>
      ) : (
        <div className="bg-white rounded-2xl border border-rose-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-cream-100 border-b border-rose-100">
                <tr>
                  <th className="p-3 font-semibold text-gray-700">Code</th>
                  <th className="p-3 font-semibold text-gray-700">Discount</th>
                  <th className="p-3 font-semibold text-gray-700">Min ₹</th>
                  <th className="p-3 font-semibold text-gray-700">Uses</th>
                  <th className="p-3 font-semibold text-gray-700">Expires</th>
                  <th className="p-3 font-semibold text-gray-700">Active</th>
                  <th className="p-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-gray-500">
                      No coupons yet. Create one above.
                    </td>
                  </tr>
                ) : (
                  coupons.map((c) => (
                    <tr key={c._id} className="border-b border-rose-50 hover:bg-rose-50/40">
                      <td className="p-3 font-mono font-semibold">{c.code}</td>
                      <td className="p-3">
                        {c.discountType === 'percent'
                          ? `${c.discountValue}%`
                          : `₹${Number(c.discountValue).toFixed(2)}`}
                      </td>
                      <td className="p-3">{c.minOrderAmount > 0 ? `₹${c.minOrderAmount}` : '—'}</td>
                      <td className="p-3">
                        {c.usageLimit > 0 ? `${c.usedCount ?? 0} / ${c.usageLimit}` : `${c.usedCount ?? 0}`}
                      </td>
                      <td className="p-3 text-gray-600">{formatDate(c.expiresAt)}</td>
                      <td className="p-3">{c.enabled !== false ? 'Yes' : 'No'}</td>
                      <td className="p-3 space-x-2">
                        <button type="button" onClick={() => openEdit(c)} className="text-rose-600 font-medium hover:underline">
                          Edit
                        </button>
                        <button type="button" onClick={() => handleDelete(c._id)} className="text-red-600 font-medium hover:underline">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
