import { Link } from 'react-router-dom';
import { whatsappChatUrl } from '../utils/whatsapp';
import elle18Logo from '../assets/brands/elle18.png';

const COSMETIC_BRANDS = [
  {
    name: 'Lakmé',
    logo: 'https://placehold.co/140x60/ffffff/333333?text=Lakm%C3%A9',
  },
  {
    name: 'Maybelline',
    logo: 'https://placehold.co/140x60/ffffff/333333?text=Maybelline',
  },
  {
    name: 'Dazller',
    logo: '/brands/dazller.png',
  },
  {
    name: 'Mamaearth',
    logo: 'https://placehold.co/140x60/ffffff/333333?text=Mamaearth',
  },
  {
    name: 'Himalaya',
    logo: 'https://placehold.co/140x60/ffffff/333333?text=Himalaya',
  },
  {
    name: 'Hindustan Unilever',
    logo: 'https://placehold.co/140x60/ffffff/333333?text=HUL',
  },
  {
    name: 'Huda Beauty',
    logo: 'https://placehold.co/140x60/ffffff/333333?text=Huda+Beauty',
  },
  {
    name: 'Colorbar',
    logo: 'https://placehold.co/140x60/ffffff/333333?text=Colorbar',
  },
  {
    name: 'Blue Heaven',
    logo: 'https://placehold.co/140x60/ffffff/333333?text=Blue+Heaven',
  },
  {
    name: 'Swiss Beauty',
    logo: 'https://placehold.co/140x60/ffffff/333333?text=Swiss+Beauty',
  },
  {
    name: 'Sugar',
    logo: 'https://placehold.co/140x60/ffffff/333333?text=Sugar',
  },
  // Additional brands
  { name: 'Nivea', logo: 'https://placehold.co/140x60/ffffff/333333?text=Nivea' },
  { name: 'Veet', logo: 'https://placehold.co/140x60/ffffff/333333?text=Veet' },
  { name: 'Vaseline', logo: 'https://placehold.co/140x60/ffffff/333333?text=Vaseline' },
  { name: "Nature's", logo: 'https://placehold.co/140x60/ffffff/333333?text=Nature%27s' },
  { name: 'Aqualogica', logo: 'https://placehold.co/140x60/ffffff/333333?text=Aqualogica' },
  { name: 'Elle18', logo: elle18Logo },
  { name: 'Lotus', logo: 'https://placehold.co/140x60/ffffff/333333?text=Lotus' },
  { name: 'Olay', logo: 'https://placehold.co/140x60/ffffff/333333?text=Olay' },
  { name: 'Ponds', logo: 'https://placehold.co/140x60/ffffff/333333?text=Ponds' },
  { name: 'Everyouth', logo: 'https://placehold.co/140x60/ffffff/333333?text=Everyouth' },
  { name: 'Garnier', logo: 'https://placehold.co/140x60/ffffff/333333?text=Garnier' },
  { name: 'VLCC', logo: 'https://placehold.co/140x60/ffffff/333333?text=VLCC' },
  { name: 'Banjaras', logo: 'https://placehold.co/140x60/ffffff/333333?text=Banjaras' },
];

export default function About() {
  return (
    <section className="relative bg-gradient-to-br from-rose-100 via-cream-100 to-lavender-100 py-16 sm:py-20 overflow-hidden">
      <div className="absolute inset-0 opacity-30 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.2\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
      <div className="max-w-6xl mx-auto px-4 relative z-10">
        {/* Hero section (same style as Home) */}
        <div className="text-center mb-12">
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold text-rose-800 mb-4">
            NEW BALAJI BANGLES & FANCY
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-8">
            Bangles, Jewellery, Cosmetics & Fashion Accessories. Order on WhatsApp.
          </p>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-8">OR</p>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          Visit our store to see and experience the products.
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
              Order on WhatsApp
            </a>
          </div>
        </div>

        {/* About content card */}
        <div className="bg-white/90 rounded-2xl shadow-soft p-6 sm:p-8">
          <h2 className="font-display text-2xl font-bold text-rose-800 text-center mb-6">
            About Our Store
          </h2>

          {/* Story + highlights */}
          <div className="max-w-3xl mx-auto text-left">
            <p className="text-lg text-gray-600 leading-relaxed mb-4">
              <strong>NEW BALAJI BANGLES & FANCY</strong> is your neighbourhood destination for traditional bangles,
              modern jewellery, everyday cosmetics and fashion accessories — carefully selected to match
              festivals, weddings and daily wear.
            </p>
            <p className="text-gray-600 leading-relaxed mb-4">
              We believe shopping for beauty and accessories should feel warm and personal. That’s why we combine
              an in‑store experience with simple WhatsApp ordering — so you can explore collections at your pace
              and confirm orders the way that’s most comfortable for you.
            </p>

            <h3 className="font-display text-xl font-semibold text-rose-800 mt-6 mb-3">
              What makes us special
            </h3>
            <div className="grid sm:grid-cols-3 gap-4 text-sm text-gray-700">
              <div className="rounded-xl bg-cream-100 border border-rose-100 p-3">
                <p className="font-semibold mb-1">Curated collections</p>
                <p>Handpicked bangles, jewellery & cosmetics for every occasion.</p>
              </div>
              <div className="rounded-xl bg-cream-100 border border-rose-100 p-3">
                <p className="font-semibold mb-1">Friendly guidance</p>
                <p>Friendly service, honest advice, and styling support you can trust.</p>
              </div>
              <div className="rounded-xl bg-cream-100 border border-rose-100 p-3">
                <p className="font-semibold mb-1">Easy ordering</p>
                <p>See products in store or place orders directly on WhatsApp.</p>
              </div>
            </div>
          </div>

          {/* Rolling cosmetics brand logos - full width strip */}
          <div className="mt-10">
            <h3 className="font-display text-xl font-semibold text-rose-800 mb-2 text-center sm:text-left">
              Cosmetics brands we stock
            </h3>
            <p className="text-sm text-gray-600 mb-3 text-center sm:text-left">
              We keep popular, trusted brands so you can pick your favourites in one place.
            </p>
            <div className="relative overflow-hidden rounded-2xl border border-rose-100 bg-cream-50 py-4 px-3">
              <div className="brand-marquee items-center gap-6">
                {[...COSMETIC_BRANDS, ...COSMETIC_BRANDS].map((brand, idx) => (
                  <div
                    key={`${brand.name}-${idx}`}
                    className="flex flex-col items-center justify-center min-w-[140px]"
                  >
                    <div className="bg-white rounded-xl shadow-sm border border-rose-100 px-3 py-2 flex items-center justify-center w-[140px] h-[60px]">
                      <img
                        src={brand.logo}
                        alt={brand.name}
                        className="max-h-[40px] object-contain"
                        loading="lazy"
                      />
                    </div>
                    <span className="mt-1 text-xs text-gray-600 font-medium">{brand.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="aspect-video rounded-2xl bg-cream-200 flex items-center justify-center text-gray-500">
              Store image 1
            </div>
            <div className="aspect-video rounded-2xl bg-cream-200 flex items-center justify-center text-gray-500">
              Store image 2
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
