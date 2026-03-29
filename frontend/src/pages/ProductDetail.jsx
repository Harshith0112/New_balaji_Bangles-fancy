import { useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProduct } from '../api';
import { useCart } from '../context/CartContext';
import { useAppSelector } from '../store/hooks';

function applyProductToUi(p, { setProduct, setSelectedImage, setSelectedOptions }) {
  if (!p) {
    setProduct(null);
    return;
  }
  setProduct(p);
  setSelectedImage(0);
  const opts = {};
  (p.options || []).forEach((o) => {
    if (o.values?.length) {
      const firstInStock = o.values.find((v) => {
        const val = typeof v === 'string' ? v : v.value;
        const inStock = typeof v === 'string' ? true : v.inStock !== false;
        return inStock;
      });
      const firstValue = typeof o.values[0] === 'string' ? o.values[0] : o.values[0].value;
      opts[o.name] = firstInStock ? (typeof firstInStock === 'string' ? firstInStock : firstInStock.value) : firstValue;
    }
  });
  setSelectedOptions(opts);
}

export default function ProductDetail() {
  const { id } = useParams();
  const { addToCart, count } = useCart();
  const catalogRevision = useAppSelector((s) => s.siteData.catalogRevision);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({});
  const prevIdRef = useRef(id);

  useEffect(() => {
    let cancelled = false;
    const idChanged = prevIdRef.current !== id;
    prevIdRef.current = id;
    if (idChanged) setLoading(true);

    getProduct(id)
      .then((p) => {
        if (cancelled) return;
        applyProductToUi(p, { setProduct, setSelectedImage, setSelectedOptions });
      })
      .catch(() => {
        if (!cancelled) setProduct(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, catalogRevision]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square bg-cream-200 rounded-2xl animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 bg-cream-200 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-cream-200 rounded w-1/2 animate-pulse" />
            <div className="h-20 bg-cream-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">Product not found.</p>
      </div>
    );
  }

  const images = product.images?.length ? product.images : ['https://placehold.co/600x600/fce7f3/9f1239?text=No+Image'];

  // Unit price = base price + sum of selected option value prices
  const getUnitPrice = () => {
    let total = Number(product.price) || 0;
    (product.options || []).forEach((opt) => {
      const selectedValue = selectedOptions[opt.name];
      if (!selectedValue || !opt.values) return;
      const optionVal = opt.values.find((v) => (typeof v === 'string' ? v : v.value) === selectedValue);
      if (optionVal && typeof optionVal === 'object' && optionVal.price != null) {
        total += Number(optionVal.price) || 0;
      }
    });
    return total;
  };
  const unitPrice = getUnitPrice();
  const discount = product.originalPrice ? Math.round((1 - unitPrice / product.originalPrice) * 100) : 0;

  // Check if selected option combination is in stock
  const isSelectedCombinationInStock = () => {
    if (!product.options?.length) return product.inStock !== false;
    
    // Check if all selected options are in stock
    for (const opt of product.options) {
      const selectedValue = selectedOptions[opt.name];
      if (!selectedValue) continue;
      
      const optionValue = opt.values.find(v => {
        const val = typeof v === 'string' ? v : (v.value || '');
        return val === selectedValue;
      });
      
      if (optionValue) {
        const inStock = typeof optionValue === 'string' ? true : (optionValue.inStock !== false);
        if (!inStock) return false;
      }
    }
    
    return product.inStock !== false;
  };
  
  const combinationInStock = isSelectedCombinationInStock();

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-cream-100 mb-4">
            <img
              src={images[selectedImage]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedImage(i)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition ${
                    selectedImage === i ? 'border-rose-500' : 'border-transparent'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {discount > 0 && (
            <span className="inline-block bg-rose-500 text-white text-sm font-semibold px-3 py-1 rounded-full mb-3">
              {discount}% OFF
            </span>
          )}
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            {product.name}
          </h1>
          <p className="text-sm text-gray-500 capitalize mb-4">{product.category}</p>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl font-bold text-rose-600">₹{unitPrice}</span>
            {product.originalPrice && (
              <span className="text-gray-400 line-through">₹{product.originalPrice}</span>
            )}
          </div>
          <p className="text-gray-600 mb-6 whitespace-pre-wrap">
            {product.description || 'No description available.'}
          </p>
          {product.nbfCode && (
            <p className="text-sm text-gray-500 mb-2">Code: <span className="font-mono font-medium">{product.nbfCode}</span></p>
          )}
          {product.options?.length > 0 && (
            <div className="mb-6 space-y-3">
              {(product.options || []).map((opt) => {
                const getValue = (v) => typeof v === 'string' ? v : (v.value || '');
                const getInStock = (v) => typeof v === 'string' ? true : (v.inStock !== false);
                
                return (
                  <div key={opt.name}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{opt.name}</label>
                    <div className="flex flex-wrap gap-2">
                      {(opt.values || []).map((val) => {
                        const value = getValue(val);
                        const inStock = getInStock(val);
                        const isSelected = selectedOptions[opt.name] === value;

                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              if (inStock) {
                                setSelectedOptions((o) => ({ ...o, [opt.name]: value }));
                              }
                            }}
                            disabled={!inStock}
                            className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition relative ${
                              !inStock
                                ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                                : isSelected
                                ? 'border-rose-500 bg-rose-50 text-rose-700'
                                : 'border-gray-300 hover:border-rose-300'
                            }`}
                          >
                            {value}
                            {!inStock && (
                              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" title="Out of stock" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="mb-6">
            <span className={`font-medium ${combinationInStock ? 'text-green-600' : 'text-red-600'}`}>
              {combinationInStock ? 'In Stock' : 'Out of Stock'}
            </span>
            {product.options?.length > 0 && !combinationInStock && (
              <span className="block text-xs text-gray-500 mt-1">
                Selected option combination is out of stock
              </span>
            )}
          </p>
          <div className="flex flex-wrap gap-3 items-center">
            <button
              type="button"
              onClick={() => {
                addToCart({
                  productId: product._id,
                  name: product.name,
                  price: unitPrice,
                  nbfCode: product.nbfCode,
                  quantity: 1,
                  selectedOptions: { ...selectedOptions },
                });
              }}
              disabled={!combinationInStock}
              className="inline-flex items-center justify-center gap-2 bg-rose-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-rose-600 transition disabled:opacity-50 disabled:pointer-events-none"
            >
              Add to Cart
            </button>
            {count > 0 && (
              <Link
                to="/cart"
                className="inline-flex items-center justify-center gap-2 border-2 border-rose-500 text-rose-600 px-6 py-3 rounded-xl font-semibold hover:bg-rose-50 transition"
              >
                Go to cart
                <span className="text-sm font-medium opacity-90">({count})</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
