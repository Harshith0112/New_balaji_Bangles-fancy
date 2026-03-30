import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  clearCustomerToken,
  customerAddAddress,
  customerDeleteAddress,
  customerMe,
  customerOrderDetail,
  customerOrders,
  getCustomerToken,
} from '../api';
import { formatOrderItemOptionsLine } from '../utils/orderItemOptions';

function normalizeDigits(s) {
  return String(s || '').replace(/\D/g, '').slice(0, 15);
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
    default:
      return status || 'Pending';
  }
}

export default function CustomerAccount() {
  const navigate = useNavigate();
  const token = getCustomerToken();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  const [label, setLabel] = useState('');
  const [doorNo, setDoorNo] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [landmark, setLandmark] = useState('');
  const [pincode, setPincode] = useState('');
  const [state, setState] = useState('');

  const [viewOrderDetail, setViewOrderDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  /** Mobile-only: collapsible “Add address” panel */
  const [mobileAddAddressOpen, setMobileAddAddressOpen] = useState(false);

  const canSubmit = useMemo(
    () => doorNo.trim() && street.trim() && city.trim() && pincode.trim() && state.trim(),
    [doorNo, street, city, pincode, state]
  );

  useEffect(() => {
    if (!token) {
      navigate('/customer/account/login', { replace: true });
      return;
    }

    setLoading(true);
    setError('');
    Promise.all([customerMe(), customerOrders()])
      .then(([me, ordersOut]) => {
        setProfile(me.customer || null);
        setOrders(ordersOut.orders || []);
      })
      .catch((e) => setError(e.message || 'Failed to load account'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once
  }, []);

  useEffect(() => {
    if (!viewOrderDetail) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setViewOrderDetail(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [viewOrderDetail]);

  const handleLogout = () => {
    clearCustomerToken();
    // After logout, always return to the store home page.
    navigate('/', { replace: true });
  };

  const refreshOrdersAndProfile = async () => {
    try {
      const [me, ordersOut] = await Promise.all([customerMe(), customerOrders()]);
      setProfile(me.customer || null);
      setOrders(ordersOut.orders || []);
    } catch (e) {
      setError(e.message || 'Failed to refresh');
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    setError('');
    if (!canSubmit) return;
    const payload = {
      label: label.trim(),
      doorNo: doorNo.trim(),
      street: street.trim(),
      city: city.trim(),
      landmark: landmark.trim(),
      pincode: pincode.trim(),
      state: state.trim(),
    };
    try {
      await customerAddAddress(payload);
      setLabel('');
      setDoorNo('');
      setStreet('');
      setCity('');
      setLandmark('');
      setPincode('');
      setState('');
      setMobileAddAddressOpen(false);
      await refreshOrdersAndProfile();
    } catch (err) {
      setError(err.message || 'Failed to add address');
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!confirm('Delete this address?')) return;
    setError('');
    try {
      await customerDeleteAddress(id);
      await refreshOrdersAndProfile();
    } catch (err) {
      setError(err.message || 'Failed to delete address');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <p className="text-gray-600">Loading account…</p>
      </div>
    );
  }

  return (
    <div className="max-w-md md:max-w-4xl mx-auto px-3 md:px-4 py-10 md:py-14">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-rose-800">My Account</h1>
          <p className="text-sm text-gray-600 mt-1">Profile, addresses, and order history.</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 transition text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </div>

      {error && <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl text-sm">{error}</div>}

      <div className="grid md:grid-cols-2 gap-4 md:gap-6 items-start">
        <div className="bg-white rounded-2xl border border-rose-100 p-4 md:p-5">
          <h2 className="font-display text-xl font-bold text-rose-800 mb-4">Profile</h2>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">Name</span>
              <span className="font-medium">{profile?.name || '—'}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-gray-500">Phone</span>
              <span className="font-mono font-medium">{profile?.phone || '—'}</span>
            </div>
          </div>

          {profile?.addresses?.length ? (
            <div className="mt-5">
              <h3 className="font-display text-sm font-bold text-rose-800 mb-3">Saved addresses</h3>
              <div className="space-y-3">
                {profile.addresses.map((a) => (
                  <div key={a._id} className="border border-rose-100 rounded-xl p-3 bg-cream-50">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {a.label ? (
                          <p className="text-xs font-semibold text-rose-700">{a.label}</p>
                        ) : (
                          <p className="text-xs font-semibold text-rose-700">Address</p>
                        )}
                        <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                          {[
                            a.doorNo,
                            a.street,
                            a.landmark,
                            a.city,
                          ]
                            .map((x) => String(x || '').trim())
                            .filter(Boolean)
                            .join(', ') || a.address}
                        </p>
                        <p className="mt-2 text-sm text-gray-600">
                          Pincode: {a.pincode} · State: {a.state}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteAddress(a._id)}
                        className="text-xs px-3 py-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 transition font-medium shrink-0"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="bg-white rounded-2xl border border-rose-100 p-5">
          <button
            type="button"
            id="add-address-toggle"
            aria-expanded={mobileAddAddressOpen}
            aria-controls="add-address-panel"
            onClick={() => setMobileAddAddressOpen((o) => !o)}
            className="md:hidden w-full flex items-center justify-between gap-3 text-left py-1 -mt-1 mb-2 rounded-xl hover:bg-rose-50/80 transition px-1 -mx-1"
          >
            <span className="font-display text-xl font-bold text-rose-800">Add Address</span>
            <span className="text-rose-600 text-lg leading-none shrink-0" aria-hidden="true">
              {mobileAddAddressOpen ? '▲' : '▼'}
            </span>
          </button>
          <h2 className="hidden md:block font-display text-xl font-bold text-rose-800 mb-4">Add Address</h2>
          <div
            id="add-address-panel"
            role="region"
            aria-label="Add a new delivery address"
            className={`${mobileAddAddressOpen ? 'block' : 'hidden'} md:block`}
          >
          <form onSubmit={handleAddAddress} className="space-y-4">
            <div>
              <label htmlFor="label" className="block text-sm font-medium text-gray-700 mb-1">
                Label (optional)
              </label>
              <input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Home / Office"
                className="w-full border border-rose-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address details
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="doorNo" className="block text-xs font-medium text-gray-600 mb-1">
                    Door no <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="doorNo"
                    value={doorNo}
                    onChange={(e) => setDoorNo(e.target.value)}
                    placeholder="e.g. 12-3-45"
                    className="w-full border border-rose-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                  />
                </div>
                <div>
                  <label htmlFor="street" className="block text-xs font-medium text-gray-600 mb-1">
                    Street <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="street"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="Street name"
                    className="w-full border border-rose-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                  />
                </div>
                <div>
                  <label htmlFor="city" className="block text-xs font-medium text-gray-600 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Hyderabad"
                    className="w-full border border-rose-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                  />
                </div>
                <div>
                  <label htmlFor="landmark" className="block text-xs font-medium text-gray-600 mb-1">
                    Landmark (optional)
                  </label>
                  <input
                    id="landmark"
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="Near ..."
                    className="w-full border border-rose-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pincode" className="block text-sm font-medium text-gray-700 mb-1">
                  Pincode
                </label>
                <input
                  id="pincode"
                  value={pincode}
                  onChange={(e) => setPincode(normalizeDigits(e.target.value).slice(0, 8))}
                  className="w-full border border-rose-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full border border-rose-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full bg-rose-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-rose-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add address
            </button>
          </form>
          </div>
        </div>
      </div>

      {orders.length > 0 ? (
        <div className="mt-6 bg-white rounded-2xl border border-rose-100 p-4 md:p-5">
          <h2 className="font-display text-xl font-bold text-rose-800 mb-4">Order history</h2>
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o._id} className="border border-rose-100 rounded-xl p-4 bg-cream-50">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">Order ID</p>
                    <p className="font-mono text-lg font-bold text-gray-900">{o.orderId}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {o.createdAt
                        ? new Date(o.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
                        : '—'}
                    </p>
                    <p className="text-sm font-semibold text-gray-800 mt-1">
                      Total: ₹{Number(o.total || 0).toFixed(2)}
                    </p>
                  </div>
                  <span
                    className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${statusBadgeClass(o.status)}`}
                  >
                    {statusLabel(o.status)}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      setError('');
                      setDetailLoading(true);
                      setViewOrderDetail({ loading: true });
                      try {
                        const { order: detail } = await customerOrderDetail(o._id);
                        setViewOrderDetail(detail);
                      } catch {
                        setViewOrderDetail(null);
                        setError('Could not load order details.');
                      } finally {
                        setDetailLoading(false);
                      }
                    }}
                    disabled={detailLoading}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    View order
                  </button>
                  <Link
                    to={`/track?order=${encodeURIComponent(o.orderId)}`}
                    className="px-4 py-2 rounded-xl bg-rose-500 text-white text-sm font-medium hover:bg-rose-600 transition"
                  >
                    Track
                  </Link>
                  {o.trackingNumber || o.shippingCarrier ? (
                    <span className="px-4 py-2 rounded-xl border border-teal-200 bg-teal-50 text-teal-900 text-sm font-medium space-y-1 inline-flex flex-col items-start">
                      {o.trackingNumber ? (
                        <span>
                          Tracking: <span className="font-mono">{o.trackingNumber}</span>
                        </span>
                      ) : null}
                      {o.shippingCarrier ? (
                        <span className="text-teal-800">Shipped by: {o.shippingCarrier}</span>
                      ) : null}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {viewOrderDetail && viewOrderDetail.loading && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-busy="true"
        >
          <div className="bg-white rounded-2xl shadow-xl p-8 text-gray-600">Loading order…</div>
        </div>
      )}

      {viewOrderDetail && !viewOrderDetail.loading && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="customer-order-detail-title"
          onClick={() => setViewOrderDetail(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-rose-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-rose-100 flex items-start justify-between gap-2">
              <div>
                <h2 id="customer-order-detail-title" className="font-display text-lg font-bold text-rose-800">
                  Order details
                </h2>
                <p className="font-mono text-sm font-semibold text-gray-900 mt-1">{viewOrderDetail.orderId}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {viewOrderDetail.createdAt
                    ? new Date(viewOrderDetail.createdAt).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })
                    : '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewOrderDetail(null)}
                className="text-gray-400 hover:text-gray-700 text-2xl leading-none p-1"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex flex-wrap gap-2 text-sm">
                <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${statusBadgeClass(viewOrderDetail.status)}`}>
                  {statusLabel(viewOrderDetail.status)}
                </span>
                <span
                  className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${
                    viewOrderDetail.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Payment: {viewOrderDetail.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                </span>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-700 mb-2">Items</h3>
                <ul className="divide-y divide-rose-100 border border-rose-100 rounded-xl overflow-hidden">
                  {(viewOrderDetail.items || []).map((item, idx) => {
                    const optionsLine = formatOrderItemOptionsLine(item.selectedOptions);
                    return (
                    <li key={idx} className="p-3 flex gap-3 items-start bg-cream-50/50">
                      <img
                        src={item.image || 'https://placehold.co/64x64/fce7f3/9f1239?text=•'}
                        alt=""
                        className="w-16 h-16 rounded-lg object-cover bg-cream-100 shrink-0 border border-rose-100"
                        loading="lazy"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        {optionsLine ? (
                          <p className="text-xs text-rose-700 mt-0.5">{optionsLine}</p>
                        ) : null}
                        <p className="text-sm text-gray-600">
                          ₹{Number(item.price).toFixed(2)} × {item.quantity}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900 shrink-0 self-center">₹{Number(item.lineTotal).toFixed(2)}</p>
                    </li>
                    );
                  })}
                </ul>
              </div>

              <div className="rounded-xl border border-rose-100 bg-cream-50 p-4 text-sm space-y-2">
                <div className="flex justify-between text-gray-700">
                  <span>Items subtotal</span>
                  <span className="font-medium">₹{Number(viewOrderDetail.itemsSubtotal || 0).toFixed(2)}</span>
                </div>
                {Number(viewOrderDetail.couponDiscount) > 0 ? (
                  <div className="flex justify-between text-emerald-800">
                    <span>
                      Coupon
                      {viewOrderDetail.couponCode ? ` (${viewOrderDetail.couponCode})` : ''}
                    </span>
                    <span className="font-medium">−₹{Number(viewOrderDetail.couponDiscount).toFixed(2)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-rose-100">
                  <span>Order amount {Number(viewOrderDetail.couponDiscount) > 0 ? '(after discount)' : ''}</span>
                  <span>₹{Number(viewOrderDetail.itemsTotal || 0).toFixed(2)}</span>
                </div>
                {Number(viewOrderDetail.shippingCharge) > 0 ? (
                  <div className="flex justify-between text-gray-700">
                    <span>Shipping</span>
                    <span>₹{Number(viewOrderDetail.shippingCharge).toFixed(2)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between text-base font-bold text-rose-700 pt-2 border-t border-rose-200">
                  <span>Grand total</span>
                  <span>₹{Number(viewOrderDetail.grandTotal || 0).toFixed(2)}</span>
                </div>
              </div>

              {viewOrderDetail.delivery &&
                (viewOrderDetail.delivery.address || viewOrderDetail.delivery.pincode || viewOrderDetail.delivery.state) && (
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-700 mb-2">Delivery</h3>
                    <div className="text-sm text-gray-700 rounded-xl border border-rose-100 p-3 bg-white">
                      {viewOrderDetail.delivery.address ? (
                        <p className="whitespace-pre-wrap">{viewOrderDetail.delivery.address}</p>
                      ) : null}
                      <p className="text-gray-600 mt-1">
                        {[viewOrderDetail.delivery.pincode, viewOrderDetail.delivery.state].filter(Boolean).join(' · ') || null}
                      </p>
                    </div>
                  </div>
                )}

              <Link
                to={`/track?order=${encodeURIComponent(viewOrderDetail.orderId)}`}
                className="block text-center text-sm text-rose-600 font-medium hover:underline"
                onClick={() => setViewOrderDetail(null)}
              >
                Track this order →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

