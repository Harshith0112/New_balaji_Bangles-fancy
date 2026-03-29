/**
 * @param {string} code
 */
export function normalizeCouponCode(code) {
  return String(code || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

/**
 * @param {object} coupon — lean doc from DB
 * @param {number} itemsSubtotal — sum of cart line totals before discount
 * @returns {number} discount in ₹ (rounded to 2 decimals), 0 if not applicable
 */
export function computeCouponDiscountAmount(coupon, itemsSubtotal) {
  const sub = Math.round((Number(itemsSubtotal) || 0) * 100) / 100;
  if (sub <= 0 || !coupon || coupon.enabled === false) return 0;

  const min = Number(coupon.minOrderAmount) || 0;
  if (min > 0 && sub < min) return 0;

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return 0;

  const limit = Number(coupon.usageLimit) || 0;
  if (limit > 0 && Number(coupon.usedCount) >= limit) return 0;

  let discount = 0;
  if (coupon.discountType === 'percent') {
    const p = Math.min(100, Math.max(0, Number(coupon.discountValue) || 0));
    discount = (sub * p) / 100;
    const cap = Number(coupon.maxDiscountAmount) || 0;
    if (cap > 0) discount = Math.min(discount, cap);
  } else {
    discount = Math.min(Number(coupon.discountValue) || 0, sub);
  }

  return Math.round(discount * 100) / 100;
}
