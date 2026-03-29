/** Visible products for storefront (matches API default visibility). */
export function isProductVisible(p) {
  return p && p.visible !== false;
}

/** Category slug/id tolerance: singular/plural, lowercase (aligned with API). */
export function productMatchesCategory(product, categoryParam) {
  if (!categoryParam) return true;
  const slug = String(categoryParam).toLowerCase();
  const patterns = new Set([slug]);
  if (!slug.endsWith('s')) patterns.add(`${slug}s`);
  else patterns.add(slug.slice(0, -1));
  const pc = String(product.category || '').toLowerCase();
  for (const pat of patterns) {
    if (pc === pat) return true;
  }
  return false;
}

/**
 * Client-side product list filtering (mirrors GET /api/products when search is applied locally).
 */
export function filterStorefrontProducts(all, filters) {
  const {
    category = '',
    search = '',
    minPrice = '',
    maxPrice = '',
    onlyInStock = false,
    featuredFilter = false,
    newArrivalsFilter = false,
  } = filters;

  let list = (all || []).filter(isProductVisible);
  if (featuredFilter) list = list.filter((p) => p.featured);
  if (newArrivalsFilter) list = list.filter((p) => p.newArrivals);
  if (onlyInStock) list = list.filter((p) => p.inStock !== false);
  if (category) {
    list = list.filter((p) => productMatchesCategory(p, category));
  }
  if (minPrice !== '' && minPrice != null) {
    const n = Number(minPrice);
    if (!Number.isNaN(n)) list = list.filter((p) => Number(p.price) >= n);
  }
  if (maxPrice !== '' && maxPrice != null) {
    const n = Number(maxPrice);
    if (!Number.isNaN(n)) list = list.filter((p) => Number(p.price) <= n);
  }
  if (search && String(search).trim()) {
    const q = String(search).trim().toLowerCase();
    list = list.filter(
      (p) =>
        String(p.name || '')
          .toLowerCase()
          .includes(q) ||
        String(p.description || '')
          .toLowerCase()
          .includes(q) ||
        String(p.nbfCode || '')
          .toLowerCase()
          .includes(q)
    );
  }
  return list;
}
