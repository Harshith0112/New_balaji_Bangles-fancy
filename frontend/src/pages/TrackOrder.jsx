import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { trackOrder } from '../api';

function normalizeOrderId(s) {
  return String(s || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
}

const STATUS_STEPS = [
  { status: 'pending', label: 'Order received', description: 'We have your order details.' },
  { status: 'confirmed', label: 'Confirmed', description: 'Your order has been confirmed.' },
  { status: 'packed', label: 'Packed', description: 'Items are packed and ready for dispatch.' },
  { status: 'shipped', label: 'Shipped', description: 'Your parcel is on the way.' },
];

function statusStepIndex(status) {
  if (status === 'cancelled' || status === 'returned') return -2;
  const i = STATUS_STEPS.findIndex((s) => s.status === status);
  return i >= 0 ? i : 0;
}

export default function TrackOrder() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [value, setValue] = useState(() => searchParams.get('order') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const lookupOrder = async (raw) => {
    const q = normalizeOrderId(raw);
    if (!q) {
      setError('Enter your order number.');
      setResult(null);
      return;
    }
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const data = await trackOrder(q);
      setResult(data);
      // Keep the input aligned with the server's canonical orderId format.
      if (data?.orderId) setValue(String(data.orderId));
      setSearchParams({ order: data.orderId }, { replace: true });
    } catch (e) {
      setError(e.message || 'Could not find this order.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fromUrl = searchParams.get('order');
    if (!fromUrl?.trim()) return;
    lookupOrder(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on load when ?order= is present
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    lookupOrder(value);
  };

  const idx = result ? statusStepIndex(result.status) : -1;
  const isCancelled = result?.status === 'cancelled';
  const isReturned = result?.status === 'returned';

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
      <h1 className="font-display text-3xl font-bold text-rose-800 text-center mb-2">Track your order</h1>
      {/* Order lookup is driven by URL query param: ?order=NB00012026 */}

      {error && (
        <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-rose-100 p-5 md:p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">Order ID</p>
                <p className="font-mono text-xl font-bold text-gray-900">{result.orderId}</p>
                {result.customerName && (
                  <p className="text-sm text-gray-600 mt-1">Customer: {result.customerName}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Payment</p>
                <span
                  className={`inline-block mt-1 px-2.5 py-1 rounded-lg text-sm font-medium ${
                    result.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {result.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                </span>
              </div>
            </div>

            {isCancelled ? (
              <div className="rounded-xl bg-red-50 border border-red-200 text-red-900 px-4 py-3 text-sm font-medium">
                This order has been cancelled. For questions, contact us.
              </div>
            ) : isReturned ? (
              <div className="rounded-xl bg-orange-50 border border-orange-200 text-orange-950 px-4 py-3 text-sm font-medium">
                This order has been marked as returned. For refunds or questions, contact us.
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 mb-4">Progress</p>
                <ol className="relative space-y-0 py-0">
                  {/* Vertical timeline line centered behind the dots */}
                  <div
                    className="absolute left-[10px] top-[10px] bottom-[42px] w-0.5 bg-rose-100 z-0"
                    aria-hidden="true"
                  />
                  {STATUS_STEPS.map((step, i) => {
                    const done = i <= idx;
                    const current = i === idx;
                    return (
                      <li key={step.status} className="pb-6 last:pb-0 relative">
                        <span
                          className={`absolute left-0 top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 text-xs font-bold relative z-10 ${
                            done
                              ? 'border-rose-500 bg-rose-500 text-white'
                              : 'border-rose-200 bg-white text-transparent'
                          }`}
                        >
                          {done ? '✓' : ''}
                        </span>

                        <div className="pl-10">
                          <p className={`font-semibold ${current ? 'text-rose-800' : done ? 'text-gray-800' : 'text-gray-400'}`}>
                            {step.label}
                          </p>
                          <p className="text-sm text-gray-600">{step.description}</p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {(result.status === 'shipped' || result.status === 'completed') && (
              <div className="mt-6 rounded-xl bg-teal-50 border border-teal-100 px-4 py-3 space-y-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-teal-800 mb-1">Tracking ID</p>
                  {result.trackingNumber ? (
                    <p className="font-mono text-sm text-teal-900 break-all">{result.trackingNumber}</p>
                  ) : (
                    <p className="text-sm text-teal-800/90">Tracking details will appear here once added by our team.</p>
                  )}
                </div>
                {result.shippingCarrier ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-teal-800 mb-1">Delivered by</p>
                    <p className="text-sm text-teal-900 font-medium">{result.shippingCarrier}</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <p className="text-center text-sm text-gray-500">
            Ordered on{' '}
            {result.createdAt ? new Date(result.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
          </p>
        </div>
      )}

      <div className="mt-10 text-center space-y-3">
        <Link to="/shop" className="text-rose-600 font-medium hover:underline">
          Continue shopping
        </Link>
        <p className="text-sm text-gray-500">
          Need help? Please contact us through the <Link to="/contact" className="text-rose-600 hover:underline font-medium">Contact</Link> page.
        </p>
      </div>
    </div>
  );
}
