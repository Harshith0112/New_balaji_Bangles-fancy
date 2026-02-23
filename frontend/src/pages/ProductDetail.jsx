import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProduct } from '../api';
import { whatsappOrderUrl } from '../utils/whatsapp';
import { useCart } from '../context/CartContext';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({});

  useEffect(() => {
    getProduct(id)
      .then((p) => {
        setProduct(p);
        setSelectedImage(0);
        const opts = {};
        (p.options || []).forEach((o) => {
          if (o.values?.length) {
            // Find first in-stock value, or fallback to first value
            const firstInStock = o.values.find(v => {
              const val = typeof v === 'string' ? v : v.value;
              const inStock = typeof v === 'string' ? true : (v.inStock !== false);
              return inStock;
            });
            const firstValue = typeof o.values[0] === 'string' ? o.values[0] : o.values[0].value;
            opts[o.name] = firstInStock ? (typeof firstInStock === 'string' ? firstInStock : firstInStock.value) : firstValue;
          }
        });
        setSelectedOptions(opts);
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

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
            {product.price !== unitPrice && (
              <span className="text-sm text-gray-500">(base ₹{product.price})</span>
            )}
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
          <div className="flex flex-wrap gap-3">
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
                navigate('/cart');
              }}
              disabled={!combinationInStock}
              className="inline-flex items-center justify-center gap-2 bg-rose-500 text-white px-8 py-3 rounded-xl font-semibold hover:bg-rose-600 transition disabled:opacity-50 disabled:pointer-events-none"
            >
              Add to Cart
            </button>
            <a
              href={whatsappOrderUrl(product.name, unitPrice, product.nbfCode, selectedOptions)}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl font-semibold transition ${
                combinationInStock
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed pointer-events-none'
              }`}
            >
              <WhatsAppIcon /> Order on WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}
