import express from 'express';
import Coupon from '../models/Coupon.js';
import { protect } from '../middleware/auth.js';
import { computeCouponDiscountAmount, normalizeCouponCode } from '../utils/couponHelpers.js';

const router = express.Router();

/** Public: validate coupon for a cart subtotal */
router.post('/validate', async (req, res) => {
  try {
    const { code, subtotal } = req.body || {};
    const raw = normalizeCouponCode(code);
    if (!raw) {
      return res.status(400).json({ valid: false, message: 'Enter a coupon code.' });
    }
    const sub = Number(subtotal);
    if (Number.isNaN(sub) || sub <= 0) {
      return res.status(400).json({ valid: false, message: 'Invalid order amount.' });
    }

    const coupon = await Coupon.findOne({ code: raw }).lean();
    if (!coupon || !coupon.enabled) {
      return res.json({ valid: false, message: 'This coupon code is not valid.' });
    }

    const discountAmount = computeCouponDiscountAmount(coupon, sub);
    if (discountAmount <= 0) {
      if (coupon.minOrderAmount > 0 && sub < coupon.minOrderAmount) {
        return res.json({
          valid: false,
          message: `Minimum order of ₹${coupon.minOrderAmount} required for this coupon.`,
        });
      }
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        return res.json({ valid: false, message: 'This coupon has expired.' });
      }
      const limit = Number(coupon.usageLimit) || 0;
      if (limit > 0 && Number(coupon.usedCount) >= limit) {
        return res.json({ valid: false, message: 'This coupon is no longer available.' });
      }
      return res.json({ valid: false, message: 'This coupon cannot be applied to this order.' });
    }

    return res.json({
      valid: true,
      code: coupon.code,
      discountAmount,
      description: coupon.description || '',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/** Admin: list coupons */
router.get('/', protect, async (req, res) => {
  try {
    const list = await Coupon.find().sort({ createdAt: -1 }).lean();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/** Admin: create */
router.post('/', protect, async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      enabled,
      expiresAt,
      usageLimit,
    } = req.body || {};

    const normalized = normalizeCouponCode(code);
    if (!normalized) {
      return res.status(400).json({ message: 'Coupon code is required' });
    }
    if (!['percent', 'fixed'].includes(discountType)) {
      return res.status(400).json({ message: 'discountType must be percent or fixed' });
    }
    const dv = Number(discountValue);
    if (Number.isNaN(dv) || dv < 0) {
      return res.status(400).json({ message: 'Invalid discount value' });
    }
    if (discountType === 'percent' && (dv < 0 || dv > 100)) {
      return res.status(400).json({ message: 'Percent must be between 0 and 100' });
    }

    const exists = await Coupon.findOne({ code: normalized });
    if (exists) {
      return res.status(409).json({ message: 'A coupon with this code already exists' });
    }

    const doc = await Coupon.create({
      code: normalized,
      description: String(description || '').trim(),
      discountType,
      discountValue: dv,
      minOrderAmount: Math.max(0, Number(minOrderAmount) || 0),
      maxDiscountAmount: Math.max(0, Number(maxDiscountAmount) || 0),
      enabled: enabled !== false,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      usageLimit: Math.max(0, Number(usageLimit) || 0),
    });

    res.status(201).json(doc.toObject());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/** Admin: update */
router.put('/:id', protect, async (req, res) => {
  try {
    const c = await Coupon.findById(req.params.id);
    if (!c) return res.status(404).json({ message: 'Coupon not found' });

    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderAmount,
      maxDiscountAmount,
      enabled,
      expiresAt,
      usageLimit,
    } = req.body || {};

    if (code != null) {
      const normalized = normalizeCouponCode(code);
      if (!normalized) return res.status(400).json({ message: 'Invalid code' });
      const clash = await Coupon.findOne({ code: normalized, _id: { $ne: c._id } });
      if (clash) return res.status(409).json({ message: 'Another coupon uses this code' });
      c.code = normalized;
    }
    if (description !== undefined) c.description = String(description).trim();
    if (discountType !== undefined) {
      if (!['percent', 'fixed'].includes(discountType)) {
        return res.status(400).json({ message: 'discountType must be percent or fixed' });
      }
      c.discountType = discountType;
    }
    if (discountValue !== undefined) {
      const dv = Number(discountValue);
      if (Number.isNaN(dv) || dv < 0) return res.status(400).json({ message: 'Invalid discount value' });
      c.discountValue = dv;
    }
    if (minOrderAmount !== undefined) c.minOrderAmount = Math.max(0, Number(minOrderAmount) || 0);
    if (maxDiscountAmount !== undefined) c.maxDiscountAmount = Math.max(0, Number(maxDiscountAmount) || 0);
    if (enabled !== undefined) c.enabled = Boolean(enabled);
    if (expiresAt !== undefined) c.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (usageLimit !== undefined) c.usageLimit = Math.max(0, Number(usageLimit) || 0);

    await c.save();
    res.json(c.toObject());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/** Admin: delete */
router.delete('/:id', protect, async (req, res) => {
  try {
    const c = await Coupon.findByIdAndDelete(req.params.id);
    if (!c) return res.status(404).json({ message: 'Coupon not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
