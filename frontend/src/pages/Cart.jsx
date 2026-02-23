import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function Cart() {
  const { items, count, updateQty, removeItem } = useCart();

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
      <ul className="space-y-4 mb-8">
        {items.map((item) => (
          <li key={`${item.productId}-${JSON.stringify(item.selectedOptions)}`} className="flex gap-4 bg-white rounded-xl border border-rose-100 p-4">
            <div className="flex-1 min-w-0">
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
        <Link
          to="/checkout"
          className="bg-rose-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-rose-600 transition"
        >
          Proceed to Checkout
        </Link>
      </div>
    </div>
  );
}
