import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { adminMe, clearToken } from '../api';

const INACTIVITY_MS = 10 * 60 * 1000; // 10 minutes

export default function AdminLayout() {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const inactivityTimerRef = useRef(null);

  useEffect(() => {
    adminMe()
      .then((data) => {
        if (data?.admin) {
          setAdmin(data.admin);
          return;
        }
        if (data?.unauthorized) clearToken();
        navigate('/admin');
      })
      .catch(() => {
        navigate('/admin');
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  // Log out after 10 minutes of no activity
  useEffect(() => {
    if (!admin) return;

    const resetTimer = () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = setTimeout(() => {
        clearToken();
        navigate('/admin');
      }, INACTIVITY_MS);
    };

    resetTimer();
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer));

    return () => {
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [admin, navigate]);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    clearToken();
    navigate('/admin');
  };

  const closeSidebar = () => setSidebarOpen(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const navClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-left font-medium transition ${
      isActive ? 'bg-rose-500 text-white' : 'text-gray-700 hover:bg-rose-100'
    }`;

  return (
    <div className="min-h-screen bg-cream-50 flex">
      {/* Mobile: hamburger + top bar (only on small screens) */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center gap-3 p-3 bg-white border-b border-rose-100 shadow-sm">
        <button
          type="button"
          onClick={() => setSidebarOpen((o) => !o)}
          className="p-2 rounded-lg text-gray-700 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-300"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <span className="font-display font-bold text-rose-800">Admin</span>
      </div>

      {/* Overlay when sidebar is open on mobile */}
      <div
        role="button"
        tabIndex={0}
        onClick={closeSidebar}
        onKeyDown={(e) => e.key === 'Escape' && closeSidebar()}
        className={`md:hidden fixed inset-0 z-30 bg-black/50 transition-opacity duration-200 ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden="true"
      />

      {/* Sidebar: slide-in on mobile, always visible on desktop */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-40 w-64 flex-shrink-0 bg-white border-r border-rose-100 flex flex-col transform transition-transform duration-200 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
        style={{ top: 0 }}
      >
        <div className="p-4 border-b border-rose-100 flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-lg font-bold text-rose-800">Admin</h1>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{admin?.email}</p>
          </div>
          <button
            type="button"
            onClick={closeSidebar}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-rose-50"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="p-3 flex-1 space-y-1 overflow-y-auto" onClick={closeSidebar}>
          <NavLink to="/admin/dashboard" end className={navClass}>
            <span className="text-xl">📊</span>
            Dashboard
          </NavLink>
          <NavLink to="/admin/dashboard/products" className={navClass}>
            <span className="text-xl">🛍️</span>
            Products
          </NavLink>
          <NavLink to="/admin/dashboard/categories" className={navClass}>
            <span className="text-xl">📁</span>
            Categories
          </NavLink>
          <NavLink to="/admin/dashboard/banners" className={navClass}>
            <span className="text-xl">🖼️</span>
            Banners
          </NavLink>
          <NavLink to="/admin/dashboard/offer" className={navClass}>
            <span className="text-xl">🏷️</span>
            Offer Banner
          </NavLink>
          <NavLink to="/admin/dashboard/processing" className={navClass}>
            <span className="text-xl">📦</span>
            Processing
          </NavLink>
          <NavLink to="/admin/dashboard/orders" className={navClass}>
            <span className="text-xl">📋</span>
            Orders
          </NavLink>
        </nav>
        <div className="p-3 border-t border-rose-100 space-y-1">
          <Link to="/" className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-700 hover:bg-rose-50 font-medium" onClick={closeSidebar}>
            View Store
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-gray-600 hover:bg-rose-50 font-medium"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main content: add top padding on mobile for the fixed header */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
