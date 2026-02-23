import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { whatsappChatUrl, whatsappCartOrderMessage } from '../utils/whatsapp';

export default function Checkout() {
  const { items, count, total, clearCart } = useCart();
  const [showWarning, setShowWarning] = useState(false);

  if (count === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-rose-800 mb-4">Checkout</h1>
        <p className="text-gray-600 mb-6">Your cart is empty.</p>
        <Link to="/shop" className="inline-block bg-rose-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-rose-600 transition">
          Continue Shopping
        </Link>
      </div>
    );
  }

  const message = whatsappCartOrderMessage(items);
  const orderUrl = whatsappChatUrl(message);

  const handleOrderClick = (e) => {
    e.preventDefault();
    setShowWarning(true);
  };

  const handleConfirmOrder = () => {
    setShowWarning(false);
    clearCart();
    window.open(orderUrl, '_blank');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-rose-800 mb-8">Checkout</h1>
      <div className="bg-white rounded-2xl border border-rose-100 overflow-hidden mb-6">
        <ul className="divide-y divide-rose-50">
          {items.map((item) => (
            <li key={`${item.productId}-${JSON.stringify(item.selectedOptions)}`} className="p-4 flex justify-between items-start">
              <div>
                <p className="font-semibold text-gray-800">{item.name}</p>
                {item.nbfCode && <span className="text-xs text-gray-500">NBF: {item.nbfCode}</span>}
                {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                  <p className="text-sm text-gray-600">
                    {Object.entries(item.selectedOptions).map(([k, v]) => `${k}: ${v}`).join(', ')}
                  </p>
                )}
                <p className="text-sm text-gray-500">₹{item.price} × {item.quantity}</p>
              </div>
              <p className="font-semibold">₹{item.price * item.quantity}</p>
            </li>
          ))}
        </ul>
        <div className="p-4 bg-cream-100 border-t border-rose-100 flex justify-between items-center">
          <span className="font-bold text-gray-800">Total</span>
          <span className="text-xl font-bold text-rose-600">₹{total}</span>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Click below to send this order to WhatsApp. You can confirm and pay with the store there.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleOrderClick}
          className="inline-flex items-center justify-center gap-2 bg-green-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-green-600 transition"
        >
          <WhatsAppIcon /> Order on WhatsApp
        </button>
        <Link to="/cart" className="inline-block px-6 py-3 border border-rose-200 rounded-xl font-semibold text-rose-600 hover:bg-rose-50 transition">
          Back to Cart
        </Link>
      </div>

      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" aria-modal="true" role="dialog">
          <div className="bg-white rounded-2xl border border-rose-200 shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-2xl" aria-hidden>
                ⚠️
              </span>
              <h2 className="font-display text-xl font-bold text-rose-800">Important</h2>
            </div>
            <p className="text-gray-700 mb-6">
              <strong>Do not tamper with the message.</strong> When WhatsApp opens, send the pre-filled order message exactly as shown. Changing prices, items, or totals may delay or cancel your order. Our team will process it as usual once received.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowWarning(false)}
                className="px-5 py-2.5 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmOrder}
                className="inline-flex items-center justify-center gap-2 bg-green-500 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-green-600 transition"
              >
                <WhatsAppIcon /> I understand, continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
