import { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { getProducts, getCategories } from '../api';
import ProductCard from '../components/ProductCard';

export default function Shop() {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get('category') || slug || '';
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(categoryFromUrl);
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [onlyInStock, setOnlyInStock] = useState(searchParams.get('inStock') === 'true');
  const featuredFilter = searchParams.get('featured') === 'true';
  const newArrivalsFilter = searchParams.get('newArrivals') === 'true';

  useEffect(() => {
    setCategory(categoryFromUrl);
  }, [slug, categoryFromUrl]);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (category) params.category = category;
    if (search) params.search = search;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    if (onlyInStock) params.inStock = 'true';
    if (featuredFilter) params.featured = 'true';
    if (newArrivalsFilter) params.newArrivals = 'true';
    getProducts(params)
      .then((p) => setProducts(p.filter((item) => item.visible !== false)))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [category, search, minPrice, maxPrice, onlyInStock, featuredFilter, newArrivalsFilter]);

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const applyFilters = () => {
    const p = {};
    if (category) p.category = category;
    if (search) p.search = search;
    if (minPrice) p.minPrice = minPrice;
    if (maxPrice) p.maxPrice = maxPrice;
    if (onlyInStock) p.inStock = 'true';
    setSearchParams(p);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl font-bold text-rose-800 mb-8">
        {featuredFilter ? 'Featured Products' : newArrivalsFilter ? 'New Arrivals' : 'Shop'}
      </h1>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-64 flex-shrink-0 space-y-6">
          <div>
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="cat" checked={!category} onChange={() => setCategory('')} className="text-rose-500" />
                <span>All</span>
              </label>
              {categories.map((c) => (
                <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="cat" checked={category === c.id} onChange={() => setCategory(c.id)} className="text-rose-500" />
                  <span>{c.name}</span>
                  {c.count != null && <span className="text-gray-400 text-sm">({c.count})</span>}
                </label>
              ))}
            </div>
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
            onClick={applyFilters}
            className="w-full bg-rose-500 text-white py-2 rounded-lg font-medium hover:bg-rose-600 transition"
          >
            Apply Filters
          </button>
        </aside>

        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-cream-100 rounded-2xl h-48 sm:h-80 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="text-gray-500 text-center py-12">No products found. Try different filters.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {products.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
