import mongoose from 'mongoose';

const offerBannerSchema = new mongoose.Schema(
  {
    headline: { type: String, default: 'Festival Special — Get 10% off on orders above ₹999. Order on WhatsApp today!' },
    ctaText: { type: String, default: 'Order now →' },
    whatsappMessage: { type: String, default: 'Hi, I want to avail the festival 10% off on orders above ₹999.' },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Single document for the site - use findOne
export default mongoose.model('OfferBanner', offerBannerSchema);
