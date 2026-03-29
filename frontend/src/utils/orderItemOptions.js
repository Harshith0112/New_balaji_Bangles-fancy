/** Plain text line for variant/options on order line items (matches cart display). */
export function formatOrderItemOptionsLine(selectedOptions) {
  if (!selectedOptions || typeof selectedOptions !== 'object') return '';
  const entries = Object.entries(selectedOptions).filter(
    ([k, v]) => k != null && v != null && String(v).trim() !== ''
  );
  if (!entries.length) return '';
  return entries.map(([k, v]) => `${k}: ${v}`).join(', ');
}
