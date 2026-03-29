import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAppSelector } from '../store/hooks';
import { getCartAvailabilityIssues } from '../utils/cartAvailability';

export default function Cart() {
  const { items, count, updateQty, removeItem } = useCart();
  const allProducts = useAppSelector((s) => s.siteData.allProducts);
  const catalogRevision = useAppSelector((s) => s.siteData.catalogRevision);
  const catalogReady = useAppSelector((s) => s.siteData.status === 'succeeded');

  const lineIssues = useMemo(() => {
    if (!catalogReady) {
      return items.map((item) => ({ item, ok: true, message: '' }));
    }
    return getCartAvailabilityIssues(items, allProducts);
  }, [items, allProducts, catalogRevision, catalogReady]);
  const cartBlocked = catalogReady && lineIssues.some((x) => !x.ok);

  if (count === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-rose-800 mb-4">Your Cart</h1>
        <p className="text-gray-600 mb-6">Your cart is empty.</p>
        <Link to="/shop" className="inline-block bg-rose-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-rose-600 transition">
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-rose-800 mb-8">Your Cart</h1>
      {cartBlocked && (
        <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl text-sm">
          Some items are out of stock or no longer available. Remove or change them to continue checkout.
        </div>
      )}
      <ul className="space-y-4 mb-8">
        {lineIssues.map(({ item, ok, message }) => (
          <li
            key={`${item.productId}-${JSON.stringify(item.selectedOptions)}`}
            className={`flex gap-4 bg-white rounded-xl border p-4 ${ok ? 'border-rose-100' : 'border-red-200 bg-red-50/50'}`}
          >
            <div className="flex-1 min-w-0">
              {!ok && (
                <p className="text-sm font-medium text-red-700 mb-1">{message}</p>
              )}
              <p className="font-semibold text-gray-800">{item.name}</p>
              {item.nbfCode && <p className="text-xs text-gray-500">NBF: {item.nbfCode}</p>}
              {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                <p className="text-sm text-gray-600">
                  {Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(', ')}
                </p>
              )}
              <p className="text-rose-600 font-bold mt-1">₹{item.price}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateQty(item.productId, item.selectedOptions, item.quantity - 1)}
                className="w-8 h-8 rounded-lg border border-rose-200 text-rose-600 font-medium hover:bg-rose-50"
              >
                −
              </button>
              <span className="w-8 text-center font-medium">{item.quantity}</span>
              <button
                type="button"
                onClick={() => updateQty(item.productId, item.selectedOptions, item.quantity + 1)}
                className="w-8 h-8 rounded-lg border border-rose-200 text-rose-600 font-medium hover:bg-rose-50"
              >
                +
              </button>
            </div>
            <p className="w-20 text-right font-semibold">₹{item.price * item.quantity}</p>
            <button
              type="button"
              onClick={() => removeItem(item.productId, item.selectedOptions)}
              className="text-red-600 hover:underline text-sm"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link to="/shop" className="text-rose-600 font-semibold hover:underline">
          ← Continue Shopping
        </Link>
        {cartBlocked ? (
          <span className="inline-flex items-center px-6 py-3 rounded-xl font-semibold bg-gray-200 text-gray-500 cursor-not-allowed">
            Proceed to Checkout
          </span>
        ) : (
          <Link
            to="/checkout/delivery"
            className="bg-rose-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-rose-600 transition"
          >
            Proceed to Checkout
          </Link>
        )}
      </div>
    </div>
  );
}
