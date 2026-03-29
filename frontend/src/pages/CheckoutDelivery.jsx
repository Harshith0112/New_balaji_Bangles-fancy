import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { customerMe, getCustomerToken } from '../api';
import { useAppSelector } from '../store/hooks';
import { cartHasUnavailableLines } from '../utils/cartAvailability';
import { parsePhone10Input, PHONE_10_HINT } from '../utils/phone10';

function trimPart(s) {
  return String(s || '').trim();
}

/** Same composition as backend customer address `address` field */
function buildCombinedAddress({ doorNo, street, landmark, city }) {
  const parts = [doorNo, street, landmark, city].map(trimPart).filter(Boolean);
  return parts.join(', ');
}

export default function CheckoutDelivery() {
  const { count, items } = useCart();
  const allProducts = useAppSelector((s) => s.siteData.allProducts);
  const catalogRevision = useAppSelector((s) => s.siteData.catalogRevision);
  const catalogReady = useAppSelector((s) => s.siteData.status === 'succeeded');
  /** Only block when we actually have catalog data; empty list makes every line "missing product" and disables checkout */
  const canVerifyCartAgainstCatalog = catalogReady && allProducts.length > 0;
  const cartBlocked = useMemo(
    () => (canVerifyCartAgainstCatalog ? cartHasUnavailableLines(items, allProducts) : false),
    [items, allProducts, catalogRevision, canVerifyCartAgainstCatalog]
  );
  const navigate = useNavigate();
  const location = useLocation();
  const initial = location.state?.delivery || {};
  const initialCustomer = location.state?.customer || {};

  const [doorNo, setDoorNo] = useState(trimPart(initial.doorNo));
  const [street, setStreet] = useState(() => {
    const s = trimPart(initial.street);
    if (s) return s;
    const anyStructured =
      trimPart(initial.doorNo) || trimPart(initial.city) || trimPart(initial.landmark);
    if (anyStructured) return '';
    return trimPart(initial.address);
  });
  const [city, setCity] = useState(trimPart(initial.city));
  const [landmark, setLandmark] = useState(trimPart(initial.landmark));
  const [pincode, setPincode] = useState(trimPart(initial.pincode));
  const [state, setState] = useState(trimPart(initial.state));
  const [customerName, setCustomerName] = useState(initialCustomer.customerName || '');
  const [customerPhone, setCustomerPhone] = useState(
    parsePhone10Input(initialCustomer.customerPhone || '')
  );

  const token = getCustomerToken();
  const [customerAddresses, setCustomerAddresses] = useState([]);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState('');

  const hasStructuredInitial =
    trimPart(initial.doorNo) ||
    trimPart(initial.street) ||
    trimPart(initial.city) ||
    trimPart(initial.landmark);
  const [useNewAddress, setUseNewAddress] = useState(
    Boolean(trimPart(initial.address) || trimPart(initial.pincode) || trimPart(initial.state) || hasStructuredInitial)
  );

  const hasSavedAddresses = customerAddresses.length > 0;

  const phoneDigits = useMemo(() => parsePhone10Input(customerPhone), [customerPhone]);
  const phoneValid = phoneDigits.length === 10;

  const combinedAddress = useMemo(
    () => buildCombinedAddress({ doorNo, street, landmark, city }),
    [doorNo, street, landmark, city]
  );

  const delivery = useMemo(
    () => ({
      address: combinedAddress,
      pincode: trimPart(pincode),
      state: trimPart(state),
      doorNo,
      street,
      city,
      landmark,
    }),
    [doorNo, street, city, landmark, pincode, state, combinedAddress]
  );

  const valid =
    trimPart(doorNo) &&
    trimPart(street) &&
    trimPart(city) &&
    trimPart(pincode) &&
    trimPart(state);

  function applySavedAddress(a) {
    setDoorNo(trimPart(a.doorNo));
    setStreet(trimPart(a.street) || trimPart(a.address));
    setCity(trimPart(a.city));
    setLandmark(trimPart(a.landmark));
    setPincode(trimPart(a.pincode));
    setState(trimPart(a.state));
  }

  useEffect(() => {
    if (!token) return;
    setLoadingCustomer(true);
    customerMe()
      .then((out) => {
        const me = out?.customer || {};
        if (me.name) setCustomerName(me.name);
        if (me.phone) setCustomerPhone(parsePhone10Input(me.phone));
        const addrs = me.addresses || [];
        setCustomerAddresses(addrs);

        const hasPreFilled =
          hasStructuredInitial ||
          Boolean(trimPart(initial.address) || trimPart(initial.pincode) || trimPart(initial.state));
        if (!hasPreFilled && addrs.length > 0) {
          const first = addrs[0];
          setSelectedAddressId(String(first._id || ''));
          applySavedAddress(first);
          setUseNewAddress(false);
        }
      })
      .catch(() => {
        setCustomerAddresses([]);
      })
      .finally(() => setLoadingCustomer(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, []);

  /** Saved-address mode: ensure first address is selected and applied (covers skipped auto-fill when state was pre-filled elsewhere). */
  useEffect(() => {
    if (!token || loadingCustomer || useNewAddress || customerAddresses.length === 0) return;
    if (selectedAddressId) return;
    const first = customerAddresses[0];
    if (!first?._id) return;
    setSelectedAddressId(String(first._id));
    setDoorNo(trimPart(first.doorNo));
    setStreet(trimPart(first.street) || trimPart(first.address));
    setCity(trimPart(first.city));
    setLandmark(trimPart(first.landmark));
    setPincode(trimPart(first.pincode));
    setState(trimPart(first.state));
  }, [
    token,
    loadingCustomer,
    useNewAddress,
    customerAddresses,
    selectedAddressId,
  ]);

  useEffect(() => {
    if (!hasSavedAddresses) return;
    if (useNewAddress) return;
    if (!selectedAddressId) return;
    const chosen = customerAddresses.find((a) => String(a._id) === String(selectedAddressId));
    if (!chosen) return;
    applySavedAddress(chosen);
  }, [selectedAddressId, customerAddresses, useNewAddress, hasSavedAddresses]);

  const inputClass =
    'w-full border border-rose-200 rounded-2xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-300 focus:border-rose-300';

  if (count === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-rose-800 mb-4">Delivery address</h1>
        <p className="text-gray-600 mb-6">Your cart is empty.</p>
        <Link
          to="/shop"
          className="inline-block bg-rose-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-rose-600 transition"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  const handleContinueOnline = () => {
    if (!valid) {
      alert('Please fill door no, street, city, pincode, and state.');
      return;
    }
    if (!phoneValid) {
      alert('Please enter exactly 10 digits for mobile (do not include +91).');
      return;
    }
    if (cartBlocked) {
      alert('Your cart has items that are out of stock or unavailable. Update your cart before continuing.');
      return;
    }
    navigate('/checkout/online-review', {
      state: {
        delivery,
        customer: {
          customerName,
          customerPhone: phoneDigits,
        },
      },
    });
  };

  const formattedSavedLines = (a) =>
    [
      a.doorNo,
      a.street,
      a.landmark,
      a.city,
    ]
      .map((x) => trimPart(x))
      .filter(Boolean)
      .join(', ') || trimPart(a.address);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="font-display text-2xl font-bold text-rose-800 mb-2">Delivery address</h1>
      <p className="text-sm text-gray-600 mb-8">
        Enter where we should send your order, then place an online order to get an Order ID for tracking.
      </p>

      {cartBlocked && (
        <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl text-sm">
          Your cart includes items that are out of stock or no longer available.{' '}
          <Link to="/cart" className="font-semibold text-rose-700 underline">
            Back to cart
          </Link>{' '}
          to update before checkout.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-rose-100 p-5 mb-8">
        <div className="space-y-4">
          {token && loadingCustomer && (
            <p className="text-sm text-gray-500">Loading your saved addresses…</p>
          )}

          {token && hasSavedAddresses && !useNewAddress ? (
            <div className="space-y-3">
              <div>
                <label htmlFor="saved-address" className="block text-sm font-medium text-gray-700 mb-1">
                  Saved addresses
                </label>
                <select
                  id="saved-address"
                  value={selectedAddressId || String(customerAddresses[0]?._id || '')}
                  onChange={(e) => setSelectedAddressId(e.target.value)}
                  className={`${inputClass} rounded-xl`}
                >
                  {customerAddresses.map((a, idx) => (
                    <option key={a._id} value={String(a._id)}>
                      {a.label ? a.label : `Address ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border border-rose-100 bg-cream-50 rounded-2xl p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-rose-700 mb-2">
                  Selected delivery
                </p>
                {(() => {
                  const a =
                    customerAddresses.find((x) => String(x._id) === String(selectedAddressId)) ||
                    customerAddresses[0];
                  if (!a) return null;
                  return (
                    <>
                      {a.label ? (
                        <p className="text-xs font-semibold text-rose-700">{a.label}</p>
                      ) : null}
                      <p className="text-sm text-gray-800 mt-1 whitespace-pre-wrap">{formattedSavedLines(a)}</p>
                      <p className="text-sm text-gray-600 mt-2">
                        Pincode: {trimPart(a.pincode)} · State: {trimPart(a.state)}
                      </p>
                    </>
                  );
                })()}

                <button
                  type="button"
                  onClick={() => setUseNewAddress(true)}
                  className="mt-3 text-sm font-medium text-rose-700 hover:underline"
                >
                  Use a different / new address
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <h2 className="font-display text-sm font-bold text-gray-800 mb-2">Address details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label htmlFor="checkout-door" className="block text-xs font-medium text-gray-700 mb-1">
                      Door no <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="checkout-door"
                      type="text"
                      value={doorNo}
                      onChange={(e) => setDoorNo(e.target.value)}
                      placeholder="e.g. 12-3-45"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-street" className="block text-xs font-medium text-gray-700 mb-1">
                      Street <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="checkout-street"
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Street name"
                      className={inputClass}
                      autoComplete="street-address"
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-city" className="block text-xs font-medium text-gray-700 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="checkout-city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Hyderabad"
                      className={inputClass}
                      autoComplete="address-level2"
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-landmark" className="block text-xs font-medium text-gray-700 mb-1">
                      Landmark (optional)
                    </label>
                    <input
                      id="checkout-landmark"
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="Near ..."
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-pincode" className="block text-xs font-medium text-gray-700 mb-1">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="checkout-pincode"
                      type="text"
                      inputMode="numeric"
                      maxLength={8}
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      className={inputClass}
                      autoComplete="postal-code"
                    />
                  </div>
                  <div>
                    <label htmlFor="checkout-state" className="block text-xs font-medium text-gray-700 mb-1">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="checkout-state"
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className={inputClass}
                      autoComplete="address-level1"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="pt-4 border-t border-rose-100">
            <h2 className="font-display text-sm font-bold text-rose-800 mb-3">Your contact (for online ordering)</h2>
            {token && phoneValid && !loadingCustomer ? (
              <div className="border border-rose-100 bg-cream-50 rounded-2xl p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-rose-700 mb-2">Logged in customer</p>
                <p className="text-sm text-gray-800">
                  <span className="font-medium">{customerName || '—'}</span> ·{' '}
                  <span className="font-mono">{phoneDigits || '—'}</span>
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {token && (loadingCustomer || !phoneValid) && (
                  <p className="sm:col-span-2 text-sm text-gray-600">
                    {loadingCustomer
                      ? 'Loading your account…'
                      : 'Confirm your phone number for this order (required for order updates).'}
                  </p>
                )}
                <div>
                  <label htmlFor="customer-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Customer name
                  </label>
                  <input
                    id="customer-name"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Balaji"
                    className={inputClass}
                    autoComplete="name"
                  />
                </div>
                <div>
                  <label htmlFor="customer-phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Phone number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="customer-phone"
                    type="text"
                    inputMode="numeric"
                    maxLength={10}
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(parsePhone10Input(e.target.value))}
                    placeholder="9876543210"
                    className={inputClass}
                    autoComplete="tel"
                    spellCheck="false"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {PHONE_10_HINT} Required for online ordering.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleContinueOnline}
          disabled={!valid || !phoneValid || cartBlocked || (token && loadingCustomer)}
          className="bg-green-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Place order
        </button>
        <Link
          to="/cart"
          className="inline-flex items-center px-6 py-3 border border-rose-200 rounded-xl font-semibold text-rose-600 hover:bg-rose-50 transition"
        >
          Back to cart
        </Link>
      </div>
    </div>
  );
}
