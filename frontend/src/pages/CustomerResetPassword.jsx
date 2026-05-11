import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { customerResetPassword } from '../api';

export default function CustomerResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = useMemo(() => String(params.get('token') || '').trim(), [params]);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!token) {
      setError('This reset link is missing a token.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await customerResetPassword({ token, password });
      setDone(true);
      setTimeout(() => navigate('/customer/account/login', { replace: true }), 2000);
    } catch (err) {
      setError(err.message || 'Reset failed. Try requesting a new link.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 md:py-14">
        <h1 className="font-display text-3xl font-bold text-rose-800 text-center mb-4">Invalid link</h1>
        <p className="text-center text-gray-600 text-sm mb-6">
          This password reset link is missing or malformed. Request a new one.
        </p>
        <Link
          to="/customer/account/forgot"
          className="block text-center w-full bg-rose-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-rose-600 transition"
        >
          Request new link
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12 md:py-14">
      <h1 className="font-display text-3xl font-bold text-rose-800 text-center mb-2">Reset password</h1>
      <p className="text-center text-gray-600 text-sm mb-8">Choose a new password for your account.</p>

      <div className="bg-white rounded-2xl border border-rose-100 p-5 md:p-6 shadow-sm">
        {done ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-3 py-3 rounded-lg text-sm">
              Your password was updated. Redirecting you to login…
            </div>
            <Link
              to="/customer/account/login"
              className="block text-center w-full bg-rose-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-rose-600 transition"
            >
              Go to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-password" className="block text-sm font-medium text-gray-700 mb-2">
                New password
              </label>
              <input
                id="reset-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full border border-rose-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label htmlFor="reset-confirm" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm new password
              </label>
              <input
                id="reset-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                className="w-full border border-rose-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
                autoComplete="new-password"
              />
            </div>

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
              {loading ? 'Updating…' : 'Update password'}
            </button>

            <div className="text-center text-sm text-gray-600">
              Need a new link?{' '}
              <Link to="/customer/account/forgot" className="text-rose-600 font-medium hover:underline">
                Request again
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
