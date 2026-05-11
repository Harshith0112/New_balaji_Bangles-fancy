import { useState } from 'react';
import { Link } from 'react-router-dom';
import { customerForgotPassword } from '../api';
import { parsePhone10Input, PHONE_10_HINT } from '../utils/phone10';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CustomerForgotPassword() {
  const [mode, setMode] = useState('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    let payload = {};
    if (mode === 'email') {
      const trimmed = email.trim().toLowerCase();
      if (!EMAIL_RE.test(trimmed)) {
        setError('Enter a valid email address.');
        return;
      }
      payload = { email: trimmed };
    } else {
      const digits = parsePhone10Input(phone);
      if (digits.length !== 10) {
        setError('Enter exactly 10 digits (no +91).');
        return;
      }
      payload = { phone: digits };
    }

    setLoading(true);
    try {
      const out = await customerForgotPassword(payload);
      setMessage(out.message || "If we have a matching account, we've sent a reset link.");
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Could not send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 md:py-14">
      <h1 className="font-display text-3xl font-bold text-rose-800 text-center mb-2">Forgot password</h1>
      <p className="text-center text-gray-600 text-sm mb-8">
        We'll email you a link to set a new password.
      </p>

      <div className="bg-white rounded-2xl border border-rose-100 p-5 md:p-6 shadow-sm">
        {submitted ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-3 py-3 rounded-lg text-sm">
              {message}
            </div>
            <p className="text-sm text-gray-600">
              The link expires in 30 minutes. Check your spam folder if it doesn't arrive shortly.
            </p>
            <Link
              to="/customer/account/login"
              className="block text-center w-full bg-rose-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-rose-600 transition"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2 text-sm">
              <button
                type="button"
                onClick={() => setMode('email')}
                className={`flex-1 px-3 py-2 rounded-xl border font-medium transition ${
                  mode === 'email'
                    ? 'bg-rose-500 text-white border-rose-500'
                    : 'bg-white text-gray-700 border-rose-200 hover:bg-rose-50'
                }`}
              >
                By email
              </button>
              <button
                type="button"
                onClick={() => setMode('phone')}
                className={`flex-1 px-3 py-2 rounded-xl border font-medium transition ${
                  mode === 'phone'
                    ? 'bg-rose-500 text-white border-rose-500'
                    : 'bg-white text-gray-700 border-rose-200 hover:bg-rose-50'
                }`}
              >
                By phone
              </button>
            </div>

            {mode === 'email' ? (
              <div>
                <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full border border-rose-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                  autoComplete="email"
                  spellCheck="false"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="forgot-phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone number
                </label>
                <input
                  id="forgot-phone"
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
            )}

            {error && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-rose-600 transition disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>

            <div className="text-center text-sm text-gray-600">
              Remembered it?{' '}
              <Link to="/customer/account/login" className="text-rose-600 font-medium hover:underline">
                Back to login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
