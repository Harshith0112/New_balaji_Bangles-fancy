import { Link } from 'react-router-dom';
import CategoryIcon from '../components/CategoryIcon';
import { useAppSelector } from '../store/hooks';

const categoryMeta = {
  bangles: { emoji: '💍', desc: 'Traditional and designer bangles for every occasion.' },
  jewellery: { emoji: '✨', desc: 'Fancy jewellery — necklaces, earrings, maang tikkas & more.' },
  cosmetics: { emoji: '💄', desc: 'Lipsticks, kajal, eyeliners and beauty essentials.' },
  accessories: { emoji: '🎀', desc: 'Hair accessories, clutches and fashion add-ons.' },
};

export default function Categories() {
  const categories = useAppSelector((s) => s.siteData.categories);

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="font-display text-3xl font-bold text-rose-800 text-center mb-4">
        Categories
      </h1>
      <p className="text-gray-600 text-center max-w-xl mx-auto mb-12">
        Browse our collections — Bangles, Fancy Jewellery, Cosmetics and Hair & Fashion Accessories.
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {categories.map((cat) => {
          const meta = categoryMeta[cat.id] || { emoji: '🛍️', desc: 'Explore this collection.' };
          return (
            <Link
              key={cat.id}
              to={`/categories/${cat.slug || cat.id}`}
              className="block p-8 rounded-2xl bg-white border border-rose-100 shadow-card hover:shadow-soft hover:border-rose-200 transition text-center group"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-cream-50 border border-rose-100 flex items-center justify-center text-5xl overflow-hidden">
                <CategoryIcon
                  icon={cat.icon}
                  fallback={meta.emoji}
                  className="text-5xl"
                  imgClassName="w-full h-full object-cover"
                />
              </div>
              <h2 className="font-display text-xl font-semibold text-gray-800 group-hover:text-rose-700 mb-2">
                {cat.name}
              </h2>
              <p className="text-sm text-gray-500 mb-3">
                {(cat.description && cat.description.trim()) || meta.desc}
              </p>
              {cat.count != null && (
                <span className="text-rose-600 font-medium">{cat.count} products</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
