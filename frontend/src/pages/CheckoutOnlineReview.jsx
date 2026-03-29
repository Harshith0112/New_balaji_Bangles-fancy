import { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { createOnlineOrder, validateCoupon } from '../api';
import { useAppSelector } from '../store/hooks';
import { cartHasUnavailableLines } from '../utils/cartAvailability';

const PHONE_KEY = 'nbf-customer-phone';

function normalizeDigits(s) {
  return String(s || '').replace(/\D/g, '').slice(0, 15);
}

export default function CheckoutOnlineReview() {
  const { items, count, total, clearCart } = useCart();
  const allProducts = useAppSelector((s) => s.siteData.allProducts);
  const catalogRevision = useAppSelector((s) => s.siteData.catalogRevision);
  const catalogReady = useAppSelector((s) => s.siteData.status === 'succeeded');
  const canVerifyCartAgainstCatalog = catalogReady && allProducts.length > 0;
  const cartBlocked = useMemo(
    () => (canVerifyCartAgainstCatalog ? cartHasUnavailableLines(items, allProducts) : false),
    [items, allProducts, catalogRevision, canVerifyCartAgainstCatalog]
  );

  const location = useLocation();
  const navigate = useNavigate();

  const rawDelivery = location.state?.delivery;
  const rawCustomer = location.state?.customer || {};

  const delivery = useMemo(
    () =>
      rawDelivery
        ? {
            address: String(rawDelivery.address || '').trim(),
            pincode: String(rawDelivery.pincode || '').trim(),
            state: String(rawDelivery.state || '').trim(),
          }
        : null,
    [rawDelivery]
  );

  const customerName = String(rawCustomer.customerName || '').trim();
  const customerPhone = normalizeDigits(rawCustomer.customerPhone);

  const deliveryValid = !!(
    delivery &&
    delivery.address.length > 0 &&
    delivery.pincode.length > 0 &&
    delivery.state.length > 0
  );

  const phoneValid = customerPhone.length >= 10;

  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponMsg, setCouponMsg] = useState('');

  const itemsSubtotal = useMemo(
    () => items.reduce((sum, i) => sum + Number(i.price) * Number(i.quantity), 0),
    [items]
  );
  const discountAmount = appliedCoupon?.discountAmount ?? 0;
  const orderTotal = Math.max(0, Math.round((itemsSubtotal - discountAmount) * 100) / 100);

  if (count === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-rose-800 mb-4">Online Checkout</h1>
        <p className="text-gray-600 mb-6">Your cart is empty.</p>
        <Link to="/shop" className="inline-block bg-rose-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-rose-600 transition">
          Continue Shopping
        </Link>
      </div>
    );
  }

  if (!deliveryValid || !phoneValid) {
    return <Navigate to="/checkout/delivery" replace state={{ delivery: delivery || {}, customer: { customerName, customerPhone } }} />;
  }

  const backToAddressState = { delivery, customer: { customerName, customerPhone } };

  const handlePlaceOrder = async () => {
    setError('');
    if (!deliveryValid || !phoneValid) {
      setError('Please provide a valid delivery address and phone number.');
      return;
    }
    if (cartBlocked) {
      setError('Your cart contains items that are out of stock or unavailable. Go back to your cart to update.');
      return;
    }
    setPlacing(true);
    try {
      const orderItems = items.map((i) => ({
        productId: i.productId,
        name: i.name,
        nbfCode: i.nbfCode || '',
        price: i.price,
        quantity: i.quantity,
        lineTotal: i.price * i.quantity,
        selectedOptions: i.selectedOptions || {},
      }));

      const payload = {
        customerName,
        customerPhone,
        items: orderItems,
        total: orderTotal,
        delivery,
        ...(appliedCoupon?.code ? { couponCode: appliedCoupon.code } : {}),
      };

      const out = await createOnlineOrder(payload);
      clearCart();

      try {
        localStorage.setItem(PHONE_KEY, customerPhone);
      } catch (_) {}

      navigate(`/order/placed/${encodeURIComponent(out.order.orderId)}`);
    } catch (e) {
      setError(e.message || 'Failed to place order.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 md:py-12">
      <h1 className="font-display text-2xl font-bold text-rose-800 mb-6">Review & place order</h1>

      {cartBlocked && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-900 px-4 py-3 rounded-xl text-sm">
          One or more items in your cart are out of stock or no longer available.{' '}
          <Link to="/cart" className="font-semibold underline">
            Update your cart
          </Link>{' '}
          before placing the order.
        </div>
      )}

      {error && (
        <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-rose-100 p-5 mb-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h2 className="font-display text-lg font-bold text-rose-800">Delivery address</h2>
          <Link to="/checkout/delivery" state={backToAddressState} className="text-sm text-rose-600 font-medium hover:underline shrink-0">
            Edit
          </Link>
        </div>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{delivery.address}</p>
        <p className="text-sm text-gray-600 mt-2">
          Pincode: {delivery.pincode} · State: {delivery.state}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-rose-100 overflow-hidden mb-6">
        <div className="p-4 bg-cream-100 border-b border-rose-100">
          <p className="text-sm font-semibold text-gray-800">Customer</p>
          <p className="text-sm text-gray-600 mt-1">
            {customerName ? <span>{customerName} · </span> : null}
            <span className="font-mono">{customerPhone}</span>
          </p>
        </div>
        <ul className="divide-y divide-rose-50">
          {items.map((item) => (
            <li key={`${item.productId}-${JSON.stringify(item.selectedOptions)}`} className="p-4 flex justify-between items-start">
              <div>
                <p className="font-semibold text-gray-800">{item.name}</p>
                {item.nbfCode && <span className="text-xs text-gray-500">NBF: {item.nbfCode}</span>}
                {item.selectedOptions && Object.keys(item.selectedOptions).length > 0 && (
                  <p className="text-sm text-gray-600">
                    {Object.entries(item.selectedOptions)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ')}
                  </p>
                )}
                <p className="text-sm text-gray-500">
                  ₹{item.price} × {item.quantity}
                </p>
              </div>
              <p className="font-semibold">₹{item.price * item.quantity}</p>
            </li>
          ))}
        </ul>
        <div className="p-4 border-t border-rose-100 space-y-3">
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[200px]">
              <label htmlFor="checkout-coupon" className="block text-xs font-semibold text-gray-600 mb-1">
                Coupon code
              </label>
              <div className="flex gap-2">
                <input
                  id="checkout-coupon"
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Enter code"
                  className="flex-1 min-w-0 border border-rose-200 rounded-xl px-3 py-2 text-sm uppercase"
                  disabled={!!appliedCoupon}
                />
                {appliedCoupon ? (
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedCoupon(null);
                      setCouponInput('');
                      setCouponMsg('');
                    }}
                    className="shrink-0 px-3 py-2 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={couponBusy || !couponInput.trim()}
                    onClick={async () => {
                      setCouponBusy(true);
                      setCouponMsg('');
                      try {
                        const out = await validateCoupon(couponInput, itemsSubtotal);
                        if (out.valid && out.discountAmount > 0) {
                          setAppliedCoupon({
                            code: out.code,
                            discountAmount: out.discountAmount,
                          });
                          setCouponMsg(`Applied: −₹${Number(out.discountAmount).toFixed(2)}`);
                        } else {
                          setAppliedCoupon(null);
                          setCouponMsg(out.message || 'Could not apply this code.');
                        }
                      } catch (err) {
                        setAppliedCoupon(null);
                        setCouponMsg(err.message || 'Invalid coupon.');
                      } finally {
                        setCouponBusy(false);
                      }
                    }}
                    className="shrink-0 px-4 py-2 rounded-xl bg-rose-100 text-rose-800 text-sm font-semibold hover:bg-rose-200 disabled:opacity-50"
                  >
                    {couponBusy ? '…' : 'Apply'}
                  </button>
                )}
              </div>
              {couponMsg && <p className="text-xs text-gray-600 mt-1">{couponMsg}</p>}
            </div>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Items subtotal</span>
            <span>₹{itemsSubtotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-emerald-700">
              <span>Coupon ({appliedCoupon.code})</span>
              <span>−₹{discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-rose-100">
            <span className="font-bold text-gray-800">Total</span>
            <span className="text-xl font-bold text-rose-600">₹{orderTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <button
          type="button"
          onClick={handlePlaceOrder}
          disabled={placing || cartBlocked}
          className="inline-flex items-center justify-center gap-2 bg-green-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-50"
        >
          {placing ? 'Placing…' : 'Place order'}
        </button>
        <Link to="/cart" className="inline-block px-6 py-3 border border-rose-200 rounded-xl font-semibold text-rose-600 hover:bg-rose-50 transition">
          Back to cart
        </Link>
      </div>

      <p className="text-sm text-gray-500 mt-5">
        After placing the order, you can track it anytime using your Order ID.
      </p>
    </div>
  );
}

