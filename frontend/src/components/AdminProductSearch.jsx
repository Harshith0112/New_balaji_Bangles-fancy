import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProducts } from '../api';

const MAX_SUGGESTIONS = 8;

export default function AdminProductSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const wrapRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getProducts({ includeHidden: 'true' })
      .then((list) => {
        if (!cancelled) setProducts(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const q = query.trim().toLowerCase();
  const suggestions =
    q.length === 0
      ? []
      : products
          .filter((p) => {
            const name = (p.name && String(p.name).toLowerCase()) || '';
            const code = (p.nbfCode && String(p.nbfCode).toLowerCase()) || '';
            const cat = (p.category && String(p.category).toLowerCase()) || '';
            return name.includes(q) || code.includes(q) || cat.includes(q);
          })
          .slice(0, MAX_SUGGESTIONS);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const goToProduct = useCallback(
    (id) => {
      setOpen(false);
      setQuery('');
      navigate(`/admin/dashboard/products?edit=${encodeURIComponent(id)}`);
    },
    [navigate]
  );

  return (
    <div ref={wrapRef} className="relative w-full max-w-md">
      <label className="sr-only" htmlFor="admin-product-search">
        Find product
      </label>
      <div className="flex rounded-xl border border-rose-200 bg-white shadow-sm focus-within:ring-2 focus-within:ring-rose-300 focus-within:border-rose-300">
        <span className="pl-3 flex items-center text-gray-400" aria-hidden="true">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </span>
        <input
          id="admin-product-search"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
            if (e.key === 'Enter' && suggestions.length === 1) {
              e.preventDefault();
              goToProduct(suggestions[0]._id);
            }
          }}
          placeholder={loading ? 'Loading products…' : 'Find product (name, NBF, category)…'}
          disabled={loading}
          className="flex-1 min-w-0 bg-transparent border-0 rounded-r-xl px-2 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-0"
        />
      </div>

      {open && q.length > 0 && suggestions.length > 0 && (
        <ul
          className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-rose-200 bg-white shadow-lg max-h-64 overflow-y-auto py-1"
          role="listbox"
        >
          {suggestions.map((p) => (
            <li key={p._id} role="option" className="flex border-b border-rose-50 last:border-0">
              <button
                type="button"
                className="flex-1 min-w-0 text-left px-3 py-2.5 text-sm hover:bg-rose-50 flex gap-3 items-center"
                onClick={() => goToProduct(p._id)}
              >
                <img
                  src={p.images?.[0] || 'https://placehold.co/40x40/fce7f3/9f1239?text=•'}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0 bg-cream-100"
                />
                <span className="min-w-0 flex-1">
                  <span className="font-medium text-gray-800 line-clamp-1">{p.name}</span>
                  <span className="block text-xs text-gray-500 capitalize">
                    {p.category}
                    {p.nbfCode ? ` · ${p.nbfCode}` : ''}
                  </span>
                </span>
                <span className="text-xs text-rose-600 font-medium shrink-0">Edit</span>
              </button>
              <Link
                to={`/product/${p._id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 px-3 flex items-center text-xs font-medium text-gray-600 hover:bg-rose-100 border-l border-rose-100"
                onClick={() => setOpen(false)}
              >
                Store
              </Link>
            </li>
          ))}
        </ul>
      )}

      {open && q.length > 0 && !loading && suggestions.length === 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-rose-200 bg-white shadow-lg px-3 py-2.5 text-sm text-gray-500">
          No products match.
        </div>
      )}
    </div>
  );
}
