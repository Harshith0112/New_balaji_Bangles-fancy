import express from 'express';
import OfferBanner from '../models/OfferBanner.js';
import { protect } from '../middleware/auth.js';
import { emitSiteDataUpdated } from '../siteSocket.js';

const router = express.Router();

const DEFAULTS = {
  headline: 'Festival Special — Get 10% off on orders above ₹999. Order on WhatsApp today!',
  ctaText: 'Order now →',
  whatsappMessage: 'Hi, I want to avail the festival 10% off on orders above ₹999.',
  enabled: true,
};

// Public: get offer banner content
router.get('/', async (req, res) => {
  try {
    const doc = await OfferBanner.findOne().lean();
    if (!doc) {
      return res.json(DEFAULTS);
    }
    // Ensure enabled always present in response
    res.json({
      ...DEFAULTS,
      ...doc,
      enabled: doc.enabled !== false,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: update offer banner
router.put('/', protect, async (req, res) => {
  try {
    const { headline, ctaText, whatsappMessage, enabled } = req.body;
    const doc = await OfferBanner.findOneAndUpdate(
      {},
      {
        ...(headline != null && { headline }),
        ...(ctaText != null && { ctaText }),
        ...(whatsappMessage != null && { whatsappMessage }),
        ...(enabled !== undefined && { enabled: enabled === 'true' || enabled === true }),
      },
      { new: true, upsert: true }
    ).lean();
    emitSiteDataUpdated();
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
