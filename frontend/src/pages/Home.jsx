import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProducts, getCategories, getOffer, getBanners } from '../api';
import ProductCard from '../components/ProductCard';
import { whatsappChatUrl } from '../utils/whatsapp';

const DEFAULT_OFFER = {
  headline: 'Festival Special — Get 10% off on orders above ₹999. Order on WhatsApp today!',
  ctaText: 'Order now →',
  whatsappMessage: 'Hi, I want to avail the festival 10% off on orders above ₹999.',
};

export default function Home() {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState([]);
  const [newArrivals, setNewArrivals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [categoryProducts, setCategoryProducts] = useState({}); // { categorySlug: [products] }
  const [offer, setOffer] = useState(DEFAULT_OFFER);
  const [banners, setBanners] = useState([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [connecting, setConnecting] = useState(true);

  useEffect(() => {
    getProducts({ featured: 'true' })
      .then((p) => setFeatured(p.filter((item) => item.visible !== false)))
      .catch(() => setFeatured([]))
      .finally(() => setConnecting(false));
    getProducts({ newArrivals: 'true' })
      .then((p) => setNewArrivals(p.filter((item) => item.visible !== false)))
      .catch(() => setNewArrivals([]));
    getCategories()
      .then((cats) => {
        setCategories(cats);
        // Fetch products for each category
        const categoryPromises = cats.map((cat) =>
          getProducts({ category: cat.slug || cat.id })
            .then((products) => ({
              categorySlug: cat.slug || cat.id,
              products: products.filter((item) => item.visible !== false).slice(0, 4),
            }))
            .catch(() => ({ categorySlug: cat.slug || cat.id, products: [] }))
        );
        return Promise.all(categoryPromises);
      })
      .then((results) => {
        const categoryProductsMap = {};
        results.forEach(({ categorySlug, products }) => {
          if (products.length > 0) {
            categoryProductsMap[categorySlug] = products;
          }
        });
        setCategoryProducts(categoryProductsMap);
      })
      .catch(() => setCategories([]));
    getOffer().then((o) => o && setOffer({ ...DEFAULT_OFFER, ...o })).catch(() => {});
    getBanners().then(setBanners).catch(() => setBanners([]));
  }, []);

  // Auto-rotate banners
  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % banners.length);
    }, 5000); // Change banner every 5 seconds
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

  return (
    <div>
      {connecting && (
        <div className="fixed inset-x-0 top-16 z-30 flex justify-center px-4">
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-amber-100 text-amber-800 text-xs sm:text-sm px-4 py-1.5 shadow">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Connecting to server… first load may take a few seconds.</span>
          </div>
        </div>
      )}
      {/* Hero Banner Carousel */}
      {banners.length > 0 ? (
        <section className="relative w-full min-h-[260px] sm:h-[60vh] sm:min-h-[400px] overflow-hidden">
          {banners.map((banner, index) => (
            <div
              key={banner._id}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentBannerIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <div
                onClick={() => handleBannerClick(banner)}
                className="relative w-full h-full cursor-pointer group"
              >
                <img
                  src={banner.image}
                  alt={banner.title}
                  className="w-full h-full object-contain sm:object-cover bg-black"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 text-white">
                  <div className="max-w-6xl mx-auto">
                    <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3 group-hover:scale-105 transition-transform">
                      {banner.title}
                    </h2>
                    {banner.description && (
                      <p className="text-lg sm:text-xl mb-4 max-w-2xl">{banner.description}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {/* Banner Indicators */}
          {banners.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 flex gap-2">
              {banners.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrentBannerIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    index === currentBannerIndex
                      ? 'bg-white w-8'
                      : 'bg-white/50 hover:bg-white/75'
                  }`}
                  aria-label={`Go to banner ${index + 1}`}
                />
              ))}
            </div>
          )}
          {/* Navigation Arrows */}
          {banners.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setCurrentBannerIndex((prev) => (prev - 1 + banners.length) % banners.length)}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full transition"
                aria-label="Previous banner"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setCurrentBannerIndex((prev) => (prev + 1) % banners.length)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 bg-white/80 hover:bg-white text-gray-800 p-2 rounded-full transition"
                aria-label="Next banner"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </>
          )}
        </section>
      ) : (
        <section className="relative bg-gradient-to-br from-rose-100 via-cream-100 to-lavender-100 py-20 sm:py-28 overflow-hidden">
          <div className="absolute inset-0 opacity-30 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.2\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
          <div className="max-w-6xl mx-auto px-4 relative z-10 text-center">
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-rose-800 mb-4">
              NEW BALAJI BANGLES & FANCY
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Bangles, Jewellery, Cosmetics & Fashion Accessories. Order on WhatsApp.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 bg-rose-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-rose-600 transition shadow-soft"
              >
                Shop Now
              </Link>
              <a
                href={whatsappChatUrl('Hi, I would like to know more about your products.')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-green-600 transition"
              >
                <WhatsAppIcon /> Order on WhatsApp
              </a>
            </div>
          </div>
        </section>
      )}

      {/* Categories */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-display text-3xl font-bold text-rose-800 text-center mb-10">
            Shop by Category
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {(showAllCategories ? categories : categories.slice(0, 4)).map((cat) => (
              <Link
                key={cat.id}
                to={cat.slug ? `/categories/${cat.slug}` : '/shop'}
                className="block p-6 rounded-2xl bg-cream-100 border border-rose-100 text-center hover:bg-rose-50 hover:border-rose-200 transition group"
              >
                <span className="text-3xl mb-2 block">{cat.icon || categoryEmoji(cat.id)}</span>
                <span className="font-semibold text-gray-800 group-hover:text-rose-700">{cat.name}</span>
                {cat.count != null && <span className="block text-sm text-gray-500">{cat.count} products</span>}
              </Link>
            ))}
          </div>
          <div className="text-center mt-8 space-y-2">
            {categories.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAllCategories((prev) => !prev)}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-rose-200 text-sm font-semibold text-rose-700 hover:bg-rose-50"
              >
                {showAllCategories ? 'View fewer categories' : 'View more categories'}
              </button>
            )}
            <div>
              <Link to="/categories" className="text-rose-600 text-sm font-semibold hover:underline">
                Go to all categories page →
              </Link>
            </div>
          </div>
        </div>
      </section>

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
            <a
              href={whatsappChatUrl(offer.whatsappMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-3 underline font-medium hover:no-underline"
            >
              {offer.ctaText}
            </a>
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

function WhatsAppIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
