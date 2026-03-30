import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { useAppSelector } from '../store/hooks';
import { filterStorefrontProducts } from '../utils/productFilters';

export default function Shop() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get('category') || slug || '';
  const categories = useAppSelector((s) => s.siteData.categories);
  const allProducts = useAppSelector((s) => s.siteData.allProducts);
  const status = useAppSelector((s) => s.siteData.status);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(categoryFromUrl);
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [onlyInStock, setOnlyInStock] = useState(searchParams.get('inStock') === 'true');
  const featuredFilter = searchParams.get('featured') === 'true';
  const newArrivalsFilter = searchParams.get('newArrivals') === 'true';
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    setCategory(categoryFromUrl);
  }, [slug, categoryFromUrl]);

  const products = useMemo(
    () =>
      filterStorefrontProducts(allProducts, {
        category,
        search,
        minPrice,
        maxPrice,
        onlyInStock,
        featuredFilter,
        newArrivalsFilter,
      }),
    [allProducts, category, search, minPrice, maxPrice, onlyInStock, featuredFilter, newArrivalsFilter]
  );

  const loading = status === 'loading' && allProducts.length === 0;

  const applyFilters = (categoryOverride) => {
    const p = {};
    const nextCategory = categoryOverride !== undefined ? categoryOverride : category;
    if (nextCategory) p.category = nextCategory;
    if (search) p.search = search;
    if (minPrice) p.minPrice = minPrice;
    if (maxPrice) p.maxPrice = maxPrice;
    if (onlyInStock) p.inStock = 'true';
    setSearchParams(p);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <h1 className="font-display text-3xl font-bold text-rose-800">
          {featuredFilter ? 'Featured Products' : newArrivalsFilter ? 'New Arrivals' : 'Shop'}
        </h1>

        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          <div className="w-full sm:w-72">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              className="w-full border border-rose-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-rose-300 focus:border-rose-400"
            />
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            className="sm:mb-0 bg-rose-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-rose-600 transition"
          >
            Filters
          </button>
        </div>
      </div>

      {filtersOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setFiltersOpen(false)}
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-md mt-16 bg-white rounded-2xl border border-rose-100 p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold text-rose-800">Add Filters</h2>
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="px-3 py-1 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 transition"
                aria-label="Close filters"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={category || ''}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-rose-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-300 focus:border-rose-400"
                >
                  <option value="">All</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.count != null ? ` (${c.count})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min ₹</label>
                  <input
                    type="number"
                    min="0"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full border border-rose-200 rounded-lg px-2 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max ₹</label>
                  <input
                    type="number"
                    min="0"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full border border-rose-200 rounded-lg px-2 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={onlyInStock}
                    onChange={(e) => setOnlyInStock(e.target.checked)}
                    className="text-rose-500"
                  />
                  <span className="text-sm">Only show in-stock</span>
                </label>
              </div>

              <button
                onClick={() => {
                  applyFilters();
                  setFiltersOpen(false);
                }}
                className="w-full bg-rose-500 text-white py-2 rounded-lg font-medium hover:bg-rose-600 transition"
              >
                Apply Filters
              </button>

              <button
                type="button"
                onClick={() => {
                  // Reset all filter controls + clear URL query params.
                  setSearch('');
                  setCategory('');
                  setMinPrice('');
                  setMaxPrice('');
                  setOnlyInStock(false);
                  setSearchParams({});
                  setFiltersOpen(false);
                }}
                className="w-full bg-white text-rose-700 py-2 rounded-lg font-medium hover:bg-rose-50 transition border border-rose-200"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-cream-100 rounded-2xl h-48 sm:h-80 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="text-gray-500 text-center py-12">No products found. Try different filters.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {products.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
