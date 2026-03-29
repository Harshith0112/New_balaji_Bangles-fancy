import { Link, useParams } from 'react-router-dom';

export default function OrderPlaced() {
  const { orderId } = useParams();
  const decodedOrderId = orderId ? String(orderId) : '';

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
      <h1 className="font-display text-3xl font-bold text-rose-800 text-center mb-2">Order placed!</h1>
      <p className="text-center text-gray-600 text-sm mb-8">
        Keep this Order ID for tracking.
      </p>

      <div className="bg-white rounded-2xl border border-rose-100 p-6 shadow-sm mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-rose-600 mb-1">Order ID</p>
        <p className="font-mono text-2xl font-bold text-gray-900">{decodedOrderId}</p>
        <p className="text-sm text-gray-600 mt-3">
          Status will update as our team processes your order.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        <Link
          to={`/track?order=${encodeURIComponent(decodedOrderId)}`}
          className="bg-rose-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-rose-600 transition inline-flex items-center justify-center"
        >
          Track order
        </Link>
        <Link
          to="/my-orders"
          className="px-8 py-3 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 transition inline-flex items-center justify-center font-semibold"
        >
          My orders
        </Link>
        <Link
          to="/shop"
          className="px-8 py-3 rounded-xl bg-cream-100 border border-rose-100 text-rose-800 hover:bg-cream-200 transition inline-flex items-center justify-center font-semibold"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}

