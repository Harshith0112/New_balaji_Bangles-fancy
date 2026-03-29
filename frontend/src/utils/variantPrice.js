/**
 * Selling price = product.price (base) + sum of selected option value `price` extras.
 * For min/max: each option group contributes independently → base + min/max per group.
 */

function valueExtra(v) {
  if (typeof v === 'string') return 0;
  const p = v?.price;
  if (p === '' || p == null) return 0;
  const n = Number(p);
  return Number.isFinite(n) ? n : 0;
}

function nonEmptyValues(values) {
  return (values || []).filter((v) => {
    const val = typeof v === 'string' ? v : v?.value;
    return val != null && String(val).trim() !== '';
  });
}

export function getLowestVariantTotal(product) {
  const base = Number(product?.price) || 0;
  const groups = product?.options || [];
  if (!groups.length) return roundMoney(base);
  let total = base;
  for (const g of groups) {
    const vals = nonEmptyValues(g.values);
    if (!vals.length) continue;
    const extras = vals.map(valueExtra);
    total += Math.min(...extras);
  }
  return roundMoney(total);
}

export function getHighestVariantTotal(product) {
  const base = Number(product?.price) || 0;
  const groups = product?.options || [];
  if (!groups.length) return roundMoney(base);
  let total = base;
  for (const g of groups) {
    const vals = nonEmptyValues(g.values);
    if (!vals.length) continue;
    const extras = vals.map(valueExtra);
    total += Math.max(...extras);
  }
  return roundMoney(total);
}

function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

/** Meaningful spread for “₹X – ₹Y” on cards */
export function variantPriceHasRange(product) {
  const low = getLowestVariantTotal(product);
  const high = getHighestVariantTotal(product);
  return Math.abs(high - low) > 0.005;
}

export function formatInrAmount(n) {
  const x = Number(n) || 0;
  if (Math.abs(x - Math.round(x)) < 1e-9) return String(Math.round(x));
  return x.toFixed(2);
}
