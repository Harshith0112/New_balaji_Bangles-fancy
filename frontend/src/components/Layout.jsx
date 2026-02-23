import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { whatsappChatUrl } from '../utils/whatsapp';
import { useCart } from '../context/CartContext';

export default function Layout() {
  const { count } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  return (
    <div className="min-h-screen flex flex-col bg-cream-50">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-rose-100 shadow-soft">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3 font-display text-xl font-semibold text-rose-700 hover:text-rose-800 transition">
            <img src="/logo.png" alt="New Balaji Bangles and Fancy" className="w-11 h-11 flex-shrink-0 rounded-full object-cover ring-2 ring-rose-100" />
            <span className="hidden sm:inline">NEW BALAJI BANGLES & FANCY</span>
            <span className="sm:hidden">NBF</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-6 text-gray-600">
            <Link to="/" className="hover:text-rose-600 transition">Home</Link>
            <Link to="/shop" className="hover:text-rose-600 transition">Shop</Link>
            <Link to="/categories" className="hover:text-rose-600 transition">Categories</Link>
            <Link to="/cart" className="hover:text-rose-600 transition inline-flex items-center gap-1">
              Cart {count > 0 && <span className="bg-rose-500 text-white text-xs px-1.5 py-0.5 rounded-full">{count}</span>}
            </Link>
            <Link to="/about" className="hover:text-rose-600 transition">About</Link>
            <Link to="/contact" className="hover:text-rose-600 transition">Contact</Link>
            <Link to="/admin" className="text-lavender-600 hover:text-lavender-700 transition">Admin</Link>
          </nav>
          <div className="flex items-center gap-3 sm:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="p-1.5 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50"
              aria-label="Toggle navigation menu"
            >
              <span className="block w-5 h-0.5 bg-rose-600 rounded-sm" />
              <span className="block w-5 h-0.5 bg-rose-600 rounded-sm mt-1" />
              <span className="block w-5 h-0.5 bg-rose-600 rounded-sm mt-1" />
            </button>
            <Link to="/cart" className="relative p-1.5 text-rose-600">
              <CartIcon />
              {count > 0 && <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">{count}</span>}
            </Link>
            <Link to="/shop" className="text-sm text-rose-600">Shop</Link>
            <a href={whatsappChatUrl()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 bg-green-500 text-white px-3 py-1.5 rounded-full text-sm font-medium">
              <WhatsAppIcon /> Chat
            </a>
          </div>
        </div>
        {mobileMenuOpen && (
          <div
            className="sm:hidden fixed inset-x-0 top-16 bottom-0 z-30 bg-black/20"
            onClick={() => setMobileMenuOpen(false)}
          >
            <nav
              className="bg-white border-t border-rose-100 max-w-6xl mx-auto px-4 py-3 flex flex-col gap-2 text-sm text-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="py-1 hover:text-rose-600">
                Home
              </Link>
              <Link to="/shop" onClick={() => setMobileMenuOpen(false)} className="py-1 hover:text-rose-600">
                Shop
              </Link>
              <Link to="/categories" onClick={() => setMobileMenuOpen(false)} className="py-1 hover:text-rose-600">
                Categories
              </Link>
              <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="py-1 hover:text-rose-600">
                About
              </Link>
              <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="py-1 hover:text-rose-600">
                Contact
              </Link>
              <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="py-1 text-lavender-600 hover:text-lavender-700">
                Admin
              </Link>
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-rose-900 text-rose-100 py-10 mt-auto">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <h3 className="font-display text-lg font-semibold text-white mb-2">NEW BALAJI BANGLES & FANCY</h3>
            <p className="text-rose-200 text-sm">Bangles, Jewellery, Cosmetics & Accessories. Order on WhatsApp.</p>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-2">Quick Links</h3>
            <ul className="space-y-1 text-sm">
              <li><Link to="/shop" className="hover:text-white transition">Shop</Link></li>
              <li><Link to="/categories" className="hover:text-white transition">Categories</Link></li>
              <li><Link to="/about" className="hover:text-white transition">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-white transition">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-white mb-2">Order on WhatsApp</h3>
            <a href={whatsappChatUrl()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-600 transition">
              <WhatsAppIcon /> Start Order
            </a>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4 mt-8 pt-6 border-t border-rose-800 text-center text-rose-300 text-sm">
          © {new Date().getFullYear()} NEW BALAJI BANGLES & FANCY. All rights reserved.
        </div>
      </footer>

      <a
        href={whatsappChatUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="whatsapp-float fixed bottom-6 right-6 w-14 h-14 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 hover:scale-105 transition-all"
        aria-label="Chat on WhatsApp"
      >
        <WhatsAppIcon className="w-8 h-8" />
      </a>
    </div>
  );
}

function CartIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function WhatsAppIcon({ className = 'w-5 h-5' }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
