/** Category `icon` field may be an emoji or an image URL (e.g. Cloudinary). */
export function isCategoryIconImage(icon) {
  const s = icon && String(icon).trim();
  return !!s && /^https?:\/\//i.test(s);
}

export default function CategoryIcon({ icon, fallback = '🛍️', className = '', imgClassName }) {
  const raw = icon && String(icon).trim();
  if (isCategoryIconImage(raw)) {
    return (
      <img
        src={raw}
        alt=""
        className={imgClassName || className}
        loading="lazy"
        decoding="async"
      />
    );
  }
  return <span className={className}>{raw || fallback}</span>;
}
