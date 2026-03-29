import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { customerLogin, setCustomerToken, getCustomerToken } from '../api';
import { parsePhone10Input, PHONE_10_HINT } from '../utils/phone10';

const PHONE_KEY = 'nbf-customer-phone';

export default function CustomerAccountLogin() {
  const navigate = useNavigate();
  const token = getCustomerToken();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (token) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const digits = parsePhone10Input(phone);
    if (digits.length !== 10) {
      setError('Enter exactly 10 digits (no +91).');
      return;
    }
    if (!password.trim()) {
      setError('Enter password.');
      return;
    }

    setLoading(true);
    try {
      const out = await customerLogin({ phone: digits, password });
      setCustomerToken(out.token);
      localStorage.setItem(PHONE_KEY, digits);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 md:py-14">
      <h1 className="font-display text-3xl font-bold text-rose-800 text-center mb-2">Customer Login</h1>
      <p className="text-center text-gray-600 text-sm mb-8">Login to view your profile, addresses, and order history.</p>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-rose-100 p-5 md:p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone number
            </label>
            <input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(parsePhone10Input(e.target.value))}
              placeholder="9876543210"
              inputMode="numeric"
              maxLength={10}
              autoComplete="tel"
              className="w-full border border-rose-200 rounded-xl px-4 py-3 font-mono text-sm focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
            />
            <p className="text-xs text-gray-500 mt-1">{PHONE_10_HINT}</p>
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full border border-rose-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
            />
          </div>

          {error && <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2 rounded-lg text-sm">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-rose-600 transition disabled:opacity-50"
          >
            {loading ? 'Logging in…' : 'Login'}
          </button>

          <div className="text-center text-sm text-gray-600">
            New here?{' '}
            <Link to="/customer/register" className="text-rose-600 font-medium hover:underline">
              Create account
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}

