/**
 * Indian mobile: 10 digits only, no country code (+91).
 * Strips non-digits and caps at 10; if user pasted 91XXXXXXXXXX, drop the leading 91.
 */
export function parsePhone10Input(raw) {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (d.length >= 12 && d.startsWith('91')) d = d.slice(2);
  return d.slice(0, 10);
}

export const PHONE_10_HINT =
  '10-digit mobile number only — do not add +91 or 0 at the start.';
