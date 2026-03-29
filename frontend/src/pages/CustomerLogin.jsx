import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getOrdersByPhone } from '../api';
import { parsePhone10Input, PHONE_10_HINT } from '../utils/phone10';

const PHONE_KEY = 'nbf-customer-phone';

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState(() => {
    try {
      return parsePhone10Input(localStorage.getItem(PHONE_KEY) || '');
    } catch {
      return '';
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // If already logged in, go straight to history.
    if (phone && phone.length === 10) navigate('/my-orders', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- we only want this initial redirect
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    const digits = parsePhone10Input(phone);
    if (!digits || digits.length !== 10) {
      setError('Enter exactly 10 digits (no +91).');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // Optional: touch the endpoint early so user sees error quickly.
      await getOrdersByPhone(digits);
      localStorage.setItem(PHONE_KEY, digits);
      navigate('/my-orders', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to load your orders.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 md:py-14">
      <h1 className="font-display text-3xl font-bold text-rose-800 text-center mb-2">My Orders</h1>
      <p className="text-center text-gray-600 text-sm mb-8">
        Enter your phone number to view your previous orders.
      </p>

      <form onSubmit={submit} className="bg-white rounded-2xl border border-rose-100 p-5 md:p-6 shadow-sm">
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
          Phone number
        </label>
        <input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(parsePhone10Input(e.target.value))}
          inputMode="numeric"
          maxLength={10}
          autoComplete="tel"
          placeholder="9876543210"
          className="w-full border border-rose-200 rounded-xl px-4 py-3 font-mono text-sm focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
          spellCheck="false"
        />
        <p className="text-xs text-gray-500 mt-1">{PHONE_10_HINT}</p>
        {error && <div className="mt-3 text-sm bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2 rounded-lg">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full bg-rose-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-rose-600 transition disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'View order history'}
        </button>
        <div className="mt-4 text-center text-sm text-gray-500">
          <Link to="/shop" className="text-rose-600 hover:underline font-medium">
            Continue shopping
          </Link>
        </div>
      </form>
    </div>
  );
}

