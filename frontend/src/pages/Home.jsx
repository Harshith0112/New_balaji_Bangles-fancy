import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import CategoryIcon from '../components/CategoryIcon';
import { useAppSelector } from '../store/hooks';
import { productMatchesCategory } from '../utils/productFilters';

export default function Home() {
  const navigate = useNavigate();
  const categories = useAppSelector((s) => s.siteData.categories);
  const banners = useAppSelector((s) => s.siteData.banners);
  const offer = useAppSelector((s) => s.siteData.offer);
  const allProducts = useAppSelector((s) => s.siteData.allProducts);
  const status = useAppSelector((s) => s.siteData.status);

  const featured = useMemo(() => allProducts.filter((p) => p.featured), [allProducts]);
  const newArrivals = useMemo(() => allProducts.filter((p) => p.newArrivals), [allProducts]);

  const categoryProducts = useMemo(() => {
    const map = {};
    for (const cat of categories) {
      const slug = cat.slug || cat.id;
      const products = allProducts.filter((p) => productMatchesCategory(p, slug)).slice(0, 4);
      if (products.length > 0) {
        map[slug] = products;
      }
    }
    return map;
  }, [categories, allProducts]);

  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const bannerItemRefs = useRef([]);
  const bannerScrollerRef = useRef(null);

  const connecting = status === 'loading' && allProducts.length === 0;

  // Auto-rotate banners
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => {
        const next = (prev + 1) % banners.length;
        const el = bannerItemRefs.current[next];
        const scroller = bannerScrollerRef.current;
        // Scroll only inside the banner strip (avoid moving page scroll Y).
        if (el && scroller && typeof scroller.scrollTo === 'function') {
          const left = el.offsetLeft - scroller.offsetLeft;
          scroller.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
        }
        return next;
      });
    }, 3000); // Change banner every 2 seconds
    return () => clearInterval(interval);
  }, [banners.length]);

  const handleBannerClick = (banner) => {
    if (banner.linkType === 'category' && banner.linkValue) {
      navigate(`/shop?category=${banner.linkValue}`);
    } else if (banner.linkType === 'custom' && banner.linkValue) {
      if (banner.linkValue.startsWith('http')) {
        window.open(banner.linkValue, '_blank');
      } else {
        navigate(banner.linkValue);
      }
    } else {
      navigate('/shop');
    }
  };

  const categoryLabels = {
    bangles: 'Bangles',
    jewellery: 'Fancy Jewellery',
    cosmetics: 'Cosmetics',
    accessories: 'Hair & Fashion Accessories',
  };

  const HOME_CATEGORY_LIMIT = 6;
  const homeCategories = categories.slice(0, HOME_CATEGORY_LIMIT);
  const hasMoreCategories = categories.length > HOME_CATEGORY_LIMIT;

  return (
    <div>
      {connecting && (
        <div className="fixed inset-x-0 top-28 sm:top-16 z-30 flex justify-center px-4">
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-100 text-amber-800 text-xs sm:text-sm px-4 py-1.5 shadow">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Connecting to server… first load may take a few seconds.</span>
          </div>
        </div>
      )}
      {/* Flipkart-style top strip (always visible) */}
      <section className="bg-white border-b border-rose-100">
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-none">
            {categories.slice(0, 8).map((cat) => (
              <Link
                key={cat.id}
                to={cat.slug ? `/categories/${cat.slug}` : '/shop'}
                className="flex-shrink-0 w-20 sm:w-24 text-center"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-cream-100 border border-rose-100 flex items-center justify-center text-2xl overflow-hidden">
                  <CategoryIcon
                    icon={cat.icon}
                    fallback={categoryEmoji(cat.id)}
                    className="text-2xl"
                    imgClassName="w-full h-full object-cover"
                  />
                </div>
                <div className="mt-2 text-xs sm:text-sm font-medium text-gray-800 line-clamp-2">
                  {cat.name}
                </div>
              </Link>
            ))}
            {categories.length > 8 && (
              <Link to="/categories" className="flex-shrink-0 w-20 sm:w-24 text-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-xl">
                  →
                </div>
                <div className="mt-2 text-xs sm:text-sm font-semibold text-rose-700">View all</div>
              </Link>
            )}
          </div>
        </div>

        {banners.length > 0 && (
          <div className="max-w-6xl mx-auto px-4 pb-6">
            <div
              ref={bannerScrollerRef}
              className="flex gap-8 sm:gap-8 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-none"
            >
              {banners.map((banner, index) => (
                <button
                  key={banner._id}
                  type="button"
                  ref={(el) => { bannerItemRefs.current[index] = el; }}
                  onClick={() => handleBannerClick(banner)}
                  className={`snap-start flex-shrink-0 rounded-2xl overflow-hidden border transition ${
                    index === currentBannerIndex ? 'border-rose-300 shadow-soft' : 'border-rose-100 hover:border-rose-200'
                  } w-full sm:w-[70%] lg:w-[48%]`}
                  aria-label={`Open banner ${index + 1}`}
                >
                  <div className="relative w-full bg-black aspect-[41/20]">
                    <img
                      src={banner.image}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                    <div
                      className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.2\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] pointer-events-none"
                      aria-hidden="true"
                    />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Fallback hero when no banners */}
      {banners.length > 0 ? null : (
        <section className="relative bg-gradient-to-br from-rose-100 via-cream-100 to-lavender-100 py-20 sm:py-28 overflow-hidden">
          <div className="absolute inset-0 opacity-30 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.2\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
          <div className="max-w-6xl mx-auto px-4 relative z-10 text-center">
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-rose-800 mb-4">
              NEW BALAJI BANGLES & FANCY
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Bangles, Jewellery, Cosmetics & Fashion Accessories.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 bg-rose-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-rose-600 transition shadow-soft"
              >
                Shop Now
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Featured */}
      {featured.length > 0 && (
        <section className="py-16 bg-cream-50">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="font-display text-3xl font-bold text-rose-800 text-center mb-10">
              Featured Products
            </h2>
            <ProductRowMobile
              products={featured.slice(0, 4)}
              viewAllTo="/shop?featured=true"
              viewAllLabel="View all featured"
            />
            <div className="hidden lg:block text-center mt-8">
              <Link to="/shop?featured=true" className="text-rose-600 font-semibold hover:underline">
                View all featured →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Offers banner (editable in Admin) */}
      {offer && offer.enabled !== false && (
        <section className="py-8 bg-rose-600 text-white">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <p className="text-lg font-semibold">{offer.headline}</p>
            <Link to="/shop" className="inline-block mt-3 underline font-medium hover:no-underline">
              {offer.ctaText}
            </Link>
          </div>
        </section>
      )}

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="font-display text-3xl font-bold text-rose-800 text-center mb-10">
              New Arrivals
            </h2>
            <ProductRowMobile
              products={newArrivals.slice(0, 4)}
              viewAllTo="/shop?newArrivals=true"
              viewAllLabel="View all new arrivals"
            />
            <div className="hidden lg:block text-center mt-8">
              <Link to="/shop?newArrivals=true" className="text-rose-600 font-semibold hover:underline">
                View all new arrivals →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Category Product Sections — mobile: horizontal scroll + View all after 4 */}
      {categories.map((cat) => {
        const products = categoryProducts[cat.slug || cat.id] || [];
        if (products.length === 0) return null;
        const viewAllTo = cat.slug ? `/categories/${cat.slug}` : `/shop?category=${cat.id}`;
        const viewAllLabel = `View all ${cat.name.toLowerCase()}`;
        return (
          <section key={cat.id || cat.slug} className="py-16 bg-cream-50">
            <div className="max-w-6xl mx-auto px-4">
              <h2 className="font-display text-3xl font-bold text-rose-800 text-center mb-10">
                {cat.name}
              </h2>
              <ProductRowMobile
                products={products}
                viewAllTo={viewAllTo}
                viewAllLabel={viewAllLabel}
              />
              <div className="hidden lg:block text-center mt-8">
                <Link to={viewAllTo} className="text-rose-600 font-semibold hover:underline">
                  {viewAllLabel} →
                </Link>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function categoryEmoji(id) {
  const emoji = { bangles: '💍', jewellery: '✨', cosmetics: '💄', accessories: '🎀' };
  return emoji[id] || '🛍️';
}

/** Mobile: horizontal scroll with 4 products side by side + "View all" at end. Desktop: 4-column grid. */
function ProductRowMobile({ products, viewAllTo, viewAllLabel }) {
  return (
    <>
      {/* Mobile: horizontal scroll, products side by side, then View all */}
      <div className="flex overflow-x-auto overflow-y-hidden gap-4 pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 lg:overflow-visible lg:grid lg:grid-cols-4 lg:gap-6 scrollbar-thin">
        {products.map((p) => (
          <div key={p._id} className="flex-shrink-0 w-[44vw] min-w-[140px] max-w-[200px] lg:w-auto lg:min-w-0 lg:max-w-none">
            <ProductCard product={p} />
          </div>
        ))}
        <div className="flex-shrink-0 w-[44vw] min-w-[140px] max-w-[200px] lg:hidden flex items-center justify-center rounded-xl bg-rose-50 border border-rose-200">
          <Link
            to={viewAllTo}
            className="text-rose-600 font-semibold text-sm px-4 text-center hover:underline"
          >
            View all →
          </Link>
        </div>
      </div>
    </>
  );
}
