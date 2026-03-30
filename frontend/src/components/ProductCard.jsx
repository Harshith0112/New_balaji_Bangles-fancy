import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import {
  formatInrAmount,
  getHighestVariantTotal,
  getLowestVariantTotal,
  variantPriceHasRange,
} from '../utils/variantPrice';

export default function ProductCard({ product }) {
  const { addToCart, updateQty, items } = useCart();
  const imageUrl = product.images?.[0] || 'https://placehold.co/400x400/fce7f3/9f1239?text=No+Image';

  /** Multiple configurable dimensions → pick on product page (single group + single value can add from card). */
  const optionGroups = (product.options || []).filter(
    (o) => o && String(o.name || '').trim() && Array.isArray(o.values) && o.values.length > 0
  );
  const needsViewForOptions =
    optionGroups.length > 1 || optionGroups.some((o) => o.values.length > 1);

  const priceLow = getLowestVariantTotal(product);
  const priceHigh = getHighestVariantTotal(product);
  const showVariantRange = optionGroups.length > 0 && variantPriceHasRange(product);
  const discount =
    product.originalPrice &&
    (showVariantRange ? product.originalPrice > priceHigh : product.originalPrice > priceLow)
      ? Math.max(0, Math.round((1 - priceLow / product.originalPrice) * 100))
      : 0;

  // Check if this product is already in cart
  const cartItem = items.find(
    (item) => item.productId === product._id && 
    (!item.selectedOptions || Object.keys(item.selectedOptions).length === 0)
  );
  const cartQuantity = cartItem?.quantity || 0;

  const handleAddToCart = (e) => {
    e.preventDefault();
    addToCart({
      productId: product._id,
      name: product.name,
      price: product.price,
      nbfCode: product.nbfCode,
      quantity: 1,
      selectedOptions: {},
    });
  };

  const handleIncreaseQty = (e) => {
    e.preventDefault();
    if (cartItem) {
      updateQty(product._id, {}, cartQuantity + 1);
    } else {
      handleAddToCart(e);
    }
  };

  const handleDecreaseQty = (e) => {
    e.preventDefault();
    if (cartQuantity > 1) {
      updateQty(product._id, {}, cartQuantity - 1);
    } else {
      updateQty(product._id, {}, 0);
    }
  };

  return (
    <div className="group bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-soft transition-all duration-300 border border-rose-50 flex flex-col min-h-[296px]">
      <Link to={`/product/${product._id}`} className="block aspect-square relative overflow-hidden bg-cream-100">
        <img
          src={imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {discount > 0 && (
          <span className="absolute top-3 left-3 bg-rose-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
            {discount}% OFF
          </span>
        )}
        {!product.inStock && (
          <span className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-gray-800 px-3 py-1 rounded font-medium">Out of Stock</span>
          </span>
        )}
      </Link>
      <div className="p-4 flex flex-col flex-1">
        <Link to={`/product/${product._id}`}>
          <h3 className="font-display font-semibold text-gray-800 line-clamp-2 min-h-[44px] group-hover:text-rose-600 transition">
            {product.name}
          </h3>
        </Link>
        <div className="mt-2 flex items-center gap-2 min-h-[24px]">
          <span className="text-rose-600 font-bold text-lg whitespace-nowrap min-w-0">
            {showVariantRange ? (
              <>
                ₹{formatInrAmount(priceLow)} – ₹{formatInrAmount(priceHigh)}
              </>
            ) : (
              <>₹{formatInrAmount(priceLow)}</>
            )}
          </span>
        </div>
        <div className="mt-auto flex gap-2 min-h-[44px]">
          {needsViewForOptions ? (
            <Link
              to={`/product/${product._id}`}
              className="flex-1 text-center bg-rose-500 text-white py-2.5 rounded-xl font-medium hover:bg-rose-600 transition whitespace-nowrap h-[44px]"
            >
              View
            </Link>
          ) : cartQuantity > 0 ? (
            <div className="flex-1 flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl p-1 h-[44px]">
              <button
                type="button"
                onClick={handleDecreaseQty}
                disabled={!product.inStock}
                className="w-8 h-8 rounded-lg bg-white border border-rose-200 text-rose-600 font-medium hover:bg-rose-100 transition disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
              >
                −
              </button>
              <span className="flex-1 text-center font-semibold text-rose-700 whitespace-nowrap">{cartQuantity}</span>
              <button
                type="button"
                onClick={handleIncreaseQty}
                disabled={!product.inStock}
                className="w-8 h-8 rounded-lg bg-white border border-rose-200 text-rose-600 font-medium hover:bg-rose-100 transition disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center"
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!product.inStock}
              className="flex-1 bg-rose-500 text-white py-2.5 rounded-xl font-medium hover:bg-rose-600 transition disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap truncate h-[44px]"
            >
              Add to Cart
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
