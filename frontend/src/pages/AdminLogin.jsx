import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminLogin, adminMe, setToken, clearToken } from '../api';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await adminLogin(email, password);
      setToken(token);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const [alreadyLoggedIn, setAlreadyLoggedIn] = useState(false);
  useEffect(() => {
    adminMe()
      .then((data) => {
        if (data?.admin) setAlreadyLoggedIn(true);
        if (data?.unauthorized) clearToken();
      })
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white rounded-2xl shadow-card border border-rose-100 p-8">
        <h1 className="font-display text-2xl font-bold text-rose-800 text-center mb-6">
          Admin Login
        </h1>
        {alreadyLoggedIn && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-center">
            <p className="text-sm text-rose-800 mb-2">You are already logged in.</p>
            <Link
              to="/admin/dashboard"
              className="inline-block px-4 py-2 bg-rose-500 text-white rounded-lg font-medium hover:bg-rose-600 transition text-sm"
            >
              Go to dashboard
            </Link>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-rose-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-300 focus:border-rose-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-rose-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-300 focus:border-rose-400"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-500 text-white py-2.5 rounded-lg font-semibold hover:bg-rose-600 transition disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          <Link to="/" className="text-rose-600 hover:underline">Back to store</Link>
        </p>
      </div>
    </div>
  );
}
