/**
 * Cart / checkout availability — keep in sync with backend isProductLineOrderable (orders.js).
 */

export function getCartLineAvailability(product, cartItem) {
  const selectedOptions = (cartItem && cartItem.selectedOptions) || {};

  if (!product) {
    return { ok: false, message: 'Product is no longer available' };
  }
  if (product.visible === false) {
    return { ok: false, message: 'Product is not available' };
  }

  const productOptions = product.options || [];

  if (!productOptions.length) {
    return product.inStock !== false
      ? { ok: true }
      : { ok: false, message: 'Out of stock' };
  }

  for (const opt of productOptions) {
    const optName = (opt.name || '').toLowerCase().trim();
    const selectedValueRaw = selectedOptions[optName] ?? selectedOptions[opt.name];
    const selectedValue = selectedValueRaw != null ? String(selectedValueRaw) : '';
    if (!selectedValue && (opt.values || []).length) {
      return { ok: false, message: `Missing ${opt.name || 'option'}` };
    }
    if (!selectedValue) continue;

    const optionValue = (opt.values || []).find((v) => {
      const val = typeof v === 'string' ? v : (v.value || '');
      return String(val).toLowerCase().trim() === selectedValue.toLowerCase().trim();
    });

    if (!optionValue) {
      return { ok: false, message: `Invalid ${opt.name || 'option'}` };
    }
    const inStock = typeof optionValue === 'string' ? true : optionValue.inStock !== false;
    if (!inStock) {
      return { ok: false, message: `Out of stock: ${opt.name} ${selectedValue}` };
    }
  }

  if (product.inStock === false) {
    return { ok: false, message: 'Out of stock' };
  }

  return { ok: true };
}

export function getCartAvailabilityIssues(items, allProducts) {
  const list = Array.isArray(items) ? items : [];
  const products = Array.isArray(allProducts) ? allProducts : [];
  return list.map((item) => {
    const product = products.find((p) => String(p._id) === String(item.productId));
    const { ok, message } = getCartLineAvailability(product, item);
    return { item, ok, message: ok ? '' : message };
  });
}

export function cartHasUnavailableLines(items, allProducts) {
  return getCartAvailabilityIssues(items, allProducts).some((x) => !x.ok);
}
