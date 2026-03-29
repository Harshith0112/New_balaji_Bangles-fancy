import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getOrdersByPhone } from '../api';

const PHONE_KEY = 'nbf-customer-phone';

function normalizeDigits(s) {
  return String(s || '').replace(/\D/g, '').slice(0, 15);
}

function statusLabel(status) {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'confirmed':
      return 'Confirmed';
    case 'packed':
      return 'Packed';
    case 'shipped':
      return 'Shipped';
    case 'returned':
      return 'Returned';
    case 'cancelled':
      return 'Cancelled';
    case 'completed':
      return 'Confirmed';
    default:
      return 'Pending';
  }
}

function statusBadgeClass(status) {
  switch (status) {
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'returned':
      return 'bg-orange-100 text-orange-900';
    case 'shipped':
      return 'bg-green-100 text-green-800';
    case 'packed':
      return 'bg-amber-100 text-amber-800';
    case 'confirmed':
    case 'completed':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-sky-100 text-sky-800';
  }
}

export default function MyOrders() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState(() => {
    try {
      return normalizeDigits(localStorage.getItem(PHONE_KEY) || '');
    } catch {
      return '';
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState([]);

  const canLoad = useMemo(() => phone && phone.length >= 10, [phone]);

  useEffect(() => {
    if (!canLoad) {
      navigate('/customer-login', { replace: true });
      return;
    }

    setLoading(true);
    setError('');
    getOrdersByPhone(phone)
      .then((data) => setOrders(data.orders || []))
      .catch((e) => setError(e.message || 'Failed to load orders'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- phone is fixed from initial storage
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-rose-800">My Orders</h1>
          <p className="text-sm text-gray-600 mt-1">Phone: <span className="font-mono">{phone || '—'}</span></p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/customer-login')}
          className="px-4 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 transition text-sm font-medium"
        >
          Change phone
        </button>
      </div>

      {loading && <p className="text-gray-600">Loading orders…</p>}
      {error && <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl text-sm">{error}</div>}

      {!loading && !error && orders.length === 0 && (
        <div className="bg-white rounded-2xl border border-rose-100 p-5 shadow-sm">
          <p className="text-gray-700 font-medium">No orders found for this phone yet.</p>
          <p className="text-gray-600 text-sm mt-2">Place an online order to see it here.</p>
          <div className="mt-4">
            <Link to="/shop" className="text-rose-600 font-medium hover:underline">Go to shop</Link>
          </div>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o._id} className="bg-white rounded-2xl border border-rose-100 p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">Order ID</p>
                  <p className="font-mono text-lg font-bold text-gray-900">{o.orderId}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {o.createdAt ? new Date(o.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                  </p>
                </div>
                <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${statusBadgeClass(o.status)}`}>
                  {statusLabel(o.status)}
                </span>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="text-sm text-gray-700">
                  Total: <span className="font-semibold text-gray-900">₹{Number(o.total).toFixed(2)}</span>
                </div>
                <div className="text-sm">
                  <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${o.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                    {o.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/track?order=${encodeURIComponent(o.orderId)}`}
                  className="px-4 py-2 rounded-xl bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 transition"
                >
                  Track
                </Link>
                {o.trackingNumber || o.shippingCarrier ? (
                  <div className="px-4 py-2 rounded-xl border border-teal-200 bg-teal-50 text-teal-900 text-sm font-medium space-y-1">
                    {o.trackingNumber ? (
                      <div>
                        Tracking: <span className="font-mono">{o.trackingNumber}</span>
                      </div>
                    ) : null}
                    {o.shippingCarrier ? <div className="text-teal-800">Shipped by: {o.shippingCarrier}</div> : null}
                  </div>
                ) : (
                  <div className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-medium">
                    Tracking available after shipment
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

